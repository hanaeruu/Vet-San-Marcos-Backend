const router = require('express').Router()
const { verificarToken } = require('../middleware/verificarToken')
const c = require('../controllers/citas.controller')

router.get('/citas', verificarToken, c.listarCitas)
router.post('/citas', verificarToken, c.crearCita)
router.get('/citas/:id', verificarToken, c.obtenerCita)
router.patch('/citas/:id/estado', verificarToken, c.cambiarEstado)

module.exports = router
