# Docker en AWS para FORGE CORE

## Arquitectura final

```text
Usuario
  |
  v
EC2 App Server
  - Nginx host: entrada publica por puerto 80
  - Docker container: forge-core-web
  - Docker container: forge-core-api
  |
  | MariaDB por IP privada
  v
EC2 Database Server
  - MariaDB nativo

MongoDB Atlas
  - Comunidad y resenas
```

## Contenedores

| Contenedor | Puerto host | Funcion |
| --- | --- | --- |
| `forge-core-web` | `127.0.0.1:8080` | Sirve el build de React con Nginx dentro del contenedor. |
| `forge-core-api` | `127.0.0.1:4000` | Ejecuta Node.js + Express y conecta con MariaDB/MongoDB. |

MariaDB se mantiene en la segunda EC2 para respetar el requerimiento de dos instancias.

## Comandos principales en el App Server

```bash
cd /opt/forge-core
sudo docker compose -f docker-compose.aws.yml ps
sudo docker compose -f docker-compose.aws.yml logs -f api
sudo docker compose -f docker-compose.aws.yml logs -f web
sudo docker compose -f docker-compose.aws.yml restart
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1:8080
```

## Variables de entorno

El contenedor `forge-core-api` usa:

```bash
/opt/forge-core/backend/.env
```

Ese archivo contiene las credenciales reales de MariaDB y MongoDB Atlas. No se sube a GitHub.
