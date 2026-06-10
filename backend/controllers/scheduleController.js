/**
 * scheduleController.js
 * Per-service schedule management:
 *   - Weekly working hours (service_schedules)
 *   - Blocked dates (service_blocked_dates)
 *   - Auto-generate time slots from schedule
 */

const db = require('../config/db');

// ── Helper: verify provider owns service ─────────────────────────────────────
async function ownsService(serviceId, providerId) {
  const r = await db.query(
    'SELECT id, duration_hours, team_count FROM services WHERE id = $1 AND provider_id = $2',
    [serviceId, providerId]
  );
  return r.rows[0] || null;
}

// ── GET /api/schedule/:serviceId ──────────────────────────────────────────────
const getSchedule = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const svc = await ownsService(serviceId, req.user.id);
    if (!svc) return res.status(403).json({ error: 'Service not found or not authorized' });

    const result = await db.query(
      `SELECT * FROM service_schedules WHERE service_id = $1 ORDER BY day_of_week ASC`,
      [serviceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getSchedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── PUT /api/schedule/:serviceId ──────────────────────────────────────────────
// Body: { schedule: [{ day_of_week, start_time, end_time, is_active }] }
const saveSchedule = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { schedule }  = req.body;
    const svc = await ownsService(serviceId, req.user.id);
    if (!svc) return res.status(403).json({ error: 'Service not found or not authorized' });
    if (!Array.isArray(schedule)) return res.status(400).json({ error: 'schedule array required' });

    // Upsert each day
    const saved = [];
    for (const day of schedule) {
      const { day_of_week, start_time, end_time, is_active = true } = day;
      if (day_of_week < 0 || day_of_week > 6) continue;
      if (!start_time || !end_time) continue;

      const r = await db.query(
        `INSERT INTO service_schedules (service_id, day_of_week, start_time, end_time, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (service_id, day_of_week)
         DO UPDATE SET start_time = $3, end_time = $4, is_active = $5
         RETURNING *`,
        [serviceId, day_of_week, start_time, end_time, is_active]
      );
      saved.push(r.rows[0]);
    }

    res.json({ message: 'Schedule saved', schedule: saved });
  } catch (err) {
    console.error('saveSchedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/schedule/:serviceId/blocked ─────────────────────────────────────
const getBlockedDates = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const svc = await ownsService(serviceId, req.user.id);
    if (!svc) return res.status(403).json({ error: 'Not authorized' });

    const result = await db.query(
      `SELECT id, TO_CHAR(blocked_date,'YYYY-MM-DD') AS blocked_date, reason, created_at
       FROM service_blocked_dates
       WHERE service_id = $1
       ORDER BY blocked_date ASC`,
      [serviceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getBlockedDates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/schedule/:serviceId/blocked ─────────────────────────────────────
const addBlockedDate = async (req, res) => {
  try {
    const { serviceId }             = req.params;
    const { blocked_date, reason }  = req.body;
    const svc = await ownsService(serviceId, req.user.id);
    if (!svc) return res.status(403).json({ error: 'Not authorized' });
    if (!blocked_date) return res.status(400).json({ error: 'blocked_date required' });

    const result = await db.query(
      `INSERT INTO service_blocked_dates (service_id, blocked_date, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (service_id, blocked_date) DO UPDATE SET reason = $3
       RETURNING id, TO_CHAR(blocked_date,'YYYY-MM-DD') AS blocked_date, reason`,
      [serviceId, blocked_date, reason || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addBlockedDate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── DELETE /api/schedule/:serviceId/blocked/:id ───────────────────────────────
const removeBlockedDate = async (req, res) => {
  try {
    const { serviceId, id } = req.params;
    const svc = await ownsService(serviceId, req.user.id);
    if (!svc) return res.status(403).json({ error: 'Not authorized' });

    await db.query(
      `DELETE FROM service_blocked_dates WHERE id = $1 AND service_id = $2`,
      [id, serviceId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('removeBlockedDate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── POST /api/schedule/:serviceId/generate-slots ──────────────────────────────
// Body: { from_date, to_date }  — generates slots for every scheduled day in range
const generateSlots = async (req, res) => {
  try {
    const { serviceId }       = req.params;
    const { from_date, to_date } = req.body;
    const svc = await ownsService(serviceId, req.user.id);
    if (!svc) return res.status(403).json({ error: 'Not authorized' });
    if (!from_date || !to_date) return res.status(400).json({ error: 'from_date and to_date required' });

    const { duration_hours, team_count } = svc;
    const durMins = duration_hours * 60;

    // Fetch schedule and blocked dates
    const scheduleRows = await db.query(
      `SELECT day_of_week, start_time, end_time FROM service_schedules
       WHERE service_id = $1 AND is_active = TRUE`,
      [serviceId]
    );
    const scheduleMap = {};
    for (const r of scheduleRows.rows) scheduleMap[r.day_of_week] = r;

    const blockedRows = await db.query(
      `SELECT TO_CHAR(blocked_date,'YYYY-MM-DD') AS blocked_date FROM service_blocked_dates WHERE service_id = $1`,
      [serviceId]
    );
    const blockedSet = new Set(blockedRows.rows.map(r => r.blocked_date));

    const toMins = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
    const toTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

    let created = 0, skipped = 0;
    const start = new Date(from_date + 'T00:00:00');
    const end   = new Date(to_date   + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr  = d.toISOString().substring(0, 10);
      const dayOfWk  = d.getDay();         // 0=Sun … 6=Sat
      const daySchedule = scheduleMap[dayOfWk];

      if (!daySchedule) { skipped++; continue; }      // not a working day
      if (blockedSet.has(dateStr)) { skipped++; continue; }  // holiday/leave

      const startMins = toMins(daySchedule.start_time);
      const endMins   = toMins(daySchedule.end_time);

      let cur = startMins;
      while (cur + durMins <= endMins) {
        const slotStart = toTime(cur);
        const slotEnd   = toTime(cur + durMins);
        try {
          const r = await db.query(
            `INSERT INTO time_slots (service_id, slot_date, start_time, end_time, max_capacity)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (service_id, slot_date, start_time) DO NOTHING
             RETURNING id`,
            [serviceId, dateStr, slotStart, slotEnd, team_count]
          );
          if (r.rows[0]) created++;
        } catch { /* skip */ }
        cur += durMins;   // next slot starts right after current ends
      }
    }

    res.json({ message: `Generated ${created} slot(s), skipped ${skipped} day(s)`, created, skipped });
  } catch (err) {
    console.error('generateSlots error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── GET /api/schedule/:serviceId/public ──────────────────────────────────────
// Public endpoint so customers can see provider's working days
const getPublicSchedule = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const result = await db.query(
      `SELECT day_of_week, start_time::text, end_time::text
       FROM service_schedules
       WHERE service_id = $1 AND is_active = TRUE
       ORDER BY day_of_week`,
      [serviceId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getSchedule, saveSchedule,
  getBlockedDates, addBlockedDate, removeBlockedDate,
  generateSlots, getPublicSchedule,
};
