const express = require('express');
const router = express.Router();
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_UjeJQISx4A1c@ep-little-block-a8Q8w8v1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require'
});

// Conecta con la base de datos
client.connect();

// Ruta para actualizar el nivel de un niño
router.put('/actualizar', async (req, res) => {
  const { correo_nino, nombre_nino, codigo_aula, nivel, puntos_obtenidos, puntos_minimos } = req.body;

  try {
    // Primero, verificamos si los puntos obtenidos son suficientes para pasar al siguiente nivel
    if (puntos_obtenidos >= puntos_minimos) {
      // Verificar si el nivel actual es el esperado antes de actualizar
      const result = await client.query(`
        SELECT nivel_actual FROM pertenece
        WHERE correo_nino = $1 AND nombre_nino = $2 AND codigo_aula = $3
      `, [correo_nino, nombre_nino, codigo_aula]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Niño o grupo no encontrado' });
      }

      // Obtener el nivel actual de la base de datos
      const nivel_actual = parseInt(result.rows[0].nivel_actual, 10);  // Convertimos a entero

      // Si el nivel actual coincide con el nivel recibido, incrementamos el nivel
      if (nivel_actual === parseInt(nivel, 10)) { // Convertimos el nivel recibido a entero
        const nuevo_nivel = nivel_actual + 1;  // Calculamos el nuevo nivel afuera

        // Actualizamos el nivel con la nueva variable
        const updateResult = await client.query(`
          UPDATE pertenece
          SET nivel_actual = $1
          WHERE correo_nino = $2 AND nombre_nino = $3 AND codigo_aula = $4
        `, [nuevo_nivel, correo_nino, nombre_nino, codigo_aula]);

        if (updateResult.rowCount === 0) {
          return res.status(404).json({ message: 'No se pudo actualizar el nivel' });
        }

        // Si se actualiza correctamente, redirigimos a /nivelesNino
        return res.status(200).json({ message: 'Nivel actualizado con éxito' });
      } else {
        // Si el nivel no coincide, no hacemos nada pero redirigimos
        return res.status(200).json({ message: 'Nivel no coincide con el nivel actual, no se ha actualizado' });
      }
    } else {
      // Si los puntos no son suficientes, redirigimos sin actualizar el nivel
      return res.status(200).json({ message: 'No se superaron los puntos necesarios para el siguiente nivel' });
    }
  } catch (err) {
    console.error('Error al actualizar nivel:', err);
    res.status(500).json({ message: 'Error al actualizar el nivel' });
  }
});

module.exports = router;
