
const jwt = require('jsonwebtoken')
const db = require('../config/db')

// Comprueba el JWT antes de permitir el acceso
async function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || ''
  const coincidencia = encabezado.match(/^Bearer\s+(\S+)$/i)

  // 1. Exigir un token
  if (!coincidencia) {
    return res.status(401).json({
      error: 'Debes iniciar sesión'
    })
  }

  // 2. Comprobar la configuración privada
  const secreto = process.env.JWT_SECRET

  if (!secreto || secreto.length < 64) {
    return res.status(500).json({
      error: 'Error de configuración del servidor'
    })
  }

  let datosToken

  // 3. Verificar firma, duración y destinatario
  try {
    datosToken = jwt.verify(coincidencia[1], secreto, {
      algorithms: ['HS256'],
      issuer: 'vet-san-marcos-api',
      audience: 'vet-san-marcos'
    })
  } catch {
    return res.status(401).json({
      error: 'Token inválido o vencido'
    })
  }

  try {
    // 4. Comprobar que el usuario siga activo en RDS
    const resultado = await db.query(`
      SELECT id, cliente_id, nombre, correo, rol, activo
      FROM usuarios
      WHERE id = $1
    `, [datosToken.sub])

    const usuario = resultado.rows[0]

    if (
      !usuario ||
      !usuario.activo ||
      usuario.rol !== datosToken.rol
    ) {
      return res.status(401).json({
        error: 'Acceso no autorizado'
      })
    }

    // 5. Guardar los datos públicos del usuario
    req.usuario = {
      id: usuario.id,
      clienteId: usuario.cliente_id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    }

    // 6. Permitir continuar a la ruta protegida
    return next()
  } catch (error) {
    console.error('Error al comprobar usuario:', error.code)

    return res.status(500).json({
      error: 'No se pudo comprobar la sesión'
    })
  }
}

module.exports = { verificarToken } 