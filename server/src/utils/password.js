const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // higher than the bcrypt default (10) — PII-adjacent system

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, comparePassword };