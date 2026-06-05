USE forge_core;

-- Tabla de comentarios de compradores para la seccion Comunidad.
CREATE TABLE IF NOT EXISTS buyer_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  author VARCHAR(120) NOT NULL,
  product VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_buyer_messages_created_at (created_at)
) ENGINE=InnoDB;

-- Mensajes semilla. Cada INSERT evita duplicados con WHERE NOT EXISTS.
INSERT INTO buyer_messages (author, product, message)
SELECT 'Mateo R.', 'RTX 4090 Ultra', 'La pondria con una fuente de 1000W si vas por 4K y render. En el checkout se nota rapido cuando baja el stock.'
WHERE NOT EXISTS (SELECT 1 FROM buyer_messages WHERE author = 'Mateo R.' AND product = 'RTX 4090 Ultra');

INSERT INTO buyer_messages (author, product, message)
SELECT 'Camila S.', 'Samsung 990 PRO 2TB NVMe SSD', 'Para juegos grandes conviene NVMe Gen4. El dashboard admin ayuda a ver que productos se mueven mas.'
WHERE NOT EXISTS (SELECT 1 FROM buyer_messages WHERE author = 'Camila S.' AND product = 'Samsung 990 PRO 2TB NVMe SSD');

INSERT INTO buyer_messages (author, product, message)
SELECT 'Diego P.', 'Corsair Vengeance RGB DDR5 32GB 6000MHz', '32 GB DDR5 es el punto dulce para gaming y edicion ligera. Buen combo con Ryzen 7.'
WHERE NOT EXISTS (SELECT 1 FROM buyer_messages WHERE author = 'Diego P.' AND product = 'Corsair Vengeance RGB DDR5 32GB 6000MHz');
