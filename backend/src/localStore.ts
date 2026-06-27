import type { OrderItemInput } from './validation.js';

// Este archivo simula MariaDB en memoria cuando USE_MOCK_DATA=true.
// Sirve para desarrollar o mostrar la interfaz sin depender de AWS ni de una BD local.

type LocalCategory = {
  id: number;
  name: string;
  slug: string;
};

type LocalBrand = {
  id: number;
  name: string;
};

type LocalProduct = {
  id: number;
  slug: string;
  name: string;
  categoryId: number;
  category: string;
  brandId: number;
  brand: string;
  price: number;
  stock: number;
  rating: number;
  description: string;
  imageUrl: string;
  specs: string[];
  active: boolean;
};

type LocalMetric = {
  id: number;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  process_count: number;
  load_avg: number;
  collected_at: string;
};

type LocalOrder = {
  id: number;
  user_id: number | null;
  customer_name: string;
  customer_email: string;
  payment_reference: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  created_at: string;
  items: OrderItemInput[];
};

type LocalUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'customer' | 'seller';
  password: string;
  session_token: string | null;
  created_at: string;
  last_login_at: string | null;
};

type LocalBuyerMessage = {
  id: number;
  author: string;
  product: string;
  message: string;
  created_at: string;
};

type LocalReview = {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  productId: number;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulUserIds: number[];
  helpfulCount: number;
  status: 'published' | 'hidden';
  createdAt: string;
  updatedAt: string;
};

// Catalogos base equivalentes a las tablas categories y brands.
const categories: LocalCategory[] = [
  { id: 1, name: 'GPU', slug: 'gpu' },
  { id: 2, name: 'RAM', slug: 'ram' },
  { id: 3, name: 'CPU', slug: 'cpu' },
  { id: 4, name: 'SSD', slug: 'ssd' },
  { id: 5, name: 'Fuente', slug: 'fuente' }
];

const brands: LocalBrand[] = [
  { id: 1, name: 'NVIDIA' },
  { id: 2, name: 'AMD' },
  { id: 3, name: 'KingForge' },
  { id: 4, name: 'CrucialX' },
  { id: 5, name: 'Corsair' },
  { id: 6, name: 'G.Skill' }
];

// Productos iniciales equivalentes al seed.sql.
const products: LocalProduct[] = [
  {
    id: 1,
    slug: 'rtx-4090-ultra',
    name: 'RTX 4090 Ultra',
    categoryId: 1,
    category: 'GPU',
    brandId: 1,
    brand: 'NVIDIA',
    price: 2499,
    stock: 5,
    rating: 4.9,
    specs: ['24 GB GDDR6X', 'PCIe 4.0', 'Ray Tracing', 'DLSS 3.5'],
    description: 'Tarjeta grafica de gama extrema para gaming 4K, renderizado y cargas IA.',
    imageUrl: '/assets/products/rtx-4090-ultra.jpg',
    active: true
  },
  {
    id: 2,
    slug: 'venom-rgb-64gb',
    name: 'Venom RGB 64 GB',
    categoryId: 2,
    category: 'RAM',
    brandId: 3,
    brand: 'KingForge',
    price: 389,
    stock: 18,
    rating: 4.8,
    specs: ['DDR5', '6400 MHz', 'CL32', 'RGB Sync'],
    description: 'Kit dual channel para estaciones gamer, streaming y multitarea pesada.',
    imageUrl: '/assets/products/venom-rgb-64gb.jpg',
    active: true
  },
  {
    id: 3,
    slug: 'ryzen-9-forge',
    name: 'Ryzen 9 Forge',
    categoryId: 3,
    category: 'CPU',
    brandId: 2,
    brand: 'AMD',
    price: 719,
    stock: 9,
    rating: 4.7,
    specs: ['16 nucleos', '32 hilos', '5.7 GHz boost', 'AM5'],
    description: 'Procesador de alto rendimiento para gaming competitivo y produccion.',
    imageUrl: '/assets/products/ryzen-9-forge.jpg',
    active: true
  },
  {
    id: 4,
    slug: 'nova-ssd-4tb',
    name: 'Nova SSD 4 TB',
    categoryId: 4,
    category: 'SSD',
    brandId: 4,
    brand: 'CrucialX',
    price: 499,
    stock: 14,
    rating: 4.6,
    specs: ['NVMe Gen4', '7400 MB/s', 'Disipador', '5 anos garantia'],
    description: 'Almacenamiento ultrarrapido para juegos, proyectos y librerias pesadas.',
    imageUrl: '/assets/products/nova-ssd-4tb.jpg',
    active: true
  },
  {
    id: 5,
    slug: 'titan-psu-1000w',
    name: 'Titan PSU 1000W',
    categoryId: 5,
    category: 'Fuente',
    brandId: 5,
    brand: 'Corsair',
    price: 279,
    stock: 7,
    rating: 4.8,
    specs: ['80+ Platinum', 'ATX 3.0', 'PCIe 5.0', 'Modular'],
    description: 'Fuente estable para builds exigentes con GPUs de nueva generacion.',
    imageUrl: '/assets/products/titan-psu-1000w.jpg',
    active: true
  },
  {
    id: 6,
    slug: 'shadow-ram-32gb',
    name: 'Shadow RAM 32 GB',
    categoryId: 2,
    category: 'RAM',
    brandId: 6,
    brand: 'G.Skill',
    price: 189,
    stock: 2,
    rating: 4.5,
    specs: ['DDR5', '6000 MHz', 'CL30', 'Perfil EXPO'],
    description: 'Memoria de baja latencia para equipos gamer compactos.',
    imageUrl: '/assets/products/shadow-ram-32gb.jpg',
    active: true
  }
];

