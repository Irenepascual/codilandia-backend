const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Ruta GET para obtener usuarios
router.get('/', async (req, res) => {
  const client = await req.pool.connect();
  try {
    const result = await client.query('SELECT * FROM usuario');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  } finally {
    client.release();
  }
});

// Ruta para obtener todos los nombres de usuarios vinculados a un correo
router.get('/get-usernames-by-email', async (req, res) => {
  const client = await req.pool.connect();  
  try {
    const { email } = req.query; 

    if (!email) {
      return res.status(400).json({ error: "Se requiere el parámetro 'email'" });
    }

    const result = await client.query(
      'SELECT nombre_usuario FROM usuario WHERE correo_usuario = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No se encontraron usuarios" });
    }

    const usernames = result.rows.map(row => row.nombre_usuario);
    res.json({ usernames });  

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: "Error del servidor" });
  } finally {
    client.release();
  }
});


// Ruta para obtener todos los adultos
router.get('/adultos', async (req, res) => {
    const client = await req.pool.connect();
    try {
      const result = await client.query('SELECT * FROM adulto');
      res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener adultos:', err);
      res.status(500).json({ error: 'Error al obtener adultos' });
    } finally {
      client.release();
    }
  });
  

  // Ruta para obtener todos los niños
  router.get('/ninos', async (req, res) => {
    const client = await req.pool.connect();
    try {
      const result = await client.query('SELECT * FROM nino');
      res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener niños:', err);
      res.status(500).json({ error: 'Error al obtener niños' });
    } finally {
      client.release();
    }
  });
  
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "codilandiaofc@gmail.com", 
    pass: process.env.CONTRASENA_GMAIL
  },
});

