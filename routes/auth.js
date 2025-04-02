const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'contrasena-clav-secreta-CODILANDIA';

router.post('/login', async (req, res) => {
  const { nombre_usuario, correo_usuario, contrasena } = req.body; 

  if (!nombre_usuario || !correo_usuario || !contrasena) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' });
  }

  try {
    const client = await req.pool.connect();
    
    const userResult = await client.query(
      'SELECT * FROM usuario WHERE nombre_usuario = $1 AND correo_usuario = $2',
      [nombre_usuario, correo_usuario]
    );

    const user = userResult.rows[0];
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

    const adultoResult = await client.query(
      'SELECT * FROM adulto WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo_usuario, nombre_usuario]
    );

    const ninoResult = await client.query(
      'SELECT * FROM nino WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo_usuario, nombre_usuario]
    );

    client.release();

    let userType = '';
    if (adultoResult.rows.length > 0) userType = 'adulto';
    else if (ninoResult.rows.length > 0) userType = 'nino';
    else return res.status(400).json({ message: 'Rol no asignado' });

    const token = jwt.sign(
      { 
        nombre_usuario: user.nombre_usuario, 
        correo_usuario: user.correo_usuario,
        tipo: userType 
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ token, tipo: userType });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta para obtener datos del usuario
router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = await req.pool.connect();
    // Validar con ambos campos
    const result = await client.query(
      'SELECT * FROM usuario WHERE nombre_usuario = $1 AND correo_usuario = $2',
      [decoded.nombre_usuario, decoded.correo_usuario]
    );
    client.release();

    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Respuesta con los tres campos
    res.json({
      nombre_usuario: user.nombre_usuario,
      correo_usuario: user.correo_usuario,
      contrasena: "**hidden**" 
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token inválido' });
  }
});

module.exports = router;