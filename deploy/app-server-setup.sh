#!/usr/bin/env bash
set -euo pipefail

# Ejecutar en el EC2 App Server despues de copiar el repositorio en /opt/forge-core.

# Paquetes del servidor web y utilidades basicas.
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx rsync

# Instalacion de Node.js 20 para compilar frontend y ejecutar backend.
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Usuario de sistema para correr la API con menos privilegios que root.
sudo useradd --system --create-home --shell /usr/sbin/nologin forge || true
sudo chown -R forge:forge /opt/forge-core

# Backend: instala dependencias y compila TypeScript a dist/.
cd /opt/forge-core/backend
npm install
npm run build

# Frontend: compila React/Vite a archivos estaticos.
cd /opt/forge-core/frontend
npm install
npm run build

# Publica el build del frontend en la carpeta que sirve Nginx.
sudo mkdir -p /var/www/forge-core
sudo rsync -a --delete /opt/forge-core/frontend/dist/ /var/www/forge-core/frontend/

# Activa configuracion Nginx y valida sintaxis antes de recargar.
sudo cp /opt/forge-core/deploy/nginx-forge-core.conf /etc/nginx/sites-available/forge-core
sudo ln -sf /etc/nginx/sites-available/forge-core /etc/nginx/sites-enabled/forge-core
sudo nginx -t
sudo systemctl reload nginx

# Registra backend como servicio systemd para que arranque automaticamente.
sudo cp /opt/forge-core/deploy/forge-core-api.service /etc/systemd/system/forge-core-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now forge-core-api

echo "App Server ready. Check: systemctl status forge-core-api"
