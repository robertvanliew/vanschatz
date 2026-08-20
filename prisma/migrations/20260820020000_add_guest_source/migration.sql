-- Marks a guest who RSVP'd from the website without a personal invite link and
-- was not already on the list. Nullable, so every existing guest is unaffected.
ALTER TABLE "Guest" ADD COLUMN "source" TEXT;
