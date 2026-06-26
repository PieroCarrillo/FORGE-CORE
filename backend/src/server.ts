import cors from 'cors';
import express from 'express';
import { ObjectId } from 'mongodb';
import type { RowDataPacket } from 'mysql2';
import { AuthRequest, createSessionToken, hashPassword, publicUser, requireAdmin, requireAuth, verifyPassword } from './auth.js';
import { config } from './config.js';
import { pool, ProductRow, toProduct } from './db.js';
import {
  authenticateLocalUser,
  createLocalReview,
  createLocalProduct,
  createLocalSimulatedOrder,
  createLocalUser,
  getLocalDashboard,
  getLocalProductBySlug,
  hideLocalReview,
  listLocalAdminReviews,
  listLocalUsers,
  listLocalCategories,
  listLocalMetrics,
  listLocalOrdersForUser,
  listLocalReviews,
  listLocalReviewsForUser,
  listLocalProducts,
  logoutLocalUser,
  markHelpfulLocalReview,
  quoteLocalOrder,
  restockLocalProduct,
  updateLocalProduct
} from './localStore.js';
import { startMetricsWorker } from './metrics.js';
import { getReviewsCollection, isMongoConfigured, ProductReviewDocument, toReviewResponse } from './mongo.js';
import { parseLoginPayload, parseOrderItems, parsePositiveInteger, parseProductPayload, parseRegisterPayload, parseReviewPayload } from './validation.js';

type QuoteProductRow = RowDataPacket & {
  id: number;
  name: string;
  price: string;
  stock: number;
};

type LoginUserRow = RowDataPacket & {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'customer';
  password_hash: string;
  password_salt: string;
};

type ProductNameRow = RowDataPacket & {
  id: number;
  name: string;
};

const app = express();

// Middlewares globales: CORS para el frontend y JSON para recibir payloads.
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '1mb' }));

async function getProductName(productId: number) {
  const [rows] = await pool.query<ProductNameRow[]>(
    'SELECT id, name FROM products WHERE id = ? AND active = 1 LIMIT 1',
    [productId]
  );
  return rows[0]?.name ?? '';
}

async function hasVerifiedPurchase(userId: number, userEmail: string, productId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT oi.id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE (o.user_id = ? OR o.customer_email = ?)
        AND oi.product_id = ?
        AND o.status = 'paid_simulated'
      LIMIT 1
    `,
    [userId, userEmail, productId]
  );
  return rows.length > 0;
}

// Healthcheck usado para comprobar si backend y MariaDB estan disponibles.
app.get('/api/health', async (_req, res) => {
  if (config.useMockData) {
    res.json({ status: 'ok', database: 'mock' });
    return;
  }

  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'online' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'offline' });
  }
});

// Lista categorias para filtros del catalogo.
app.get('/api/categories', async (_req, res, next) => {
  if (config.useMockData) {
    res.json(listLocalCategories());
    return;
  }

  try {
    const [rows] = await pool.query('SELECT id, name, slug FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const payload = parseLoginPayload(req.body);

    if (config.useMockData) {
      const session = authenticateLocalUser(payload.identifier, payload.password);
      if (!session) {
        res.status(401).json({ error: 'Credenciales invalidas' });
        return;
      }
      res.json(session);
      return;
    }

    const [rows] = await pool.query<LoginUserRow[]>(
      `
        SELECT id, name, username, email, role, password_hash, password_salt
        FROM users
        WHERE email = ? OR username = ?
        LIMIT 1
      `,
      [payload.identifier, payload.identifier]
    );

    const user = rows[0];
    if (!user || !verifyPassword(payload.password, user.password_salt, user.password_hash)) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const token = createSessionToken();
    await pool.query('UPDATE users SET session_token = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [token, user.id]);

    res.json({
      token,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const payload = parseRegisterPayload(req.body);

    if (config.useMockData) {
      res.status(201).json(createLocalUser(payload));
      return;
    }

    const password = hashPassword(payload.password);
    const token = createSessionToken();
    await pool.query(
      `
        INSERT INTO users (name, username, email, role, password_hash, password_salt, session_token, last_login_at)
        VALUES (?, ?, ?, 'customer', ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [payload.name, payload.username, payload.email, password.hash, password.salt, token]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, username, email, role FROM users WHERE session_token = ? LIMIT 1',
      [token]
    );

    res.status(201).json({
      token,
      user: rows[0]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: publicUser(req.authUser!) });
});

