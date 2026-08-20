-- How each claimed gift is reaching the couple: NULL (not yet said), 'SHIP' or
-- 'BRING'. Nullable, so every existing claim stays valid.
ALTER TABLE "GiftClaim" ADD COLUMN "delivery" TEXT;

-- Key/value settings the couple edits from /admin. Holds the shipping address,
-- which must never be committed to the repository.
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
