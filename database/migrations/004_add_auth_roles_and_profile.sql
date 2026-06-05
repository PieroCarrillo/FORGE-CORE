USE forge_core;

-- Agrega autenticacion real sin destruir datos existentes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(80) NULL AFTER name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash CHAR(64) NULL AFTER role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt VARCHAR(64) NULL AFTER password_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token CHAR(64) NULL AFTER password_salt;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL AFTER session_token;

UPDATE users
SET username = LOWER(SUBSTRING_INDEX(email, '@', 1))
WHERE username IS NULL OR username = '';

UPDATE users
SET password_salt = 'forge_cliente_salt_2026',
    password_hash = 'b30994206cba6406938afc07f0af7511790ea2b608e95a7a0601116284a2dfd3'
WHERE password_hash IS NULL OR password_hash = '';

INSERT INTO users (name, username, email, role, password_hash, password_salt)
VALUES
  ('Master Admin', 'master', 'master@forgecore.local', 'admin', 'c46e2eb877c9bbc6826d6da59f8b72ca245772600533613327343b41c98a41bd', 'forge_master_salt_2026'),
  ('Cliente Demo', 'cliente', 'cliente@forgecore.local', 'customer', 'b30994206cba6406938afc07f0af7511790ea2b608e95a7a0601116284a2dfd3', 'forge_cliente_salt_2026')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  username = VALUES(username),
  role = VALUES(role),
  password_hash = VALUES(password_hash),
  password_salt = VALUES(password_salt);

-- Si existe el usuario admin heredado del primer seed, se conserva como cuenta de prueba sin permisos admin.
UPDATE users
SET role = 'customer',
    password_hash = 'b30994206cba6406938afc07f0af7511790ea2b608e95a7a0601116284a2dfd3',
    password_salt = 'forge_cliente_salt_2026'
WHERE username = 'admin' AND email = 'admin@forgecore.local';

ALTER TABLE users MODIFY username VARCHAR(80) NOT NULL;
ALTER TABLE users MODIFY password_hash CHAR(64) NOT NULL;
ALTER TABLE users MODIFY password_salt VARCHAR(64) NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users (session_token);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_simulated_order $$
CREATE PROCEDURE sp_create_simulated_order(
  IN p_user_id BIGINT UNSIGNED,
  IN p_customer_name VARCHAR(120),
  IN p_customer_email VARCHAR(160),
  IN p_payment_reference VARCHAR(80),
  IN p_items_json JSON
)
BEGIN
  DECLARE v_index INT DEFAULT 0;
  DECLARE v_length INT DEFAULT 0;
  DECLARE v_product_id BIGINT UNSIGNED;
  DECLARE v_quantity INT UNSIGNED;
  DECLARE v_stock INT UNSIGNED;
  DECLARE v_price DECIMAL(10,2);
  DECLARE v_name VARCHAR(140);
  DECLARE v_order_id BIGINT UNSIGNED;
  DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0;
  DECLARE v_tax DECIMAL(10,2) DEFAULT 0;
  DECLARE v_shipping DECIMAL(10,2) DEFAULT 0;
  DECLARE v_total DECIMAL(10,2) DEFAULT 0;
  DECLARE v_exists INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_length = JSON_LENGTH(p_items_json);
  IF v_length IS NULL OR v_length = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La orden no tiene productos';
  END IF;

  START TRANSACTION;

  INSERT INTO orders (user_id, customer_name, customer_email, payment_reference, status)
  VALUES (p_user_id, p_customer_name, p_customer_email, p_payment_reference, 'paid_simulated');

  SET v_order_id = LAST_INSERT_ID();

  WHILE v_index < v_length DO
    SET v_product_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_index, '].product_id'))) AS UNSIGNED);
    SET v_quantity = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_index, '].quantity'))) AS UNSIGNED);

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item de orden invalido';
    END IF;

    SELECT COUNT(*) INTO v_exists
    FROM products
    WHERE id = v_product_id AND active = 1;

    IF v_exists = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Producto no existe';
    END IF;

    SELECT stock, price, name
      INTO v_stock, v_price, v_name
    FROM products
    WHERE id = v_product_id AND active = 1
    FOR UPDATE;

    IF v_stock < v_quantity THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente';
    END IF;

    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;

    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    VALUES (v_order_id, v_product_id, v_name, v_price, v_quantity, v_price * v_quantity);

    INSERT INTO inventory_movements (product_id, movement_type, quantity, note)
    VALUES (v_product_id, 'sale', -CAST(v_quantity AS SIGNED), CONCAT('Venta simulada ', p_payment_reference));

    SET v_subtotal = v_subtotal + (v_price * v_quantity);
    SET v_index = v_index + 1;
  END WHILE;

  SET v_tax = ROUND(v_subtotal * 0.18, 2);
  SET v_shipping = IF(v_subtotal > 0, 25.00, 0.00);
  SET v_total = v_subtotal + v_tax + v_shipping;

  UPDATE orders
  SET subtotal = v_subtotal,
      tax = v_tax,
      shipping = v_shipping,
      total = v_total
  WHERE id = v_order_id;

  COMMIT;

  SELECT v_order_id AS order_id,
         p_payment_reference AS payment_reference,
         v_subtotal AS subtotal,
         v_tax AS tax,
         v_shipping AS shipping,
         v_total AS total;
END $$

DELIMITER ;
