const { Pool } = require('pg')
const { readFileSync } = require('node:fs')
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    ca: readFileSync(process.env.DB_CA_FILE, 'utf8'),
    rejectUnauthorized: true
  },
  max: 2,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000
})
pool.on('error', (error) => {
  console.error('Error de pool:', error.code || 'DB_ERROR')
})
module.exports = pool

pool.query('SELECT 1')
  .then(() => console.log('BD conectada'))
  .catch((error) => {
    console.error('No se pudo conectar a la BD:', error.code || error.message)
    process.exit(1)
  })
