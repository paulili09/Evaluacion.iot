#!/usr/bin/env bash
# ==============================================================================
# Colección de Pruebas cURL - LumiControl IoT REST API (ES03)
# Demuestra: 401 sin token, obtención JWT, refresh JWT, y CRUD completo
# ==============================================================================

BASE_URL="${1:-http://localhost:3000}"

echo "1) Health Check (AllowAny - debe devolver HTTP 200)"
curl -s -w "\nHTTP %{http_code}\n" "$BASE_URL/api/health/"

echo -e "\n2) Acceso SIN token a ruta protegida (IsAuthenticated - debe devolver HTTP 401)"
curl -s -w "\nHTTP %{http_code}\n" "$BASE_URL/api/luminarias/"

echo -e "\n3) Autenticación JWT con usuario/contraseña (POST /api/token/)"
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/token/" \
  -H "Content-Type: application/json" \
  -d '{"username": "sofia", "password": "lumi2026"}')
echo "$TOKEN_RESPONSE"

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"refresh":"[^"]*' | cut -d'"' -f4)

echo -e "\n4) Listar Luminarias CON Bearer Token (GET /api/luminarias/)"
curl -s -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE_URL/api/luminarias/"

echo -e "\n5) Crear nueva Luminaria (POST /api/luminarias/ -> HTTP 201)"
CREATED=$(curl -s -X POST "$BASE_URL/api/luminarias/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Foco Terraza API","room":"Terraza","roomType":"salon","brightness":75,"colorTemp":3000,"isOn":true}')
echo "$CREATED"
NEW_ID=$(echo "$CREATED" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo -e "\n6) Actualizar Luminaria parcialmente (PATCH /api/luminarias/$NEW_ID/ -> HTTP 200)"
curl -s -w "\nHTTP %{http_code}\n" -X PATCH "$BASE_URL/api/luminarias/$NEW_ID/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brightness":45,"colorTemp":2400}'

echo -e "\n7) Refrescar Access Token (POST /api/token/refresh/ -> HTTP 200)"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE_URL/api/token/refresh/" \
  -H "Content-Type: application/json" \
  -d "{\"refresh\": \"$REFRESH_TOKEN\"}"

echo -e "\n8) Eliminar Luminaria de prueba (DELETE /api/luminarias/$NEW_ID/ -> HTTP 204)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X DELETE "$BASE_URL/api/luminarias/$NEW_ID/" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
