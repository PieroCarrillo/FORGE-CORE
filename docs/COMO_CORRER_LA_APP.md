# Como correr FORGE CORE / PC Hardware Hub

Este archivo tiene los comandos principales para correr la aplicacion en AWS y tambien en local desde Visual Studio Code.

## 1. Datos actuales del despliegue AWS

> Importante: si detienes y vuelves a iniciar las instancias EC2, las IP publicas pueden cambiar. Revisa siempre la consola de AWS antes de conectarte por SSH o abrir la pagina.

Datos usados en el despliegue actual:

```txt
App Server publico: 34.230.29.124
App Server privado: 172.31.31.144

DB Server publico: 34.207.78.96
DB Server privado: 172.31.29.30

Usuario SSH Ubuntu: ubuntu
Llave SSH Windows: C:\Users\piero\Downloads\forge-core-key.pem

Base de datos: forge_core
Usuario BD app: forge_app
Puerto backend: 4000
Puerto web publico: 80
```

URL publica:

```txt
http://34.230.29.124
```

Endpoints rapidos para verificar:

```txt
http://34.230.29.124/api/health
http://34.230.29.124/api/products
http://34.230.29.124/api/community/messages
http://34.230.29.124/api/admin/system-metrics
```

## 2. Correr la app en AWS cuando las instancias ya estan encendidas

### 2.1. Abrir PowerShell en Windows

Abre PowerShell y conectate al servidor de aplicacion:

```powershell
ssh -i "$env:USERPROFILE\Downloads\forge-core-key.pem" ubuntu@34.230.29.124
```

Si la IP publica cambio, reemplaza `34.230.29.124` por la IP publica nueva de `forge-app-server`.

### 2.2. Revisar que el backend y Nginx esten corriendo

Dentro del App Server ejecuta:

```bash
sudo systemctl status forge-core-api --no-pager
sudo systemctl status nginx --no-pager
```

Si alguno no esta activo, reinicialo:

```bash
sudo systemctl restart forge-core-api
sudo systemctl restart nginx
```

### 2.3. Probar la API desde el App Server

```bash
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1/api/health
```

Respuesta esperada:

```json
{"status":"ok","database":"online"}
```

### 2.4. Abrir la app desde el navegador

En Chrome abre:

```txt
http://34.230.29.124
```

Si no ves los ultimos cambios, fuerza recarga:

```txt
Ctrl + F5
```

Tambien puedes abrir con version para evitar cache:

```txt
http://34.230.29.124/?v=demo
```

## 3. Verificar la base de datos AWS

### 3.1. Conectarte al DB Server

Desde PowerShell:

```powershell
ssh -i "$env:USERPROFILE\Downloads\forge-core-key.pem" ubuntu@34.207.78.96
```

Si la IP publica cambio, reemplaza `34.207.78.96` por la IP publica nueva de `forge-db-server`.

### 3.2. Revisar MariaDB

Dentro del DB Server:

```bash
sudo systemctl status mariadb --no-pager
```

Si no esta activo:

```bash
sudo systemctl restart mariadb
```

### 3.3. Entrar a MariaDB

```bash
sudo mysql forge_core
```

Comandos utiles dentro de MariaDB:

```sql
SHOW TABLES;
SELECT COUNT(*) AS productos FROM products;
SELECT COUNT(*) AS mensajes FROM buyer_messages;
SELECT COUNT(*) AS pedidos FROM orders;
SELECT id, author, body, created_at FROM buyer_messages ORDER BY created_at DESC LIMIT 10;
EXIT;
```

## 4. Probar que comentarios se guardan en MariaDB

### Desde el navegador

1. Abre `http://34.230.29.124`.
2. Entra a `Comunidad`.
3. Escribe un nombre, producto, rating y comentario.
4. Presiona publicar.
5. Actualiza la pagina.
6. El comentario debe seguir apareciendo.

### Desde PowerShell

```powershell
Invoke-RestMethod http://34.230.29.124/api/community/messages
```

### Desde MariaDB

Conectate al DB Server y ejecuta:

```bash
sudo mysql forge_core -e "SELECT id, author, body, created_at FROM buyer_messages ORDER BY created_at DESC LIMIT 10;"
```

## 5. Probar que los productos vienen de MariaDB

Desde PowerShell:

