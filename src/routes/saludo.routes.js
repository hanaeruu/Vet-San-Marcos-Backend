const router = require('express').Router()
const controlador = require('../controllers/saludo.controller')
router.get('/saludo', controlador.saludar)
module.exports = router
