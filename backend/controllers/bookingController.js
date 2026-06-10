const db                = require('../config/db');
const { notify }        = require('../services/notificationService');
const email             = require('../services/emailService');
const { getRates, convert, getRate } = require('../services/currencyService');

// ── Helper: format booking date ───────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return 'TBD';
  try { return new Date(d).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' }); } catch { return String(d); }
}

// ── @route  POST /api/bookings ────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const { service_id, booking_date, notes, location, time_slot_id, payment_currency } = req.body;

    if (!service_id || !booking_date) {
      return res.status(400).json({ error: 'service_id and booking_date are required' });
    }

    // Verify service exists and is active
    const service = await db.query(
      `SELECT s.*, u.account_type AS provider_account_type
       FROM services s JOIN users u ON s.provider_id = u.id
       WHERE s.id = $1 AND s.is_active = TRUE`,
      [service_id]
    );
    if (service.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const svc = service.rows[0];

    if (svc.availability_status === 'fully_booked') {
      return res.status(400).json({ error: 'This service is currently fully booked' });
    }
    if (svc.availability_status === 'paused') {
      return res.status(400).json({ error: 'This service is temporarily unavailable' });
    }

    // Prevent provider from booking their own service
    if (svc.provider_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot book your own service' });
    }

    // ── Time slot validation ──────────────────────────────────────────────────
    if (time_slot_id) {
      const slot = await db.query(
        `SELECT *, (max_capacity - booked_count) AS available_spots
         FROM time_slots WHERE id = $1 AND service_id = $2`,
        [time_slot_id, service_id]
      );
      if (slot.rows.length === 0) {
        return res.status(404).json({ error: 'Time slot not found for this service' });
      }
      const s = slot.rows[0];

      if (s.booked_count >= s.max_capacity) {
        if (s.max_capacity === 1) {
          return res.status(400).json({ error: 'This time slot is already fully booked. Please choose a different slot.' });
        }
        return res.status(400).json({
          error: `All ${s.max_capacity} team(s) are already booked for this slot. Please choose a different time.`,
        });
      }

      const duplicate = await db.query(
        `SELECT id FROM bookings
         WHERE customer_id = $1
           AND time_slot_id = $2
           AND status NOT IN ('cancelled')`,
        [req.user.id, time_slot_id]
      );
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ error: 'You already have a booking for this time slot.' });
      }
    }

    // ── Currency Conversion ──────────────────────────────────────────────────
    const SUPPORTED = ['USD', 'THB', 'MMK', 'CNY'];
    const originalCurrency = (svc.currency && SUPPORTED.includes(svc.currency)) ? svc.currency : 'USD';
    const payCurrency      = (payment_currency && SUPPORTED.includes(payment_currency.toUpperCase()))
      ? payment_currency.toUpperCase()
      : originalCurrency;

    const rates         = await getRates();
    const exchangeRate  = getRate(originalCurrency, payCurrency, rates);
    const convertedAmt  = convert(parseFloat(svc.price), originalCurrency, payCurrency, rates);

    // Create booking
    const result = await db.query(
      `INSERT INTO bookings
         (customer_id, service_id, booking_date, notes, location, time_slot_id,
          payment_currency, converted_price, exchange_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, service_id, booking_date, notes || null, location || null,
       time_slot_id || null, payCurrency,
       parseFloat(convertedAmt.toFixed(2)),
       parseFloat(exchangeRate.toFixed(8))]
    );

    // Increment booked_count; recalculate is_booked (full when booked_count reaches max_capacity)
    if (time_slot_id) {
      await db.query(
        `UPDATE time_slots
         SET booked_count = booked_count + 1,
             is_booked    = ((booked_count + 1) >= max_capacity)
         WHERE id = $1`,
        [time_slot_id]
      );
    }

    const booking = result.rows[0];

    // ── Insert payments audit record ─────────────────────────────────────────
    await db.query(
      `INSERT INTO payments
         (booking_id, original_price, original_currency, converted_price, payment_currency, exchange_rate)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [booking.id, parseFloat(svc.price), originalCurrency,
       parseFloat(convertedAmt.toFixed(2)), payCurrency,
       parseFloat(exchangeRate.toFixed(8))]
    );

    // ── Fetch customer + provider details for notifications ───────────────────
    const peopleRows = await db.query(
      `SELECT u.id, u.name, u.email, u.role FROM users u
       WHERE u.id = ANY($1::int[])`,
      [[req.user.id, svc.provider_id]]
    );
    const people      = Object.fromEntries(peopleRows.rows.map(u => [u.id, u]));
    const customer    = people[req.user.id];
    const provider    = people[svc.provider_id];
    const dateLabel   = fmtDate(booking_date);

    // Notify provider
    notify({
      userId:  svc.provider_id,
      type:    'booking_new',
      title:   '📅 New Booking Request',
      message: `${customer?.name || 'A customer'} booked "${svc.title}" for ${dateLabel}`,
      data:    { booking_id: booking.id, service_id, service_title: svc.title },
      emailFn: provider ? () => email.newBookingReceived({
        to: provider.email, providerName: provider.name,
        customerName: customer?.name || 'A customer',
        serviceTitle: svc.title, bookingDate: dateLabel, bookingId: booking.id,
      }) : null,
    });

    // Notify customer
    notify({
      userId:  req.user.id,
      type:    'booking_confirmed',
      title:   '✅ Booking Submitted',
      message: `Your booking for "${svc.title}" on ${dateLabel} has been received.`,
      data:    { booking_id: booking.id, service_id, service_title: svc.title },
      emailFn: customer ? () => email.bookingConfirmed({
        to: customer.email, customerName: customer.name,
        serviceTitle: svc.title, bookingDate: dateLabel,
        providerName: provider?.name || 'Provider', bookingId: booking.id,
      }) : null,
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('createBooking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  GET /api/bookings/my ──────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         b.*,
         s.title       AS service_title,
         s.image_url,
         s.price,
         s.category,
         s.duration_hours,
         s.team_count,
         s.provider_id,
         u.name        AS provider_name,
         u.phone       AS provider_phone,
         ts.slot_date, ts.start_time, ts.end_time,
         ts.max_capacity, ts.booked_count
       FROM bookings b
       JOIN services   s  ON b.service_id  = s.id
       JOIN users      u  ON s.provider_id = u.id
       LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
       WHERE b.customer_id = $1
       ORDER BY b.booking_date DESC`,
      [req.user.id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getMyBookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  GET /api/bookings/provider ───────────────────────────────────────
const getProviderBookings = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         b.*,
         s.title    AS service_title,
         s.price,
         s.category,
         s.duration_hours,
         s.team_count,
         u.name     AS customer_name,
         u.email    AS customer_email,
         u.phone    AS customer_phone,
         ts.slot_date, ts.start_time, ts.end_time,
         ts.max_capacity, ts.booked_count
       FROM bookings b
       JOIN services   s  ON b.service_id  = s.id
       JOIN users      u  ON b.customer_id = u.id
       LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
       WHERE s.provider_id = $1
       ORDER BY b.booking_date ASC`,
      [req.user.id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getProviderBookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  PATCH /api/bookings/:id/status (provider) ───────────────────────
const updateBookingStatus = async (req, res) => {
  try {
    const { id }   = req.params;
    const { status, cancellation_reason } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'paused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const check = await db.query(
      `SELECT b.* FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1 AND s.provider_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }

    let result;
    if (status === 'cancelled') {
      result = await db.query(
        `UPDATE bookings
         SET status = 'cancelled', cancelled_by = 'provider',
             cancellation_reason = $1, cancelled_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [cancellation_reason || null, id]
      );
      // Decrement booked_count and recalculate is_booked
      if (check.rows[0].time_slot_id) {
        await db.query(
          `UPDATE time_slots
           SET booked_count = GREATEST(0, booked_count - 1),
               is_booked    = ((GREATEST(0, booked_count - 1)) >= max_capacity)
           WHERE id = $1`,
          [check.rows[0].time_slot_id]
        );
      }
    } else {
      result = await db.query(
        `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [status, id]
      );
    }

    res.status(200).json(result.rows[0]);

    // ── Notify customer of status change ─────────────────────────────────
    const bk = result.rows[0];
    const info = await db.query(
      `SELECT s.title AS service_title, s.provider_id,
              cu.name AS customer_name, cu.email AS customer_email,
              pu.name AS provider_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cu   ON b.customer_id = cu.id
       JOIN users pu   ON s.provider_id = pu.id
       WHERE b.id = $1`, [bk.id]
    );
    if (info.rows[0]) {
      const { service_title, customer_name, customer_email, provider_name } = info.rows[0];
      const dateLabel = fmtDate(bk.booking_date);
      const statusLabel = { confirmed:'Confirmed ✅', cancelled:'Cancelled ❌', completed:'Completed 🏁', paused:'Paused ⏸️' }[status] || status;
      notify({
        userId: bk.customer_id,
        type: 'booking_status',
        title: `Booking ${statusLabel}`,
        message: `Your booking for "${service_title}" on ${dateLabel} is now ${status}.`,
        data: { booking_id: bk.id, service_title },
        emailFn: () => email.bookingStatusUpdated({
          to: customer_email, customerName: customer_name,
          serviceTitle: service_title, status, bookingDate: dateLabel,
          bookingId: bk.id, reason: status === 'cancelled' ? cancellation_reason : null,
        }),
      });
    }
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  PATCH /api/bookings/:id/cancel (customer) ────────────────────────
const cancelBooking = async (req, res) => {
  try {
    const { id }    = req.params;
    const { reason } = req.body;

    const check = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (check.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed booking' });
    }
    if (check.rows[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const result = await db.query(
      `UPDATE bookings
       SET status              = 'cancelled',
           cancelled_by        = 'customer',
           cancellation_reason = $1,
           cancelled_at        = CURRENT_TIMESTAMP,
           updated_at          = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [reason || null, id]
    );

    // Free the time slot capacity and recalculate is_booked
    if (check.rows[0].time_slot_id) {
      await db.query(
        `UPDATE time_slots
         SET booked_count = GREATEST(0, booked_count - 1),
             is_booked    = ((GREATEST(0, booked_count - 1)) >= max_capacity)
         WHERE id = $1`,
        [check.rows[0].time_slot_id]
      );
    }

    res.status(200).json(result.rows[0]);

    // ── Notify provider of customer cancellation ──────────────────────────
    const bk2 = result.rows[0];
    const info2 = await db.query(
      `SELECT s.title AS service_title, s.provider_id,
              cu.name AS customer_name,
              pu.name AS provider_name, pu.email AS provider_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cu   ON b.customer_id = cu.id
       JOIN users pu   ON s.provider_id = pu.id
       WHERE b.id = $1`, [bk2.id]
    );
    if (info2.rows[0]) {
      const { service_title, provider_id, customer_name, provider_name, provider_email } = info2.rows[0];
      const dateLabel = fmtDate(bk2.booking_date);
      notify({
        userId: provider_id,
        type: 'booking_cancelled',
        title: '❌ Booking Cancelled',
        message: `${customer_name} cancelled their booking for "${service_title}" on ${dateLabel}.`,
        data: { booking_id: bk2.id, service_title },
        emailFn: () => email.bookingCancelledByCustomer({
          to: provider_email, providerName: provider_name,
          customerName: customer_name, serviceTitle: service_title,
          bookingDate: dateLabel, bookingId: bk2.id, reason: reason || null,
        }),
      });
    }
  } catch (error) {
    console.error('cancelBooking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  PATCH /api/bookings/:id/pause (provider) ─────────────────────────
const pauseBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await db.query(
      `SELECT b.* FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1 AND s.provider_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }
    if (['completed', 'cancelled'].includes(check.rows[0].status)) {
      return res.status(400).json({ error: `Cannot pause a ${check.rows[0].status} booking` });
    }

    const result = await db.query(
      `UPDATE bookings SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('pauseBooking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  PATCH /api/bookings/:id/admin-cancel (admin) ─────────────────────
const adminCancelBooking = async (req, res) => {
  try {
    const { id }    = req.params;
    const { reason } = req.body;

    const check = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (check.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed booking' });
    }

    const result = await db.query(
      `UPDATE bookings
       SET status              = 'cancelled',
           cancelled_by        = 'admin',
           cancellation_reason = $1,
           cancelled_at        = CURRENT_TIMESTAMP,
           updated_at          = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [reason || 'Cancelled by administrator', id]
    );

    // Free the time slot capacity and recalculate is_booked
    if (check.rows[0].time_slot_id) {
      await db.query(
        `UPDATE time_slots
         SET booked_count = GREATEST(0, booked_count - 1),
             is_booked    = ((GREATEST(0, booked_count - 1)) >= max_capacity)
         WHERE id = $1`,
        [check.rows[0].time_slot_id]
      );
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('adminCancelBooking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
  pauseBooking,
  adminCancelBooking,
};
