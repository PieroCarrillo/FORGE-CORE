#!/usr/bin/env bash
set -euo pipefail

# Ejecutar en el EC2 Database Server.
# Uso: sudo bash db-server-setup.sh <APP_PRIVATE_IP> <APP_DB_PASSWORD>

APP_PRIVATE_IP="${1:?APP_PRIVATE_IP is required}"
APP_DB_PASSWORD="${2:?APP_DB_PASSWORD is required}"

# Instala MariaDB en Ubuntu.
sudo apt update
sudo apt install -y mariadb-server

# MariaDB escucha en todas las interfaces, pero AWS limita el acceso por security group.
sudo sed -i "s/^bind-address.*/bind-address = 0.0.0.0/" /etc/mysql/mariadb.conf.d/50-server.cnf
sudo systemctl restart mariadb

# Crea base, usuario limitado y permisos solo para la IP privada del App Server.
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS forge_core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'forge_app'@'${APP_PRIVATE_IP}' IDENTIFIED BY '${APP_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON forge_core.* TO 'forge_app'@'${APP_PRIVATE_IP}';
FLUSH PRIVILEGES;
SQL

echo "Database Server ready. Import database/schema.sql, procedures.sql and seed.sql from the repo."
