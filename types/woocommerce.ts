/**
 * WooCommerce Core REST primitives shared across authenticated responses.
 * @see {@link https://woocommerce.github.io/woocommerce-rest-api-docs/ WooCommerce REST API docs}
 */

/**
 * Image tile returned embedded on product payloads; primary channel is PNG/JPEG CDN URLs.
 */
export interface WCImage {
  readonly src: string;
}

/** Inventory reporting flag exposed on REST product + variation payloads. */
export type WCStockStatus = "instock" | "outofstock" | "onbackorder";

/** Reduced product archetypes relevant to cashier lane merchandising workflows. */
export type WCProductType = "simple" | "variable";

/**
 * Recursive JSON payloads observed inside WooCommerce `meta_data` bags.
 */
export type WCJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly WCJsonValue[]
  | { readonly [key: string]: WCJsonValue };

/**
 * Loose key/value pair wrapper returned on orders, coupons, refunds, etc.
 */
export interface WCMetaDataPair {
  readonly key: string;
  readonly value: WCJsonValue;
}

/** Attribute permutation rows attached to each variation SKU. */
export interface WCVariationAttribute {
  readonly id: number | null;
  readonly name: string;
  readonly option: string;
}

/**
 * Canonical REST v3 product row shape surfaced by `/products` and `/products/:id`.
 * Nullable fields honour upstream responses where WooCommerce emits `null` instead of empty strings.
 */
export interface WCProduct {
  readonly id: number;
  readonly name: string;
  readonly sku: string | null;
  readonly price: string;
  readonly regular_price: string | null;
  readonly stock_quantity: number | null;
  readonly stock_status: WCStockStatus;
  readonly manage_stock: boolean;
  readonly type: WCProductType;
  readonly images: readonly WCImage[];
  readonly variations: readonly number[];
  readonly categories: readonly WCCategory[];
  readonly date_modified: string;
}

/** Category entry returned by `/products/categories`. */
export interface WCCategory {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly count?: number;
}

/** Variation record returned via `/products/:parent/variations/:id`. */
export interface WCVariation {
  readonly id: number;
  readonly sku: string | null;
  readonly price: string;
  readonly stock_quantity: number | null;
  readonly stock_status: WCStockStatus;
  readonly manage_stock: boolean;
  readonly attributes: readonly WCVariationAttribute[];
}

/** Persisted WooCommerce basket line reconstructed from fulfilled orders or admin responses. */
export interface WCOrderLineItem {
  readonly product_id: number;
  readonly variation_id: number | null;
  readonly name: string;
  readonly sku: string | null;
  readonly quantity: number;
  readonly price: string;
  readonly total: string;
  readonly meta_data: readonly WCMetaDataPair[];
}

/**
 * Lightweight line payloads accepted inside `WCOrderRequest.line_items`.
 * Mirrors the subset WooCommerce honours when assembling new orders programmatically.
 */
export interface WCOrderRequestLineItem {
  readonly product_id: number;
  readonly quantity: number;
  readonly variation_id?: number | null;
  readonly sku?: string | null;
  readonly name?: string | null;
  readonly meta_data?: readonly WCMetaDataPair[];
}

/** Body contract for programmatic `POST /orders` integrations. */
export interface WCOrderRequest {
  readonly line_items: readonly WCOrderRequestLineItem[];
  readonly payment_method: string;
  readonly payment_method_title: string;
  readonly set_paid: boolean;
  readonly status?: string;
  readonly billing?: {
    readonly first_name?: string;
    readonly last_name?: string;
  };
  readonly meta_data: readonly WCMetaDataPair[];
  readonly customer_note?: string | null;
  readonly fee_lines?: readonly {
    readonly name: string;
    readonly total: string;
  }[];
}

/** Persisted WooCommerce order envelope returned immediately after synchronous creation/update. */
export interface WCOrderResponse {
  readonly id: number;
  readonly number: string;
  readonly status: string;
  readonly total: string;
  readonly line_items: readonly WCOrderLineItem[];
  readonly date_created: string;
  readonly payment_method: string;
  readonly payment_method_title: string;
  readonly billing: {
    readonly first_name: string;
    readonly last_name: string;
  };
  readonly meta_data: readonly WCMetaDataPair[];
}

/** Normalised error envelope thrown by gateway helpers translating WooCommerce rejects. */
export interface WCApiError {
  readonly status: number;
  readonly message: string;
  readonly code: string;
}
