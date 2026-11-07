#!/bin/bash
echo "=== Iniciando Prueba de Contingencia: Caída de Nodos (QosqoPass) ==="
echo "1. Verificando estado inicial de contenedores..."
docker-compose ps
echo "---------------------------------------------------"
echo "2. Simulando caída del microservicio de Usuarios..."
docker-compose stop usuarios
echo "Estado actual (Usuarios debe aparecer como Exited):"
docker-compose ps
echo "---------------------------------------------------"
echo "3. Recuperando el nodo caído..."
docker-compose start usuarios
echo "=== Prueba Finalizada. Sistema recuperado ==="
docker-compose ps
