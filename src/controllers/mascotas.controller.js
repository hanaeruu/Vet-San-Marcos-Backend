const db = require('../config/db')

async function listarMascotas(req, res) {
  try {
    const resultado = await db.query(`
      SELECT
        m.id,
        m.cliente_id AS "clienteId",
        m.nombre,
        m.especie,
        m.raza,
        m.sexo,
        m.fecha_nacimiento AS "fechaNacimiento",
        m.peso_kg AS "pesoKg",
        m.color,
        m.microchip,
        m.activo,
        m.creado_en AS "creadoEn",
        c.correo AS "tutorCorreo"
      FROM mascotas m
      JOIN clientes c ON c.id = m.cliente_id
      WHERE m.activo = TRUE
      ORDER BY m.creado_en DESC, m.id
    `)

    res.status(200).json(resultado.rows)
  } catch (error) {
    console.error('Error al consultar mascotas:', error.code)
    res.status(500).json({
      error: 'No se pudieron consultar las mascotas'
    })
  }
}

async function crearMascota(req, res) {
  const { clienteId, nombre, especie } = req.body || {}

  const uuidValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (
    typeof clienteId !== 'string' ||
    !uuidValido.test(clienteId) ||
    typeof nombre !== 'string' ||
    !nombre.trim() ||
    nombre.trim().length > 100 ||
    typeof especie !== 'string' ||
    !especie.trim() ||
    especie.trim().length > 40
  ) {
    return res.status(400).json({
      error: 'Indica clienteId válido, nombre y especie'
    })
  }

  try {
    const resultado = await db.query(`
      INSERT INTO mascotas (cliente_id, nombre, especie)
      SELECT id, $2, $3
      FROM clientes
      WHERE id = $1 AND activo = TRUE
      RETURNING
        id,
        cliente_id AS "clienteId",
        nombre,
        especie,
        activo,
        creado_en AS "creadoEn"
    `, [clienteId, nombre.trim(), especie.trim()])

    if (resultado.rowCount === 0) {
      return res.status(400).json({
        error: 'El cliente no existe o está inactivo'
      })
    }

    return res.status(201).json(resultado.rows[0])
  } catch (error) {
    console.error('Error al crear mascota:', error.code)
    return res.status(500).json({
      error: 'No se pudo registrar la mascota'
    })
  }
}

module.exports = { listarMascotas, crearMascota }