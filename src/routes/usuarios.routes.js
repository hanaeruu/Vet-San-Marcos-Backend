const router = require('express').Router()
const { verificarToken } = require('../middleware/verificarToken')

const {
  listarUsuarios,
  modificarUsuario,
  desactivarUsuario
} = require('../controllers/usuarios.controller')

const {
  obtenerUsuario,
  modificarDatos,
  crearUsuario
} = require('../controllers/usuarios.cuenta.controller')

// Consultar usuarios (administrador)
router.get('/usuarios', verificarToken, listarUsuarios)

// Crear usuario con rol (administrador)
router.post('/usuarios', verificarToken, crearUsuario)

// Ver una cuenta (propia o administrador)
router.get('/usuarios/:id', verificarToken, obtenerUsuario)

// Modificar el rol de un usuario (administrador)
router.put('/usuarios/:id', verificarToken, modificarUsuario)

// Modificar nombre y correo (propia cuenta o administrador)
router.patch('/usuarios/:id', verificarToken, modificarDatos)

// Desactivar un usuario sin borrar sus datos
router.patch(
  '/usuarios/:id/desactivar',
  verificarToken,
  desactivarUsuario
)

module.exports = router
