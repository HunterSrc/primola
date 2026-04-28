const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseFormat');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
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
 * @param {Array<string>} allowedRoles - Ruoli ammessi (es. ['ADMIN', 'STAFF'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 403, 'Utente non autorizzato (Ruolo mancante).');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, `Accesso riservato ai ruoli: ${allowedRoles.join(', ')}.`);
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole
};
