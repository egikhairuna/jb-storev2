export const APP_NAME = "JB Store POS";
export const CURRENCY = "IDR";

export const PAYMENT_METHODS = {
  CASH: "cash",
  TRANSFER: "transfer",
  SPLIT: "split",
} as const;

export const ORDER_STATUS_LABELS = {
  PENDING: "PENDING",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
} as const;

export const UI_STRINGS = {
  SEARCH_PLACEHOLDER: "Search product (/) ...",
  OUT_OF_STOCK: "habis",
  IN_STOCK: "stok:",
  SUBTOTAL: "Subtotal",
  TAX: "Tax",
  DISCOUNT: "Discount",
  TOTAL: "Grand Total",
  PAY: "Bayar",
  PROCESS_PAYMENT: "Proses Pembayaran",
  NEW_TRANSACTION: "Transaksi Baru",
  CHANGE_AMOUNT: "Kembalian",
  GIVEN_AMOUNT: "Uang Diterima",
  REFERENCE: "Referensi",
  CASH_AMOUNT: "Tunai",
  TRANSFER_AMOUNT: "Transfer",
  INSUFFICIENT_STOCK_ERROR: "Stok tidak mencukupi",
  TRANSACTION_SUCCESS: "Transaksi Berhasil",
  CONFIRM: "Konfirmasi",
  CANCEL: "Batal",
  BASKET_EMPTY: "Keranjang kosong",
  REFRESH: "Refresh",
  SYNC: "Sync",
  CASHIER: "Kasir",
} as const;

export const KEYBOARD_SHORTCUTS = {
  FOCUS_SEARCH: "/",
  CLEAR_CART: "Escape",
  CLOSE_MODAL: "Escape",
} as const;

