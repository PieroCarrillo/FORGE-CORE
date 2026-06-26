USE forge_core;

DELIMITER $$

-- Crea un pedido simulado completo.
-- Punto clave de Sistemas Operativos/BD: usa transaccion y SELECT ... FOR UPDATE para sincronizar stock.
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

  -- Si cualquier sentencia falla, se revierte toda la compra.
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_length = JSON_LENGTH(p_items_json);
  IF v_length IS NULL OR v_length = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La orden no tiene productos';
  END IF;

  -- Desde aqui todas las operaciones forman una unidad atomica.
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
    -- Bloquea la fila del producto hasta terminar la transaccion.
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

  -- Devuelve al backend los datos principales para mostrar confirmacion.
  SELECT v_order_id AS order_id,
         p_payment_reference AS payment_reference,
         v_subtotal AS subtotal,
         v_tax AS tax,
         v_shipping AS shipping,
         v_total AS total;
END $$

-- Repone stock de un producto y registra el movimiento para auditoria.
DROP PROCEDURE IF EXISTS sp_restock_product $$
CREATE PROCEDURE sp_restock_product(
  IN p_product_id BIGINT UNSIGNED,
  IN p_quantity INT UNSIGNED,
  IN p_note VARCHAR(255)
)
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_current_stock INT UNSIGNED DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantity IS NULL OR p_quantity = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cantidad invalida';
  END IF;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_exists
  FROM products
  WHERE id = p_product_id;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Producto no existe';
  END IF;

  SELECT stock INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  -- Bloqueo para evitar que una reposicion y una venta modifiquen el mismo stock a la vez.
  FOR UPDATE;

  UPDATE products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;

  INSERT INTO inventory_movements (product_id, movement_type, quantity, note)
  VALUES (p_product_id, 'restock', p_quantity, p_note);

  COMMIT;
END $$

-- Devuelve tres result sets: resumen, productos con stock bajo y ultimos pedidos.
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

-- Guarda una medicion enviada por el worker de Node.js.
DROP PROCEDURE IF EXISTS sp_register_system_metric $$
CREATE PROCEDURE sp_register_system_metric(
  IN p_cpu_percent DECIMAL(5,2),
  IN p_memory_percent DECIMAL(5,2),
  IN p_disk_percent DECIMAL(5,2),
  IN p_process_count INT UNSIGNED,
  IN p_load_avg DECIMAL(6,2)
)
BEGIN
  INSERT INTO system_metrics (cpu_percent, memory_percent, disk_percent, process_count, load_avg)
  VALUES (p_cpu_percent, p_memory_percent, p_disk_percent, p_process_count, p_load_avg);
END $$

DELIMITER ;
