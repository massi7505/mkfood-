CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN');
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'VALIDATED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PAID', 'ABANDONED', 'OVERDUE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "thirdpartyId" INTEGER NOT NULL DEFAULT 0,
  "dolibarrApiKey" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductCache" (
  "dolibarrId" TEXT NOT NULL,
  "ref" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "priceHt" DECIMAL(12,2) NOT NULL,
  "tva" DECIMAL(5,2) NOT NULL,
  "unit" TEXT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "categoryId" TEXT,
  "categoryLabel" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductCache_pkey" PRIMARY KEY ("dolibarrId")
);

CREATE TABLE "OrderCache" (
  "dolibarrId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "lines" JSONB NOT NULL,
  "dateOrder" TIMESTAMP(3) NOT NULL,
  "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderCache_pkey" PRIMARY KEY ("dolibarrId")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_thirdpartyId_idx" ON "User"("thirdpartyId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "ProductCache_ref_idx" ON "ProductCache"("ref");
CREATE INDEX "ProductCache_categoryId_idx" ON "ProductCache"("categoryId");
CREATE INDEX "ProductCache_isActive_idx" ON "ProductCache"("isActive");
CREATE INDEX "OrderCache_userId_idx" ON "OrderCache"("userId");
CREATE INDEX "OrderCache_dateOrder_idx" ON "OrderCache"("dateOrder");
CREATE INDEX "OrderCache_status_idx" ON "OrderCache"("status");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderCache" ADD CONSTRAINT "OrderCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
