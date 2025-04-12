const express = require('express');
const router = express.Router();


// Ruta para actualizar el nivel de un niño
router.put('/actualizar', async (req, res) => {
  const { correo_nino, nuevo_nivel } = req.body;

  try {
    // Actualizar el nivel en la base de datos
    const result = await client.query(`
      UPDATE niveles 
      SET nivel_actual = $1 
      WHERE correo_nino = $2
    `, [nuevo_nivel, correo_nino]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Niño no encontrado' });
    }

    res.status(200).json({ message: 'Nivel actualizado con éxito' });
  } catch (err) {
    console.error('Error al actualizar nivel:', err);
    res.status(500).json({ message: 'Error al actualizar el nivel' });
  }
});

module.exports = router;
