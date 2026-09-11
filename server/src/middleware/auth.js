const jwt = require('jsonwebtoken');

/**
 * Verifies the staff JWT and attaches the authenticated staff caller and its
 * login-session identifier. The session ID is deliberately token-scoped.
 * This is the ONLY place a staff CallerContext gets constructed for HTTP requests —
 * every downstream agent tool call trusts req.caller as already-authenticated.
 */
function requireStaffAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.caller = { type: 'staff', staffId: decoded.staffId, role: decoded.role, sessionId: decoded.sessionId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Chain after requireStaffAuth. Restricts a route to specific roles —
 * e.g. only 'admin' can create new staff accounts.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.caller || !allowedRoles.includes(req.caller.role)) {
      return res.status(403).json({ error: `Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireStaffAuth, requireRole };
