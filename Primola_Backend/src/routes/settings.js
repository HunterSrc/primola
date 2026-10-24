const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// GET /api/settings - Lettura (Admin e Office)
router.get('/', requireRole(['ADMIN', 'OFFICE']), (req, res) => settingsController.getSettings(req, res));

// PUT /api/settings - Modifica (Solo Admin)
router.put('/', requireRole(['ADMIN']), (req, res) => settingsController.updateSettings(req, res));

module.exports = router;
