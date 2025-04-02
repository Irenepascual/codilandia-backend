const express = require('express');
const router = express.Router();


// Ruta POST para unirse a un grupo
router.post('/unirse', async (req, res) => {
  const { correo, nombre, codigo, fecha_solicitud } = req.body;
  console.log(correo, nombre, codigo, fecha_solicitud);  
  const client = await req.pool.connect(); 
  try {
    // Inserta los datos en la tabla 'solicita'
    const result = await client.query(
      'INSERT INTO solicita (correo_nino, nombre_nino, codigo_aula, fecha_solicitud) VALUES ($1, $2, $3, $4)',
      [correo, nombre, codigo, fecha_solicitud]
    );
    
    res.status(200).send({ message: 'Solicitud registrada con éxito' });
  } catch (err) {
    console.error('Error al procesar la solicitud:', err);
    res.status(500).send({ error: 'Error al procesar la solicitud' });
  } finally {
    client.release();  
  }
});


// Ruta GET para obtener los cursos del niño
router.get('/:correo/:nombre', async (req, res) => {
  const { correo, nombre } = req.params;
  const client = await req.pool.connect();
  try {
    // Obtener los cursos asociados al niño
    const result = await client.query(`
      SELECT a.nombre_aula 
      FROM aula a
      JOIN pertenece p ON a.codigo_aula = p.codigo_aula
      JOIN aula_virtual av ON a.codigo_aula = av.codigo_aula
      WHERE p.correo_nino = $1 AND p.nombre_nino = $2
    `, [correo, nombre]);
       
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener cursos:', err);
    res.status(500).json({ error: 'Error al obtener los cursos' });
  } finally {
    client.release();
  }
});

module.exports = router;
