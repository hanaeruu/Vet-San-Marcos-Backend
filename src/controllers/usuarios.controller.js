
const db = require('../config/db')

// Obtiene los usuarios registrados
async function listarUsuarios(req, res) {

  // Solo el administrador puede ver el listado
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({
      error: 'No tienes permiso para ver los usuarios'
    })
  }

  try {
    // Consultar los usuarios en PostgreSQL
    const resultado = await db.query(`
      SELECT
        id,
        nombre,
        correo,
        rol,
        activo,
        creado_en AS "creadoEn"
      FROM usuarios
      ORDER BY creado_en DESC
      LIMIT 100
    `)

    // Devolver el listado sin contraseñas
    return res.status(200).json({
      usuarios: resultado.rows
    })

  } catch (error) {
    console.error('Error al listar usuarios:', error.code)

    return res.status(500).json({
      error: 'No se pudieron consultar los usuarios'
    })
  }
}

async function modificarUsuario(req, res) {
  // Solo los administradores pueden modificar usuarios
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({
      error: 'No tienes permiso para modificar usuarios'
    })
  }

  const { id } = req.params
  const { rol } = req.body || {}

  // Comprobar el identificador
  const uuidValido =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidValido.test(id)) {
    return res.status(400).json({
      error: 'Identificador de usuario inválido'
    })
  }

  // Solo permitir roles conocidos
  const rolesPermitidos = [
    'cliente',
    'admin',
    'recepcion',
    'veterinario',
    'tecnico'
  ]

  if (!rolesPermitidos.includes(rol)) {
    return res.status(400).json({
      error: 'Rol no válido'
    })
  }

  // Evitar que un administrador cambie su propio rol
  if (id === req.usuario.id) {
    return res.status(400).json({
      error: 'No puedes modificar tu propio rol'
    })
  }

  try {
    const resultado = await db.query(`
      UPDATE usuarios
      SET rol = $1
      WHERE id = $2
      RETURNING id, nombre, correo, rol, activo
    `, [rol, id])

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      })
    }

    return res.status(200).json({
      mensaje: 'Usuario actualizado correctamente',
      usuario: resultado.rows[0]
    })
  } catch (error) {
    console.error('Error al modificar usuario:', error.code)

    return res.status(500).json({
      error: 'No se pudo modificar el usuario'
    })
  }
}

module.exports = { listarUsuarios, modificarUsuario }