app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const token = req.header('authorization')?.slice(7).trim() ?? '';

    if (config.useMockData) {
      res.json(logoutLocalUser(token));
      return;
    }

    await pool.query('UPDATE users SET session_token = NULL WHERE id = ?', [req.authUser!.id]);
    res.json({ loggedOut: true });
  } catch (error) {
    next(error);
  }
});

// Catalogo principal: soporta filtro por categoria y busqueda por texto.
app.get('/api/products', async (req, res, next) => {
  try {
    const category = String(req.query.category ?? '');
    const search = String(req.query.q ?? '');

    if (config.useMockData) {
      res.json(listLocalProducts(category, search));
      return;
    }

    const params: unknown[] = [];
    const filters = ['p.active = 1'];

    // Los filtros se parametrizan para evitar SQL injection.
    if (category) {
      filters.push('c.slug = ?');
      params.push(category);
    }
    if (search) {
      filters.push('(p.name LIKE ? OR b.name LIKE ? OR c.name LIKE ?)');
      const token = `%${search}%`;
      params.push(token, token, token);
    }

    const [rows] = await pool.query<ProductRow[]>(
      `
        SELECT p.id, p.slug, p.name, c.name AS category_name, b.name AS brand_name,
               p.price, p.stock, p.rating, p.description, p.image_url, p.specs_json, p.active
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        WHERE ${filters.join(' AND ')}
        ORDER BY p.created_at DESC
      `,
      params
    );
    res.json(rows.map(toProduct));
  } catch (error) {
    next(error);
  }
});

