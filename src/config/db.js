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

pool.on('error', () => {
  console.error('Error en una conexión inactiva con PostgreSQL')
})

module.exports = pool