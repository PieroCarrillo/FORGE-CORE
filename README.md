# FORGE CORE | PC Hardware Hub

E-commerce ficticio de productos tecnologicos desarrollado para el curso de Sistemas Operativos. El sistema simula una tienda de componentes de PC con catalogo, carrito, checkout con pago simulado, gestion de usuarios por roles, comunidad de resenas, panel administrativo, metricas del servidor y persistencia en MariaDB + MongoDB Atlas.

## Arquitectura

```text
Usuario
  |
  v
EC2 App Server
  - Nginx
  - Frontend React build
  - Backend Node.js + Express
  - Worker de metricas del sistema operativo
  |
  | Conexion privada por puerto 3306
  v
EC2 Database Server
  - MariaDB
  - Stored procedures
  - Tablas de usuarios, productos, pedidos, inventario y metricas

MongoDB Atlas Free M0
  - Coleccion product_reviews
  - Resenas, votos de utilidad y moderacion de comunidad
```

La base MariaDB no se expone directamente a internet. El backend se conecta a MariaDB usando la IP privada del servidor de base de datos dentro de la VPC de AWS. Para Comunidad, el backend usa MongoDB Atlas Free M0 con acceso permitido solo desde la IP publica del App Server.

## Funcionalidades

- Login con roles:
  - `master`: administrador principal.
  - `customer`: cliente comprador.
- Catalogo de productos tecnologicos.
- Detalle de producto.
- Carrito y checkout con pago simulado.
- Pedidos vinculados al usuario autenticado.
- Comunidad con resenas por producto guardadas en MongoDB Atlas.
- Perfil de cliente con ultimos pedidos.
- Panel admin con usuarios, productos, stock bajo, pedidos, metricas y moderacion de resenas.
- Stored procedure para crear pedidos con transaccion y bloqueo de stock.
- Worker de Node.js que recolecta CPU, RAM, disco y procesos del servidor Linux.

## Credenciales de demostracion

Estas credenciales son solo para la demo academica. No corresponden a cuentas reales ni a secretos de AWS.

```text
Admin:
usuario: master
password: MasterForge2026!

Cliente:
usuario: cliente
password: ClienteForge2026!
```

## Estructura del proyecto

```text
backend/   API REST con Node.js, Express, mysql2 y worker de metricas.
frontend/  SPA React + TypeScript + Tailwind CSS con Vite.
database/  Scripts SQL, datos semilla, stored procedures y migraciones.
deploy/    Archivos y scripts de despliegue para AWS, Nginx y systemd.
docs/      Informe, manual, presentacion y evidencias academicas.
scripts/   Utilidades locales de apoyo.
```

## Tecnologias

| Parte | Tecnologia | Uso |
| --- | --- | --- |
| Frontend | React + TypeScript | Interfaz SPA y control de vistas internas. |
| Estilos | Tailwind CSS | Diseno responsive, tarjetas, formularios y dashboard. |
| Build | Vite | Desarrollo local y build de produccion del frontend. |
| Backend | Node.js + Express | API REST para productos, auth, pedidos, perfil y admin. |
| BD | MariaDB | Persistencia de usuarios, catalogo, pedidos, stock y metricas. |
| Driver BD | mysql2 | Pool de conexiones entre backend y MariaDB. |
| Comunidad | MongoDB Atlas Free M0 | Resenas, votos de utilidad y moderacion. |
| Driver NoSQL | mongodb | Conexion del backend con la coleccion `product_reviews`. |
| SO | worker_threads, os, /proc, df | Recoleccion concurrente de metricas del servidor. |
| Cloud | AWS EC2 | Separacion entre servidor de app y servidor de base de datos. |
| Web server | Nginx | Sirve React y hace proxy de `/api` hacia Express. |
| Servicio | systemd | Mantiene el backend activo como servicio Linux. |

## Ejecucion local

### 1. Base de datos

