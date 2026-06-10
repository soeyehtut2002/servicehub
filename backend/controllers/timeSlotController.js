const db = require('../config/db');

// ── @route  POST /api/slots  (provider) ──────────────────────────────────────
// Body: { service_id, slots: [{ slot_date, start_time, end_time? }] }
// If end_time is omitted, it is auto-calculated from service.duration_hours.
const createSlots = async (req, res) => {
  try {
    const { service_id, slots } = req.body;

    if (!service_id || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'service_id and slots array are required' });
    }

    // Verify ownership and fetch service capacity settings
    const svc = await db.query(
      'SELECT id, duration_hours, team_count FROM services WHERE id = $1 AND provider_id = $2',
      [service_id, req.user.id]
    );
    if (svc.rows.length === 0) {
      return res.status(403).json({ error: 'Service not found or not authorized' });
    }

    const { duration_hours, team_count } = svc.rows[0];

    // Insert each slot; skip duplicates (ON CONFLICT DO NOTHING)
    const inserted = [];
    for (const slot of slots) {
      const { slot_date, start_time } = slot;
      if (!slot_date || !start_time) continue;

      // Auto-calculate end_time from start_time + duration_hours if not supplied
      let end_time = slot.end_time;
      if (!end_time) {
        const [h, m] = start_time.split(':').map(Number);
        const endH = h + duration_hours;
        end_time = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      // max_capacity mirrors service team_count (can be overridden per-slot)
      const max_capacity = slot.max_capacity ? parseInt(slot.max_capacity) : team_count;

      const result = await db.query(
        `INSERT INTO time_slots (service_id, slot_date, start_time, end_time, max_capacity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (service_id, slot_date, start_time) DO NOTHING
         RETURNING *`,
        [service_id, slot_date, start_time, end_time, max_capacity]
      );
      if (result.rows[0]) inserted.push(result.rows[0]);
    }

    res.status(201).json({ message: `${inserted.length} slot(s) created`, slots: inserted });
  } catch (error) {
    console.error('createSlots error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  POST /api/slots/bulk-generate  (provider) ────────────────────────
// Body: { service_id, dates: ['YYYY-MM-DD', ...], start_time, interval_minutes? }
// Generates a slot for every date in the list starting at start_time,
// repeated every interval_minutes until end of working day (default until 18:00).
const bulkGenerateSlots = async (req, res) => {
  try {
    const { service_id, dates, start_time, end_of_day = '18:00', interval_minutes } = req.body;

    if (!service_id || !Array.isArray(dates) || !dates.length || !start_time) {
      return res.status(400).json({ error: 'service_id, dates[], and start_time are required' });
    }

    const svc = await db.query(
      'SELECT id, duration_hours, team_count FROM services WHERE id = $1 AND provider_id = $2',
      [service_id, req.user.id]
    );
    if (svc.rows.length === 0) {
      return res.status(403).json({ error: 'Service not found or not authorized' });
    }

    const { duration_hours, team_count } = svc.rows[0];
    // Slot interval: either explicitly provided or defaults to service duration
    const step = interval_minutes ? parseInt(interval_minutes) : duration_hours * 60;

    const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toTime    = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

    const startMins  = toMinutes(start_time);
    const endMins    = toMinutes(end_of_day);
    const durMins    = duration_hours * 60;

    let inserted = 0;
    const preview = [];

    for (const slot_date of dates) {
      let cur = startMins;
      while (cur + durMins <= endMins) {
        const s = toTime(cur);
        const e = toTime(cur + durMins);
        preview.push({ slot_date, start_time: s, end_time: e });
        try {
          const r = await db.query(
            `INSERT INTO time_slots (service_id, slot_date, start_time, end_time, max_capacity)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (service_id, slot_date, start_time) DO NOTHING
             RETURNING id`,
            [service_id, slot_date, s, e, team_count]
          );
          if (r.rows[0]) inserted++;
        } catch { /* skip duplicate */ }
        cur += step;
      }
    }

    res.status(201).json({ message: `${inserted} slot(s) created`, preview });
  } catch (error) {
    console.error('bulkGenerateSlots error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getServiceSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    let query  = `
      SELECT
        id, service_id,
        TO_CHAR(slot_date, 'YYYY-MM-DD')   AS slot_date,
        start_time::text                   AS start_time,
        end_time::text                     AS end_time,
        is_booked,
        max_capacity,
        booked_count,
        created_at,
        (max_capacity - booked_count)              AS available_spots,
        (booked_count >= max_capacity)             AS is_full
      FROM time_slots
      WHERE service_id = $1
    `;
    const vals = [id];
    let idx    = 2;

    if (from) { query += ` AND slot_date >= $${idx++}`; vals.push(from); }
    if (to)   { query += ` AND slot_date <= $${idx++}`; vals.push(to);   }

    query += ' ORDER BY slot_date ASC, start_time ASC';

    const result = await db.query(query, vals);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getServiceSlots error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  DELETE /api/slots/:id  (provider) ────────────────────────────────
const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await db.query(
      `SELECT ts.* FROM time_slots ts
       JOIN services s ON ts.service_id = s.id
       WHERE ts.id = $1 AND s.provider_id = $2`,
      [id, req.user.id]
    );
    if (slot.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found or not authorized' });
    }
    if (slot.rows[0].booked_count > 0) {
      return res.status(400).json({ error: 'Cannot delete a slot that has active bookings' });
    }

    await db.query('DELETE FROM time_slots WHERE id = $1', [id]);
    res.status(200).json({ message: 'Slot deleted' });
  } catch (error) {
    console.error('deleteSlot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createSlots, bulkGenerateSlots, getServiceSlots, deleteSlot };
