const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Información del usuario', user: req.user });
});

router.get('/recuperacion', authMiddleware, (req, res) => {
  res.json({ message: 'Recuperación de contraseña' });
});

module.exports = router;