Crear la base MariaDB desde cero:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p forge_core < database/procedures.sql
mysql -u root -p forge_core < database/seed.sql
mysql -u root -p forge_core < database/migrations/002_insert_50_catalog_products.sql
mysql -u root -p forge_core < database/migrations/004_add_auth_roles_and_profile.sql
```

### 2. Backend

Copiar `backend/.env.example` como `backend/.env` y ajustar credenciales locales.
Para probar Comunidad real, agregar `MONGODB_URI` y `MONGODB_DB`; si no se configuran, el catalogo y checkout siguen funcionando y las resenas quedan desactivadas.

```bash
cd backend
npm install
npm run dev
```

Healthcheck:

```bash
curl http://localhost:4000/api/health
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## Despliegue AWS

Servidor de aplicacion:

- Ubuntu Server.
- Nginx sirve el build de React.
- Express corre como servicio `forge-core-api`.
- El backend usa `/opt/forge-core/backend/.env`.
- El `.env` debe incluir `MONGODB_URI` para activar Comunidad con Atlas.

Servidor de base de datos:

- Ubuntu Server.
- MariaDB.
- Puerto `3306` abierto solo desde el Security Group del App Server.
- Usuario limitado `forge_app`.

Comandos utiles en App Server:

```bash
cd /opt/forge-core
sudo systemctl status forge-core-api --no-pager
sudo systemctl status nginx --no-pager
curl http://127.0.0.1/api/health
```

Comandos utiles en DB Server:

```bash
sudo systemctl status mariadb --no-pager
sudo mysql forge_core
```

## Scripts SQL principales

- `database/schema.sql`: crea la estructura base.
- `database/procedures.sql`: define stored procedures de pedidos, stock, dashboard y metricas.
- `database/seed.sql`: inserta usuarios, categorias, marcas y productos iniciales.
- `database/migrations/004_add_auth_roles_and_profile.sql`: agrega login, roles, tokens de sesion y vincula pedidos con usuarios.

## Endpoints principales

| Metodo | Endpoint | Descripcion |
| --- | --- | --- |
| GET | `/api/health` | Verifica backend y conexion con MariaDB. |
| POST | `/api/auth/login` | Inicia sesion y devuelve token. |
| POST | `/api/auth/register` | Crea cliente nuevo. |
| GET | `/api/auth/me` | Devuelve usuario autenticado. |
| GET | `/api/products` | Lista productos activos. |
| GET | `/api/products/:slug` | Devuelve detalle de producto. |
| POST | `/api/orders/simulated-payment` | Crea pedido simulado y descuenta stock. |
| GET | `/api/account/orders` | Lista pedidos del usuario autenticado. |
| GET | `/api/products/:id/reviews` | Lista resenas publicadas del producto. |
| POST | `/api/products/:id/reviews` | Crea resena autenticada en MongoDB. |
| GET | `/api/account/reviews` | Lista resenas del usuario autenticado. |
| POST | `/api/reviews/:id/helpful` | Marca una resena como util. |
| GET | `/api/admin/dashboard` | Resumen admin, solo rol admin. |
| GET | `/api/admin/users` | Lista usuarios, solo rol admin. |
| GET | `/api/admin/reviews` | Lista resenas para moderacion, solo rol admin. |
| DELETE | `/api/admin/reviews/:id` | Oculta una resena, solo rol admin. |
| GET | `/api/admin/system-metrics` | Lista metricas del servidor, solo rol admin. |
| POST | `/api/admin/products` | Crea producto, solo rol admin. |

## Seguridad

- `.env` y credenciales reales no se suben al repositorio.
- El archivo `backend/.env.aws.example` documenta la configuracion de AWS sin contrasenas reales.
- El backend valida payloads antes de consultar MariaDB.
- El panel admin requiere token y rol `admin`.
- El checkout usa stored procedure con transaccion y `SELECT ... FOR UPDATE` para evitar inconsistencias de stock.

## Estado academico

El proyecto esta pensado como una demo funcional y defendible: muestra frontend profesional, API REST, base de datos relacional, procedimientos almacenados, despliegue cloud y conceptos de sistemas operativos aplicados en Linux.
