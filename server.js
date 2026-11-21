const app = require('./src/app')
const puerto = Number(process.env.PORT || 3000)
app.listen(puerto, '0.0.0.0', () => {
  console.log(`API Express lista en puerto ${puerto}`)
})
