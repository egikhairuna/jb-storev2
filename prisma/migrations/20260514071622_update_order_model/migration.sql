-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "posOrderId" TEXT NOT NULL,
    "wcOrderId" TEXT,
    "cashierId" TEXT,
    "items" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "cashAmount" REAL,
    "transferAmount" REAL,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "wcStatus" TEXT NOT NULL DEFAULT 'pending',
    "customerName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'pos',
    "paymentMethodTitle" TEXT,
    CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cashAmount", "cashierId", "createdAt", "discountAmount", "errorMessage", "id", "items", "paymentMethod", "posOrderId", "retryCount", "subtotal", "syncStatus", "taxAmount", "total", "transferAmount", "updatedAt", "wcOrderId") SELECT "cashAmount", "cashierId", "createdAt", "discountAmount", "errorMessage", "id", "items", "paymentMethod", "posOrderId", "retryCount", "subtotal", "syncStatus", "taxAmount", "total", "transferAmount", "updatedAt", "wcOrderId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_posOrderId_key" ON "Order"("posOrderId");
CREATE UNIQUE INDEX "Order_wcOrderId_key" ON "Order"("wcOrderId");
CREATE INDEX "Order_cashierId_idx" ON "Order"("cashierId");
CREATE INDEX "Order_syncStatus_idx" ON "Order"("syncStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