// Función para enviar el correo de recuperación
async function sendResetEmail(email, username) {
  const mailOptions = {
    from: '"Codilandia" <codilandiaofc@gmail.com>',
    to: email,
    subject: 'Recuperación de Contraseña',
    text: `Hola ${username},\n\nHaz clic en el siguiente enlace para cambiar tu contraseña: \nhttp://localhost:4200/recuperacion?email=${email}&username=${username}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo de recuperación enviado a:', email);
  } catch (error) {
    console.error('Error enviando el correo:', error);
    throw new Error('Error al enviar el correo de recuperación');
  }
}

router.get('/send-reset-email', async (req, res) => {
  const { email, username } = req.query;  

  if (!email || !username) {
    return res.status(400).json({ error: 'Faltan parámetros: email o username' });
  }

  const client = await req.pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [email, username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await sendResetEmail(email, username);
    res.json({ message: 'Correo de recuperación enviado' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al enviar el correo' });
  } finally {
    client.release();
  }
});



// Ruta POST para crear adulto
router.post('/adulto', async (req, res) => {
  const { correo_usuario, nombre_usuario, contrasena } = req.body;
  const client = await req.pool.connect();

  if (!correo_usuario || !nombre_usuario || !contrasena) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    await client.query('BEGIN');

    // Hashear la contraseña antes de almacenarla
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Verificar si ya existe el usuario en USUARIO con la combinación correo y nombre
    const userCheck = await client.query(
      'SELECT * FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo_usuario, nombre_usuario]
    );
    if (userCheck.rows.length > 0) {
      throw { status: 400, message: 'Usuario ya registrado en USUARIO' };
    }

    // Verificar si ya existe el adulto en ADULTO con la misma combinación
    const adultoCheck = await client.query(
      'SELECT * FROM adulto WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo_usuario, nombre_usuario]
    );
    if (adultoCheck.rows.length > 0) {
      throw { status: 400, message: 'Adulto ya registrado en ADULTO' };
    }

    // Insertar en USUARIO
    await client.query(
      'INSERT INTO usuario (correo_usuario, nombre_usuario, contrasena, tipo) VALUES ($1, $2, $3, $4)',
      [correo_usuario, nombre_usuario, hashedPassword, 'adulto']
    );

    // Insertar en ADULTO
    await client.query(
      'INSERT INTO adulto (correo_usuario, nombre_usuario) VALUES ($1, $2)',
      [correo_usuario, nombre_usuario]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Usuario adulto creado con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Error interno' });
  } finally {
    client.release();
  }
});


router.post('/send-reset-email', async (req, res) => {
  const { email, username } = req.body;
  
  try {
    const client = await req.pool.connect();
    // Verificar si el usuario existe
    const result = await client.query(
      'SELECT * FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [email, username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Enviar correo
    await sendResetEmail(email, username);
    res.json({ message: 'Correo de recuperación enviado' });
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al enviar el correo' });
  } finally {
    client.release();
  }
});

// Ruta POST para cambiar la contraseña
router.post('/update-password', async (req, res) => {
  const { email, username, newPassword } = req.body; 

  if (!email || !username || !newPassword) {
    return res.status(400).json({ error: 'Faltan parámetros: email, username o nueva contraseña' });
  }

  const client = await req.pool.connect(); 
  try {
    // Buscar el usuario por correo electrónico y nombre de usuario
    const result = await client.query(
      'SELECT * FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [email, username]
    );

    // Verificar si el usuario existe
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña en la base de datos
    await client.query(
      'UPDATE usuario SET contrasena = $1 WHERE correo_usuario = $2 AND nombre_usuario = $3',
      [hashedPassword, email, username]
    );

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  } finally {
    client.release();  
  }
});


// Función para generar un código aleatorio sin que exista otro igual
async function generateRandomAulaCode(client) {
    while (true) {
      // Genera un número aleatorio entre 0 y 99999
      const randomInt = Math.floor(Math.random() * 100000);

      // Convierte a string con 5 dígitos
      const codeStr = randomInt.toString().padStart(5, '0');
  
      // Verifica si existe en la tabla "aula"
      const checkRes = await client.query(
        'SELECT 1 FROM aula WHERE codigo_aula = $1',
        [codeStr]
      );
  
      if (checkRes.rowCount === 0) {
        // No existe, podemos usar este código
        return codeStr;
      }
    }
  }

// POST para crear un niño y su aula individual
// 1. Insertar en USUARIO (tipo = 'nino')
// 2. Insertar en NINO
// 3. Generar un código de aula aleatorio (5 dígitos)
// 4. Insertar en AULA (nombre_aula = 'INDIVIDUAL')
// 5. Insertar en AULA_INDIVIDUAL
// 6. Insertar 15 niveles (1 a 15) en la tabla NIVELES (con nombre_nivel = NULL)
// 7. Insertar en PERTENECE, referenciando nivel_actual = 1
router.post('/nino', async (req, res) => {
  const client = await req.pool.connect();
  try {
    const { correo_usuario, nombre_usuario, contrasena } = req.body;
    console.log('Datos recibidos:', req.body);

    if (!correo_usuario || !nombre_usuario || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el usuario ya existe en USUARIO (usando la clave compuesta)
    const userCheck = await client.query(
      'SELECT * FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo_usuario, nombre_usuario]
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya registrado en USUARIO' });
    }
  
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(contrasena, 10); 
  
    // 1. Insertar en USUARIO (tipo = 'nino')
    await client.query(
      `INSERT INTO usuario (correo_usuario, nombre_usuario, contrasena, tipo)
       VALUES ($1, $2, $3, 'nino')`,
      [correo_usuario, nombre_usuario, hashedPassword]
    );
  
    // 2. Insertar en NINO (clave compuesta)
    await client.query(
      `INSERT INTO nino (correo_usuario, nombre_usuario)
       VALUES ($1, $2)`,
      [correo_usuario, nombre_usuario]
    );
  
    // 3. Generar un código de aula aleatorio de 5 dígitos
    const codigoAula = await generateRandomAulaCode(client);
  
    // 4. Insertar en AULA (nombre_aula = 'INDIVIDUAL')
    await client.query(
      `INSERT INTO aula (codigo_aula, nombre_aula)
       VALUES ($1, 'INDIVIDUAL')`,
      [codigoAula]
    );
  
    // 5. Insertar en AULA_INDIVIDUAL (clave compuesta en NINO)
    await client.query(
      `INSERT INTO aula_individual (codigo_aula, correo_nino, nombre_nino)
       VALUES ($1, $2, $3)`,
      [codigoAula, correo_usuario, nombre_usuario]
    );
  
    // 6. Insertar 15 niveles (del 1 al 11) en la tabla NIVELES, con nombre_nivel = NULL
    for (let i = 1; i <= 11; i++) {
      const nombreNivel = `nivel - ${i}`;
      await client.query(
        `INSERT INTO niveles (numero_nivel, codigo_aula, nombre_nivel)
         VALUES ($1, $2, $3)`,
        [i, codigoAula, nombreNivel]
      );
    }
    
  
    // 7. Insertar en PERTENECE, referenciando el nivel_actual = 1 (clave foránea compuesta)
    await client.query(
      `INSERT INTO pertenece (correo_nino, nombre_nino, codigo_aula, nivel_actual)
         VALUES ($1, $2, $3, 1)`,
      [correo_usuario, nombre_usuario, codigoAula]
    );
  
    await client.query('COMMIT');
  
    res.status(201).json({
      message: 'Niño creado con éxito, aula individual y 15 niveles asignados',
      correo: correo_usuario,
      codigoAula
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando niño y aula individual:', err);
    res.status(500).json({ error: 'Error al crear niño y aula individual' });
  } finally {
    client.release();
  }
});


// DELETE para eliminar un adulto
router.delete('/adulto/:correo/:nombre', async (req, res) => {
  const client = await req.pool.connect();
  const correo = req.params.correo;
  const nombre = req.params.nombre;
  try {
    await client.query('BEGIN');
    
    // Primero eliminar de la tabla "adulto"
    await client.query(
      'DELETE FROM adulto WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo, nombre]
    );
    
    // Luego eliminar de la tabla "usuario" 
    await client.query(
      'DELETE FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2 AND tipo = $3',
      [correo, nombre, 'adulto']
    );
    
    await client.query('COMMIT');
    res.status(200).json({ message: 'Adulto eliminado con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error eliminando adulto:', err);
    res.status(500).json({ error: 'Error eliminando adulto' });
  } finally {
    client.release();
  }
});


// DELETE para eliminar un niño y todos los registros asociados
router.delete('/nino/:correo/:nombre', async (req, res) => {
  const client = await req.pool.connect();
  const correo = req.params.correo;
  const nombre = req.params.nombre;

  try {
    await client.query('BEGIN');

    // 1. Obtener el código de aula asociado al niño desde la tabla aula_individual
    const aulaIndResult = await client.query(
      'SELECT codigo_aula FROM aula_individual WHERE correo_nino = $1 AND nombre_nino = $2',
      [correo, nombre]
    );
    if (aulaIndResult.rowCount === 0) {
      throw new Error('No se encontró aula individual para ese niño');
    }
    const codigoAula = aulaIndResult.rows[0].codigo_aula;

    // 2. Eliminar de la tabla pertenece
    await client.query(
      'DELETE FROM pertenece WHERE correo_nino = $1 AND nombre_nino = $2 AND codigo_aula = $3',
      [correo, nombre, codigoAula]
    );

    // 3. Eliminar los niveles asociados al aula en la tabla niveles
    await client.query(
      'DELETE FROM niveles WHERE codigo_aula = $1',
      [codigoAula]
    );

    // 4. Eliminar el registro de aula_individual
    await client.query(
      'DELETE FROM aula_individual WHERE codigo_aula = $1 AND correo_nino = $2 AND nombre_nino = $3',
      [codigoAula, correo, nombre]
    );

    // 5. Eliminar el aula
    await client.query(
      'DELETE FROM aula WHERE codigo_aula = $1',
      [codigoAula]
    );

    // 6. Eliminar el niño de la tabla nino
    await client.query(
      'DELETE FROM nino WHERE correo_usuario = $1 AND nombre_usuario = $2',
      [correo, nombre]
    );

    // 7. Finalmente, eliminar el usuario de la tabla usuario
    await client.query(
      'DELETE FROM usuario WHERE correo_usuario = $1 AND nombre_usuario = $2 AND tipo = $3',
      [correo, nombre, 'nino']
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Niño y todos los registros asociados eliminados con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error eliminando niño y registros asociados:', err);
    res.status(500).json({ error: 'Error eliminando niño y registros asociados' });
  } finally {
    client.release();
  }
});



module.exports = router;
