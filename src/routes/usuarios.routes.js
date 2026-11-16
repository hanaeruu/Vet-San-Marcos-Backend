
const router = require('express').Router()

const { verificarToken } = require('../middleware/verificarToken')
const { listarUsuarios } = require('../controllers/usuarios.controller')

// Listar usuarios, solo con autenticación y permiso de administrador
router.get('/usuarios', verificarToken, listarUsuarios)

module.exports = router
