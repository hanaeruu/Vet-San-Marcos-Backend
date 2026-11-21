const router = require('express').Router()
const { verificarToken } = require('../middleware/verificarToken')
const c = require('../controllers/servicios.controller')

router.get('/servicios', verificarToken, c.listarServicios)
router.get('/servicios/:id', verificarToken, c.obtenerServicio)
router.post('/servicios', verificarToken, c.crearServicio)
router.put('/servicios/:id', verificarToken, c.modificarServicio)
router.delete('/servicios/:id', verificarToken, c.eliminarServicio)

module.exports = router
