#!/usr/bin/env python3
"""
=============================================================================
QOSQOPASS & TOURS (COSITUC) - SIMULADOR DE TRÁFICO Y TELEMETRÍA EN VIVO
=============================================================================
Este script automatiza la generación de tráfico realista para alimentar:
1. Docker Compose (Microservicios locales: Usuarios, Reservas, Garita)
2. AWS CloudWatch Logs (Métricas de observabilidad, latencia y status codes)
3. Amazon S3 (Comprobantes digitales y auditoría histórica)
4. Detección de anomalías / intentos de fraude (código 409)
=============================================================================
"""

import argparse
import random
import sys
import time
from datetime import datetime
import urllib.request
import json

BASE_URL_USUARIOS = "http://localhost:3001"
BASE_URL_BOLETOS  = "http://localhost:3002"
BASE_URL_RESERVAS = "http://localhost:3003"
BASE_URL_GARITA   = "http://localhost:3004"

SITIOS_ARQUEOLOGICOS = [
    "Sacsayhuaman",
    "Ollantaytambo",
    "Pisac",
    "Moray",
    "Chinchero"
]

NOMBRES_TURISTAS = [
    "Carlos Mendoza", "Elena Rostova", "John Smith", "Maria Garcia",
    "Pierre Dubois", "Akira Tanaka", "Lucia Benitez", "Liam O'Connor",
    "Sofia Fernandez", "Hans Mueller", "Camila Torres", "David Cohen"
]

def log_info(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\033[94m[{ts}] [INFO]\033[0m {msg}")

def log_success(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\033[92m[{ts}] [ÉXITO]\033[0m {msg}")

def log_warning(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\033[93m[{ts}] [AVISO]\033[0m {msg}")

def log_error(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\033[91m[{ts}] [ERROR]\033[0m {msg}")

def make_request(url, method="GET", payload=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}
    except Exception as ex:
        return 500, {"error": str(ex)}

def verificar_servicios():
    print("=" * 70)
    print(" Verificando estado de microservicios COSITUC...")
    print("=" * 70)
    servicios = [
        ("Usuarios", f"{BASE_URL_USUARIOS}/health"),
        ("Boletos",  f"{BASE_URL_BOLETOS}/health"),
        ("Reservas", f"{BASE_URL_RESERVAS}/health"),
        ("Garita",   f"{BASE_URL_GARITA}/health"),
    ]
    todos_ok = True
    for nombre, url in servicios:
        status, data = make_request(url)
        if status == 200:
            log_success(f"Servicio {nombre} disponible: {data}")
        else:
            log_error(f"Servicio {nombre} NO responde en {url} (Status: {status})")
            todos_ok = False
    return todos_ok

def simular_flujo_turista(idx, sitio_fijo=None):
    nombre = random.choice(NOMBRES_TURISTAS)
    email = f"turista_{int(time.time())}_{idx}@ejemplo.com"
    sitio = sitio_fijo if sitio_fijo else random.choice(SITIOS_ARQUEOLOGICOS)
    
    print("\n" + "-" * 60)
    log_info(f"Iniciando flujo de compra y acceso para Turista #{idx}: {nombre}")

    # 1. Crear usuario
    status, user_data = make_request(
        f"{BASE_URL_USUARIOS}/usuarios",
        method="POST",
        payload={"nombre": nombre, "email": email, "rol": "Turista"}
    )
    if status != 201:
        log_error(f"Fallo al registrar usuario: {user_data}")
        return
    usuario_id = user_data.get("id")
    log_success(f"Usuario registrado: ID {usuario_id} ({nombre})")

    # 2. Consultar catálogo de boletos
    status, boletos = make_request(f"{BASE_URL_BOLETOS}/boletos")
    if status != 200 or not boletos:
        log_error("No hay boletos disponibles en catálogo.")
        return
    boleto_seleccionado = boletos[0]
    boleto_id = boleto_seleccionado.get("id")
    log_info(f"Boleto seleccionado: {boleto_seleccionado.get('nombre')} (S/. {boleto_seleccionado.get('precio')})")

    # 3. Crear reserva (Dispara respaldo en Amazon S3)
    payload_reserva = {
        "usuario_id": usuario_id,
        "boleto_id": boleto_id,
        "fecha_visita": datetime.now().strftime("%Y-%m-%d"),
        "cantidad": 1
    }
    status, reserva_data = make_request(f"{BASE_URL_RESERVAS}/reservas", method="POST", payload=payload_reserva)
    if status != 201:
        log_error(f"Error al emitir reserva: {reserva_data}")
        return
    codigo_qr = reserva_data.get("codigo_qr")
    log_success(f"Reserva creada con éxito: QR = {codigo_qr} | Respaldo S3 generado")

    # 4. Validar ingreso en Garita (Dispara registro a AWS CloudWatch Logs)
    time.sleep(0.5)
    payload_garita = {
        "codigo_qr": codigo_qr,
        "sitio_arqueologico": sitio,
        "controlador_id": 1
    }
    status, garita_data = make_request(f"{BASE_URL_GARITA}/garita/validar", method="POST", payload=payload_garita)
    if status == 201:
        log_success(f"Acceso PERMITIDO en Garita {sitio} para QR {codigo_qr}")
    else:
        log_warning(f"Respuesta de garita: {garita_data}")

    # 5. Prueba de fraude / reingreso no permitido (para CloudWatch Insights)
    if idx % 3 == 0:
        log_warning(f"Simulando intento de fraude (reingreso con el mismo QR {codigo_qr})...")
        time.sleep(0.3)
        status_fraude, fraude_data = make_request(f"{BASE_URL_GARITA}/garita/validar", method="POST", payload=payload_garita)
        if status_fraude == 409:
            log_error(f"Detección de fraude confirmada (HTTP 409 Conflicto): {fraude_data.get('error')}")

def main():
    parser = argparse.ArgumentParser(description="Simulador de Tráfico COSITUC para AWS CloudWatch y S3")
    parser.add_argument("--total", type=int, default=6, help="Total de turistas a simular")
    parser.add_argument("--sitio", type=str, default=None, help="Sitio arqueológico fijo (ej. Sacsayhuaman)")
    parser.add_argument("--delay", type=float, default=1.0, help="Segundos entre cada turista")
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print(" QOSQOPASS & TOURS - COSITUC")
    print(" GENERADOR DE TELEMETRÍA Y EVENTOS PARA AWS LEARNER LAB")
    print("=" * 70)

    if not verificar_servicios():
        log_error("Los microservicios no están completamente listos. Revisa 'docker compose ps'.")
        sys.exit(1)

    print(f"\nIniciando simulación de {args.total} turistas hacia los parques arqueológicos...")
    for i in range(1, args.total + 1):
        simular_flujo_turista(i, sitio_fijo=args.sitio)
        if i < args.total:
            time.sleep(args.delay)

    print("\n" + "=" * 70)
    log_success("Simulación completada con éxito.")
    log_info("Peticiones y métricas registradas en:")
    log_info("  -> AWS CloudWatch Logs: Log Group /cosituc/microservicios/garita")
    log_info("  -> Amazon S3: Bucket de auditoría y reservas")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
