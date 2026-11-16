const router = require('express').Router()
const { verificarToken } = require('../middleware/verificarToken')

const {
  listarUsuarios,
  modificarUsuario
} = require('../controllers/usuarios.controller')

// Consultar usuarios
router.get('/usuarios', verificarToken, listarUsuarios)

// Modificar el rol de un usuario
router.put('/usuarios/:id', verificarToken, modificarUsuario)

module.exports = router