// Detalle de producto por slug.
app.get('/api/products/:slug', async (req, res, next) => {
  try {
    if (config.useMockData) {
      const product = getLocalProductBySlug(req.params.slug);
      if (!product) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }
      res.json(product);
      return;
    }

    const [rows] = await pool.query<ProductRow[]>(
      `
        SELECT p.id, p.slug, p.name, c.name AS category_name, b.name AS brand_name,
               p.price, p.stock, p.rating, p.description, p.image_url, p.specs_json, p.active
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        WHERE p.slug = ? AND p.active = 1
      `,
      [req.params.slug]
    );

    if (!rows.length) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json(toProduct(rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id/reviews', async (req, res, next) => {
  try {
    const productId = parsePositiveInteger(req.params.id, 'productId');

    if (config.useMockData) {
      res.json(listLocalReviews(productId));
      return;
    }

    if (!isMongoConfigured()) {
      res.json([]);
      return;
    }

    const collection = await getReviewsCollection();
    const reviews = await collection
      .find({ productId, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(80)
      .toArray();
    res.json(reviews.map(toReviewResponse));
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/:id/reviews', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const productId = parsePositiveInteger(req.params.id, 'productId');
    const payload = parseReviewPayload(req.body);

    if (config.useMockData) {
      res.status(201).json(
        createLocalReview({
          userId: req.authUser!.id,
          userName: req.authUser!.name,
          userEmail: req.authUser!.email,
          productId,
          ...payload
        })
      );
      return;
    }

    if (!isMongoConfigured()) {
      res.status(503).json({ error: 'MongoDB Atlas no esta configurado' });
      return;
    }

    const productName = await getProductName(productId);
    if (!productName) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const now = new Date();
    const review: ProductReviewDocument = {
      userId: req.authUser!.id,
      userName: req.authUser!.name,
      userEmail: req.authUser!.email,
      productId,
      productName,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      verifiedPurchase: await hasVerifiedPurchase(req.authUser!.id, req.authUser!.email, productId),
      helpfulUserIds: [],
      helpfulCount: 0,
      status: 'published',
      createdAt: now,
      updatedAt: now
    };

    const collection = await getReviewsCollection();
    const result = await collection.insertOne(review);
    res.status(201).json(toReviewResponse({ ...review, _id: result.insertedId }));
  } catch (error) {
    next(error);
  }
});

// Cotiza carrito sin crear pedido: valida productos, stock, subtotal, IGV y envio.
app.post('/api/cart/quote', async (req, res, next) => {
  try {
    const items = parseOrderItems(req.body.items);

    if (config.useMockData) {
      res.json(quoteLocalOrder(items));
      return;
    }

    const ids = items.map((item) => item.productId);
    const [rows] = await pool.query<QuoteProductRow[]>(
      `SELECT id, name, price, stock FROM products WHERE id IN (${ids.map(() => '?').join(',')}) AND active = 1`,
      ids
    );

    const quotedItems = items.map((item) => {
      const product = rows.find((row) => row.id === item.productId);
      if (!product) {
        throw new Error(`Producto ${item.productId} no existe`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }
      return {
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        lineTotal: Number(product.price) * item.quantity
      };
    });

    const subtotal = quotedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = subtotal * 0.18;
    const shipping = subtotal > 0 ? 25 : 0;
    res.json({ items: quotedItems, subtotal, tax, shipping, total: subtotal + tax + shipping });
  } catch (error) {
    next(error);
  }
});

// Checkout simulado: llama al stored procedure que crea pedido y descuenta inventario.
app.post('/api/orders/simulated-payment', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const customerName = String(req.body.customerName ?? req.authUser?.name ?? '').trim();
    const customerEmail = String(req.body.customerEmail ?? req.authUser?.email ?? '').trim();
    if (customerName.length < 2 || !customerEmail.includes('@')) {
      res.status(400).json({ error: 'Cliente invalido' });
      return;
    }

    const items = parseOrderItems(req.body.items).map((item) => ({
      product_id: item.productId,
      quantity: item.quantity
    }));
    const paymentReference = `SIM-${Date.now()}`;

    if (config.useMockData) {
      const order = createLocalSimulatedOrder(
        customerName,
        customerEmail,
        items.map((item) => ({ productId: item.product_id, quantity: item.quantity })),
        req.authUser?.id ?? null
      );
      res.status(201).json({ paymentReference, order });
      return;
    }

    const [resultSets] = await pool.query('CALL sp_create_simulated_order(?, ?, ?, ?, ?)', [
      req.authUser?.id ?? null,
      customerName,
      customerEmail,
      paymentReference,
      JSON.stringify(items)
    ]);

    const procedureRows = resultSets as Array<Array<Record<string, unknown>>>;
    res.status(201).json({
      paymentReference,
      order: procedureRows[0]?.[0] ?? null
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/account/orders', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (config.useMockData) {
      res.json(listLocalOrdersForUser(req.authUser!.id));
      return;
    }

    const [rows] = await pool.query(
      `
        SELECT id, customer_name, customer_email, payment_reference, subtotal, tax, shipping, total, status, created_at
        FROM orders
        WHERE user_id = ? OR customer_email = ?
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [req.authUser!.id, req.authUser!.email]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/account/reviews', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (config.useMockData) {
      res.json(listLocalReviewsForUser(req.authUser!.id));
      return;
    }

    if (!isMongoConfigured()) {
      res.json([]);
      return;
    }

    const collection = await getReviewsCollection();
    const reviews = await collection
      .find({ userId: req.authUser!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json(reviews.map(toReviewResponse));
  } catch (error) {
    next(error);
  }
});

app.get('/api/reviews', async (_req, res, next) => {
  try {
    if (config.useMockData) {
      res.json(listLocalAdminReviews().filter((review) => review.status === 'published').slice(0, 100));
      return;
    }

    if (!isMongoConfigured()) {
      res.json([]);
      return;
    }

    const collection = await getReviewsCollection();
    const reviews = await collection
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    res.json(reviews.map(toReviewResponse));
  } catch (error) {
    next(error);
  }
});

app.post('/api/reviews/:id/helpful', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reviewId = req.params.id;

    if (config.useMockData) {
      res.json(markHelpfulLocalReview(reviewId, req.authUser!.id));
      return;
    }

    if (!isMongoConfigured()) {
      res.status(503).json({ error: 'MongoDB Atlas no esta configurado' });
      return;
    }
    if (!ObjectId.isValid(reviewId)) {
      res.status(400).json({ error: 'id de resena invalido' });
      return;
    }

    const collection = await getReviewsCollection();
    await collection.updateOne(
      { _id: new ObjectId(reviewId), status: 'published' },
      {
        $addToSet: { helpfulUserIds: req.authUser!.id },
        $set: { updatedAt: new Date() }
      }
    );
    const review = await collection.findOne({ _id: new ObjectId(reviewId) });
    if (!review) {
      res.status(404).json({ error: 'Resena no encontrada' });
      return;
    }
    await collection.updateOne(
      { _id: review._id },
      { $set: { helpfulCount: review.helpfulUserIds.length } }
    );
    res.json(toReviewResponse({ ...review, helpfulCount: review.helpfulUserIds.length }));
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', requireAdmin, async (_req, res, next) => {
  if (config.useMockData) {
    res.json(listLocalUsers());
    return;
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT id, name, username, email, role, created_at, last_login_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 50
      `
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/reviews', requireAdmin, async (_req, res, next) => {
  try {
    if (config.useMockData) {
      res.json(listLocalAdminReviews());
      return;
    }

    if (!isMongoConfigured()) {
      res.json([]);
      return;
    }

    const collection = await getReviewsCollection();
    const reviews = await collection.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    res.json(reviews.map(toReviewResponse));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const reviewId = req.params.id;

    if (config.useMockData) {
      res.json(hideLocalReview(reviewId));
      return;
    }

    if (!isMongoConfigured()) {
      res.status(503).json({ error: 'MongoDB Atlas no esta configurado' });
      return;
    }
    if (!ObjectId.isValid(reviewId)) {
      res.status(400).json({ error: 'id de resena invalido' });
      return;
    }

    const collection = await getReviewsCollection();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      { $set: { status: 'hidden', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) {
      res.status(404).json({ error: 'Reseña no encontrada' });
      return;
    }
    res.json(toReviewResponse(result));
  } catch (error) {
    next(error);
  }
});

// Dashboard administrativo: ventas, stock bajo y ultimos pedidos.
app.get('/api/admin/dashboard', requireAdmin, async (_req, res, next) => {
  if (config.useMockData) {
    res.json(getLocalDashboard());
    return;
  }

  try {
    const [resultSets] = await pool.query('CALL sp_admin_dashboard_summary()');
    const sets = resultSets as Array<Array<Record<string, unknown>>>;
    res.json({
      summary: sets[0]?.[0] ?? {},
      lowStock: sets[1] ?? [],
      latestOrders: sets[2] ?? []
    });
  } catch (error) {
    next(error);
  }
});

// Ultimas metricas recolectadas desde el sistema operativo del App Server.
app.get('/api/admin/system-metrics', requireAdmin, async (_req, res, next) => {
  if (config.useMockData) {
    res.json(listLocalMetrics());
    return;
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT id, cpu_percent, memory_percent, disk_percent, process_count, load_avg, collected_at
        FROM system_metrics
        ORDER BY collected_at DESC
        LIMIT 50
      `
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Crea producto desde el formulario Admin.
app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const product = parseProductPayload(req.body);

    if (config.useMockData) {
      res.status(201).json(createLocalProduct(product));
      return;
    }

    const [result] = await pool.query(
      `
        INSERT INTO products (category_id, brand_id, slug, name, description, price, stock, image_url, specs_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [product.categoryId, product.brandId, product.slug, product.name, product.description, product.price, product.stock, product.imageUrl || `/assets/products/${product.slug}.jpg`, JSON.stringify(product.specs)]
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Actualiza un producto existente.
app.put('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.id, 'id');
    const product = parseProductPayload(req.body);

    if (config.useMockData) {
      res.json(updateLocalProduct(id, product));
      return;
    }

    await pool.query(
      `
        UPDATE products
        SET category_id = ?, brand_id = ?, slug = ?, name = ?, description = ?,
            price = ?, stock = ?, image_url = ?, specs_json = ?
        WHERE id = ?
      `,
      [product.categoryId, product.brandId, product.slug, product.name, product.description, product.price, product.stock, product.imageUrl || `/assets/products/${product.slug}.jpg`, JSON.stringify(product.specs), id]
    );
    res.json({ updated: true });
  } catch (error) {
    next(error);
  }
});

// Repone stock usando el stored procedure de inventario.
app.post('/api/admin/products/:id/restock', requireAdmin, async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.id, 'id');
    const quantity = parsePositiveInteger(req.body.quantity, 'quantity');

    if (config.useMockData) {
      res.json(restockLocalProduct(id, quantity, String(req.body.note ?? 'Reposicion manual')));
      return;
    }

    await pool.query('CALL sp_restock_product(?, ?, ?)', [id, quantity, String(req.body.note ?? 'Reposicion manual')]);
    res.json({ restocked: true });
  } catch (error) {
    next(error);
  }
});

// Manejador central de errores para que la API responda JSON uniforme.
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Error inesperado';
  const status = message.includes('Stock insuficiente') || message.includes('no existe') || message.includes('invalido') || message.includes('debe tener') ? 400 : 500;
  res.status(status).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`FORGE CORE API escuchando en puerto ${config.port}`);
  if (config.useMockData) {
    console.log('Modo local activo: usando datos en memoria, sin MariaDB ni AWS.');
    return;
  }
  if (config.nodeEnv !== 'test') {
    // En produccion inicia el worker que registra CPU, RAM, disco y procesos.
    startMetricsWorker();
  }
});
