/**
 * Reset or create the admin account with a freshly hashed password.
 * Run: node reset-admin.js
 */

require('dotenv').config({ path: './backend/.env' });
const { Client } = require('pg');
const bcrypt = require('./backend/node_modules/bcrypt');

const ADMIN_EMAIL    = 'admin@servicehub.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME     = 'Admin';

async function resetAdmin() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Upsert: update if exists, insert if not
    const res = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_verified, is_active)
       VALUES ($1, $2, $3, 'admin', TRUE, TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = $3,
             role          = 'admin',
             is_active     = TRUE,
             is_verified   = TRUE,
             updated_at    = CURRENT_TIMESTAMP
       RETURNING id, name, email, role`,
      [ADMIN_NAME, ADMIN_EMAIL, hash]
    );

    console.log('\n🎉 Admin account ready!');
    console.log('   Email:    ', ADMIN_EMAIL);
    console.log('   Password: ', ADMIN_PASSWORD);
    console.log('   Role:     ', res.rows[0].role);
    console.log('\nGo to: http://localhost:5173/login\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\n💡 Make sure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. backend/.env has the correct DATABASE_URL');
    console.error('   3. You have run setup-db.js first (to create tables)');
  } finally {
    await client.end();
  }
}

resetAdmin();
