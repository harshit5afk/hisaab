-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billNo" TEXT,
    "vendor" TEXT,
    "productId" TEXT,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "quantity" REAL DEFAULT 1,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "purchases_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_purchases" ("amount", "billNo", "createdAt", "createdBy", "date", "deletedAt", "description", "id", "quantity", "updatedAt", "vendor") SELECT "amount", "billNo", "createdAt", "createdBy", "date", "deletedAt", "description", "id", "quantity", "updatedAt", "vendor" FROM "purchases";
DROP TABLE "purchases";
ALTER TABLE "new_purchases" RENAME TO "purchases";
CREATE INDEX "purchases_vendor_idx" ON "purchases"("vendor");
CREATE INDEX "purchases_productId_idx" ON "purchases"("productId");
CREATE INDEX "purchases_date_idx" ON "purchases"("date");
CREATE INDEX "purchases_createdBy_idx" ON "purchases"("createdBy");
CREATE INDEX "purchases_deletedAt_idx" ON "purchases"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
