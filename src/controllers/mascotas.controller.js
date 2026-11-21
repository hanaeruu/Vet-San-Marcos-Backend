const db = require('../config/db')
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Un cliente solo ve y crea mascotas propias; el resto de roles, todas
const esCliente = (req) => req.usuario?.rol === 'cliente'

exports.listarMascotas = async (req, res) => {
  let filtroCliente = null

  if (esCliente(req)) {
    filtroCliente = req.usuario.clienteId
    if (!filtroCliente) {
      return res.status(403).json({
        error: 'Tu cuenta no tiene una ficha de cliente'
      })
    }
  }

  try {
    const resultado = await db.query(`
      SELECT m.id, m.cliente_id AS "clienteId", m.nombre,
        m.especie, m.raza, m.sexo,
        m.fecha_nacimiento AS "fechaNacimiento",
        m.peso_kg AS "pesoKg", m.color, m.microchip,
        m.activo, m.creado_en AS "creadoEn",
        c.correo AS "tutorCorreo"
      FROM mascotas m
      JOIN clientes c ON c.id = m.cliente_id
      WHERE m.activo = TRUE
        AND ($1::uuid IS NULL OR m.cliente_id = $1::uuid)
      ORDER BY m.creado_en DESC, m.id
    `, [filtroCliente])

    return res.status(200).json(resultado.rows)
  } catch (error) {
    console.error('Error GET mascotas:', error.code || 'DB_ERROR')
    return res.status(500).json({ error: 'Error al consultar mascotas' })
  }
}

exports.crearMascota = async (req, res) => {
  const { nombre, especie } = req.body || {}

  // Cliente: siempre para sí mismo. Personal: indica clienteId en el body
  const clienteId = esCliente(req)
    ? req.usuario.clienteId
    : req.body?.clienteId

  if (typeof clienteId !== 'string' || !uuid.test(clienteId) ||
      typeof nombre !== 'string' || !nombre.trim() ||
      nombre.trim().length > 100 ||
      typeof especie !== 'string' || !especie.trim() ||
      especie.trim().length > 40) {
    return res.status(400).json({
      error: 'Revisa clienteId, nombre y especie'
    })
  }

  try {
    const resultado = await db.query(`
      INSERT INTO mascotas (cliente_id, nombre, especie)
      SELECT id, $2, $3 FROM clientes
      WHERE id = $1 AND activo = TRUE
      RETURNING id, cliente_id AS "clienteId", nombre,
        especie, activo, creado_en AS "creadoEn"
    `, [clienteId, nombre.trim(), especie.trim()])

    if (resultado.rowCount === 0) {
      return res.status(400).json({
        error: 'El cliente no existe o esta inactivo'
      })
    }

    return res.status(201).json(resultado.rows[0])
  } catch (error) {
    console.error('Error POST mascotas:', error.code || 'DB_ERROR')
    return res.status(500).json({ error: 'Error al crear mascota' })
  }
}