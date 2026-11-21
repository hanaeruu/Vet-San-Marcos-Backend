const db = require('../config/db')
const bcrypt = require('bcryptjs')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CORREO = /^\S+@\S+\.\S+$/
const ROLES = ['cliente', 'admin', 'recepcion', 'veterinario', 'tecnico']

const nombreValido = (n) =>
  typeof n === 'string' && n.trim() !== '' && n.trim().length <= 100
const correoValido = (c) =>
  typeof c === 'string' && c.trim().length <= 254 && CORREO.test(c.trim())

// Ver un usuario: solo su propia cuenta o el administrador
async function obtenerUsuario(req, res) {
  const { id } = req.params

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }

  if (req.usuario?.rol !== 'admin' && req.usuario?.id !== id) {
    return res.status(403).json({
      error: 'No tienes permiso para ver esta cuenta'
    })
  }

  try {
    const resultado = await db.query(`
      SELECT id, nombre, correo, rol, activo, creado_en AS "creadoEn"
      FROM usuarios
      WHERE id = $1
    `, [id])

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    return res.status(200).json({ usuario: resultado.rows[0] })
  } catch (error) {
    console.error('Error al consultar usuario:', error.code)
    return res.status(500).json({
      error: 'No se pudo consultar el usuario'
    })
  }
}

// Modificar nombre y correo: solo la propia cuenta o el administrador
async function modificarDatos(req, res) {
  const { id } = req.params

  if (!UUID.test(id)) {
    return res.status(400).json({ error: 'Identificador no válido' })
  }

  if (req.usuario?.rol !== 'admin' && req.usuario?.id !== id) {
    return res.status(403).json({
      error: 'No tienes permiso para modificar esta cuenta'
    })
  }

  const { nombre, correo, rol } = req.body || {}

  // El rol solo se cambia en PUT /usuarios/:id (administrador)
  if (rol !== undefined) {
    return res.status(400).json({
      error: 'El rol no se modifica en esta ruta'
    })
  }

  if (nombre === undefined && correo === undefined) {
    return res.status(400).json({ error: 'No hay datos para modificar' })
  }

  if (
    (nombre !== undefined && !nombreValido(nombre)) ||
    (correo !== undefined && !correoValido(correo))
  ) {
    return res.status(400).json({ error: 'Nombre o correo no válidos' })
  }

  const nombreLimpio = nombre !== undefined ? nombre.trim() : null
  const correoLimpio =
    correo !== undefined ? correo.trim().toLowerCase() : null

  let conexion

  try {
    conexion = await db.connect()
    await conexion.query('BEGIN')

    const resultado = await conexion.query(`
      UPDATE usuarios
      SET nombre = COALESCE($2, nombre),
          correo = COALESCE($3, correo)
      WHERE id = $1
      RETURNING id, cliente_id, nombre, correo, rol, activo
    `, [id, nombreLimpio, correoLimpio])

    if (resultado.rowCount === 0) {
      await conexion.query('ROLLBACK')
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const { cliente_id: clienteId, ...usuario } = resultado.rows[0]

    // Mantener la ficha del cliente sincronizada (el personal puede no tenerla)
    if (clienteId) {
      await conexion.query(`
        UPDATE clientes
        SET nombre = COALESCE($2, nombre),
            correo = COALESCE($3, correo)
        WHERE id = $1
      `, [clienteId, nombreLimpio, correoLimpio])
    }

    await conexion.query('COMMIT')

    return res.status(200).json({
      mensaje: 'Datos actualizados correctamente',
      usuario
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
      return res.status(409).json({
        error: 'Este correo ya está registrado'
      })
    }

    console.error('Error al modificar datos:', error.code || error.message)

    return res.status(500).json({
      error: 'No se pudieron modificar los datos'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

// Crear un usuario con rol: solo el administrador
async function crearUsuario(req, res) {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({
      error: 'No tienes permiso para crear usuarios'
    })
  }

  const { nombre, correo, contrasena, rol } = req.body || {}

  if (
    !nombreValido(nombre) ||
    !correoValido(correo) ||
    typeof contrasena !== 'string' ||
    contrasena.length < 8 ||
    Buffer.byteLength(contrasena, 'utf8') > 72 ||
    !ROLES.includes(rol)
  ) {
    return res.status(400).json({
      error: 'Revisa nombre, correo, contraseña y rol'
    })
  }

  const nombreLimpio = nombre.trim()
  const correoLimpio = correo.trim().toLowerCase()

  let conexion

  try {
    const hash = await bcrypt.hash(contrasena, 12)

    conexion = await db.connect()
    await conexion.query('BEGIN')

    // Evitar correos duplicados en ambas tablas
    const existe = await conexion.query(`
      SELECT correo FROM usuarios WHERE correo = $1
      UNION
      SELECT correo FROM clientes WHERE correo = $1
      LIMIT 1
    `, [correoLimpio])

    if (existe.rowCount > 0) {
      await conexion.query('ROLLBACK')
      return res.status(409).json({
        error: 'Este correo ya está registrado'
      })
    }

    // Solo los clientes tienen ficha en la tabla clientes
    let clienteId = null

    if (rol === 'cliente') {
      const cliente = await conexion.query(`
        INSERT INTO clientes (nombre, correo)
        VALUES ($1, $2)
        RETURNING id
      `, [nombreLimpio, correoLimpio])

      clienteId = cliente.rows[0].id
    }

    const resultado = await conexion.query(`
      INSERT INTO usuarios (
        cliente_id, nombre, correo, contrasena_hash, rol
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, correo, rol, activo
    `, [clienteId, nombreLimpio, correoLimpio, hash, rol])

    await conexion.query('COMMIT')

    return res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: resultado.rows[0]
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
      return res.status(409).json({
        error: 'Este correo ya está registrado'
      })
    }

    console.error('Error al crear usuario:', error.code || error.message)

    return res.status(500).json({
      error: 'No se pudo crear el usuario'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

module.exports = { obtenerUsuario, modificarDatos, crearUsuario }