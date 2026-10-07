-- Guest song requests. A new table only; nothing existing changes.
-- CreateTable
CREATE TABLE "SongRequest" (
    "id" TEXT NOT NULL,
    "guestId" TEXT,
    "givenName" TEXT,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artwork" TEXT,
    "previewUrl" TEXT,
    "appleUrl" TEXT NOT NULL,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongRequest_guestId_idx" ON "SongRequest"("guestId");

-- CreateIndex
CREATE INDEX "SongRequest_trackId_idx" ON "SongRequest"("trackId");

-- AddForeignKey
ALTER TABLE "SongRequest" ADD CONSTRAINT "SongRequest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

