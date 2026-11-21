
const db = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
// Registra un nuevo dueño de mascota
async function registrarUsuario(req, res) {
  const { nombre, correo, contrasena } = req.body || {}

  // 1. Validar los datos recibidos
  if (
    typeof nombre !== 'string' ||
    typeof correo !== 'string' ||
    typeof contrasena !== 'string'
  ) {
    return res.status(400).json({
      error: 'Nombre, correo y contraseña son obligatorios'
    })
  }

  const nombreLimpio = nombre.trim()
  const correoLimpio = correo.trim().toLowerCase()

  if (
    !nombreLimpio ||
    nombreLimpio.length > 100 ||
    correoLimpio.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio) ||
    contrasena.length < 8 ||
    Buffer.byteLength(contrasena, 'utf8') > 72
  ) {
    return res.status(400).json({
      error: 'Revisa el nombre, correo y contraseña'
    })
  }

  let conexion

  try {
    // 2. Proteger la contraseña
    const hash = await bcrypt.hash(contrasena, 12)

    // 3. Iniciar una operación conjunta en PostgreSQL
    conexion = await db.connect()
    await conexion.query('BEGIN')

    // 4. Evitar correos duplicados
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

    // 5. Crear la ficha del cliente
    const cliente = await conexion.query(`
      INSERT INTO clientes (nombre, correo)
      VALUES ($1, $2)
      RETURNING id
    `, [nombreLimpio, correoLimpio])

    // 6. Crear su cuenta de acceso
    const resultado = await conexion.query(`
      INSERT INTO usuarios (
        cliente_id,
        nombre,
        correo,
        contrasena_hash
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, correo, rol, activo
    `, [
      cliente.rows[0].id,
      nombreLimpio,
      correoLimpio,
      hash
    ])

    // 7. Guardar ambas operaciones
    await conexion.query('COMMIT')

    return res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
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

    console.error('Error al registrar:', error.code || error.message)

    return res.status(500).json({
      error: 'No se pudo registrar el usuario'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

async function iniciarSesion(req, res) {
  // 1. Recibir el correo y la contraseña
  const { correo, contrasena } = req.body || {}

  // 2. Validar los datos
  if (
    typeof correo !== 'string' ||
    typeof contrasena !== 'string' ||
    !correo.trim() ||
    !contrasena
  ) {
    return res.status(400).json({
      error: 'Correo y contraseña son obligatorios'
    })
  }

  try {
    // 3. Buscar el usuario en RDS
    const resultado = await db.query(`
      SELECT
        id, cliente_id, nombre, correo,
        contrasena_hash, rol, activo
      FROM usuarios
      WHERE correo = $1
    `, [correo.trim().toLowerCase()])

    const usuario = resultado.rows[0]

    // 4. Comprobar la contraseña y el estado
    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      })
    }

    const claveCorrecta = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    )

    if (!claveCorrecta || !usuario.activo) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      })
    }

    // 5. Comprobar la clave privada
    const secreto = process.env.JWT_SECRET

    if (!secreto || secreto.length < 64) {
      console.error('JWT_SECRET no está configurada')
      return res.status(500).json({
        error: 'No se pudo iniciar sesión'
      })
    }

    // 6. Generar un JWT válido durante 1 hora
    const token = jwt.sign(
      { rol: usuario.rol },
      secreto,
      {
        algorithm: 'HS256',
        subject: usuario.id,
        expiresIn: '1h',
        issuer: 'vet-san-marcos-api',
        audience: 'vet-san-marcos'
      }
    )

    // 7. Devolver el token y los datos públicos
    return res.status(200).json({
      mensaje: 'Inicio de sesión correcto',
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario: {
        id: usuario.id,
        clienteId: usuario.cliente_id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error(
      'Error de autenticación:',
      error.code || error.message
    )

    return res.status(500).json({
      error: 'No se pudo iniciar sesión'
    })
  }
}

module.exports = { registrarUsuario, iniciarSesion }