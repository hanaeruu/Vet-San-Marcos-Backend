const router = require('express').Router()
const { verificarToken } = require('../middleware/verificarToken')
const controlador = require('../controllers/mascotas.controller')

router.get('/mascotas', verificarToken, controlador.listarMascotas)
router.post('/mascotas', verificarToken, controlador.crearMascota)

module.exports = router