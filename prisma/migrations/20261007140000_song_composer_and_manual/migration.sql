-- Classical composers, and songs typed in by hand (no Apple link). Additive.
-- AlterTable
ALTER TABLE "SongRequest" ADD COLUMN     "composer" TEXT,
ADD COLUMN     "manual" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "appleUrl" DROP NOT NULL;

