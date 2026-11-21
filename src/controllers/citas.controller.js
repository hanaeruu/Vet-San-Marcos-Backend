const db = require('../config/db')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESTADOS = ['pendiente', 'confirmada', 'atendida', 'cancelada']
const rol = (req) => req.usuario?.rol
const esGestor = (req) => ['admin', 'recepcion'].includes(rol(req))
const uuidValido = (v) => typeof v === 'string' && UUID.test(v)

const BASE = `
  SELECT c.id, c.cliente_id AS "clienteId", c.mascota_id AS "mascotaId",
    m.nombre AS "mascotaNombre", c.servicio_id AS "servicioId",
    s.nombre AS "servicioNombre", c.veterinario_id AS "veterinarioId",
    c.fecha_hora AS "fechaHora", c.motivo, c.precio::float8 AS precio,
    c.estado, c.creado_en AS "creadoEn", c.actualizado_en AS "actualizadoEn"
  FROM citas c
  JOIN mascotas m ON m.id = c.mascota_id
  JOIN servicios s ON s.id = c.servicio_id`

// Quién puede ver una cita concreta
function puedeVer(req, cita) {
  if (rol(req) === 'cliente') return cita.clienteId === req.usuario.clienteId
  if (rol(req) === 'veterinario') return cita.veterinarioId === req.usuario.id
  return true
}

async function listarCitas(req, res) {
  const condiciones = []
  const params = []

  if (rol(req) === 'cliente') {
    if (!req.usuario.clienteId) {
      return res.status(403).json({ error: 'Tu cuenta no tiene una ficha de cliente' })
    }
    params.push(req.usuario.clienteId)
    condiciones.push(`c.cliente_id = $${params.length}`)
  } else if (rol(req) === 'veterinario') {
    params.push(req.usuario.id)
    condiciones.push(`c.veterinario_id = $${params.length}`)
  }

  if (req.query.estado !== undefined) {
    if (!ESTADOS.includes(req.query.estado)) {
      return res.status(400).json({ error: 'Estado no válido' })
    }
    params.push(req.query.estado)
    condiciones.push(`c.estado = $${params.length}`)
  }

  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''

  try {
    const resultado = await db.query(
      `${BASE} ${where} ORDER BY c.fecha_hora DESC LIMIT 200`, params
    )
    return res.status(200).json(resultado.rows)
  } catch (error) {
    console.error('Error al listar citas:', error.code || error.message)
    return res.status(500).json({ error: 'No se pudieron consultar las citas' })
  }
}

async function obtenerCita(req, res) {
  const { id } = req.params

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }

  try {
    const resultado = await db.query(`${BASE} WHERE c.id = $1`, [id])

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' })
    }

    if (!puedeVer(req, resultado.rows[0])) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta cita' })
    }

    return res.status(200).json(resultado.rows[0])
  } catch (error) {
    console.error('Error al consultar cita:', error.code || error.message)
    return res.status(500).json({ error: 'No se pudo consultar la cita' })
  }
}

async function crearCita(req, res) {
  const esCliente = rol(req) === 'cliente'

  if (!esCliente && !esGestor(req)) {
    return res.status(403).json({ error: 'No tienes permiso para agendar citas' })
  }

  const { mascotaId, servicioId, fechaHora, motivo, veterinarioId } = req.body || {}
  const clienteId = esCliente ? req.usuario.clienteId : req.body?.clienteId

  if (esCliente && !clienteId) {
    return res.status(403).json({ error: 'Tu cuenta no tiene una ficha de cliente' })
  }

  if (esCliente && veterinarioId !== undefined) {
    return res.status(400).json({ error: 'El cliente no elige veterinario' })
  }

  const fecha = typeof fechaHora === 'string' ? new Date(fechaHora) : null

  if (
    !uuidValido(clienteId) || !uuidValido(mascotaId) || !uuidValido(servicioId) ||
    (veterinarioId !== undefined && !uuidValido(veterinarioId)) ||
    !fecha || Number.isNaN(fecha.getTime()) ||
    (motivo !== undefined && (typeof motivo !== 'string' || motivo.length > 500))
  ) {
    return res.status(400).json({
      error: 'Revisa clienteId, mascotaId, servicioId, fechaHora, motivo y veterinarioId'
    })
  }

  if (fecha.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'La fecha de la cita debe ser futura' })
  }

  try {
    // El precio sale del servicio; la mascota debe ser del cliente
    const resultado = await db.query(`
      INSERT INTO citas (cliente_id, mascota_id, servicio_id, veterinario_id,
                         fecha_hora, motivo, precio)
      SELECT m.cliente_id, m.id, s.id, v.id, $4::timestamptz, $5::text, s.precio
      FROM mascotas m
      JOIN clientes cl ON cl.id = m.cliente_id AND cl.activo = TRUE
      JOIN servicios s ON s.id = $3::uuid AND s.activo = TRUE
      LEFT JOIN usuarios v ON v.id = $6::uuid
        AND v.rol = 'veterinario' AND v.activo = TRUE
      WHERE m.id = $2::uuid AND m.cliente_id = $1::uuid AND m.activo = TRUE
        AND ($6::uuid IS NULL OR v.id IS NOT NULL)
      RETURNING id
    `, [clienteId, mascotaId, servicioId, fecha.toISOString(),
        motivo ? motivo.trim() : null, veterinarioId || null])

    if (resultado.rowCount === 0) {
      return res.status(400).json({
        error: 'La mascota, el servicio o el veterinario no son válidos para esta cita'
      })
    }

    const detalle = await db.query(`${BASE} WHERE c.id = $1`, [resultado.rows[0].id])
    return res.status(201).json(detalle.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El veterinario ya tiene una cita a esa hora' })
    }
    console.error('Error al crear cita:', error.code || error.message)
    return res.status(500).json({ error: 'No se pudo crear la cita' })
  }
}

