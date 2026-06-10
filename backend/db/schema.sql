-- ============================================================
-- ServiceHub Database Schema
-- ============================================================

-- Drop tables in reverse dependency order (for clean re-runs)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(50)   DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin')),
  phone         VARCHAR(50),
  location      VARCHAR(255),
  avatar_url    VARCHAR(500),
  bio           TEXT,
  is_verified   BOOLEAN       DEFAULT FALSE,
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SERVICES TABLE
-- ============================================================
CREATE TABLE services (
  id          SERIAL PRIMARY KEY,
  provider_id INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  category    VARCHAR(100)  NOT NULL,
  location    VARCHAR(255)  NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  image_url   VARCHAR(500),
  is_active   BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE bookings (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id   INTEGER   NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_date TIMESTAMP NOT NULL,
  notes        TEXT,
  status       VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id  INTEGER   NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_id  INTEGER   REFERENCES bookings(id) ON DELETE SET NULL,
  rating      INTEGER   NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, service_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_services_category   ON services(category);
CREATE INDEX idx_services_provider   ON services(provider_id);
CREATE INDEX idx_services_location   ON services(location);
CREATE INDEX idx_bookings_customer   ON bookings(customer_id);
CREATE INDEX idx_bookings_service    ON bookings(service_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_reviews_service     ON reviews(service_id);
CREATE INDEX idx_reviews_customer    ON reviews(customer_id);

-- ============================================================
-- SEED: Default Admin Account
-- password: admin123 (bcrypt hash)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, is_verified)
VALUES (
  'Admin',
  'admin@servicehub.com',
  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmKMKvmDcIU8EY6dATuHl5OxilQoGy',
  'admin',
  TRUE
);
