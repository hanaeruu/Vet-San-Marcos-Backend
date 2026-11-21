// Fabrica tokens defectuosos para probar el rechazo. Solo para pruebas.
const jwt = require('jsonwebtoken')
const [caso, id, rol] = process.argv.slice(2)
const secreto = process.env.JWT_SECRET
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

const opciones = {
  algorithm: 'HS256',
  subject: id,
  issuer: 'vet-san-marcos-api',
  audience: 'vet-san-marcos',
  expiresIn: '1h'
}
const carga = { rol }
let clave = secreto

if (caso === 'none') {
  const ahora = Math.floor(Date.now() / 1000)
  console.log(
    b64({ alg: 'none', typ: 'JWT' }) + '.' +
    b64({ rol, sub: id, iss: opciones.issuer, aud: opciones.audience,
          iat: ahora, exp: ahora + 3600 }) + '.'
  )
  process.exit(0)
}

if (caso === 'payload' || caso === 'firma') {
  const partes = process.env.TOKEN_REAL.split('.')
  if (caso === 'payload') {
    const d = JSON.parse(Buffer.from(partes[1], 'base64url'))
    d.exp += 999999
    partes[1] = b64(d)
  } else {
    partes[2] = (partes[2][0] === 'A' ? 'B' : 'A') + partes[2].slice(1)
  }
  console.log(partes.join('.'))
  process.exit(0)
}

if (caso === 'expirado') { delete opciones.expiresIn; carga.exp = Math.floor(Date.now() / 1000) - 60 }
if (caso === 'expira2s') opciones.expiresIn = 2
if (caso === 'sinexp') delete opciones.expiresIn
if (caso === 'otraclave') clave = 'x'.repeat(64)
if (caso === 'hs512') opciones.algorithm = 'HS512'
if (caso === 'issmalo') opciones.issuer = 'otro-emisor'
if (caso === 'audmala') opciones.audience = 'otra-audiencia'
if (caso === 'sinsub') delete opciones.subject

console.log(jwt.sign(carga, clave, opciones))
