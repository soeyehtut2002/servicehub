require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const SQL_MIGRATIONS = `
-- Add is_flagged + flag_reason + image_urls + updated_at to reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_flagged  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT,
  ADD COLUMN IF NOT EXISTS image_urls  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'freelancer',
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

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

-- Advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  image_url    TEXT NOT NULL,
  logo_url     TEXT,
  cta_text     VARCHAR(50) DEFAULT 'Learn More',
  cta_url      TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  start_date   TIMESTAMP,
  end_date     TIMESTAMP,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ads_active ON advertisements(is_active, start_date, end_date);
`;

const providers = [
  { name: 'Alex Johnson', email: 'alex.provider@example.com', phone: '+1-555-0101', location: 'New York, NY', bio: 'Professional handyman with 10 years of experience in home repairs and renovations.', account_type: 'freelancer' },
  { name: 'Maria Garcia', email: 'maria.provider@example.com', phone: '+1-555-0102', location: 'Los Angeles, CA', bio: 'Expert cleaning specialist and home organizer. Passionate about creating spotless spaces.', account_type: 'business' },
  { name: 'David Chen', email: 'david.provider@example.com', phone: '+1-555-0103', location: 'Chicago, IL', bio: 'Licensed electrician and plumber. Certified for all residential and commercial work.', account_type: 'freelancer' },
  { name: 'Sarah Williams', email: 'sarah.provider@example.com', phone: '+1-555-0104', location: 'Houston, TX', bio: 'Professional gardener and landscaper. Creating beautiful outdoor spaces since 2010.', account_type: 'business' },
];

const customers = [
  { name: 'John Smith', email: 'john.smith@example.com', phone: '+1-555-0201', location: 'Brooklyn, NY' },
  { name: 'Emily Davis', email: 'emily.davis@example.com', phone: '+1-555-0202', location: 'Santa Monica, CA' },
  { name: 'Michael Brown', email: 'michael.brown@example.com', phone: '+1-555-0203', location: 'Naperville, IL' },
  { name: 'Jessica Wilson', email: 'jessica.wilson@example.com', phone: '+1-555-0204', location: 'Sugar Land, TX' },
  { name: 'Chris Martinez', email: 'chris.martinez@example.com', phone: '+1-555-0205', location: 'Queens, NY' },
  { name: 'Ashley Taylor', email: 'ashley.taylor@example.com', phone: '+1-555-0206', location: 'Pasadena, CA' },
  { name: 'Ryan Anderson', email: 'ryan.anderson@example.com', phone: '+1-555-0207', location: 'Evanston, IL' },
  { name: 'Amanda Thomas', email: 'amanda.thomas@example.com', phone: '+1-555-0208', location: 'Austin, TX' },
  { name: 'Kevin Jackson', email: 'kevin.jackson@example.com', phone: '+1-555-0209', location: 'Manhattan, NY' },
  { name: 'Lauren White', email: 'lauren.white@example.com', phone: '+1-555-0210', location: 'San Diego, CA' },
];

