# Veterinaria San Marcos | Backend

API REST desarrollada con Node.js, Express y PostgreSQL para la gestión de datos de Veterinaria San Marcos.

El proyecto utiliza Amazon EC2 para ejecutar el servidor y Amazon RDS para almacenar la información.

## Tecnologías utilizadas

- Node.js
- Express
- PostgreSQL
- Amazon EC2
- Amazon RDS
- JSON Web Token (JWT)
- BCrypt
- Git y GitHub

## Funcionalidades

| Operación | Estado | Descripción |
|---|---|---|
| Tabla de usuarios | Listo | Tabla creada en PostgreSQL con correo único, roles y contraseña protegida mediante hash. |
| Registro de usuarios | Listo | Permite registrar un cliente y su cuenta mediante una solicitud POST. |
| Inicio de sesión | Listo | Comprueba las credenciales y entrega un JWT válido. |
| Listar usuarios | En avance | Ruta GET implementada con autenticación y control de administrador. |
| Modificar usuarios | En avance | Ruta PUT iniciada para modificar roles. Pendiente de pruebas y permisos SQL. |
| Desactivar usuarios | En avance | Ruta PATCH iniciada para desactivar cuentas sin eliminarlas. Pendiente de pruebas y permisos SQL. |

## Estructura del proyecto

```text
src/
  app.js
  config/
    db.js
  controllers/
    auth.controller.js
    usuarios.controller.js
    mascotas.controller.js
    saludo.controller.js
  middleware/
    verificarToken.js
  routes/
    auth.routes.js
    usuarios.routes.js
    mascotas.routes.js
    saludo.routes.js
server.js
package.json
```

## Endpoints

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/registro` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión y obtener JWT |
| GET | `/api/auth/me` | Consultar la cuenta autenticada |
| GET | `/api/usuarios` | Listar usuarios, en avance |
| PUT | `/api/usuarios/:id` | Modificar rol, en avance |
| PATCH | `/api/usuarios/:id/desactivar` | Desactivar cuenta, en avance |

Las rutas privadas requieren un JWT válido. Las operaciones de administración también comprueban el rol del usuario.

## Instalación

Se necesita Node.js compatible con la opción `--env-file`, acceso a PostgreSQL y las variables de configuración correspondientes.

1. Clonar el repositorio.
2. Instalar dependencias con `npm ci`.
3. Crear un archivo `.env` con las variables privadas necesarias.
4. Ejecutar `npm start`.

El servidor utiliza el puerto `3000` por defecto.

### Variables de entorno

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `JWT_SECRET`
- `PORT` (opcional)

Las credenciales se mantienen fuera del repositorio.

La base de datos utilizada se encuentra en Amazon RDS y contiene las tablas `clientes`, `mascotas` y `usuarios`.

## Comprobaciones realizadas

| Comprobación | Resultado |
|---|---|
| Registro de usuario | HTTP 201 |
| Inicio de sesión correcto | HTTP 200 |
| Contraseña incorrecta | HTTP 401 |
| Ruta privada sin JWT | HTTP 401 |
| Ruta privada con JWT falso | HTTP 401 |
| Ruta privada con JWT válido | HTTP 200 |
| Listado solicitado por un cliente | HTTP 403 |

Las comprobaciones anteriores se realizaron mediante solicitudes HTTP desde la instancia EC2. La prueba del registro en Postman y las operaciones administrativas completas están pendientes.

## Próximos pasos

- Completar y probar la gestión de usuarios.
- Configurar los permisos SQL necesarios.
- Documentar la estructura de la base de datos.
- Incorporar Swagger.
- Integrar la autenticación con el frontend React.

## Integrantes | Grupo 9

**Hanael Echeverría**
ha.echeverria@duocuc.cl

**Matías Soto**
mat.sotoz@duocuc.cl