const metrics: LocalMetric[] = [];
const orders: LocalOrder[] = [];
const reviews: LocalReview[] = [];

const users: LocalUser[] = [
  {
    id: 1,
    name: 'Master Admin',
    username: 'master',
    email: 'master@forgecore.local',
    role: 'admin',
    password: 'MasterForge2026!',
    session_token: null,
    created_at: new Date().toISOString(),
    last_login_at: null
  },
  {
    id: 2,
    name: 'Cliente Demo',
    username: 'cliente',
    email: 'cliente@forgecore.local',
    role: 'customer',
    password: 'ClienteForge2026!',
    session_token: null,
    created_at: new Date().toISOString(),
    last_login_at: null
  },
  {
    id: 3,
    name: 'Vendedor Demo',
    username: 'vendedor',
    email: 'vendedor@forgecore.local',
    role: 'seller',
    password: 'VendedorForge2026!',
    session_token: null,
    created_at: new Date().toISOString(),
    last_login_at: null
  }
];

// Mensajes locales de Comunidad cuando no se usa MariaDB.
const buyerMessages: LocalBuyerMessage[] = [
  {
    id: 1,
    author: 'Mateo R.',
    product: 'RTX 4090 Ultra',
    message: 'La pondria con una fuente de 1000W si vas por 4K y render. En el checkout se nota rapido cuando baja el stock.',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    author: 'Camila S.',
    product: 'Samsung 990 PRO 2TB NVMe SSD',
    message: 'Para juegos grandes conviene NVMe Gen4. El dashboard admin ayuda a ver que productos se mueven mas.',
    created_at: new Date(Date.now() - 27 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    author: 'Diego P.',
    product: 'Corsair Vengeance RGB DDR5 32GB 6000MHz',
    message: '32 GB DDR5 es el punto dulce para gaming y edicion ligera. Buen combo con Ryzen 7.',
    created_at: new Date(Date.now() - 41 * 60 * 1000).toISOString()
  }
];

let nextProductId = products.length + 1;
let nextMetricId = 1;
let nextOrderId = 1;
let nextUserId = users.length + 1;
let nextBuyerMessageId = buyerMessages.length + 1;
let nextReviewId = 1;

function toPublicLocalUser(user: LocalUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role
  };
}

// Adapta el producto local al mismo contrato que devuelve la API real.
function toApiProduct(product: LocalProduct) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    brand: product.brand,
    price: product.price,
    stock: product.stock,
    rating: product.rating,
    description: product.description,
    imageUrl: product.imageUrl,
    specs: product.specs,
    active: product.active
  };
}

// Helpers de busqueda con fallback para que el modo local no falle si llega un id desconocido.
function findCategory(id: number) {
  return categories.find((category) => category.id === id) ?? categories[0];
}

function findBrand(id: number) {
  return brands.find((brand) => brand.id === id) ?? brands[0];
}

// Solo los productos activos deben aparecer en catalogo.
function activeProducts() {
  return products.filter((product) => product.active);
}

export function listLocalCategories() {
  return categories;
}

export function authenticateLocalUser(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = users.find((item) => item.email === normalizedIdentifier || item.username === normalizedIdentifier);
  if (!user || user.password !== password) {
    return null;
  }

  user.session_token = `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  user.last_login_at = new Date().toISOString();

  return {
    user: toPublicLocalUser(user),
    token: user.session_token
  };
}

export function findLocalUserByToken(token: string) {
  const user = users.find((item) => item.session_token === token);
  return user ? toPublicLocalUser(user) : null;
}

export function logoutLocalUser(token: string) {
  const user = users.find((item) => item.session_token === token);
  if (user) {
    user.session_token = null;
  }
  return { loggedOut: true };
}

export function createLocalUser(payload: { name: string; username: string; email: string; password: string }) {
  if (users.some((user) => user.email === payload.email || user.username === payload.username)) {
    throw new Error('Usuario o correo ya registrado');
  }

  const user: LocalUser = {
    id: nextUserId++,
    name: payload.name,
    username: payload.username,
    email: payload.email,
    password: payload.password,
    role: 'customer',
    session_token: `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  };
  users.push(user);

  return {
    user: toPublicLocalUser(user),
    token: user.session_token
  };
}

