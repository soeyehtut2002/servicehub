/**
 * ServiceHub — Run DB Migrations
 * node migrate.js
 *
 * Safely adds new columns to the existing database.
 * Uses IF NOT EXISTS so it is safe to run multiple times.
 */

require('dotenv').config({ path: './backend/.env' });
const { Client } = require('pg');

const SQL = `
-- Add is_flagged + flag_reason to reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_flagged  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Add location to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Add password reset columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires  TIMESTAMP;

-- Add cancellation tracking to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMP;

-- Real-time chat messages table
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at
);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Index for flagged reviews
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = TRUE;

-- ── Availability Management: Service capacity fields ─────────────────────────
-- duration_hours: expected service duration per booking (1, 2, 3, 4 hours)
-- team_count:     how many teams can work in parallel at the same time slot
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS duration_hours INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS team_count     INT NOT NULL DEFAULT 1;

-- Availability status on services (from earlier feature work)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'available';

-- Update availability_status CHECK constraint via DO block (safe re-run)
DO $$
BEGIN
  BEGIN
    ALTER TABLE services
      ADD CONSTRAINT chk_availability_status
      CHECK (availability_status IN ('available', 'fully_booked', 'paused'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- account_type on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'freelancer';

-- Backfill NULLs before applying constraint
UPDATE users SET account_type = 'freelancer' WHERE account_type IS NULL OR account_type NOT IN ('freelancer','business');

DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_account_type;
  ALTER TABLE users
    ADD CONSTRAINT chk_account_type
    CHECK (account_type IN ('freelancer', 'business'));
END $$;

-- time_slots table (if not already created by a prior migration)
CREATE TABLE IF NOT EXISTS time_slots (
  id           SERIAL PRIMARY KEY,
  service_id   INT  NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slot_date    DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_booked    BOOLEAN NOT NULL DEFAULT FALSE,
  max_capacity INT     NOT NULL DEFAULT 1,
  booked_count INT     NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (service_id, slot_date, start_time)
);

-- ── Time-slot capacity tracking columns (safe add to existing tables) ─────────
ALTER TABLE time_slots
  ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booked_count INT NOT NULL DEFAULT 0;

-- Migrate existing booked slots: set booked_count = 1 where is_booked = TRUE
UPDATE time_slots SET booked_count = 1 WHERE is_booked = TRUE AND booked_count = 0;

-- time_slot_id on bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS time_slot_id INT REFERENCES time_slots(id) ON DELETE SET NULL;

-- bookings status update: allow 'paused' status
DO $$
BEGIN
  BEGIN
    ALTER TABLE bookings
      DROP CONSTRAINT IF EXISTS bookings_status_check;
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_status_check
      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'paused'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Indexes for efficient availability queries
CREATE INDEX IF NOT EXISTS idx_timeslots_date_service ON time_slots(slot_date, service_id);
CREATE INDEX IF NOT EXISTS idx_timeslots_capacity     ON time_slots(service_id, slot_date, booked_count, max_capacity);

-- ── Per-service weekly schedule ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_schedules (
  id           SERIAL PRIMARY KEY,
  service_id   INT  NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  day_of_week  INT  NOT NULL,   -- 0=Sunday, 1=Monday ... 6=Saturday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(service_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_schedules_service ON service_schedules(service_id);

-- ── Per-service blocked dates (holidays, leave) ───────────────────────────────
CREATE TABLE IF NOT EXISTS service_blocked_dates (
  id           SERIAL PRIMARY KEY,
  service_id   INT  NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_id, blocked_date)
);
CREATE INDEX IF NOT EXISTS idx_blocked_service ON service_blocked_dates(service_id, blocked_date);

-- ── In-app notifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ── Service multi-image gallery ───────────────────────────────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- ── Multi-Currency Support ─────────────────────────────────────────────────────
-- Provider sets price in their preferred currency
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- Currency fields on bookings (customer payment currency + conversion snapshot)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS converted_price  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS exchange_rate     NUMERIC(18,8);

-- Payments table: full audit trail of every booking's currency conversion
CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  booking_id        INT           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  original_price    NUMERIC(12,2) NOT NULL,
  original_currency VARCHAR(3)    NOT NULL,
  converted_price   NUMERIC(12,2) NOT NULL,
  payment_currency  VARCHAR(3)    NOT NULL,
  exchange_rate     NUMERIC(18,8) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
`;

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('\n🔄 Running migrations...\n');
    await client.query(SQL);
    console.log('✅  reviews.is_flagged / flag_reason      — OK');
    console.log('✅  bookings.location                     — OK');
    console.log('✅  users.password_reset_*                — OK');
    console.log('✅  bookings.cancellation tracking         — OK');
    console.log('✅  messages table + indexes              — OK');
    console.log('✅  services.duration_hours               — OK');
    console.log('✅  services.team_count                   — OK');
    console.log('✅  time_slots table (if new)             — OK');
    console.log('✅  time_slots.max_capacity               — OK');
    console.log('✅  time_slots.booked_count               — OK');
    console.log('✅  availability indexes                  — OK');
    console.log('✅  service_schedules table               — OK');
    console.log('✅  service_blocked_dates table           — OK');
    console.log('✅  notifications table                   — OK');
    console.log('✅  services.image_urls                   — OK');
    console.log('✅  services.currency                     — OK');
    console.log('✅  bookings.payment_currency/rate         — OK');
    console.log('✅  payments table                         — OK');
    console.log('\n🎉 All migrations applied successfully!\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
