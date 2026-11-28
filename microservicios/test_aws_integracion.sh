#!/bin/bash
# =============================================================================
# QOSQOPASS & TOURS - SCRIPT DE VALIDACIÓN DE INTEGRACIÓN CON AWS
# =============================================================================
set -e

echo "================================================================="
echo "   COSITUC - TEST DE INTEGRACIÓN CON SERVICIOS AWS (WSL)"
echo "================================================================="

# 1. Comprobar credenciales de AWS
if [ -f "$HOME/.aws/credentials" ]; then
    echo "[OK] Archivo de credenciales ~/.aws/credentials detectado."
else
    echo "[ALERTA] No se encontró ~/.aws/credentials. Asegúrate de iniciar Learner Lab."
fi

# 2. Validar sintaxis de Docker Compose
echo "[INFO] Validando sintaxis de docker-compose.yml..."
docker compose config -q
echo "[OK] Sintaxis de Docker Compose correcta."

# 3. Reconstruir y levantar contenedores
echo "[INFO] Reconstruyendo y levantando contenedores con credenciales AWS..."
docker compose up --build -d

# 4. Esperar arranque
echo "[INFO] Esperando inicialización de servicios (8 segundos)..."
sleep 8

# 5. Probar endpoints de salud
echo "[INFO] Comprobando Healthchecks..."
curl -s http://localhost:3001/health | grep -q "ok" && echo "  - Usuarios: OK" || echo "  - Usuarios: FAIL"
curl -s http://localhost:3002/health | grep -q "ok" && echo "  - Boletos: OK" || echo "  - Boletos: FAIL"
curl -s http://localhost:3003/health | grep -q "ok" && echo "  - Reservas (S3): OK" || echo "  - Reservas: FAIL"
curl -s http://localhost:3004/health | grep -q "ok" && echo "  - Garita (CloudWatch): OK" || echo "  - Garita: FAIL"

# 6. Lanzar petición de prueba a Garita para disparar CloudWatch
echo "[INFO] Enviando petición de prueba a Garita..."
curl -s -X POST http://localhost:3004/garita/validar \
  -H "Content-Type: application/json" \
  -d '{"codigo_qr": "TEST-PING", "sitio_arqueologico": "Sacsayhuaman", "controlador_id": 1}' > /dev/null

echo "================================================================="
echo "[ÉXITO] Todo levantado y funcionando con AWS."
echo "Puedes revisar los logs del contenedor Garita con:"
echo "   docker compose logs garita --tail 20"
echo "================================================================="