export function listLocalUsers() {
  return users.map((user) => ({
    ...toPublicLocalUser(user),
    created_at: user.created_at,
    last_login_at: user.last_login_at
  }));
}

// Lista productos locales con la misma logica de filtros que /api/products.
export function listLocalProducts(categorySlug = '', search = '') {
  const normalizedSearch = search.trim().toLowerCase();

  return activeProducts()
    .filter((product) => {
      const category = categories.find((item) => item.id === product.categoryId);
      if (categorySlug && category?.slug !== categorySlug) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [product.name, product.brand, product.category].join(' ').toLowerCase().includes(normalizedSearch);
    })
    .map(toApiProduct);
}

export function getLocalProductBySlug(slug: string) {
  const product = activeProducts().find((item) => item.slug === slug);
  return product ? toApiProduct(product) : null;
}

// Cotiza carrito en memoria y valida stock como lo haria la base de datos.
export function quoteLocalOrder(items: OrderItemInput[]) {
  const quotedItems = items.map((item) => {
    const product = activeProducts().find((row) => row.id === item.productId);
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
      unitPrice: product.price,
      lineTotal: product.price * item.quantity
    };
  });

  const subtotal = quotedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.18;
  const shipping = subtotal > 0 ? 25 : 0;
  return { items: quotedItems, subtotal, tax, shipping, total: subtotal + tax + shipping };
}

// Crea un pedido simulado local y descuenta stock en memoria.
export function createLocalSimulatedOrder(customerName: string, customerEmail: string, items: OrderItemInput[], userId: number | null = null) {
  const quote = quoteLocalOrder(items);

  for (const item of items) {
    const product = products.find((row) => row.id === item.productId);
    if (product) {
      product.stock -= item.quantity;
    }
  }

  const order: LocalOrder = {
    id: nextOrderId++,
    user_id: userId,
    customer_name: customerName,
    customer_email: customerEmail,
    payment_reference: `MOCK-${Date.now()}`,
    subtotal: quote.subtotal,
    tax: quote.tax,
    shipping: quote.shipping,
    total: quote.total,
    status: 'paid_simulated',
    created_at: new Date().toISOString(),
    items: items.map((item) => ({ ...item }))
  };

  orders.unshift(order);
  orders.splice(10);
  return order;
}

export function listLocalOrdersForUser(userId: number) {
  return orders.filter((order) => order.user_id === userId || order.customer_email === users.find((user) => user.id === userId)?.email);
}

export function listLocalPurchasedProducts(userId: number) {
  const user = users.find((item) => item.id === userId);
  if (!user) return [];

  const purchasedIds = new Set<number>();
  for (const order of orders) {
    const belongsToUser = order.user_id === userId || order.customer_email === user.email;
    if (!belongsToUser || order.status !== 'paid_simulated') continue;
    for (const item of order.items) {
      purchasedIds.add(item.productId);
    }
  }

  return activeProducts()
    .filter((product) => purchasedIds.has(product.id))
    .map(toApiProduct);
}

function userHasPurchasedProduct(userId: number, productId: number) {
  const user = users.find((item) => item.id === userId);
  if (!user) return false;
  return orders.some((order) => {
    const belongsToUser = order.user_id === userId || order.customer_email === user.email;
    return belongsToUser && order.status === 'paid_simulated' && order.items.some((item) => item.productId === productId);
  });
}

