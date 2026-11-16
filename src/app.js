const express = require('express')
const cors = require('cors')
const saludoRoutes = require('./routes/saludo.routes')
const mascotasRoutes = require('./routes/mascotas.routes')
const authRoutes = require('./routes/auth.routes')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', saludoRoutes)
app.use('/api', mascotasRoutes)
app.use('/api', authRoutes)

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada'
  })
})

module.exports = app