```powershell
Invoke-RestMethod http://34.230.29.124/api/products | Select-Object -First 3
```

Desde el App Server:

```bash
curl http://127.0.0.1/api/products
```

Desde el DB Server:

```bash
sudo mysql forge_core -e "SELECT id, name, slug, stock, price FROM products ORDER BY id DESC LIMIT 10;"
```

## 6. Probar metricas de CPU, RAM, disco y procesos

Las metricas se toman del servidor de aplicacion usando Node, Linux y MariaDB.

Desde PowerShell:

```powershell
Invoke-RestMethod http://34.230.29.124/api/admin/system-metrics
```

Desde el navegador:

```txt
http://34.230.29.124/api/admin/system-metrics
```

Desde MariaDB:

```bash
sudo mysql forge_core -e "SELECT cpu_usage, memory_usage, disk_usage, process_count, recorded_at FROM system_metrics ORDER BY recorded_at DESC LIMIT 10;"
```

Nota: si la CPU sale muy baja, por ejemplo `0%` o `1%`, no significa que este roto. Significa que el servidor EC2 esta casi sin carga.

## 7. Subir nuevos cambios desde tu PC a AWS

Ejecuta esto desde PowerShell en la carpeta del proyecto local:

```powershell
cd "C:\Users\piero\Documents\Codex\2026-05-18\files-mentioned-by-the-user-06"
```

Crear paquete comprimido:

```powershell
Remove-Item .\forge-core.tar.gz -ErrorAction SilentlyContinue
tar.exe -czf forge-core.tar.gz `
  --exclude=backend/node_modules `
  --exclude=backend/dist `
  --exclude=frontend/node_modules `
  --exclude=frontend/dist `
  --exclude=backend/tsconfig.tsbuildinfo `
  --exclude=frontend/tsconfig.tsbuildinfo `
  frontend backend database deploy docs README.md
```

Subir paquete al App Server:

```powershell
scp -i "$env:USERPROFILE\Downloads\forge-core-key.pem" .\forge-core.tar.gz ubuntu@34.230.29.124:/home/ubuntu/forge-core.tar.gz
```

Entrar al App Server:

```powershell
ssh -i "$env:USERPROFILE\Downloads\forge-core-key.pem" ubuntu@34.230.29.124
```

Desplegar dentro del App Server:

```bash
sudo cp /opt/forge-core/backend/.env /home/ubuntu/forge-core.env.backup

sudo rm -rf /opt/forge-core
sudo mkdir -p /opt/forge-core
sudo tar -xzf /home/ubuntu/forge-core.tar.gz -C /opt/forge-core
sudo chown -R ubuntu:ubuntu /opt/forge-core

cp /home/ubuntu/forge-core.env.backup /opt/forge-core/backend/.env

cd /opt/forge-core/backend
npm install
npm run build
sudo systemctl restart forge-core-api

cd /opt/forge-core/frontend
npm install
npm run build

