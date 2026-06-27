import cors from 'cors';
import express from 'express';
import { ObjectId } from 'mongodb';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AuthRequest, createSessionToken, hashPassword, publicUser, requireAdmin, requireAuth, requireProductManager, verifyPassword } from './auth.js';
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
import {
  OrderItemInput,
  parseLoginPayload,
  parseOptionalPromotionCode,
  parseOrderItems,
  parseOrderStatusPayload,
  parsePasswordResetConfirm,
  parsePasswordResetRequest,
  parsePositiveInteger,
  parseProductPayload,
  parseRegisterPayload,
  parseReviewPayload
} from './validation.js';

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
  role: 'admin' | 'customer' | 'seller';
  password_hash: string;
  password_salt: string;
};

type ProductNameRow = RowDataPacket & {
  id: number;
  name: string;
};

type CartRow = RowDataPacket & {
  id: number;
};

type CartItemRow = ProductRow & {
  quantity: number;
};

type PromotionRow = RowDataPacket & {
  code: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
};

type ResetUserRow = RowDataPacket & {
  id: number;
};

type AssistantProduct = ReturnType<typeof toProduct> & {
  reviewCount: number;
  reviewAverage: number;
  reviewSnippets: string[];
};

type AssistantReviewSignal = {
  productId: number;
  rating: number;
  title: string;
  comment: string;
  helpfulCount: number;
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

function getCartSessionToken(userId: number) {
  return `user:${userId}`;
}

async function ensureUserCart(userId: number) {
  const [existing] = await pool.query<CartRow[]>(
    'SELECT id FROM carts WHERE user_id = ? AND status = ? LIMIT 1',
    [userId, 'active']
  );
  if (existing[0]) return existing[0].id;

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO carts (user_id, session_token, status) VALUES (?, ?, ?)',
    [userId, getCartSessionToken(userId), 'active']
  );
  return result.insertId;
}

async function readUserCart(userId: number) {
  const cartId = await ensureUserCart(userId);
  const [rows] = await pool.query<CartItemRow[]>(
    `
      SELECT p.id, p.slug, p.name, c.name AS category_name, b.name AS brand_name,
             p.price, p.stock, p.rating, p.description, p.image_url, p.specs_json,
             p.active, ci.quantity
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      WHERE ci.cart_id = ? AND p.active = 1
      ORDER BY ci.updated_at DESC
    `,
    [cartId]
  );

  return {
    cartId,
    items: rows.map((row) => ({ ...toProduct(row), quantity: row.quantity }))
  };
}

async function getActivePromotion(code: string) {
  if (!code) return null;
  const [rows] = await pool.query<PromotionRow[]>(
    `
      SELECT code, description, discount_type, discount_value
      FROM promotions
      WHERE code = ?
        AND active = 1
        AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
        AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
      LIMIT 1
    `,
    [code]
  );
  return rows[0] ?? null;
}

function calculateDiscount(subtotal: number, promotion: PromotionRow | null) {
  if (!promotion || subtotal <= 0) return 0;
  const value = Number(promotion.discount_value);
  const rawDiscount = promotion.discount_type === 'percent' ? subtotal * (value / 100) : value;
  return Math.max(0, Math.min(subtotal, Number(rawDiscount.toFixed(2))));
}

async function quoteOrderItems(items: OrderItemInput[], promotionCode = '') {
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
  const promotion = await getActivePromotion(promotionCode);
  if (promotionCode && !promotion) {
    throw new Error('codigo promocional no existe o esta inactivo');
  }
  const discount = calculateDiscount(subtotal, promotion);

  return {
    items: quotedItems,
    subtotal,
    tax,
    shipping,
    discount,
    promotionCode: promotion?.code ?? '',
    promotionDescription: promotion?.description ?? '',
    total: subtotal + tax + shipping - discount
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function detectAssistantCategory(message: string) {
  const text = normalizeText(message);
  const rules: Array<{ category: string; keywords: string[] }> = [
    { category: 'GPU', keywords: ['gpu', 'grafica', 'tarjeta de video', 'video', '4k', 'ray tracing', 'dlss', 'render', 'ia'] },
    { category: 'CPU', keywords: ['cpu', 'procesador', 'nucleos', 'hilos', 'streaming', 'compilar', 'multitarea'] },
    { category: 'RAM', keywords: ['ram', 'memoria', 'ddr5', 'ddr4', 'gb', 'rgb'] },
    { category: 'SSD', keywords: ['ssd', 'nvme', 'almacenamiento', 'disco', 'cargas', 'juegos pesados'] },
    { category: 'Fuente', keywords: ['fuente', 'psu', 'watts', 'watt', 'energia', '1000w', '850w'] }
  ];

  return rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)))?.category ?? '';
}

