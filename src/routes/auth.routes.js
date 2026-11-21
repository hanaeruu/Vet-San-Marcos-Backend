const router = require('express').Router()
const authController = require('../controllers/auth.controller')
const { verificarToken } = require('../middleware/verificarToken')

// Crear cuenta
router.post('/auth/registro', authController.registrarUsuario)

// Iniciar sesión y obtener JWT
router.post('/auth/login', authController.iniciarSesion)

// Consultar mi cuenta, requiere JWT válido
router.get('/auth/me', verificarToken, (req, res) => {
  return res.status(200).json({
    usuario: req.usuario
  })
})

module.exports = router