const express = require('express')
const cors = require('cors')
const saludoRoutes = require('./routes/saludo.routes')
const mascotasRoutes = require('./routes/mascotas.routes')
const authRoutes = require('./routes/auth.routes')
const usuariosRoutes = require('./routes/usuarios.routes')
const serviciosRoutes = require('./routes/servicios.routes')
const citasRoutes = require('./routes/citas.routes')

if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL no está configurada')
}

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json({ limit: '16kb' }))
app.use('/api', saludoRoutes)
app.use('/api', mascotasRoutes)
app.use('/api', authRoutes)
app.use('/api', usuariosRoutes)
app.use('/api', serviciosRoutes)
app.use('/api', citasRoutes)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Cuerpo demasiado grande' })
  }
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Error interno' })
})
module.exports = app
