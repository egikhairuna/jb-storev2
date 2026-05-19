// Note: 'server-only' intentionally omitted — this file is
// also imported by the BullMQ worker (Node.js process).
// Credentials are protected via environment variables only.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { WCProduct, WCVariation, WCOrderRequest, WCOrderResponse, WCApiError as WCApiErrorType, WCCategory } from "@/types/woocommerce";
import { parseWCProductPayload, parseWCVariationPayload } from "@/types/woocommerce-schemas";

export class WCApiError extends Error implements WCApiErrorType {
  status: number;
  code: string;

  constructor(status: number, message: string, code: string = 'wc_error') {
    super(message);
    this.name = 'WCApiError';
    this.status = status;
    this.code = code;
  }
}

class WooCommerceRestApi {
  private url: string;
  private key: string;
  private secret: string;

  constructor() {
    this.url = process.env.WC_BASE_URL?.replace(/\/+$/, '') || '';
    this.key = process.env.WC_CONSUMER_KEY || '';
    this.secret = process.env.WC_CONSUMER_SECRET || '';

    if (!this.url || !this.key || !this.secret) {
      throw new Error('Missing WooCommerce environment variables');
    }
  }

  private get authHeader() {
    return 'Basic ' + Buffer.from(`${this.key}:${this.secret}`).toString('base64');
  }

  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.url}/wp-json/wc/v3${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const headers = new Headers(options.headers);
    headers.set('Authorization', this.authHeader);
    headers.set('Accept', 'application/json');
    if (options.body) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const text = await response.text();
      let msg = text;
      let code = 'wc_error';
      try {
        const json = JSON.parse(text);
        if (json.message) msg = json.message;
        if (json.code) code = json.code;
      } catch {}
      throw new WCApiError(response.status, msg, code);
    }
    return response;
  }
}

const api = new WooCommerceRestApi();

export async function getProducts(params?: { page?: number; per_page?: number; search?: string; modifiedAfter?: Date }): Promise<{ products: WCProduct[], totalPages: number }> {
  const perPage = params?.per_page || 50;
  const page = params?.page || 1;

  const search = new URLSearchParams({
    status: 'any',
    per_page: `${perPage}`,
    page: `${page}`,
  });

  if (params?.search) {
    search.append('search', params.search);
  }
  if (params?.modifiedAfter) {
    const iso = params.modifiedAfter.toISOString().replace(/\.\d{3}Z$/, "Z");
    search.append("modified_after", iso);
  }

  const fullUrl = `/products?${search.toString()}`;
  console.info(`[sync] fetching WC products with status=any: ${fullUrl}`);
  
  const response = await api.fetch(fullUrl, { cache: 'no-store' });
  const productsRaw = (await response.json()) as unknown[];
  
  if (!Array.isArray(productsRaw)) {
    throw new WCApiError(500, "Unexpected WooCommerce response for products listing", 'invalid_response');
  }

  const products = productsRaw.flatMap((row) => {
    try {
      return [parseWCProductPayload(row)];
    } catch (err) {
      console.warn(`[WC_SYNC] Failed to parse product ${JSON.stringify(row).substring(0, 100)}...:`, err);
      return [];
    }
  });

  const rawHeader = response.headers.get("x-wp-totalpages");
  const totalPages = rawHeader ? parseInt(rawHeader.trim(), 10) : 1;

  console.info(`[WC_FETCH] Fetched: ${products.length} products, totalPages: ${totalPages}`);

  return {
    products,
    totalPages,
  };
}


export async function getProduct(id: string): Promise<WCProduct> {
  const response = await api.fetch(`/products/${encodeURIComponent(id)}`, {
    cache: 'no-store'
  });
  const decodedUnknown = await response.json();
  try {
    return parseWCProductPayload(decodedUnknown);
  } catch {
    throw new WCApiError(500, "WooCommerce returned an invalid single product payload", 'invalid_product_payload');
  }
}

export async function getProductStock(
  productId: string | number,
  variationId?: string | number
): Promise<{ product_id?: number; stock_quantity: number | null; stock_status: string }> {
  const endpoint = variationId 
    ? `/products/${productId}/variations/${variationId}` 
    : `/products/${productId}`;
    
  const response = await api.fetch(endpoint, {
    cache: 'no-store'
  });
  const decodedUnknown = await response.json();
  try {
    if (variationId) {
      const variation = parseWCVariationPayload(decodedUnknown);
      return {
        product_id: variation.id,
        stock_quantity: variation.stock_quantity ?? 0,
        stock_status: variation.stock_status
      };
    } else {
      const product = parseWCProductPayload(decodedUnknown);
      return {
        product_id: product.id,
        stock_quantity: product.stock_quantity ?? 0,
        stock_status: product.stock_status
      };
    }
  } catch {
    throw new WCApiError(500, "WooCommerce returned an invalid stock payload", 'invalid_product_payload');
  }
}

