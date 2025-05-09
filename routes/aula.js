const express = require('express');
const router = express.Router();

// Obtener el nivel actual de un niño en un aula
router.get('/nivel-actual/:correo/:nombre/:codigo_aula', async (req, res) => {
  const { correo, nombre, codigo_aula } = req.params;
  const client = await req.pool.connect();
  
  try {
    const result = await client.query(`
      SELECT nivel_actual 
      FROM pertenece 
      WHERE correo_nino = $1 AND nombre_nino = $2 AND codigo_aula = $3
    `, [correo, nombre, codigo_aula]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }

    res.status(200).json({ nivel_actual: result.rows[0].nivel_actual });
  } catch (err) {
    console.error('Error al obtener el nivel actual:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    client.release();
  }
});


// Agrega en aula.js este nuevo endpoint para obtener el aula individual de un niño
router.get('/individual/:correo/:nombre', async (req, res) => {
  const { correo, nombre } = req.params;
  const client = await req.pool.connect();
  try {
    const result = await client.query(
      `SELECT codigo_aula 
       FROM aula_individual 
       WHERE correo_nino = $1 AND nombre_nino = $2`,
      [correo, nombre]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró aula individual para el niño' });
    }

    // Suponemos que para un niño existe una única aula individual
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener aula individual:', err);
    res.status(500).json({ error: 'Error al obtener aula individual' });
  } finally {
    client.release();
  }
});


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


router.post('/crear-aula', async (req, res) => {
  const { codigo_aula, nombre_aula } = req.body;

  if (!codigo_aula || !nombre_aula) {
    return res.status(400).send({ error: 'Faltan datos obligatorios' });
  }

  const client = await req.pool.connect();
  try {
    const aulaExiste = await client.query(
      'SELECT * FROM AULA WHERE codigo_aula = $1',
      [codigo_aula]
    );

    if (aulaExiste.rows.length > 0) {
      return res.status(409).send({ error: 'El código de aula ya existe' });
    }

    await client.query(
      'INSERT INTO AULA (codigo_aula, nombre_aula) VALUES ($1, $2)',
      [codigo_aula, nombre_aula]
    );

    res.status(201).send({ message: 'Aula creada con éxito' });
  } catch (err) {
    console.error('Error al crear el aula:', err);
    res.status(500).send({ error: 'Error al procesar la solicitud' });
  } finally {
    client.release();
  }
});

router.post('/crear-aula-virtual', async (req, res) => {
  const { codigo_aula, correo_adulto, nombre_adulto } = req.body;

  if (!codigo_aula || !correo_adulto || !nombre_adulto) {
    return res.status(400).send({ error: 'Faltan datos obligatorios' });
  }

  const client = await req.pool.connect();
  try {
    // Verificar si el aula ya existe en la tabla AULA
    const aulaExiste = await client.query(
      'SELECT * FROM AULA WHERE codigo_aula = $1',
      [codigo_aula]
    );

    if (aulaExiste.rows.length === 0) {
      return res.status(404).send({ error: 'El aula no existe' });
    }

    // Insertar en la tabla AULA_VIRTUAL
    await client.query(
      'INSERT INTO AULA_VIRTUAL (codigo_aula, correo_adulto, nombre_adulto) VALUES ($1, $2, $3)',
      [codigo_aula, correo_adulto, nombre_adulto]
    );

    res.status(201).send({ message: 'Aula virtual creada con éxito' });
  } catch (err) {
    console.error('Error al crear el aula virtual:', err);
    res.status(500).send({ error: 'Error al procesar la solicitud' });
  } finally {
    client.release();
  }
});

router.get('/:correo/:nombre', async (req, res) => {
  const { correo, nombre } = req.params;
  const client = await req.pool.connect();
  try {
    // Obtener los cursos asociados al niño, devolviendo también el código del aula
    const result = await client.query(`
      SELECT a.codigo_aula, a.nombre_aula 
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

// Ruta GET para obtener los cursos del adulto
router.get('/adulto/:correo/:nombre', async (req, res) => {
  const { correo, nombre } = req.params;
  const client = await req.pool.connect();
  try {
    // Obtener los cursos asociados al adulto
    const result = await client.query(`
      SELECT a.codigo_aula, a.nombre_aula 
      FROM aula a
      JOIN aula_virtual av ON a.codigo_aula = av.codigo_aula
      WHERE av.correo_adulto = $1 AND av.nombre_adulto = $2
    `, [correo, nombre]);
       
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener cursos:', err);
    res.status(500).json({ error: 'Error al obtener los cursos' });
  } finally {
    client.release();
  }
});

// Ruta GET para obtener solictudes de un aula por ID
router.get('/aula/:codigo/solicitudes', async (req, res) => {

  const client = await req.pool.connect();
  const { codigo } = req.params;  
  try {
    const result = await client.query(`
      SELECT s.codigo_aula, s.nombre_nino, s.correo_nino
      FROM solicita s
      WHERE s.codigo_aula = $1
	`, [codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solictudes no encontradas' });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener solicitudes por código:', err);
    res.status(500).json({ error: 'Error al obtener el aula' });
  } finally {
    client.release();
  }
});

// Ruta DELETE para eliminar solicitudes de un aula
// Ruta DELETE mejorada
router.delete('/aula/:codigo/solicitudes/:correo/:nombre', async (req, res) => {
  const { codigo, correo, nombre } = req.params;
  const client = await req.pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM solicita
       WHERE codigo_aula  = $1
         AND correo_nino  = $2
         AND nombre_nino  = $3
      RETURNING *;
    `, [codigo, correo, nombre]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró la solicitud a eliminar' });
    }
    res.status(200).json({ mensaje: 'Solicitud eliminada correctamente', solicitud: result.rows[0] });
  } finally {
    client.release();
  }
});


// Ruta POST para añadir un niño a un aula
router.post('/pertenece', async (req, res) => {
  const client = await req.pool.connect();
  const { correo_nino, nombre_nino, codigo_aula, nivel_actual } = req.body;

  try {
    const result = await client.query(`
      INSERT INTO pertenece (correo_nino, nombre_nino, codigo_aula, nivel_actual)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [correo_nino, nombre_nino, codigo_aula, nivel_actual]);

    res.status(201).json({ mensaje: 'Añadido correctamente', pertenece: result.rows[0] });
  } catch (err) {
    console.error('Error al añadir a pertenece:', err);
    res.status(500).json({ error: 'No se pudo añadir a pertenece' });
  } finally {
    client.release();
  }
});

// Ruta GET para obtener un aula por su ID
router.get('/aula', async (req, res) => {

  const client = await req.pool.connect();
  const codigo = req.query.codigo;  
  try {
    const result = await client.query(`
      SELECT a.codigo_aula, a.nombre_aula 
      FROM aula a
      WHERE a.codigo_aula = $1
	`, [codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aula no encontrada' });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener aula por código:', err);
    res.status(500).json({ error: 'Error al obtener el aula' });
  } finally {
    client.release();
  }
});

// Ruta GET para obtener alumnos de un aula
router.get('/alumnos', async (req, res) => {

  const client = await req.pool.connect();
  const codigo = req.query.codigo;  
  try {
    const result = await client.query(`
      SELECT p.nombre_nino, p.correo_nino, p.nivel_actual
      FROM pertenece p
      WHERE p.codigo_aula = $1
	`, [codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alumnos no encontrados' });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener alumnos por código:', err);
    res.status(500).json({ error: 'Error al obtener los alumnos' });
  } finally {
    client.release();
  }
});

// Ruta DELETE para eliminar alumnos de un aula
router.delete('/aula/:codigo/alumnos/:correo', async (req, res) => {
  const client = await req.pool.connect();
  const { codigo, correo } = req.params;

  try {
    const result = await client.query(`
      DELETE FROM pertenece
      WHERE codigo_aula = $1 AND correo_nino = $2
      RETURNING *
    `, [codigo, correo]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró el alumno a eliminar' });
    }

    res.status(200).json({ mensaje: 'Alumno eliminado correctamente', solicitud: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar el alumno:', err);
    res.status(500).json({ error: 'Error al eliminar el alumno' });
  } finally {
    client.release();
  }
});

// Ruta GET para notas por alumnos de un aula
// Ruta GET para notas de un alumno en un aula, filtrando también por nombre
router.get('/alumnos/notas/:codigo/:correo/:nombre', async (req, res) => {
  const { codigo, correo, nombre } = req.params;
  const client = await req.pool.connect();
  try {
    const result = await client.query(`
      SELECT r.nombre_nino, r.correo_nino, r.nota, r.numero_nivel
      FROM resultado r
      WHERE r.codigo_aula = $1
        AND r.correo_nino = $2
        AND r.nombre_nino = $3
      ORDER BY r.numero_nivel
    `, [codigo, correo, nombre]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Resultados no encontrados' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los resultados' });
  } finally {
    client.release();
  }
});

// Obtiene la nota media de un alumno en un aula concreta
router.get(
  '/alumnos/nota-media/:codigo/:correo/:nombre',
  async (req, res) => {
    const { codigo, correo, nombre } = req.params;
    const client = await req.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          AVG(r.nota)::numeric(5,2) AS nota_media
        FROM resultado r
        WHERE r.codigo_aula = $1
          AND r.correo_nino = $2
          AND r.nombre_nino = $3
        `,
        [codigo, correo, nombre]
      );

      // Si no hay filas, devolvemos 404
      if (result.rows.length === 0 || result.rows[0].nota_media === null) {
        return res.status(404).json({ error: 'No hay notas para este alumno' });
      }

      // Devolvemos la nota media como número con dos decimales
      res.json({ nota_media: result.rows[0].nota_media });
    } catch (err) {
      console.error('Error al calcular nota media:', err);
      res.status(500).json({ error: 'Error en el servidor' });
    } finally {
      client.release();
    }
  }
);

// GET /api/aulas/aula/nombre/:codigo
router.get('/aula/nombre/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const client = await req.pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT nombre_aula
        FROM aula
       WHERE codigo_aula = $1
    `, [codigo]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Aula no encontrada' });
    }
    res.json({ nombre_aula: rows[0].nombre_aula });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener nombre de aula' });
  } finally {
    client.release();
  }
});

// Ruta POST para añadir niveles a un aula
router.post('/niveles', async (req, res) => {
  const client = await req.pool.connect();
  const { numero_nivel, codigo_aula, nombre_nivel } = req.body;

  try {
    const result = await client.query(`
      INSERT INTO niveles (numero_nivel, codigo_aula, nombre_nivel)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [numero_nivel, codigo_aula, nombre_nivel]);

    res.status(201).json({ mensaje: 'Añadido correctamente', pertenece: result.rows[0] });
  } catch (err) {
    console.error('Error al añadir a niveles', err);
    res.status(500).json({ error: 'No se pudo añadir a niveles' });
  } finally {
    client.release();
  }
});



module.exports = router;
