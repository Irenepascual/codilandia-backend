// routes/niveles.js
const express = require('express');
const router = express.Router();

/**
 * PUT /api/niveles/actualizar
 */
router.put('/actualizar', async (req, res) => {
  const {
    correo_nino,
    nombre_nino,
    codigo_aula,
    nivel,
    puntos_obtenidos,
    puntos_minimos,
    puntos_maximos
  } = req.body;

  // 0) Validación básica
  if (
    !correo_nino || !nombre_nino || !codigo_aula ||
    nivel == null || puntos_obtenidos == null ||
    puntos_minimos == null || puntos_maximos == null
  ) {
    return res.status(400).json({ message: 'Faltan parámetros obligatorios' });
  }

  let client;
  try {
    client = await req.pool.connect();

    // 1) Leemos el nivel actual guardado
    const selectRes = await client.query(
      `SELECT nivel_actual
         FROM pertenece
        WHERE correo_nino = $1
          AND nombre_nino = $2
          AND codigo_aula = $3`,
      [correo_nino, nombre_nino, codigo_aula]
    );
    if (selectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Niño o aula no encontrado' });
    }
    const nivel_actual = parseInt(selectRes.rows[0].nivel_actual, 10);

    // 2) Calculamos y guardamos siempre la nota en 'resultado' para este intento
    let nota = (puntos_obtenidos / puntos_maximos) * 10;
    nota = Math.min(10, Math.max(0, Math.round(nota * 100) / 100));

    await client.query(
      `INSERT INTO resultado
         (correo_nino, nombre_nino, codigo_aula, numero_nivel, nota)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (correo_nino, nombre_nino, codigo_aula, numero_nivel)
         DO UPDATE SET nota = EXCLUDED.nota`,
      [correo_nino, nombre_nino, codigo_aula, nivel, nota]
    );

    // 3) Si no supera puntos mínimos, devolvemos sin cambiar de nivel
    if (puntos_obtenidos < puntos_minimos) {
      return res.status(200).json({
        message: 'Puntos insuficientes. Resultado registrado pero nivel no incrementado.',
        data: { nivel_actual, nota }
      });
    }

    // 4) Si el nivel enviado no coincide con el actual, no lo incrementamos
    if (nivel_actual !== Number(nivel)) {
      return res.status(200).json({
        message: 'Nivel enviado no coincide con el nivel actual.',
        data: { nivel_actual, nota }
      });
    }

    // 5) Calculamos e insertamos el nuevo nivel en 'niveles' (para no romper la FK)
    const nuevo_nivel = nivel_actual + 1;
    if (nuevo_nivel < 12) {
      await client.query(
        `INSERT INTO niveles (codigo_aula, numero_nivel)
           VALUES ($1, $2)
         ON CONFLICT (codigo_aula, numero_nivel) DO NOTHING`,
        [codigo_aula, nuevo_nivel]
      );

      // 6) Actualizamos el nivel en 'pertenece'
      await client.query(
        `UPDATE pertenece
            SET nivel_actual = $1
          WHERE correo_nino = $2
            AND nombre_nino = $3
            AND codigo_aula = $4`,
        [nuevo_nivel, correo_nino, nombre_nino, codigo_aula]
      );

    } else {
      // opcional: log o mensaje de que ya no hay más niveles
      console.log(`No se inserta nivel ${nuevo_nivel}: tope alcanzado`);
    }


    // 7) Respondemos
    return res.status(200).json({
      message: 'Nivel incrementado y resultado actualizado con éxito',
      data: { nivel_anterior: nivel_actual, nuevo_nivel, nota }
    });

  } catch (err) {
    console.error('Error en PUT /actualizar:', err);
    return res.status(500).json({ message: 'Error interno al procesar la operación' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