export async function getProductVariations(productId: string): Promise<WCVariation[]> {
  const response = await api.fetch(`/products/${encodeURIComponent(productId)}/variations?per_page=100`, {
    cache: 'no-store'
  });
  const decodedUnknown = await response.json();

  if (!Array.isArray(decodedUnknown)) {
    throw new WCApiError(500, "Unexpected variation payload from WooCommerce", 'invalid_variations_payload');
  }

  return decodedUnknown.flatMap((row) => {
    try {
      return [parseWCVariationPayload(row)];
    } catch {
      return [];
    }
  });
}

export async function createOrder(payload: WCOrderRequest): Promise<WCOrderResponse> {
  const response = await api.fetch("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()) as WCOrderResponse;
}

export async function addOrderNote(orderId: number, note: string) {
  try {
    await api.fetch(`/orders/${orderId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        note,
        customer_note: false
      }),
    });
  } catch (error) {
    console.error(`[WC_NOTE] Failed to add note to order ${orderId}:`, error);
    // Do not throw - we don't want to fail the order if the note fails
  }
}

export async function getOrders(params?: {
  page?: number;
  per_page?: number;
  after?: string;
  status?: string;
}): Promise<{ orders: WCOrderResponse[]; totalPages: number; total: number }> {
  const searchParams = new URLSearchParams({
    page: (params?.page || 1).toString(),
    per_page: (params?.per_page || 20).toString(),
    status: params?.status || "any",
  });

  if (params?.after) {
    searchParams.append("after", params.after);
  }

  const response = await api.fetch(`/orders?${searchParams.toString()}`, {
    cache: "no-store",
  });

  const orders = (await response.json()) as WCOrderResponse[];
  const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
  const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "0", 10);

  return { orders, totalPages, total };
}

export async function getAllOrders(after?: string): Promise<WCOrderResponse[]> {
  const { totalPages, orders: firstPageOrders } = await getOrders({
    page: 1,
    per_page: 100,
    after,
    status: "any",
  });

  const allOrders = [...firstPageOrders];

  if (totalPages > 1) {
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

    // Process in chunks of 3 for concurrency control
    for (let i = 0; i < remainingPages.length; i += 3) {
      const chunk = remainingPages.slice(i, i + 3);
      const results = await Promise.all(
        chunk.map((page) => getOrders({ page, per_page: 100, after, status: "any" })),
      );
      for (const r of results) {
        allOrders.push(...r.orders);
      }
    }
  }

  return allOrders;
}

export async function checkOrderExists(wcOrderId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.WC_BASE_URL}/wp-json/wc/v3/orders/${wcOrderId}`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
          ).toString('base64'),
        },
        cache: 'no-store',
      }
    )
    // 404 = hard deleted, 410 = in WooCommerce trash — both mean gone
    if (response.status === 404 || response.status === 410) return false
    return true
  } catch {
    // Network error — assume exists to avoid false deletion
    console.warn('[checkOrderExists] network error for', wcOrderId)
    return true
  }
}

export async function getCategories(): Promise<WCCategory[]> {
  const response = await api.fetch("/products/categories?per_page=100&hide_empty=true", {
    next: { revalidate: 300 }
  });
  const data = (await response.json()) as WCCategory[];
  return data;
}

export function verifyWooCommerceWebhookSignature(
  rawBodyBuffer: Buffer,
  signatureHeader: string | undefined
): boolean {
  const secret = process.env.WEBHOOK_SECRET || "";
  if (!signatureHeader || secret.length === 0) return false;

  const expectedBase64 = createHmac("sha256", secret)
    .update(rawBodyBuffer)
    .digest("base64");

  const expectedBuffer = Buffer.from(expectedBase64, "utf8");
  
  // Also handle hex signature strings safely 
  const normalizedHeader = /^[a-fA-F0-9]{64}$/.test(signatureHeader.trim())
    ? Buffer.from(signatureHeader.trim(), "hex").toString("base64")
    : signatureHeader.trim();

  const providedBuffer = Buffer.from(normalizedHeader, "utf8");

  try {
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