sudo rm -rf /var/www/forge-core/frontend
sudo mkdir -p /var/www/forge-core/frontend
sudo cp -r dist/* /var/www/forge-core/frontend/
sudo find /var/www/forge-core/frontend -type d -exec chmod 755 {} \;
sudo find /var/www/forge-core/frontend -type f -exec chmod 644 {} \;

sudo cp /opt/forge-core/deploy/nginx-forge-core.conf /etc/nginx/sites-available/forge-core
sudo nginx -t
sudo systemctl reload nginx

curl http://127.0.0.1/api/health
```

## 8. Ejecutar migraciones nuevas en la base de datos AWS

Solo usa esto cuando agregues un archivo nuevo dentro de `database/migrations`.

Ejemplo con la migracion de comentarios:

Desde PowerShell local:

```powershell
scp -i "$env:USERPROFILE\Downloads\forge-core-key.pem" .\database\migrations\003_create_buyer_messages.sql ubuntu@34.207.78.96:/home/ubuntu/003_create_buyer_messages.sql
```

Entrar al DB Server:

```powershell
ssh -i "$env:USERPROFILE\Downloads\forge-core-key.pem" ubuntu@34.207.78.96
```

Ejecutar migracion:

```bash
sudo mysql forge_core < /home/ubuntu/003_create_buyer_messages.sql
sudo mysql forge_core -e "SHOW TABLES; SELECT COUNT(*) AS mensajes FROM buyer_messages;"
```

## 9. Correr la app localmente en Visual Studio Code

Este modo sirve para desarrollar antes de subir a AWS.

### 9.1. Abrir la carpeta

En Visual Studio Code abre:

```txt
C:\Users\piero\Documents\Codex\2026-05-18\files-mentioned-by-the-user-06
```

O desde PowerShell:

```powershell
cd "C:\Users\piero\Documents\Codex\2026-05-18\files-mentioned-by-the-user-06"
code .
```

### 9.2. Preparar MariaDB local

Si tienes MariaDB instalado localmente, crea la base:

```powershell
mysql -u root -p < .\database\schema.sql
mysql -u root -p forge_core < .\database\procedures.sql
mysql -u root -p forge_core < .\database\seed.sql
mysql -u root -p forge_core < .\database\migrations\002_insert_50_catalog_products.sql
mysql -u root -p forge_core < .\database\migrations\003_create_buyer_messages.sql
```

Crea el usuario local si todavia no existe:

```powershell
mysql -u root -p
```

Dentro de MariaDB:

```sql
CREATE USER IF NOT EXISTS 'forge_app'@'localhost' IDENTIFIED BY 'forge_local_123';
GRANT ALL PRIVILEGES ON forge_core.* TO 'forge_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 9.3. Revisar `backend/.env`

El archivo local debe quedar asi:

```env
NODE_ENV=development
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
USE_MOCK_DATA=false

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=forge_app
DB_PASSWORD=forge_local_123
DB_NAME=forge_core

METRICS_INTERVAL_SECONDS=30
```

### 9.4. Terminal 1: backend

```powershell
cd "C:\Users\piero\Documents\Codex\2026-05-18\files-mentioned-by-the-user-06\backend"
npm install
npm run dev
```

El backend queda en:

```txt
http://localhost:4000
```

Verificacion:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

### 9.5. Terminal 2: frontend

```powershell
cd "C:\Users\piero\Documents\Codex\2026-05-18\files-mentioned-by-the-user-06\frontend"
npm install
npm run dev
```

El frontend queda normalmente en:

```txt
http://localhost:5173
```

## 10. Comandos de diagnostico rapido

### Ver logs del backend en AWS

```bash
sudo journalctl -u forge-core-api -n 100 --no-pager
```

### Ver logs de Nginx

```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
```

### Ver si backend escucha en puerto 4000

```bash
sudo ss -tulpn | grep 4000
```

### Ver si MariaDB escucha en puerto 3306 en el DB Server

```bash
sudo ss -tulpn | grep 3306
```

### Probar conexion App Server -> DB Server

Desde el App Server:

```bash
mysql -h 172.31.29.30 -u forge_app -p forge_core -e "SELECT 1 AS ok; SHOW TABLES;"
```

### Si el navegador no abre la pagina

Revisa en AWS:

1. `forge-app-server` debe estar en estado `running`.
2. Security group `forge-app-sg` debe permitir HTTP puerto `80` desde `0.0.0.0/0`.
3. Security group `forge-app-sg` debe permitir SSH puerto `22` solo desde tu IP.
4. Nginx debe estar activo:

```bash
sudo systemctl status nginx --no-pager
```

### Si la API dice database offline

Revisa:

1. `forge-db-server` debe estar en estado `running`.
2. MariaDB debe estar activo.
3. El security group `forge-db-sg` debe permitir puerto `3306` solo desde `forge-app-sg`.
4. En `/opt/forge-core/backend/.env`, `DB_HOST` debe ser la IP privada del DB Server:

```env
DB_HOST=172.31.29.30
```

Luego reinicia backend:

```bash
sudo systemctl restart forge-core-api
curl http://127.0.0.1/api/health
```

## 11. Apagar AWS para no seguir consumiendo

Desde la consola de AWS:

1. Entra a EC2.
2. Selecciona `forge-app-server` y `forge-db-server`.
3. Click en `Estado de la instancia`.
4. Click en `Detener instancia`.

Cuando quieras volver a usar la demo:

1. Inicia primero `forge-db-server`.
2. Inicia despues `forge-app-server`.
3. Revisa las IP publicas nuevas.
4. Abre la nueva IP publica del App Server.

No elimines las instancias si todavia necesitas la demo. Detenerlas conserva el disco, la base de datos y los archivos.
