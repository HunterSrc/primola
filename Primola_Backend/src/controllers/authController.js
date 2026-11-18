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

    if (user.status === 'PENDING') {
      return sendError(res, 403, 'Il tuo account è in attesa di approvazione da parte di un amministratore.');
    }
    if (user.status === 'REJECTED') {
      return sendError(res, 403, 'Il tuo account è stato disabilitato o respinto dall\'amministratore.');
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
        status: user.status || 'APPROVED',
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

const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, nome, cognome } = req.body;

    const fn = (first_name || nome || '').trim();
    const ln = (last_name || cognome || '').trim();
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail) {
      return sendError(res, 400, 'L\'indirizzo email è obbligatorio.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return sendError(res, 400, 'Inserisci un indirizzo email valido.');
    }

    if (!fn) {
      return sendError(res, 400, 'Il nome è obbligatorio.');
    }
    if (!ln) {
      return sendError(res, 400, 'Il cognome è obbligatorio.');
    }

    if (!password || password.length < 6) {
      return sendError(res, 400, 'La password deve contenere almeno 6 caratteri.');
    }

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return sendError(res, 409, 'Un utente con questo indirizzo email è già registrato.');
    }

    const newUser = await userRepository.create({
      email: normalizedEmail,
      password,
      first_name: fn,
      last_name: ln,
      phone: phone ? phone.trim() : null,
      role: 'TEACHER',
      groups: ['TEACHER'],
      status: 'PENDING'
    });

    return sendSuccess(res, 201, {
      message: 'Registrazione completata con successo. Il tuo account è in attesa di approvazione da parte di un amministratore.',
      userId: newUser.id,
      email: newUser.email,
      status: 'PENDING'
    });
  } catch (error) {
    console.error('Errore nella registrazione utente:', error);
    return sendError(res, 500, 'Errore interno del server durante la registrazione.');
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

    if (user.status === 'PENDING') {
      return sendError(res, 403, 'Il tuo account è in attesa di approvazione da parte di un amministratore.');
    }
    if (user.status === 'REJECTED') {
      return sendError(res, 403, 'Il tuo account è stato disabilitato o respinto dall\'amministratore.');
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
        status: user.status || 'APPROVED',
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
      status: user.status || 'APPROVED',
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
  register,
  refresh,
  getMe
};
