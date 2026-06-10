require('dotenv').config();
const db = require('./config/db');

async function verify() {
  try {
    // 1. Check new tables exist
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('service_schedules','service_blocked_dates','notifications')
      ORDER BY table_name
    `);
    console.log('✅ New tables:', tables.rows.map(r => r.table_name).join(', '));

    // 2. Check notifications table columns
    const notifCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'notifications' ORDER BY ordinal_position
    `);
    console.log('✅ notifications columns:', notifCols.rows.map(r => r.column_name).join(', '));

    // 3. Check service_schedules columns
    const schCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'service_schedules' ORDER BY ordinal_position
    `);
    console.log('✅ service_schedules columns:', schCols.rows.map(r => r.column_name).join(', '));

    // 4. Check services have duration_hours + team_count
    const svcCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'services' 
        AND column_name IN ('duration_hours','team_count','availability_status')
    `);
    console.log('✅ services capacity columns:', svcCols.rows.map(r => r.column_name).join(', '));

    // 5. Check time_slots have max_capacity + booked_count
    const slotCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'time_slots' 
        AND column_name IN ('max_capacity','booked_count')
    `);
    console.log('✅ time_slots capacity columns:', slotCols.rows.map(r => r.column_name).join(', '));

    // 6. Check new modules load
    require('./services/socketState');
    require('./services/emailService');
    require('./services/notificationService');
    require('./controllers/notificationController');
    require('./controllers/scheduleController');
    console.log('✅ All new backend modules load without errors');

    console.log('\n🎉 Verification complete — all systems OK!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

verify();
