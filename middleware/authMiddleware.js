const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'contrasena-clav-secreta-CODILANDIA';

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']; // Obtener el token de la cabecera

  if (!token) {
    return res.status(403).json({ message: 'No token provided' }); // Si no hay token, lo denegamos
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Verificamos el token
    req.user = decoded;  // Guardamos la información del usuario decodificada
    next();  
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' }); // Si el token es inválido, lo denegamos
  }
};

module.exports = authMiddleware;