function detectAssistantBudget(message: string) {
  const matches = normalizeText(message).match(/\b\d{2,5}\b/g) ?? [];
  const values = matches.map(Number).filter((value) => value >= 50);
  return values.length ? Math.max(...values) : null;
}

function detectAssistantIntent(message: string) {
  const text = normalizeText(message);
  return {
    gaming: ['gaming', 'jugar', 'fps', '4k', '1440p', 'ultra'].some((word) => text.includes(word)),
    creator: ['render', 'edicion', 'streaming', 'ia', '3d', 'productividad'].some((word) => text.includes(word)),
    compact: ['compacto', 'mini', 'pequeno', 'itx'].some((word) => text.includes(word)),
    upgrade: ['mejorar', 'upgrade', 'actualizar'].some((word) => text.includes(word))
  };
}

function scoreAssistantProduct(product: AssistantProduct, message: string, category: string, budget: number | null) {
  const text = normalizeText(message);
  const haystack = normalizeText([product.name, product.brand, product.category, product.description, product.specs.join(' ')].join(' '));
  const intent = detectAssistantIntent(message);
  let score = Number(product.rating) * 8 + product.reviewAverage * 5 + Math.min(product.reviewCount, 8) * 2;

  if (category && product.category === category) score += 60;
  if (product.stock > 0) score += 12;
  if (budget && product.price <= budget) score += 25;
  if (budget && product.price > budget) score -= Math.min(35, (product.price - budget) / 35);
  if (intent.gaming && ['GPU', 'CPU', 'RAM'].includes(product.category)) score += 12;
  if (intent.creator && ['GPU', 'CPU', 'SSD'].includes(product.category)) score += 10;
  if (intent.compact && haystack.includes('compact')) score += 8;
  if (intent.upgrade && product.price < 700) score += 8;

  for (const token of text.split(/\s+/).filter((word) => word.length > 3)) {
    if (haystack.includes(token)) score += 2;
  }

  return score;
}

function summarizeAssistantReviews(reviews: AssistantReviewSignal[]) {
  const grouped = new Map<number, AssistantReviewSignal[]>();
  for (const review of reviews) {
    const current = grouped.get(review.productId) ?? [];
    current.push(review);
    grouped.set(review.productId, current);
  }
  return grouped;
}

function buildAssistantReply(message: string, products: AssistantProduct[]) {
  const category = detectAssistantCategory(message);
  const budget = detectAssistantBudget(message);
  const scored = products
    .map((product) => ({
      product,
      score: scoreAssistantProduct(product, message, category, budget)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.product);

  if (!scored.length) {
    return {
      reply: 'No encontre productos activos suficientes para recomendar ahora. Revisa el catalogo o intenta una pregunta mas especifica.',
      recommendations: []
    };
  }

  const main = scored[0];
  const categoryText = category ? ` para ${category}` : '';
  const budgetText = budget ? ` y considerando un presupuesto cercano a $${budget}` : '';
  const reviewText = main.reviewCount
    ? ` Tiene ${main.reviewCount} resena(s) con promedio ${main.reviewAverage.toFixed(1)}/5; eso ayuda a validar la recomendacion con opiniones reales.`
    : ' Aun no tiene muchas resenas, asi que priorice sus especificaciones, stock y precio.';
  const snippets = main.reviewSnippets.length ? ` Comentarios destacados: ${main.reviewSnippets.slice(0, 2).join(' | ')}` : '';

  return {
    reply: `Te recomendaria empezar con ${main.name}${categoryText}${budgetText}. Es ${main.category}, cuesta $${main.price.toLocaleString('en-US')} y tiene stock ${main.stock}.${reviewText}${snippets} Tambien puedes comparar con ${scored.slice(1).map((product) => product.name).join(' y ') || 'otros productos del catalogo'}.`,
    recommendations: scored.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      stock: product.stock,
      rating: product.rating,
      imageUrl: product.imageUrl,
      reviewCount: product.reviewCount,
      reviewAverage: Number(product.reviewAverage.toFixed(1))
    }))
  };
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

