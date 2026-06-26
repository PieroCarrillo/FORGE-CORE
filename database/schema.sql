-- Base de datos principal del e-commerce ficticio FORGE CORE.
CREATE DATABASE IF NOT EXISTS forge_core
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE forge_core;

-- Se desactivan temporalmente las FK para poder reconstruir el esquema desde cero.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS system_metrics;
DROP TABLE IF EXISTS buyer_messages;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Usuarios reales de la aplicacion: login, rol y token de sesion.
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  role ENUM('customer', 'admin', 'seller') NOT NULL DEFAULT 'customer',
  password_hash CHAR(64) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  session_token CHAR(64) NULL,
  password_reset_token CHAR(64) NULL,
  password_reset_expires_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_session_token (session_token),
  INDEX idx_users_password_reset_token (password_reset_token)
) ENGINE=InnoDB;

-- Categorias del catalogo: GPU, RAM, CPU, SSD y Fuente.
CREATE TABLE categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(90) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Marcas de hardware asociadas a los productos.
CREATE TABLE brands (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(90) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Catalogo central. Guarda precio, stock, rating, imagen y especificaciones en JSON.
CREATE TABLE products (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  brand_id BIGINT UNSIGNED NOT NULL,
  seller_id BIGINT UNSIGNED NULL,
  slug VARCHAR(130) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  specs_json LONGTEXT NOT NULL CHECK (JSON_VALID(specs_json)),
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_products_brands FOREIGN KEY (brand_id) REFERENCES brands(id),
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users(id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_brand (brand_id),
  INDEX idx_products_seller (seller_id),
  INDEX idx_products_stock (stock)
) ENGINE=InnoDB;

-- Carritos persistentes. Queda preparado para ampliar la app con sesiones reales.
CREATE TABLE carts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  session_token VARCHAR(120) NOT NULL,
  status ENUM('active', 'converted', 'abandoned') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_users FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_carts_session_active (session_token, status)
) ENGINE=InnoDB;

-- Lineas del carrito; cada producto puede aparecer una sola vez por carrito.
CREATE TABLE cart_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_carts FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_products FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uq_cart_product (cart_id, product_id)
) ENGINE=InnoDB;

-- Cabecera del pedido simulado.
CREATE TABLE orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(160) NOT NULL,
  payment_reference VARCHAR(80) NOT NULL UNIQUE,
  status ENUM('pending', 'paid_simulated', 'cancelled') NOT NULL DEFAULT 'pending',
  fulfillment_status ENUM('new', 'preparing', 'shipped', 'delivered') NOT NULL DEFAULT 'new',
  status_updated_at TIMESTAMP NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  promotion_code VARCHAR(40) NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB;

-- Cupones y promociones aplicables al checkout simulado.
CREATE TABLE promotions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(180) NOT NULL,
  discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  starts_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_promotions_active (active),
  INDEX idx_promotions_code (code)
) ENGINE=InnoDB;

-- Detalle de productos comprados en cada pedido.
CREATE TABLE order_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(140) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_orders FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_products FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Auditoria de movimientos de inventario: ventas, reposiciones y ajustes.
CREATE TABLE inventory_movements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('sale', 'restock', 'adjustment') NOT NULL,
  quantity INT NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_movements_products FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_inventory_movements_product (product_id),
  INDEX idx_inventory_movements_created_at (created_at)
) ENGINE=InnoDB;

-- Historico de metricas recolectadas desde el App Server Linux.
CREATE TABLE system_metrics (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cpu_percent DECIMAL(5,2) NOT NULL,
  memory_percent DECIMAL(5,2) NOT NULL,
  disk_percent DECIMAL(5,2) NOT NULL,
  process_count INT UNSIGNED NOT NULL,
  load_avg DECIMAL(6,2) NOT NULL,
  collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_system_metrics_collected_at (collected_at)
) ENGINE=InnoDB;

-- Comentarios de la seccion Comunidad. Permite demostrar persistencia desde el navegador.
CREATE TABLE buyer_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  author VARCHAR(120) NOT NULL,
  product VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_buyer_messages_created_at (created_at)
) ENGINE=InnoDB;
