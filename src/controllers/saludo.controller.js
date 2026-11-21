exports.saludar = (req, res) => {
  const nombre = String(req.query.nombre || 'estudiante')
    .slice(0, 60)
  res.json({
    mensaje: `Hola, ${nombre}`,
    backend: 'Node.js + Express en EC2',
    lenguaje: 'Node.js'
  })
}
