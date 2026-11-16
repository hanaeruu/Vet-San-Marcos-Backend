
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

module.exports = { listarUsuarios }
