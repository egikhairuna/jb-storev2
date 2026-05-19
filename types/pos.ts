/**
 * Lightweight classification used when rendering SKU tiles on the cashier grid.
 */
export type ProductType = "simple" | "variable";

/**
 * Mirrored WooCommerce variation row compacted into a POS-friendly datum.
 */
export interface Variant {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly price: number;
  readonly stock: number;
}

/** Cached catalog entity hydrated from SQLite / WooCommerce pulls. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly sku: string;
  readonly type: ProductType;
  readonly variants?: readonly Variant[];
  readonly image?: string | undefined;
  readonly categoryIds?: string;
}

/**
 * Quantity-aware basket mutation derived from catalogue rows.
 */
export interface CartItem extends Product {
  readonly quantity: number;
  readonly variantId?: string | undefined;
  readonly variantName?: string | undefined;
}

/**
 * Local tender draft captured offline-first (UUID mandated before enqueueing outbound sync).
 */
export interface POSOrder {
  readonly offline_id: string;
  readonly items: readonly CartItem[];
  readonly payment_method: "cash" | "transfer" | "split";
  readonly given_amount: number;
  readonly change_amount: number;
  readonly cash_amount?: number;
  readonly transfer_amount?: number;
  readonly note?: string | undefined;
  readonly status: "pending" | "syncing" | "synced" | "failed";
  readonly created_at: string;
  readonly wc_order_id?: number | undefined;
  readonly cashier_name: string;
  readonly discount_type: "percent" | "nominal" | null;
  readonly discount_value: number;
  readonly discount_amount: number;
  readonly customer_name: string | null;
  readonly order_note: string | null;
  readonly subtotal: number;
  readonly total: number;
}

/**
 * Discriminated tender union matching how cashiers record drawer + bank splits.
 */
export type PaymentMethod =
  | CashPaymentFacet
  | TransferPaymentFacet
  | SplitPaymentFacet;

/**
 * Cash tenders record both paid and change deltas for cashier accountability.
 */
export interface CashPaymentFacet {
  readonly type: "cash";
  readonly given_amount: number;
  readonly change_amount: number;
}

/** Electronic transfers optionally capture PSP references surfaced on receipts. */
export interface TransferPaymentFacet {
  readonly type: "transfer";
  readonly reference?: string | undefined;
}

/** Composite settlements requiring distinct cash drawer + bank postings. */
export interface SplitPaymentFacet {
  readonly type: "split";
  readonly cash_amount: number;
  readonly transfer_amount: number;
}

/**
 * Printable merchandising barcode metadata composed by the label studio workspace.
 */
export interface BarcodeItem {
  readonly id: string;
  readonly productName: string;
  readonly variantId?: string | undefined;
  readonly variantName?: string | undefined;
  readonly sku: string;
  readonly price: number;
  readonly quantity: number;
}

/**
 * UI-visible synchronization pulses independent of Prisma-backed queue states.
 */
export type SyncStatus = "idle" | "syncing" | "success" | "error";

/**
 * Outcome of correlating live WooCommerce stock with a proposed basket quantity.
 */
export type StockCheckResult =
  | StockAvailabilityPositive
  | StockAvailabilityShortfall;

/**
 * SKU has sufficient WooCommerce-managed inventory according to realtime reads.
 */
export interface StockAvailabilityPositive {
  readonly available: true;
  readonly stock_quantity: number;
}

/**
 * Requested tally exceeds authoritative WooCommerce stock for the SKU + variation pairing.
 */
export interface StockAvailabilityShortfall {
  readonly available: false;
  readonly product_id: number;
  readonly requested: number;
  readonly actual: number;
}
