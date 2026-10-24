const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Tutte le rotte utenti richiedono autenticazione
router.use(verifyToken);

// Lista gruppi disponibili
router.get('/groups', userController.listGroups);

// Lista utenti (filtrata se TEACHER)
router.get('/', userController.listUsers);

// Dettaglio utente
router.get('/:id', userController.getUser);

// Creazione utente (ADMIN o OFFICE)
router.post('/', userController.createUser);

// Aggiornamento utente (ADMIN: tutto; OFFICE: no ruoli; TEACHER: solo se stesso e solo anagrafica)
router.put('/:id', userController.updateUser);

// Eliminazione utente (solo ADMIN)
router.delete('/:id', userController.deleteUser);

module.exports = router;
