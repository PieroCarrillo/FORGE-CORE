USE forge_core;

-- Usuarios iniciales con login real.
-- master / MasterForge2026! tiene rol admin.
-- cliente / ClienteForge2026! tiene rol customer.
-- vendedor / VendedorForge2026! tiene rol seller.
INSERT INTO users (name, username, email, role, password_hash, password_salt) VALUES
  ('Master Admin', 'master', 'master@forgecore.local', 'admin', 'c46e2eb877c9bbc6826d6da59f8b72ca245772600533613327343b41c98a41bd', 'forge_master_salt_2026'),
  ('Cliente Demo', 'cliente', 'cliente@forgecore.local', 'customer', 'b30994206cba6406938afc07f0af7511790ea2b608e95a7a0601116284a2dfd3', 'forge_cliente_salt_2026'),
  ('Vendedor Demo', 'vendedor', 'vendedor@forgecore.local', 'seller', 'bd880255d1812993d334d570afa5ee325f382389eea480f8b623d0c370b45e77', '25bef455a822e2fba3bd8a74a4e9a085');

-- Categorias visibles en los filtros del frontend.
INSERT INTO categories (name, slug) VALUES
  ('GPU', 'gpu'),
  ('RAM', 'ram'),
  ('CPU', 'cpu'),
  ('SSD', 'ssd'),
  ('Fuente', 'fuente');

-- Marcas base usadas por los productos semilla y el formulario Admin.
INSERT INTO brands (name) VALUES
  ('NVIDIA'),
  ('AMD'),
  ('KingForge'),
  ('CrucialX'),
  ('Corsair'),
  ('G.Skill');

INSERT INTO promotions (code, description, discount_type, discount_value, active) VALUES
  ('FORGE10', '10% de descuento demo para compras academicas.', 'percent', 10.00, 1),
  ('SETUP25', 'US$25 de descuento para builds completos.', 'fixed', 25.00, 1);

-- Productos iniciales con imagenes locales en /frontend/public/assets/products.
INSERT INTO products (category_id, brand_id, slug, name, description, image_url, price, stock, rating, specs_json) VALUES
  (
    (SELECT id FROM categories WHERE slug = 'gpu'),
    (SELECT id FROM brands WHERE name = 'NVIDIA'),
    'rtx-4090-ultra',
    'RTX 4090 Ultra',
    'Tarjeta grafica de gama extrema para gaming 4K, renderizado y cargas IA.',
    '/assets/products/rtx-4090-ultra.jpg',
    2499.00,
    5,
    4.9,
    JSON_ARRAY('24 GB GDDR6X', 'PCIe 4.0', 'Ray Tracing', 'DLSS 3.5')
  ),
  (
    (SELECT id FROM categories WHERE slug = 'ram'),
    (SELECT id FROM brands WHERE name = 'KingForge'),
    'venom-rgb-64gb',
    'Venom RGB 64 GB',
    'Kit dual channel para estaciones gamer, streaming y multitarea pesada.',
    '/assets/products/venom-rgb-64gb.jpg',
    389.00,
    18,
    4.8,
    JSON_ARRAY('DDR5', '6400 MHz', 'CL32', 'RGB Sync')
  ),
  (
    (SELECT id FROM categories WHERE slug = 'cpu'),
    (SELECT id FROM brands WHERE name = 'AMD'),
    'ryzen-9-forge',
    'Ryzen 9 Forge',
    'Procesador de alto rendimiento para gaming competitivo y produccion.',
    '/assets/products/ryzen-9-forge.jpg',
    719.00,
    9,
    4.7,
    JSON_ARRAY('16 nucleos', '32 hilos', '5.7 GHz boost', 'AM5')
  ),
  (
    (SELECT id FROM categories WHERE slug = 'ssd'),
    (SELECT id FROM brands WHERE name = 'CrucialX'),
    'nova-ssd-4tb',
    'Nova SSD 4 TB',
    'Almacenamiento ultrarrapido para juegos, proyectos y librerias pesadas.',
    '/assets/products/nova-ssd-4tb.jpg',
    499.00,
    14,
    4.6,
    JSON_ARRAY('NVMe Gen4', '7400 MB/s', 'Disipador', '5 anos garantia')
  ),
  (
    (SELECT id FROM categories WHERE slug = 'fuente'),
    (SELECT id FROM brands WHERE name = 'Corsair'),
    'titan-psu-1000w',
    'Titan PSU 1000W',
    'Fuente estable para builds exigentes con GPUs de nueva generacion.',
    '/assets/products/titan-psu-1000w.jpg',
    279.00,
    7,
    4.8,
    JSON_ARRAY('80+ Platinum', 'ATX 3.0', 'PCIe 5.0', 'Modular')
  ),
  (
    (SELECT id FROM categories WHERE slug = 'ram'),
    (SELECT id FROM brands WHERE name = 'G.Skill'),
    'shadow-ram-32gb',
    'Shadow RAM 32 GB',
    'Memoria de baja latencia para equipos gamer compactos.',
    '/assets/products/shadow-ram-32gb.jpg',
    189.00,
    2,
    4.5,
    JSON_ARRAY('DDR5', '6000 MHz', 'CL30', 'Perfil EXPO')
  );

-- Registra como movimiento de inventario la carga inicial de stock.
INSERT INTO inventory_movements (product_id, movement_type, quantity, note)
SELECT id, 'restock', stock, 'Carga inicial de inventario'
FROM products;

-- Metricas semilla para que el dashboard tenga datos apenas se importa la BD.
CALL sp_register_system_metric(31.4, 58.2, 42.8, 126, 0.78);
CALL sp_register_system_metric(36.7, 61.5, 43.1, 130, 0.92);