// 20 services spread across 4 providers (5 each)
const serviceTemplates = [
  // Alex Johnson - Handyman (provider index 0)
  { title: 'General Home Repair', description: 'Fix anything in your home — leaky faucets, broken doors, drywall patching, furniture assembly and more. Fast, reliable, and affordable.', category: 'Handyman', location: 'New York, NY', price: 75, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Furniture Assembly', description: 'Expert assembly of all flat-pack furniture including IKEA, Wayfair, Amazon. All tools provided. Quick and clean service.', category: 'Handyman', location: 'New York, NY', price: 60, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Painting & Touch-ups', description: 'Interior wall painting, touch-ups, and small paint jobs. Quality materials, clean finish, and no mess left behind.', category: 'Painting', location: 'New York, NY', price: 120, duration_hours: 4, team_count: 1, currency: 'USD' },
  { title: 'TV Mounting Service', description: 'Professional TV wall mounting for all screen sizes. Includes cable management and wall repair if needed.', category: 'Handyman', location: 'New York, NY', price: 90, duration_hours: 1, team_count: 1, currency: 'USD' },
  { title: 'Smart Home Installation', description: 'Setup and install smart home devices — thermostats, doorbells, locks, cameras, and speakers. Full configuration included.', category: 'Tech', location: 'New York, NY', price: 150, duration_hours: 3, team_count: 1, currency: 'USD' },

  // Maria Garcia - Cleaning (provider index 1)
  { title: 'Standard Home Cleaning', description: 'Thorough cleaning of your home including kitchen, bathrooms, bedrooms and living areas. Eco-friendly products used.', category: 'Cleaning', location: 'Los Angeles, CA', price: 120, duration_hours: 3, team_count: 2, currency: 'USD' },
  { title: 'Deep Cleaning Service', description: 'Comprehensive deep clean including appliances, baseboards, window sills, and hard-to-reach areas. Perfect for move-in/out.', category: 'Cleaning', location: 'Los Angeles, CA', price: 220, duration_hours: 6, team_count: 2, currency: 'USD' },
  { title: 'Office Cleaning', description: 'Professional office cleaning service for small to medium businesses. Flexible scheduling including evenings and weekends.', category: 'Cleaning', location: 'Los Angeles, CA', price: 180, duration_hours: 4, team_count: 3, currency: 'USD' },
  { title: 'Post-Party Cleanup', description: 'Quick and efficient post-event cleanup. We handle trash removal, surface cleaning, and restoring your space to its original state.', category: 'Cleaning', location: 'Los Angeles, CA', price: 160, duration_hours: 3, team_count: 2, currency: 'USD' },
  { title: 'Home Organization', description: 'Professional decluttering and organization for closets, kitchens, garages, and any room. Includes labeling and storage solutions.', category: 'Organization', location: 'Los Angeles, CA', price: 95, duration_hours: 3, team_count: 1, currency: 'USD' },

  // David Chen - Electrical & Plumbing (provider index 2)
  { title: 'Electrical Repairs', description: 'Licensed electrician for outlet installation, circuit breaker issues, lighting fixtures, and all electrical troubleshooting.', category: 'Electrical', location: 'Chicago, IL', price: 100, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Plumbing Services', description: 'Fix leaks, unclog drains, replace faucets, install toilets and showers. All plumbing work guaranteed for 90 days.', category: 'Plumbing', location: 'Chicago, IL', price: 110, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Water Heater Installation', description: 'Professional installation and replacement of water heaters — tank and tankless. Includes disposal of old unit.', category: 'Plumbing', location: 'Chicago, IL', price: 350, duration_hours: 4, team_count: 2, currency: 'USD' },
  { title: 'Ceiling Fan Installation', description: 'Install or replace ceiling fans with or without existing wiring. Safety-certified and fully insured.', category: 'Electrical', location: 'Chicago, IL', price: 85, duration_hours: 1, team_count: 1, currency: 'USD' },
  { title: 'Home Inspection', description: 'Comprehensive home inspection covering electrical, plumbing, HVAC basics, and structural concerns. Detailed report provided.', category: 'Inspection', location: 'Chicago, IL', price: 250, duration_hours: 3, team_count: 1, currency: 'USD' },

  // Sarah Williams - Gardening & Landscaping (provider index 3)
  { title: 'Lawn Mowing & Edging', description: 'Professional lawn mowing, edging, and trimming. Leaves your yard looking neat and well-maintained every time.', category: 'Gardening', location: 'Houston, TX', price: 65, duration_hours: 2, team_count: 1, currency: 'USD' },
  { title: 'Garden Design & Planting', description: 'Custom garden design and planting service. We source plants suited to your climate and aesthetic preferences.', category: 'Gardening', location: 'Houston, TX', price: 200, duration_hours: 5, team_count: 2, currency: 'USD' },
  { title: 'Tree Trimming & Pruning', description: 'Safe and professional tree trimming, branch removal, and hedge pruning. Debris hauled away at no extra cost.', category: 'Landscaping', location: 'Houston, TX', price: 175, duration_hours: 4, team_count: 2, currency: 'USD' },
  { title: 'Irrigation System Setup', description: 'Design and install drip or sprinkler irrigation systems for lawns and gardens. Includes controller programming.', category: 'Landscaping', location: 'Houston, TX', price: 300, duration_hours: 6, team_count: 2, currency: 'USD' },
  { title: 'Seasonal Garden Cleanup', description: 'Spring or fall garden cleanup — clearing leaves, cutting back perennials, mulching beds, and prepping for the next season.', category: 'Gardening', location: 'Houston, TX', price: 130, duration_hours: 3, team_count: 2, currency: 'USD' },
];

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables!");
  }

  console.log(`[DB-INIT] Connecting to database...`);
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // 1. Check if base tables exist
    const resCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'users'
      );
    `);
    
    const usersExist = resCheck.rows[0].exists;

    if (!usersExist) {
      console.log('[DB-INIT] Base tables do not exist. Executing schema.sql...');
      const schemaPath = path.join(__dirname, 'db', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('[DB-INIT] Base tables and admin account created successfully!');
    } else {
      console.log('[DB-INIT] Base tables already exist.');
    }

    // 2. Run migrations
    console.log('[DB-INIT] Running migrations...');
    await client.query(SQL_MIGRATIONS);
    console.log('[DB-INIT] Migrations applied successfully!');

    // 3. Seed data if services table is empty
    const resCount = await client.query('SELECT COUNT(*) FROM services');
    const serviceCount = parseInt(resCount.rows[0].count, 10);

    if (serviceCount === 0) {
      console.log('[DB-INIT] Seeding database with default providers and services...');
      const password = 'password123';
      const hash = await bcrypt.hash(password, 10);

      // Insert providers
      const providerIds = [];
      for (const p of providers) {
        const res = await client.query(
          `INSERT INTO users (name, email, password_hash, role, phone, location, bio, account_type, is_verified)
           VALUES ($1, $2, $3, 'provider', $4, $5, $6, $7, true)
           ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
          [p.name, p.email, hash, p.phone, p.location, p.bio, p.account_type]
        );
        providerIds.push(res.rows[0].id);
        console.log(`  ✅ Provider: ${p.name} (${p.email})`);
      }

      // Insert customers
      for (const c of customers) {
        await client.query(
          `INSERT INTO users (name, email, password_hash, role, phone, location, is_verified)
           VALUES ($1, $2, $3, 'customer', $4, $5, true)
           ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name`,
          [c.name, c.email, hash, c.phone, c.location]
        );
        console.log(`  ✅ Customer: ${c.name} (${c.email})`);
      }

      // Insert services
      for (let i = 0; i < serviceTemplates.length; i++) {
        const s = serviceTemplates[i];
        const providerIdx = Math.floor(i / 5);
        const providerId = providerIds[providerIdx];
        await client.query(
          `INSERT INTO services (provider_id, title, description, category, location, price, duration_hours, team_count, currency, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
          [providerId, s.title, s.description, s.category, s.location, s.price, s.duration_hours, s.team_count, s.currency]
        );
        console.log(`  ✅ Service: ${s.title}`);
      }
      console.log('[DB-INIT] Seeding complete!');
    } else {
      console.log('[DB-INIT] Database already seeded.');
    }

    console.log('[DB-INIT] Database initialization finished successfully!\n');
  } catch (error) {
    console.error('[DB-INIT] Database initialization failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  initDb()
    .then(() => {
      console.log('✅ Standalone database initialization successful.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Standalone database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = { initDb };