function toApiReview(review: LocalReview) {
  return {
    id: review.id,
    userId: review.userId,
    userName: review.userName,
    productId: review.productId,
    productName: review.productName,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    verifiedPurchase: review.verifiedPurchase,
    helpfulCount: review.helpfulCount,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

export function listLocalReviews(productId?: number) {
  return reviews
    .filter((review) => review.status === 'published')
    .filter((review) => !productId || review.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toApiReview);
}

export function listLocalAdminReviews() {
  return reviews
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toApiReview);
}

export function listLocalReviewsForUser(userId: number) {
  return reviews
    .filter((review) => review.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toApiReview);
}

export function createLocalReview(payload: {
  userId: number;
  userName: string;
  userEmail: string;
  productId: number;
  rating: number;
  title: string;
  comment: string;
}) {
  const product = products.find((item) => item.id === payload.productId);
  if (!product) {
    throw new Error('Producto no existe');
  }
  if (!userHasPurchasedProduct(payload.userId, payload.productId)) {
    throw new Error('Primero debes comprar este producto para publicar una reseña');
  }

  const now = new Date().toISOString();
  const review: LocalReview = {
    id: String(nextReviewId++),
    userId: payload.userId,
    userName: payload.userName,
    userEmail: payload.userEmail,
    productId: payload.productId,
    productName: product.name,
    rating: payload.rating,
    title: payload.title,
    comment: payload.comment,
    verifiedPurchase: userHasPurchasedProduct(payload.userId, payload.productId),
    helpfulUserIds: [],
    helpfulCount: 0,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };
  reviews.unshift(review);
  return toApiReview(review);
}

export function markHelpfulLocalReview(reviewId: string, userId: number) {
  const review = reviews.find((item) => item.id === reviewId);
  if (!review) {
    throw new Error('Reseña no existe');
  }
  if (!review.helpfulUserIds.includes(userId)) {
    review.helpfulUserIds.push(userId);
    review.helpfulCount = review.helpfulUserIds.length;
    review.updatedAt = new Date().toISOString();
  }
  return toApiReview(review);
}

export function hideLocalReview(reviewId: string) {
  const review = reviews.find((item) => item.id === reviewId);
  if (!review) {
    throw new Error('Reseña no existe');
  }
  review.status = 'hidden';
  review.updatedAt = new Date().toISOString();
  return toApiReview(review);
}

// Resumen usado por /api/admin/dashboard en modo mock.
export function getLocalDashboard() {
  const lowStock = activeProducts()
    .filter((product) => product.stock <= 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock
    }));

  return {
    summary: {
      order_count: orders.length,
      simulated_revenue: orders.reduce((sum, order) => sum + order.total, 0),
      active_products: activeProducts().length,
      low_stock_count: lowStock.length
    },
    lowStock,
    latestOrders: orders
  };
}

// Genera metricas artificiales para que el dashboard se vea vivo sin worker real.
export function listLocalMetrics() {
  const now = Date.now();
  const metric: LocalMetric = {
    id: nextMetricId++,
    cpu_percent: Number((35 + Math.sin(now / 11000) * 12).toFixed(2)),
    memory_percent: Number((58 + Math.cos(now / 13000) * 10).toFixed(2)),
    disk_percent: 47,
    process_count: 74,
    load_avg: Number((1.2 + Math.sin(now / 17000) * 0.4).toFixed(2)),
    collected_at: new Date().toISOString()
  };

  metrics.unshift(metric);
  metrics.splice(50);
  return metrics;
}

export function listLocalBuyerMessages() {
  return buyerMessages;
}

// Guarda mensajes en memoria para la seccion Comunidad.
export function createLocalBuyerMessage(payload: { author: string; product: string; message: string }) {
  const message: LocalBuyerMessage = {
    id: nextBuyerMessageId++,
    ...payload,
    created_at: new Date().toISOString()
  };
  buyerMessages.unshift(message);
  buyerMessages.splice(50);
  return message;
}

// Inserta productos en memoria desde el panel Admin.
export function createLocalProduct(product: {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  brandId: number;
  specs: string[];
  imageUrl?: string;
}) {
  const category = findCategory(product.categoryId);
  const brand = findBrand(product.brandId);
  const localProduct: LocalProduct = {
    id: nextProductId++,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    categoryId: category.id,
    category: category.name,
    brandId: brand.id,
    brand: brand.name,
    specs: product.specs,
    imageUrl: product.imageUrl || `/assets/products/${product.slug}.jpg`,
    rating: 4.5,
    active: true
  };

  products.unshift(localProduct);
  return { insertId: localProduct.id, affectedRows: 1 };
}

// Actualiza productos en memoria.
export function updateLocalProduct(
  id: number,
  product: {
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    categoryId: number;
    brandId: number;
    specs: string[];
    imageUrl?: string;
  }
) {
  const existing = products.find((item) => item.id === id);
  if (!existing) {
    throw new Error(`Producto ${id} no existe`);
  }

  const category = findCategory(product.categoryId);
  const brand = findBrand(product.brandId);
  Object.assign(existing, {
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    categoryId: category.id,
    category: category.name,
    brandId: brand.id,
    brand: brand.name,
    specs: product.specs,
    imageUrl: product.imageUrl || existing.imageUrl
  });

  return { updated: true };
}

// Repone stock localmente.
export function restockLocalProduct(id: number, quantity: number, note: string) {
  const product = products.find((item) => item.id === id);
  if (!product) {
    throw new Error(`Producto ${id} no existe`);
  }
  product.stock += quantity;
  return { restocked: true, note };
}
