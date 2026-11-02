# Arquitectura de Microservicios: QosqoPass & Tours
## Sistema Integrado de Boletos Turísticos y Tours Regionales del Cusco

**Asignatura:** Cloud Computing  
**Unidad:** 3
## Integrantes
* Alejandro Zavala, Rodrigo Josue
* Cortez Herrera, Sebastian Rodrigo
* Cisneros Nieto, Sabrina Andrea
* Cordova Alvarez, Gonzalo Sebastian
* Ccoyo Huaman, Jhojan Edwin
---

## PARTE 1. CONCEPCIÓN DEL PROYECTO Y ARGUMENTACIÓN

### 1.1 Contexto Geográfico, Social y Problemática Real
La región Cusco representa el núcleo turístico del Perú, recibiendo millones de visitantes al año para acceder a atractivos como Machu Picchu, Sacsayhuamán, Ollantaytambo y la Montaña de 7 Colores. Sin embargo, entidades de administración como COSITUC (Comité de Servicios Integrados Turístico Culturales del Cusco) y agencias operadoras locales manejan el proceso de venta de boletos turísticos (BTC) e ingresos a sitios arqueológicos de forma mayoritariamente manual y descentralizada.

Esta desarticulación genera cuellos de botella críticos: congestionamiento masivo en puntos de venta físicos, imprecisión en el control de aforos en tiempo real, colapso de plataformas de venta en horas pico y la imposibilidad de que los turistas empaqueten el boleto turístico con los tours regionales impartidos por guías independientes u operadores locales.

### 1.2 Análisis de Usuarios Objetivo y Condiciones del Entorno
Para asegurar la viabilidad de la solución en el entorno local, se identificaron tres perfiles clave y sus limitaciones reales:

- **Turistas Nacionales e Internacionales:** Acceden mediante dispositivos móviles inteligentes con conectividad variable (4G/5G en zona urbana, 3G o nula en trayectos rurales hacia el Valle Sagrado). Requieren acceso rápido, liviano y generación de tickets digitales con confirmación inmediata.
- **Agencias Operadoras y Guías Independientes:** Requieren una interfaz web/móvil para consultar disponibilidad de cupos y registrar paquetes turísticos sin depender de colas presenciales.
- **Administradores y Controladores de Aforo:** Personal ubicado en los accesos a parques arqueológicos donde la señal de internet puede ser intermitente. La arquitectura debe permitir llamadas REST ligeras y desacopladas para garantizar respuestas rápidas sin bloquear el acceso.

### 1.3 Propuesta de Solución y Arquitectura de Microservicios
Se plantea 'QosqoPass & Tours', una plataforma distribuida en la nube basada en una arquitectura de microservicios ligera, desacoplada y contenerizada con Docker. La responsabilidad del sistema se divide en tres servicios independientes:

| Microservicio | Tecnología / BD | Responsabilidad Dominio |
| :--- | :--- | :--- |
| **usuarios** | Node.js (Express) + PostgreSQL (`usuarios_db`) | Gestión integral de usuarios: registro, actualización y consulta de perfiles (Turistas, Agencias, Guías, Admins). |
| **boletos** | Node.js (Express) + PostgreSQL (`boletos_db`) | Administración del catálogo de Boletos Turísticos e Ingresos a Sitios Arqueológicos (precios, cupos, aforos, horarios). |
| **reservas** | Node.js (Express) + PostgreSQL (`reservas_db`) | Orquestación de la emisión de reservas/tickets. Realiza llamadas sincrónicas HTTP/REST hacia 'usuarios' y 'boletos' para validar la existencia antes de confirmar la transacción. |

---

## PARTE 2. CONFIGURACIÓN DEL REPOSITORIO Y TRABAJO COLABORATIVO

Se estableció un flujo de trabajo distribuido en GitHub utilizando el modelo *Forking & Pull Request* para asegurar la calidad de código y el cumplimiento de las políticas de contribución:

- **Repositorio Central:** Creado bajo la cuenta del Líder del Proyecto con el nombre `proyecto-qosqopass-microservicios`. Se protegió la rama `main` exigiendo Pull Request y al menos una (1) aprobación obligatoria.
- **Forks e Integración:** Cada integrante creó su propio Fork en su cuenta personal. Los desarrollos se trabajaron en ramas locales y se enviaron mediante Pull Request (PR) hacia la rama `main` del repositorio central.
- **Repartición Equitativa del Trabajo:** Ningún integrante concentró más del 30% del código del proyecto. Cada miembro realizó un mínimo de tres (3) commits descriptivos siguiendo la convención de mensajes claros.

| Integrante | Rol Asignado | Componentes / Entregables |
| :--- | :--- | :--- |
| **Alejandro Zavala Rodrigo Josue** | Líder del Repositorio | Creación de repo central, README.md inicial, reglas de protección de rama main, revisión/aprobación de PRs y CI/CD en GitHub Actions. |
| **Cordova Alvarez Gonzalo Sebastian** | Dev Microservicio Usuarios | Construcción del MS 'usuarios' (API Express, init.sql, Dockerfile, scripts REST POST/PUT/DELETE y tests automatizados Jest). |
| **Cisneros Nieto Sabrina Andrea** | Dev Microservicio Boletos | Construcción del MS 'boletos' (API Express, init.sql, Dockerfile, gestión de catálogo/aforo y tests automatizados Jest). |
| **Cortez Herrera Sebastian Rodrigo** | Dev Microservicio Reservas | Construcción del MS 'reservas' (API Express con llamadas fetch inter-servicio a usuarios/boletos, init.sql, Dockerfile y tests Jest). |
| **Ccoyo Huaman Jhojan Edwin** | Dev Infraestructura & Docs | Orquestación central con docker-compose.yml, pruebas inter-servicio de caída de nodos y documentación de informe con capturas. |

---

## PARTE 3. DESARROLLO, CONTENERIZACIÓN Y PIPELINE CI/CD

### 3.1 Estructura del Código y Comunicación Inter-Servicio
El microservicio de 'reservas' implementa la función de validación de referencias hacia los microservicios de 'usuarios' y 'boletos' previa a la inserción en la base de datos:

```javascript
// reservas/src/app.js - Comunicación Inter-Servicio
async function validarReferencias(usuarioId, boletoId) {
    const [usuario, boleto] = await Promise.all([
        fetch(`${process.env.USUARIOS_URL}/usuarios/${usuarioId}`),
        fetch(`${process.env.BOLETOS_URL}/boletos/${boletoId}`)
    ]);

    if (usuario.status === 404 || boleto.status === 404) {
        return false; // Usuario o Boleto inexistente
    }

    if (!usuario.ok || !boleto.ok) {
        throw new Error('Error al consultar red de Microservicios');
    }

    return true;
}
