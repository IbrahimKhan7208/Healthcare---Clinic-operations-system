const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { StaffUser } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password.js');

const TOKEN_TTL = '12h'; // roughly a clinic shift

function issueToken(staffUser) {
  return jwt.sign({ staffId: staffUser._id.toString(), role: staffUser.role, sessionId: crypto.randomUUID() }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function validateNewStaffInput({ name, email, password, role }) {
  if (!name || !email || !password || !role) {
    return 'name, email, password, and role are all required.';
  }
  if (password.length < 10) {
    return 'password must be at least 10 characters.';
  }
  const validRoles = ['admin', 'front_desk', 'clinician_support', 'billing'];
  if (!validRoles.includes(role)) {
    return `role must be one of: ${validRoles.join(', ')}`;
  }
  return null;
}

/**
 * POST /api/staff/auth/bootstrap-admin
 * Unauthenticated — but only works ONCE, when zero staff accounts exist.
 * This is how the very first admin account gets created on a fresh deployment.
 * Every subsequent staff account must go through /register (admin-gated).
 */
async function bootstrapAdmin(req, res) {
  try {
    const existingCount = await StaffUser.countDocuments();
    if (existingCount > 0) {
      return res.status(403).json({ error: 'Bootstrap already used — staff accounts already exist. Use /register (admin-only) instead.' });
    }

    const { name, email, password, department } = req.body;
    const validationError = validateNewStaffInput({ name, email, password, role: 'admin' });
    if (validationError) return res.status(400).json({ error: validationError });

    const passwordHash = await hashPassword(password);
    const admin = await StaffUser.create({ name, email, passwordHash, role: 'admin', department: department || null });

    const token = issueToken(admin);
    res.status(201).json({ token, staff: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in use.' });
    console.error('bootstrapAdmin error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/staff/auth/register
 * Requires requireStaffAuth + requireRole('admin') upstream — only an existing
 * admin can create new staff accounts. No self-service signup, ever.
 */
async function register(req, res) {
  try {
    const { name, email, password, role, department } = req.body;
    const validationError = validateNewStaffInput({ name, email, password, role });
    if (validationError) return res.status(400).json({ error: validationError });

    const passwordHash = await hashPassword(password);
    const staff = await StaffUser.create({ name, email, passwordHash, role, department: department || null });

    res.status(201).json({ staff: { id: staff._id, name: staff.name, email: staff.email, role: staff.role } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in use.' });
    console.error('register error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/staff/auth/login
 * Public. Deliberately generic error message on failure — doesn't reveal
 * whether the email exists, to avoid account enumeration.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const staff = await StaffUser.findOne({ email: email.toLowerCase().trim() });
    if (!staff) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await comparePassword(password, staff.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = issueToken(staff);
    res.json({ token, staff: { id: staff._id, name: staff.name, email: staff.email, role: staff.role } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { bootstrapAdmin, register, login };
