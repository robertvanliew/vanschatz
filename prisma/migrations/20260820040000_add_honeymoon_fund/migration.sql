-- A named piece of the honeymoon guests can contribute toward.
CREATE TABLE "FundTile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "targetCents" INTEGER NOT NULL,
    "suggested" INTEGER[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundTile_pkey" PRIMARY KEY ("id")
);

-- A guest saying they have sent money. Records intent, not a verified payment:
-- the money moves through PayPal, which tells this site nothing.
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "tileId" TEXT NOT NULL,
    "guestId" TEXT,
    "givenName" TEXT,
    "amountCents" INTEGER NOT NULL,
    "message" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FundTile_slug_key" ON "FundTile"("slug");

ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "FundTile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
