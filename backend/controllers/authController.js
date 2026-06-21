const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../config/db');

// ── Helper ────────────────────────────────────────────────────────────────────
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── @route  POST /api/auth/register ──────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, location, account_type } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt          = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const validRole     = ['customer', 'provider'].includes(role) ? role : 'customer';

    // Validate account_type for providers
    const validAccountTypes = ['freelancer', 'business'];
    let resolvedAccountType = null;
    if (validRole === 'provider') {
      if (!account_type || !validAccountTypes.includes(account_type)) {
        return res.status(400).json({ error: 'Providers must select an account type: freelancer or business' });
      }
      resolvedAccountType = account_type;
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone, location, account_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, phone, location, account_type, created_at`,
      [name, email, password_hash, validRole, phone || null, location || null, resolvedAccountType]
    );

    const user  = result.rows[0];
    const token = generateToken(user.id, user.role);

    res.status(201).json({ message: 'Registration successful', user, token });
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  POST /api/auth/login ──────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        account_type: user.account_type,
        phone:        user.phone,
        location:     user.location,
        avatar_url:   user.avatar_url,
        bio:          user.bio,
        gallery_urls: user.gallery_urls || [],
        is_verified:  user.is_verified,
      },
      token,
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  GET /api/auth/me ──────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, account_type, phone, location,
              avatar_url, bio, gallery_urls, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  PUT /api/auth/profile ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, bio } = req.body;

    const result = await db.query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           phone      = COALESCE($2, phone),
           location   = COALESCE($3, location),
           bio        = COALESCE($4, bio),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, role, account_type, phone, location,
                 avatar_url, bio, gallery_urls, is_verified`,
      [name, phone, location, bio, req.user.id]
    );

    res.status(200).json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  POST /api/auth/forgot-password ────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await db.query('SELECT id, name FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    // Always respond success (don't reveal if email exists)
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'If that email exists, an OTP code has been generated.' });
    }

    const user    = result.rows[0];
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [otp, expires, user.id]
    );

    // Send the email using the email service
    const emailService = require('../services/emailService');
    await emailService.sendPasswordResetOtp({
      to: email.trim().toLowerCase(),
      userName: user.name,
      otp
    });

    // Also keep the backend console logging for verification & development ease
    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│  🔑 PASSWORD RESET OTP (logged for verification):     │');
    console.log(`│  User: ${user.name.padEnd(46)} │`);
    console.log(`│  Email: ${email.trim().toLowerCase().padEnd(45)} │`);
    console.log(`│  OTP Code: ${otp.padEnd(43)} │`);
    console.log('│  Expires in 15 minutes                                 │');
    console.log('└────────────────────────────────────────────────────────┘\n');

    res.status(200).json({ message: 'If that email exists, an OTP code has been generated.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── @route  POST /api/auth/reset-password ────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await db.query(
      `SELECT id FROM users
       WHERE LOWER(email) = LOWER($1)
         AND password_reset_token = $2
         AND password_reset_expires > CURRENT_TIMESTAMP`,
      [email.trim(), otp.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    const salt          = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db.query(
      `UPDATE users
       SET password_hash = $1, password_reset_token = NULL,
           password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [password_hash, result.rows[0].id]
    );

    res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile, forgotPassword, resetPassword };
