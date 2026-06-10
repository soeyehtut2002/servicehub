-- ============================================================
-- ServiceHub Migration 002: Feature Enhancements
-- Run ONCE against your existing servicehub database.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ── Users: account_type + gallery_urls ───────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type  VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gallery_urls  TEXT[]      DEFAULT '{}';

-- CHECK constraint for account_type (freelancer/company/group)
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_account_type_check
    CHECK (account_type IN ('company', 'freelancer', 'group'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Bookings: cancellation fields ────────────────────────────────────────────
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS time_slot_id INTEGER;

-- Drop old status constraint, re-add with 'paused'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
        'pending',
        'confirmed',
        'completed',
        'cancelled',
        'paused'
    )
);

-- ── Services: availability_status ────────────────────────────────────────────
ALTER TABLE services
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available';

DO $$ BEGIN
  ALTER TABLE services ADD CONSTRAINT services_availability_status_check
    CHECK (availability_status IN ('available', 'fully_booked', 'paused'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Reviews: image_urls + updated_at ─────────────────────────────────────────
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS image_urls TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ── Services: duration_hours + team_count ──────────────────────────────────────
ALTER TABLE services
ADD COLUMN IF NOT EXISTS duration_hours INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS team_count INT NOT NULL DEFAULT 1;

-- ── New table: time_slots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    max_capacity INT NOT NULL DEFAULT 1,
    booked_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        service_id,
        slot_date,
        start_time
    )
);

-- ── Time-slot capacity tracking (for existing tables) ───────────────────────────
ALTER TABLE time_slots
ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS booked_count INT NOT NULL DEFAULT 0;

-- Migrate existing booked slots: set booked_count = 1 where is_booked = TRUE
UPDATE time_slots
SET
    booked_count = 1
WHERE
    is_booked = TRUE
    AND booked_count = 0;

-- ── FK: bookings.time_slot_id → time_slots.id ────────────────────────────────
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT fk_booking_time_slot
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_time_slots_service ON time_slots (service_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots (slot_date);

CREATE INDEX IF NOT EXISTS idx_time_slots_booked ON time_slots (is_booked);

CREATE INDEX IF NOT EXISTS idx_users_account_type ON users (account_type);

CREATE INDEX IF NOT EXISTS idx_services_availability ON services (availability_status);

SELECT '✅ Migration 002 completed successfully' AS status;