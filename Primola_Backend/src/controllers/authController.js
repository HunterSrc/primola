const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { sendSuccess, sendError } = require('../utils/responseFormat');

const ACCESS_TOKEN_EXPIRY = '60m';
const REFRESH_TOKEN_EXPIRY = '7d';

const getAccessSecret = () => process.env.JWT_SECRET || 'primola_access_secret_fallback';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'primola_refresh_secret_fallback';

const generateTokens = (user) => {
  const groups = user.groups && user.groups.length > 0 
    ? user.groups 
    : [user.role === 'STAFF' ? 'TEACHER' : (user.role || 'TEACHER')];

  const payload = {
    id: user.id,
    email: user.email,
    groups: groups,
    role: groups[0], // retrocompatibilità per client legacy
    first_name: user.first_name || user.nome || '',
    last_name: user.last_name || user.cognome || '',
    name: `${user.first_name || user.nome || ''} ${user.last_name || user.cognome || ''}`.trim()
  };

  const accessToken = jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });

  return { accessToken, refreshToken, groups };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email e password sono obbligatorie.');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return sendError(res, 401, 'Credenziali non valide.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Credenziali non valide.');
    }

    const { accessToken, refreshToken, groups } = generateTokens(user);

    return sendSuccess(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        nome: user.nome,
        cognome: user.cognome,
        groups: groups,
        role: groups[0]
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Errore nel login:', error);
    return sendError(res, 500, 'Errore interno del server durante il login.');
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 400, 'Refresh token obbligatorio.');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Refresh token scaduto. Effettua nuovamente il login.');
      }
      return sendError(res, 403, 'Refresh token non valido.');
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return sendError(res, 401, 'Utente non più valido.');
    }

    const tokens = generateTokens(user);

    return sendSuccess(res, 200, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        nome: user.nome,
        cognome: user.cognome,
        groups: tokens.groups,
        role: tokens.groups[0]
      }
    });
  } catch (error) {
    console.error('Errore nel refresh del token:', error);
    return sendError(res, 500, 'Errore interno del server durante il refresh.');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return sendError(res, 404, 'Utente non trovato.');
    }

    return sendSuccess(res, 200, {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      nome: user.nome,
      cognome: user.cognome,
      groups: user.groups,
      role: user.groups[0]
    });
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    return sendError(res, 500, 'Errore interno nel recupero utente.');
  }
};

module.exports = {
  login,
  refresh,
  getMe
};
