-- Goals and per-piece tiles are gone. A target caps how much feels appropriate
-- to give, and five progress bars reading $0 said "nobody has given" rather than
-- "help us get there". The public page shows guests' notes instead.
--
-- Safe: no contributions had been recorded when this ran.
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_tileId_fkey";

ALTER TABLE "Contribution" DROP COLUMN "tileId",
ADD COLUMN "noteHidden" BOOLEAN NOT NULL DEFAULT false;

DROP TABLE "FundTile";
