const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const cors = require('cors'); 
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth'); 
const protectedRoutes = require('./routes/protectedRoutes');

const app = express();
const port = 3000;

require('dotenv').config();


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en el idle client', err);
});

app.use(cors({
  origin: 'http://localhost:4200',  // Permitir solicitudes solo desde el frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type']  // Cabeceras permitidas
}));

// Middleware para compartir el pool (solo una vez)
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Función para inicializar la base de datos
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT to_regclass('public.usuario') as table_name;");
    if (result.rows[0].table_name === null) {
      // Si la tabla no existe, se asume que las tablas aún no están creadas.
      console.log('Tablas no encontradas. Creando esquema de la base de datos...');
      const sql = fs.readFileSync('./creacionBD.sql').toString();
      await client.query(sql);
      console.log('Esquema de la base de datos creado.');
    } else {
      console.log('El esquema de la base de datos ya existe.');
    }
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
  } finally {
    client.release();
  }
}

initializeDatabase();

// Importar rutas

app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);


const userRoutes = require('./routes/userRoutes');
const aulaRoutes = require('./routes/aula'); // Añadir esta línea
const nivelesRoutes = require('./routes/niveles');

app.use('/api/users', userRoutes);
app.use('/api/aulas', aulaRoutes); 
app.use('/api/niveles', nivelesRoutes);

app.get('/', (req, res) => {
  res.send('¡Bienvenido a Codilandia!');
});

// En escucha...
app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});