async function cambiarEstado(req, res) {
  const { id } = req.params
  const { estado, veterinarioId } = req.body || {}

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }
  if (!ESTADOS.includes(estado) || estado === 'pendiente') {
    return res.status(400).json({ error: 'Estado no válido' })
  }
  if (veterinarioId !== undefined && !uuidValido(veterinarioId)) {
    return res.status(400).json({ error: 'Veterinario no válido' })
  }
  if (veterinarioId !== undefined && estado !== 'confirmada') {
    return res.status(400).json({ error: 'Solo se asigna veterinario al confirmar' })
  }

  let conexion

  try {
    conexion = await db.connect()
    await conexion.query('BEGIN')

    const actual = await conexion.query(`
      SELECT cliente_id, veterinario_id, estado
      FROM citas WHERE id = $1 FOR UPDATE
    `, [id])

    if (actual.rowCount === 0) {
      await conexion.query('ROLLBACK')
      return res.status(404).json({ error: 'Cita no encontrada' })
    }

    const cita = actual.rows[0]
    const dueno = rol(req) === 'cliente' && cita.cliente_id === req.usuario.clienteId
    const asignado = rol(req) === 'veterinario' && cita.veterinario_id === req.usuario.id

    // Permiso según el estado que se quiere aplicar
    const permitido =
      estado === 'confirmada' ? esGestor(req)
      : estado === 'atendida' ? (asignado || rol(req) === 'admin')
      : (dueno || esGestor(req))

    if (!permitido) {
      await conexion.query('ROLLBACK')
      return res.status(403).json({ error: 'No tienes permiso para este cambio de estado' })
    }

    // Transiciones válidas
    const requerido =
      estado === 'confirmada' ? 'pendiente'
      : estado === 'atendida' ? 'confirmada'
      : null

    if (
      cita.estado === 'atendida' || cita.estado === 'cancelada' ||
      (requerido && cita.estado !== requerido)
    ) {
      await conexion.query('ROLLBACK')
      return res.status(409).json({
        error: `No se puede pasar de ${cita.estado} a ${estado}`
      })
    }

    // Para confirmar hace falta un veterinario válido
    let veterinario = null

    if (estado === 'confirmada') {
      veterinario = veterinarioId || cita.veterinario_id

      if (!veterinario) {
        await conexion.query('ROLLBACK')
        return res.status(400).json({ error: 'Debes asignar un veterinario para confirmar' })
      }

      const vet = await conexion.query(`
        SELECT 1 FROM usuarios
        WHERE id = $1 AND rol = 'veterinario' AND activo = TRUE
      `, [veterinario])

      if (vet.rowCount === 0) {
        await conexion.query('ROLLBACK')
        return res.status(400).json({ error: 'El veterinario no es válido' })
      }
    }

    await conexion.query(`
      UPDATE citas
      SET estado = $2,
          veterinario_id = COALESCE($3::uuid, veterinario_id),
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, estado, veterinario])

    await conexion.query('COMMIT')

    const detalle = await conexion.query(`${BASE} WHERE c.id = $1`, [id])

    return res.status(200).json({
      mensaje: 'Estado actualizado correctamente',
      cita: detalle.rows[0]
    })
  } catch (error) {
    if (conexion) {
      try {
        await conexion.query('ROLLBACK')
      } catch {
        // La conexión podría haberse interrumpido
      }
    }

    if (error.code === '23505') {
      return res.status(409).json({ error: 'El veterinario ya tiene una cita a esa hora' })
    }

    console.error('Error al cambiar estado:', error.code || error.message)
    return res.status(500).json({ error: 'No se pudo cambiar el estado' })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { listarCitas, obtenerCita, crearCita, cambiarEstado }