app.get('/api/promotions', async (_req, res, next) => {
  if (config.useMockData) {
    res.json([
      { code: 'FORGE10', description: '10% de descuento demo para compras academicas.', discount_type: 'percent', discount_value: 10 },
      { code: 'SETUP25', description: 'US$25 de descuento para builds completos.', discount_type: 'fixed', discount_value: 25 }
    ]);
    return;
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT code, description, discount_type, discount_value
        FROM promotions
        WHERE active = 1
          AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
          AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
      `
    );
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

app.post('/api/auth/password-reset/request', async (req, res, next) => {
  try {
    const payload = parsePasswordResetRequest(req.body);
    const resetToken = createSessionToken();

    if (config.useMockData) {
      res.json({
        message: 'Token demo generado. En produccion se enviaria por correo.',
        resetToken
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
        UPDATE users
        SET password_reset_token = ?,
            password_reset_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 20 MINUTE)
        WHERE email = ? OR username = ?
      `,
      [resetToken, payload.identifier, payload.identifier]
    );

    res.json({
      message: 'Si el usuario existe, se genero un token de recuperacion.',
      resetToken: result.affectedRows > 0 ? resetToken : null
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/password-reset/confirm', async (req, res, next) => {
  try {
    const payload = parsePasswordResetConfirm(req.body);
    const password = hashPassword(payload.password);

    if (config.useMockData) {
      res.json({ updated: true });
      return;
    }

    const [rows] = await pool.query<ResetUserRow[]>(
      `
        SELECT id
        FROM users
        WHERE password_reset_token = ?
          AND password_reset_expires_at >= CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [payload.token]
    );

    if (!rows[0]) {
      res.status(400).json({ error: 'Token vencido o invalido' });
      return;
    }

    await pool.query(
      `
        UPDATE users
        SET password_hash = ?,
            password_salt = ?,
            session_token = NULL,
            password_reset_token = NULL,
            password_reset_expires_at = NULL
        WHERE id = ?
      `,
      [password.hash, password.salt, rows[0].id]
    );
    res.json({ updated: true });
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

app.post('/api/assistant/chat', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const message = String(req.body.message ?? '').trim();
    if (message.length < 3 || message.length > 700) {
      res.status(400).json({ error: 'La pregunta debe tener entre 3 y 700 caracteres' });
      return;
    }

    if (config.useMockData) {
      const reviews = listLocalAdminReviews()
        .filter((review) => review.status === 'published')
        .map((review) => ({
          productId: review.productId,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          helpfulCount: review.helpfulCount
        }));
      const groupedReviews = summarizeAssistantReviews(reviews);
      const products = listLocalProducts('', '').map((product) => {
        const productReviews = groupedReviews.get(product.id) ?? [];
        const reviewAverage = productReviews.length
          ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
          : Number(product.rating);
        return {
          ...product,
          reviewCount: productReviews.length,
          reviewAverage,
          reviewSnippets: productReviews.slice(0, 3).map((review) => `${review.title}: ${review.comment.slice(0, 90)}`)
        } as AssistantProduct;
      });
      res.json(buildAssistantReply(message, products));
      return;
    }

    const [rows] = await pool.query<ProductRow[]>(
      `
        SELECT p.id, p.slug, p.name, c.name AS category_name, b.name AS brand_name,
               p.price, p.stock, p.rating, p.description, p.image_url, p.specs_json, p.active
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        WHERE p.active = 1
        ORDER BY p.stock DESC, p.rating DESC, p.created_at DESC
        LIMIT 80
      `
    );

    let reviews: AssistantReviewSignal[] = [];
    if (isMongoConfigured()) {
      const collection = await getReviewsCollection();
      const reviewDocs = await collection
        .find({ status: 'published' })
        .sort({ helpfulCount: -1, createdAt: -1 })
        .limit(200)
        .toArray();
      reviews = reviewDocs.map((review) => ({
        productId: review.productId,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        helpfulCount: review.helpfulCount
      }));
    }

    const groupedReviews = summarizeAssistantReviews(reviews);
    const products = rows.map((row) => {
      const product = toProduct(row);
      const productReviews = groupedReviews.get(product.id) ?? [];
      const reviewAverage = productReviews.length
        ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
        : Number(product.rating);
      return {
        ...product,
        reviewCount: productReviews.length,
        reviewAverage,
        reviewSnippets: productReviews
          .sort((a, b) => b.helpfulCount - a.helpfulCount || b.rating - a.rating)
          .slice(0, 3)
          .map((review) => `${review.title}: ${review.comment.slice(0, 90)}`)
      };
    });

    res.json(buildAssistantReply(message, products));
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
    const promotionCode = parseOptionalPromotionCode(req.body.promotionCode ?? req.body.promotion_code);

    if (config.useMockData) {
      const quote = quoteLocalOrder(items);
      const discount = promotionCode === 'FORGE10' ? quote.subtotal * 0.1 : promotionCode === 'SETUP25' ? Math.min(25, quote.subtotal) : 0;
      res.json({ ...quote, discount, promotionCode, total: quote.total - discount });
      return;
    }

    res.json(await quoteOrderItems(items, promotionCode));
  } catch (error) {
    next(error);
  }
});

app.get('/api/cart', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (config.useMockData) {
      res.json({ items: [] });
      return;
    }

    res.json(await readUserCart(req.authUser!.id));
  } catch (error) {
    next(error);
  }
});

app.put('/api/cart', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    const items = rawItems.length ? parseOrderItems(rawItems) : [];

    if (config.useMockData) {
      res.json({ items });
      return;
    }

    const cartId = await ensureUserCart(req.authUser!.id);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    for (const item of items) {
      await pool.query(
        `
          INSERT INTO cart_items (cart_id, product_id, quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP
        `,
        [cartId, item.productId, item.quantity]
      );
    }

    res.json(await readUserCart(req.authUser!.id));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/cart', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (!config.useMockData) {
      const cartId = await ensureUserCart(req.authUser!.id);
      await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    }
    res.json({ cleared: true });
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
    const promotionCode = parseOptionalPromotionCode(req.body.promotionCode ?? req.body.promotion_code);
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

    const quote = await quoteOrderItems(
      items.map((item) => ({ productId: item.product_id, quantity: item.quantity })),
      promotionCode
    );

    const [resultSets] = await pool.query('CALL sp_create_simulated_order(?, ?, ?, ?, ?)', [
      req.authUser?.id ?? null,
      customerName,
      customerEmail,
      paymentReference,
      JSON.stringify(items)
    ]);

    const procedureRows = resultSets as Array<Array<Record<string, unknown>>>;
    await pool.query(
      `
        UPDATE orders
        SET discount = ?,
            promotion_code = NULLIF(?, ''),
            total = ?,
            status_updated_at = CURRENT_TIMESTAMP
        WHERE payment_reference = ?
      `,
      [quote.discount, quote.promotionCode, quote.total, paymentReference]
    );
    const cartId = await ensureUserCart(req.authUser!.id);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    res.status(201).json({
      paymentReference,
      order: { ...(procedureRows[0]?.[0] ?? {}), total: quote.total, discount: quote.discount, promotionCode: quote.promotionCode }
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
        SELECT id, customer_name, customer_email, payment_reference, subtotal, tax, shipping,
               discount, promotion_code, total, status, fulfillment_status, status_updated_at, created_at
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

app.get('/api/admin/reports', requireAdmin, async (_req, res, next) => {
  if (config.useMockData) {
    res.json({
      revenueByCategory: [],
      topProducts: [],
      ordersByStatus: [],
      promotionUsage: []
    });
    return;
  }

  try {
    const [revenueByCategory, topProducts, ordersByStatus, promotionUsage] = await Promise.all([
      pool.query(
        `
          SELECT c.name AS category, COALESCE(SUM(oi.line_total), 0) AS revenue, COALESCE(SUM(oi.quantity), 0) AS units
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN categories c ON c.id = p.category_id
          GROUP BY c.name
          ORDER BY revenue DESC
        `
      ),
      pool.query(
        `
          SELECT product_name, COALESCE(SUM(quantity), 0) AS units, COALESCE(SUM(line_total), 0) AS revenue
          FROM order_items
          GROUP BY product_name
          ORDER BY units DESC, revenue DESC
          LIMIT 8
        `
      ),
      pool.query(
        `
          SELECT fulfillment_status, COUNT(*) AS total
          FROM orders
          GROUP BY fulfillment_status
          ORDER BY total DESC
        `
      ),
      pool.query(
        `
          SELECT COALESCE(promotion_code, 'SIN_CUPON') AS promotion_code,
                 COUNT(*) AS orders,
                 COALESCE(SUM(discount), 0) AS discount_total
          FROM orders
          GROUP BY promotion_code
          ORDER BY orders DESC
        `
      )
    ]);

    res.json({
      revenueByCategory: revenueByCategory[0],
      topProducts: topProducts[0],
      ordersByStatus: ordersByStatus[0],
      promotionUsage: promotionUsage[0]
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.id, 'id');
    const payload = parseOrderStatusPayload(req.body);

    if (!config.useMockData) {
      await pool.query(
        'UPDATE orders SET fulfillment_status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [payload.fulfillmentStatus, id]
      );
    }
    res.json({ updated: true, fulfillmentStatus: payload.fulfillmentStatus });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/products', requireProductManager, async (_req: AuthRequest, res, next) => {
  if (config.useMockData) {
    res.json(listLocalProducts('', ''));
    return;
  }

  try {
    const [rows] = await pool.query<ProductRow[]>(
      `
        SELECT p.id, p.slug, p.name, c.name AS category_name, b.name AS brand_name,
               p.price, p.stock, p.rating, p.description, p.image_url, p.specs_json, p.active
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        ORDER BY p.updated_at DESC, p.created_at DESC
      `
    );
    res.json(rows.map(toProduct));
  } catch (error) {
    next(error);
  }
});

// Crea producto desde el formulario Admin/Vendedor.
app.post('/api/admin/products', requireProductManager, async (req: AuthRequest, res, next) => {
  try {
    const product = parseProductPayload(req.body);

    if (config.useMockData) {
      res.status(201).json(createLocalProduct(product));
      return;
    }

    const [result] = await pool.query(
      `
        INSERT INTO products (category_id, brand_id, seller_id, slug, name, description, price, stock, image_url, specs_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.categoryId,
        product.brandId,
        req.authUser!.role === 'seller' ? req.authUser!.id : null,
        product.slug,
        product.name,
        product.description,
        product.price,
        product.stock,
        product.imageUrl || `/assets/products/${product.slug}.jpg`,
        JSON.stringify(product.specs)
      ]
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Actualiza un producto existente.
app.put('/api/admin/products/:id', requireProductManager, async (req, res, next) => {
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
app.post('/api/admin/products/:id/restock', requireProductManager, async (req, res, next) => {
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

app.delete('/api/admin/products/:id', requireProductManager, async (req, res, next) => {
  try {
    const id = parsePositiveInteger(req.params.id, 'id');

    if (config.useMockData) {
      res.json({ deactivated: true });
      return;
    }

    await pool.query('UPDATE products SET active = 0 WHERE id = ?', [id]);
    res.json({ deactivated: true });
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
