const db = require('../config/db')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const rol = (req) => req.usuario?.rol
const puedeGestionar = (req) => ['admin', 'recepcion'].includes(rol(req))
const veTodos = (req) => rol(req) !== 'cliente'

const COLUMNAS = `id, nombre, descripcion, precio::float8 AS precio,
  duracion_min AS "duracionMin", activo, creado_en AS "creadoEn"`

// Valida el cuerpo y devuelve los datos limpios o un mensaje de error
function leerDatos(body) {
  const { nombre, descripcion, precio, duracionMin, activo } = body || {}

  if (typeof nombre !== 'string' ||
      nombre.trim().length < 2 || nombre.trim().length > 100) {
    return { error: 'El nombre debe tener entre 2 y 100 caracteres' }
  }
  if (descripcion !== undefined && descripcion !== null &&
      (typeof descripcion !== 'string' || descripcion.length > 500)) {
    return { error: 'La descripción admite hasta 500 caracteres' }
  }
  if (typeof precio !== 'number' || !Number.isFinite(precio) ||
      precio < 0 || precio > 100000000) {
    return { error: 'El precio debe ser un número entre 0 y 100000000' }
  }
  if (!Number.isInteger(duracionMin) || duracionMin < 5 || duracionMin > 480) {
    return { error: 'La duración debe ser un entero entre 5 y 480 minutos' }
  }
  if (activo !== undefined && typeof activo !== 'boolean') {
    return { error: 'El campo activo debe ser verdadero o falso' }
  }

  return {
    datos: {
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      precio,
      duracionMin,
      activo
    }
  }
}

async function listarServicios(req, res) {
  try {
    const resultado = await db.query(`
      SELECT ${COLUMNAS} FROM servicios
      WHERE ($1::boolean OR activo = TRUE)
      ORDER BY nombre
    `, [veTodos(req)])

    return res.status(200).json(resultado.rows)
  } catch (error) {
    console.error('Error al listar servicios:', error.code || error.message)
    return res.status(500).json({ error: 'No se pudieron consultar los servicios' })
  }
}

async function obtenerServicio(req, res) {
  const { id } = req.params

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }

  try {
    const resultado = await db.query(`
      SELECT ${COLUMNAS} FROM servicios
      WHERE id = $1 AND ($2::boolean OR activo = TRUE)
    `, [id, veTodos(req)])

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' })
    }

    return res.status(200).json(resultado.rows[0])
  } catch (error) {
    console.error('Error al consultar servicio:', error.code || error.message)
    return res.status(500).json({ error: 'No se pudo consultar el servicio' })
  }
}

async function crearServicio(req, res) {
  if (!puedeGestionar(req)) {
    return res.status(403).json({ error: 'No tienes permiso para crear servicios' })
  }

  const { error, datos } = leerDatos(req.body)
  if (error) return res.status(400).json({ error })

  try {
    const resultado = await db.query(`
      INSERT INTO servicios (nombre, descripcion, precio, duracion_min, activo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${COLUMNAS}
    `, [datos.nombre, datos.descripcion, datos.precio,
        datos.duracionMin, datos.activo ?? true])

    return res.status(201).json(resultado.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un servicio con ese nombre' })
    }
    console.error('Error al crear servicio:', err.code || err.message)
    return res.status(500).json({ error: 'No se pudo crear el servicio' })
  }
}

async function modificarServicio(req, res) {
  if (!puedeGestionar(req)) {
    return res.status(403).json({ error: 'No tienes permiso para modificar servicios' })
  }

  const { id } = req.params

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }

  const { error, datos } = leerDatos(req.body)
  if (error) return res.status(400).json({ error })

  try {
    const resultado = await db.query(`
      UPDATE servicios
      SET nombre = $2, descripcion = $3, precio = $4,
          duracion_min = $5, activo = COALESCE($6::boolean, activo)
      WHERE id = $1
      RETURNING ${COLUMNAS}
    `, [id, datos.nombre, datos.descripcion, datos.precio,
        datos.duracionMin, datos.activo ?? null])

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' })
    }

    return res.status(200).json(resultado.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un servicio con ese nombre' })
    }
    console.error('Error al modificar servicio:', err.code || err.message)
    return res.status(500).json({ error: 'No se pudo modificar el servicio' })
  }
}

async function eliminarServicio(req, res) {
  if (rol(req) !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para eliminar servicios' })
  }

  const { id } = req.params

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }

  try {
    const resultado = await db.query(
      'DELETE FROM servicios WHERE id = $1 RETURNING id', [id]
    )

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' })
    }

    return res.status(204).send()
  } catch (err) {
    // 23503: hay citas que usan este servicio
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'El servicio tiene citas asociadas; desactívalo en lugar de eliminarlo'
      })
    }
    console.error('Error al eliminar servicio:', err.code || err.message)
    return res.status(500).json({ error: 'No se pudo eliminar el servicio' })
  }
}

module.exports = {
  listarServicios,
  obtenerServicio,
  crearServicio,
  modificarServicio,
  eliminarServicio
}
