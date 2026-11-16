const router = require('express').Router()
const { verificarToken } = require('../middleware/verificarToken')

const {
  listarUsuarios,
  modificarUsuario,
  desactivarUsuario
} = require('../controllers/usuarios.controller')

// Consultar usuarios
router.get('/usuarios', verificarToken, listarUsuarios)

// Modificar el rol de un usuario
router.put('/usuarios/:id', verificarToken, modificarUsuario)

// Desactivar un usuario sin borrar sus datos
router.patch(
  '/usuarios/:id/desactivar',
  verificarToken,
  desactivarUsuario
)

module.exports = router