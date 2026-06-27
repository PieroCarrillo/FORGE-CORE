import { pbkdf2Sync } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'MONGODB_URI'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Falta variable requerida: ${key}`);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 4
});

const mongo = new MongoClient(process.env.MONGODB_URI);
const mongoDbName = process.env.MONGODB_DB ?? 'forge_core';

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
}

const firstNames = [
  'Valeria', 'Mateo', 'Camila', 'Sebastian', 'Lucia', 'Nicolas', 'Renata', 'Diego', 'Sofia', 'Gabriel',
  'Mia', 'Adrian', 'Isabella', 'Lucas', 'Daniela', 'Joaquin', 'Paula', 'Bruno', 'Alessia', 'Thiago',
  'Fernanda', 'Iker', 'Antonella', 'Rodrigo', 'Ariana', 'Emiliano', 'Catalina', 'Samuel', 'Bianca', 'Leonardo',
  'Mariana', 'Facundo', 'Ximena', 'Tomas', 'Abril', 'Maximiliano', 'Elena', 'Gael', 'Julieta', 'Franco',
  'Regina', 'Andres', 'Carla', 'Martin', 'Noelia', 'Dante', 'Victoria', 'Pablo', 'Miranda', 'Hugo'
];

const lastNames = [
  'Rojas', 'Vargas', 'Mendoza', 'Castillo', 'Flores', 'Torres', 'Salazar', 'Paredes', 'Quispe', 'Herrera'
];

const reviewTemplates = [
  {
    title: 'Rendimiento muy solido',
    comment: 'El producto mantiene buen rendimiento en sesiones largas. Para una build gamer se siente estable y el precio queda razonable frente a otras opciones.'
  },
  {
    title: 'Buena compra para actualizar PC',
    comment: 'Lo compre para renovar mi equipo y funciono bien con el resto de componentes. La ficha del catalogo ayuda a comparar especificaciones rapido.'
  },
  {
    title: 'Ideal para demo de e-commerce',
    comment: 'La compra simulada queda registrada y luego aparece como compra verificada. Me gusta que el inventario y las reseñas esten conectados.'
  },
  {
    title: 'Compatible y facil de recomendar',
    comment: 'Buena opcion si quieres armar una PC equilibrada. El producto se ve ordenado en el catalogo y la experiencia de compra es clara.'
  },
  {
    title: 'Buen balance precio rendimiento',
    comment: 'No es solo apariencia: tiene buen balance entre precio, stock disponible y especificaciones. Lo recomendaria para builds de gama media alta.'
  }
];

async function main() {
  const [products] = await pool.query(`
    SELECT p.id, p.name, p.price, p.rating, c.name AS category, b.name AS brand
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN brands b ON b.id = p.brand_id
    WHERE p.active = 1
    ORDER BY p.id ASC
  `);

  if (!products.length) {
    throw new Error('No hay productos activos para generar compras y reseñas.');
  }

  const source = 'demo_activity_v1';
  await pool.query(`
    DELETE oi
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_reference LIKE 'DEMO-ACT-%'
  `);
  await pool.query("DELETE FROM orders WHERE payment_reference LIKE 'DEMO-ACT-%'");

  await mongo.connect();
  const reviews = mongo.db(mongoDbName).collection('product_reviews');
  await reviews.deleteMany({ source });

  const password = 'ClienteDemo2026!';
  const users = [];

  for (let index = 0; index < 50; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    const name = `${firstNames[index]} ${lastNames[index % lastNames.length]}`;
    const username = `cliente_demo_${number}`;
    const email = `${username}@forgecore.local`;
    const salt = `demo_customer_${number}_salt_v1`;
    const hash = hashPassword(password, salt);

    await pool.query(
      `
        INSERT INTO users (name, username, email, role, password_hash, password_salt)
        VALUES (?, ?, ?, 'customer', ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), role = 'customer'
      `,
      [name, username, email, hash, salt]
    );

    const [rows] = await pool.query('SELECT id, name, email FROM users WHERE username = ? LIMIT 1', [username]);
    users.push(rows[0]);
  }

  const [primaryCustomerRows] = await pool.query("SELECT id, name, email FROM users WHERE username = 'cliente' LIMIT 1");
  const reviewUsers = primaryCustomerRows[0] ? [primaryCustomerRows[0], ...users] : users;
  const reviewDocs = [];

  for (let userIndex = 0; userIndex < reviewUsers.length; userIndex += 1) {
    const user = reviewUsers[userIndex];

    for (let purchaseIndex = 0; purchaseIndex < 4; purchaseIndex += 1) {
      const product = products[(userIndex * 4 + purchaseIndex) % products.length];
      const paymentReference = `DEMO-ACT-${String(userIndex + 1).padStart(2, '0')}-${purchaseIndex + 1}`;
      const unitPrice = Number(product.price);
      const quantity = 1;
      const subtotal = unitPrice * quantity;
      const tax = Number((subtotal * 0.18).toFixed(2));
      const shipping = 25;
      const total = Number((subtotal + tax + shipping).toFixed(2));

      await pool.query(
        `
          INSERT INTO orders (
            user_id, customer_name, customer_email, payment_reference, status, fulfillment_status,
            status_updated_at, subtotal, tax, shipping, discount, total, created_at
          )
          VALUES (?, ?, ?, ?, 'paid_simulated', 'delivered', CURRENT_TIMESTAMP, ?, ?, ?, 0, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY))
        `,
        [user.id, user.name, user.email, paymentReference, subtotal, tax, shipping, total, (userIndex + purchaseIndex) % 28]
      );

      const [orderRows] = await pool.query('SELECT id FROM orders WHERE payment_reference = ? LIMIT 1', [paymentReference]);
      await pool.query(
        `
          INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [orderRows[0].id, product.id, product.name, unitPrice, quantity, subtotal]
      );

      const template = reviewTemplates[(userIndex + purchaseIndex) % reviewTemplates.length];
      const rating = Math.max(4, Math.min(5, Math.round(Number(product.rating) + ((userIndex + purchaseIndex) % 2 === 0 ? 0 : 0.2))));
      reviewDocs.push({
        source,
        userId: Number(user.id),
        userName: user.name,
        userEmail: user.email,
        productId: Number(product.id),
        productName: product.name,
        rating,
        title: template.title,
        comment: `${template.comment} Categoria ${product.category}, marca ${product.brand}.`,
        verifiedPurchase: true,
        helpfulUserIds: [],
        helpfulCount: (userIndex + purchaseIndex) % 7,
        status: 'published',
        createdAt: new Date(Date.now() - ((userIndex * 4 + purchaseIndex) % 30) * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
    }
  }

  if (reviewDocs.length) {
    await reviews.insertMany(reviewDocs);
  }

  await reviews.createIndex({ productId: 1, status: 1, createdAt: -1 });
  await reviews.createIndex({ userId: 1, createdAt: -1 });
  await reviews.createIndex({ source: 1 });

  console.log(`Usuarios demo generados: ${users.length}`);
  console.log(`Cliente principal incluido: ${primaryCustomerRows[0] ? 'si' : 'no'}`);
  console.log(`Compras demo: ${reviewUsers.length * 4}`);
  console.log(`Reseñas demo: ${reviewDocs.length}`);
  console.log(`Productos cubiertos: ${new Set(reviewDocs.map((review) => review.productId)).size}/${products.length}`);

  await mongo.close();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await mongo.close().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
