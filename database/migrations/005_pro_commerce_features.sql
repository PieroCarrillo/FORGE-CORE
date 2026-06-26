USE forge_core;

-- Completa el alcance "modo pro" sin borrar datos existentes:
-- vendedor, recuperacion de clave, carrito persistente, cupones y seguimiento.

ALTER TABLE users
  MODIFY role ENUM('customer', 'admin', 'seller') NOT NULL DEFAULT 'customer';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token CHAR(64) NULL AFTER session_token,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP NULL AFTER password_reset_token;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users (password_reset_token);

INSERT INTO users (name, username, email, role, password_hash, password_salt)
VALUES (
  'Vendedor Demo',
  'vendedor',
  'vendedor@forgecore.local',
  'seller',
  'bd880255d1812993d334d570afa5ee325f382389eea480f8b623d0c370b45e77',
  '25bef455a822e2fba3bd8a74a4e9a085'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = 'seller';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seller_id BIGINT UNSIGNED NULL AFTER brand_id;

CREATE INDEX IF NOT EXISTS idx_products_seller ON products (seller_id);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status ENUM('new', 'preparing', 'shipped', 'delivered') NOT NULL DEFAULT 'new' AFTER status,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP NULL AFTER fulfillment_status,
  ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER shipping,
  ADD COLUMN IF NOT EXISTS promotion_code VARCHAR(40) NULL AFTER discount;

UPDATE orders
SET status_updated_at = created_at
WHERE status_updated_at IS NULL;

CREATE TABLE IF NOT EXISTS promotions (
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

INSERT INTO promotions (code, description, discount_type, discount_value, active)
VALUES
  ('FORGE10', '10% de descuento demo para compras academicas.', 'percent', 10.00, 1),
  ('SETUP25', 'US$25 de descuento para builds completos.', 'fixed', 25.00, 1)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  discount_type = VALUES(discount_type),
  discount_value = VALUES(discount_value),
  active = VALUES(active);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_admin_dashboard_summary $$
CREATE PROCEDURE sp_admin_dashboard_summary()
BEGIN
  SELECT
    COALESCE(SUM(total), 0) AS simulated_revenue,
    COUNT(*) AS order_count,
    COALESCE(AVG(total), 0) AS average_ticket,
    (SELECT COUNT(*) FROM products WHERE stock <= 5 AND active = 1) AS low_stock_count,
    (SELECT COUNT(*) FROM products WHERE active = 1) AS active_products
  FROM orders;

  SELECT p.id, p.name, p.stock, c.name AS category
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.stock <= 5 AND p.active = 1
  ORDER BY p.stock ASC, p.name ASC
  LIMIT 10;

  SELECT id, customer_name, customer_email, payment_reference, total, discount,
         promotion_code, status, fulfillment_status, status_updated_at, created_at
  FROM orders
  ORDER BY created_at DESC
  LIMIT 10;
END $$

DELIMITER ;
