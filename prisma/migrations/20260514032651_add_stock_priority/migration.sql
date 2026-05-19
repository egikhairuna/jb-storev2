-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "computedStock" INTEGER NOT NULL DEFAULT 0,
    "stockStatus" TEXT NOT NULL DEFAULT 'instock',
    "stockPriority" INTEGER NOT NULL DEFAULT 2,
    "sku" TEXT,
    "type" TEXT NOT NULL,
    "image" TEXT,
    "lastUpdated" DATETIME,
    "categoryIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("categoryIds", "computedStock", "createdAt", "id", "image", "lastUpdated", "name", "price", "sku", "stock", "type", "updatedAt") SELECT "categoryIds", "computedStock", "createdAt", "id", "image", "lastUpdated", "name", "price", "sku", "stock", "type", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_stockPriority_idx" ON "Product"("stockPriority");
CREATE INDEX "Product_stockStatus_idx" ON "Product"("stockStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
