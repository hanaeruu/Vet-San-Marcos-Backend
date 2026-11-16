const express = require('express')
const router = express.Router()
const mascotasController = require('../controllers/mascotas.controller')

router.get('/mascotas', mascotasController.listarMascotas)
router.post('/mascotas', mascotasController.crearMascota)

module.exports = router