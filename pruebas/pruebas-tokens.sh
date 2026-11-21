#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
set -a; source .env; set +a
[ -z "$JWT_SECRET" ] && { echo "Falta JWT_SECRET en .env"; exit 1; }
BASE="${BASE:-http://localhost:3000/api}"
OK=0; FALLO=0
UUID_FALSO="11111111-1111-4111-8111-111111111111"

pasa()  { OK=$((OK+1)); echo "PASS  $1"; }
falla() { FALLO=$((FALLO+1)); echo "FAIL  $1"; }
forjar() { node pruebas/forjar.js "$@"; }
# probar "descripción" CODIGO_ESPERADO "valor del encabezado Authorization"
probar() {
  local args=(-s -o /dev/null -w "%{http_code}" "$BASE/auth/me")
  [ -n "$3" ] && args+=(-H "Authorization: $3")
  local c; c=$(curl "${args[@]}")
  if [ "$c" = "$2" ]; then pasa "$1 ($c)"; else falla "$1: esperado $2, obtenido $c"; fi
}

read -rp "Correo del admin: " CORREO
read -rsp "Clave del admin: " CLAVE; echo
R=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"correo\":\"$CORREO\",\"contrasena\":\"$CLAVE\"}")
TOKEN_REAL=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).accessToken || ""' 2>/dev/null)
[ ${#TOKEN_REAL} -lt 100 ] && { echo "No se pudo iniciar sesión."; exit 1; }
export TOKEN_REAL

echo; echo "== Contenido público del token (sin la firma) =="
node -e '
const p = process.env.TOKEN_REAL.split(".")
const h = JSON.parse(Buffer.from(p[0], "base64url"))
const d = JSON.parse(Buffer.from(p[1], "base64url"))
const f = (s) => new Date(s * 1000).toISOString()
console.log("algoritmo:", h.alg, "| tipo:", h.typ)
console.log("sub (usuario):", d.sub)
console.log("rol:", d.rol, "| iss:", d.iss, "| aud:", d.aud)
console.log("emitido:", f(d.iat), "| expira:", f(d.exp), "| vigencia:", d.exp - d.iat, "s")
console.log("campos:", Object.keys(d).join(", "))'

ME=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $TOKEN_REAL")
ID=$(echo "$ME" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).usuario.id')
ROL=$(echo "$ME" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).usuario.rol')

echo; echo "== Formato del encabezado =="
probar "Sin encabezado Authorization" 401 ""
probar "Esquema Basic en lugar de Bearer" 401 "Basic abc123"
probar "Token sin la palabra Bearer" 401 "$TOKEN_REAL"
probar "Bearer sin token" 401 "Bearer "
probar "Bearer con basura" 401 "Bearer esto.no.es.un.token"
probar "Bearer en minúscula (válido)" 200 "bearer $TOKEN_REAL"
probar "Token válido" 200 "Bearer $TOKEN_REAL"

echo; echo "== Manipulación del token =="
probar "Firma alterada" 401 "Bearer $(forjar firma)"
probar "Payload alterado con la firma original" 401 "Bearer $(forjar payload)"
probar "Firmado con otra clave" 401 "Bearer $(forjar otraclave "$ID" "$ROL")"
probar "Algoritmo HS512 (no permitido)" 401 "Bearer $(forjar hs512 "$ID" "$ROL")"
probar "Algoritmo none (sin firma)" 401 "Bearer $(forjar none "$ID" "$ROL")"

echo; echo "== Contenido del token =="
probar "Emisor (iss) incorrecto" 401 "Bearer $(forjar issmalo "$ID" "$ROL")"
probar "Destinatario (aud) incorrecto" 401 "Bearer $(forjar audmala "$ID" "$ROL")"
probar "Sin sub" 401 "Bearer $(forjar sinsub "$ID" "$ROL")"
probar "Usuario inexistente en la BD" 401 "Bearer $(forjar valido "$UUID_FALSO" "$ROL")"
probar "Rol del token distinto al de la BD" 401 "Bearer $(forjar valido "$ID" cliente)"
probar "Sin fecha de expiración (exp)" 401 "Bearer $(forjar sinexp "$ID" "$ROL")"

echo; echo "== Vencimiento =="
probar "Token ya vencido" 401 "Bearer $(forjar expirado "$ID" "$ROL")"
T2=$(forjar expira2s "$ID" "$ROL")
probar "Token de 2 s: válido al emitirlo" 200 "Bearer $T2"
echo "Esperando 3 segundos..."; sleep 3
probar "Token de 2 s: rechazado al vencer" 401 "Bearer $T2"

echo; echo "Resultado: $OK correctas, $FALLO fallidas"
[ "$FALLO" -eq 0 ]
