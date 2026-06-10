/**
 * ServiceHub Database Setup Script
 * Run with: node setup-db.js
 * 
 * This script will:
 *  1. Create the 'servicehub' database (if it doesn't exist)
 *  2. Run the full schema (tables + indexes + admin seed)
 * 
 * USAGE: Set your PG password in the environment or edit below.
 */

require('dotenv').config({ path: './backend/.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Parse connection string ───────────────────────────────────────────────────
const url = new URL(process.env.DATABASE_URL);
const DB_USER     = url.username;
const DB_PASSWORD = url.password;
const DB_HOST     = url.hostname;
const DB_PORT     = parseInt(url.port) || 5432;
const DB_NAME     = url.pathname.replace('/', '');

async function setup() {
  console.log('\n🚀 ServiceHub Database Setup\n');
  console.log(`   Host:     ${DB_HOST}:${DB_PORT}`);
  console.log(`   User:     ${DB_USER}`);
  console.log(`   Database: ${DB_NAME}\n`);

  // Step 1: Connect to postgres (default DB) to create servicehub DB
  const rootClient = new Client({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: 'postgres',
  });

  try {
    await rootClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if DB exists
    const exists = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
    if (exists.rows.length === 0) {
      await rootClient.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database '${DB_NAME}' created`);
    } else {
      console.log(`ℹ️  Database '${DB_NAME}' already exists`);
    }
    await rootClient.end();
  } catch (err) {
    console.error('\n❌ Failed to connect to PostgreSQL:');
    console.error(`   ${err.message}`);
    console.error('\n💡 Tips:');
    console.error('   • Make sure PostgreSQL service is running');
    console.error('   • Check that password in backend/.env is correct');
    console.error(`   • Current DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:.*@/, ':****@')}`);
    process.exit(1);
  }

  // Step 2: Run schema on the target DB
  const appClient = new Client({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
  });

  try {
    await appClient.connect();
    const schema = fs.readFileSync(path.join(__dirname, 'backend', 'db', 'schema.sql'), 'utf8');
    await appClient.query(schema);
    console.log('✅ Schema applied (tables, indexes, admin seed)');
    await appClient.end();
  } catch (err) {
    console.error('\n❌ Failed to apply schema:', err.message);
    await appClient.end();
    process.exit(1);
  }

  console.log('\n🎉 Database setup complete!\n');
  console.log('   👑 Admin login:');
  console.log('      Email:    admin@servicehub.com');
  console.log('      Password: admin123\n');
  console.log('Next steps:');
  console.log('  1. cd backend && npm run dev');
  console.log('  2. cd frontend && npm run dev\n');
}

setup();
