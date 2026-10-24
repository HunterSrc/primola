const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseFormat');

/**
 * Normalizza l'array di ruoli/gruppi dell'utente autenticato
 * Supporta sia il formato moderno `groups: [...]` che il legacy `role: 'ADMIN'`
 */
const getUserGroups = (user) => {
  if (!user) return [];
  if (Array.isArray(user.groups) && user.groups.length > 0) {
    return user.groups.map(g => (g || '').toUpperCase());
  }
  if (user.role) {
    const roleUpper = user.role.toUpperCase();
    return [roleUpper === 'STAFF' ? 'TEACHER' : roleUpper];
  }
  return [];
};

/**
 * Verifica la presenza e la validità del token JWT nell'header Authorization
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Accesso negato: Nessun token fornito o formato non valido.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'primola_access_secret_fallback');
    req.user = decoded;
    req.user.groups = getUserGroups(decoded);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token scaduto. Effettua nuovamente il login.');
    }
    return sendError(res, 403, 'Token non valido.');
  }
};

/**
 * Verifica se l'utente autenticato possiede uno dei ruoli consentiti
 * Supporta sia match su role che match su groups N:N
 * @param {Array<string>} allowedRoles - Ruoli ammessi (es. ['ADMIN', 'OFFICE'])
 * @param {number} [failureStatus=403] - Codice di stato HTTP in caso di errore autorizzazione
 */
const requireRole = (allowedRoles, failureStatus = 403) => {
  const normalizedAllowed = allowedRoles.map(r => {
    const upper = r.toUpperCase();
    return upper === 'STAFF' ? 'TEACHER' : upper;
  });

  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, failureStatus, 'Utente non autorizzato (Ruolo mancante).');
    }

    const userGroups = getUserGroups(req.user);
    if (userGroups.length === 0) {
      return sendError(res, failureStatus, 'Utente non autorizzato (Ruolo mancante).');
    }

    const hasRole = userGroups.some(g => normalizedAllowed.includes(g));

    if (!hasRole) {
      return sendError(res, failureStatus, `Accesso riservato ai ruoli: ${allowedRoles.join(', ')}.`);
    }

    next();
  };
};

/**
 * Utility di sanitizzazione dati sensibili per profilo docente
 * Se l'utente richiedente ha SOLO ruolo TEACHER (e non ADMIN né OFFICE),
 * rimuove hourly_rate e assigned_hours dagli oggetti
 */
const sanitizeTeacherSensitiveData = (req, obj) => {
  if (!obj || !req.user) return obj;

  const userGroups = getUserGroups(req.user);
  const isPrivileged = userGroups.includes('ADMIN') || userGroups.includes('OFFICE');

  if (isPrivileged) {
    return obj;
  }

  // Se è solo TEACHER, strip dei campi tariffa/ore
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeTeacherSensitiveData(req, item));
  }

  const sanitized = { ...obj };
  delete sanitized.hourly_rate;
  delete sanitized.assigned_hours;
  delete sanitized.total_cost;
  return sanitized;
};

module.exports = {
  verifyToken,
  requireRole,
  getUserGroups,
  sanitizeTeacherSensitiveData
};
