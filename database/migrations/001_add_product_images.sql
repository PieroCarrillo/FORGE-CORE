USE forge_core;

-- Migracion historica: agrega columna de imagen si el esquema anterior no la tenia.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NOT NULL DEFAULT '';

-- Rellena imagenes por convencion de slug para productos antiguos.
UPDATE products
SET image_url = CONCAT('/assets/products/', slug, '.jpg')
WHERE image_url = '';
