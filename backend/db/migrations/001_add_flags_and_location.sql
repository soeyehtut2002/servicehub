-- ============================================================
-- ServiceHub Migration: Review Flags + Booking Location
-- Run this ONCE against your existing database.
-- Safe to run on a live DB (no data loss).
-- ============================================================

-- Add is_flagged column to reviews (for "report review" feature)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Add location column to bookings (customer address/location input)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Add password reset columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = TRUE;

SELECT 'Migration completed successfully' AS status;
