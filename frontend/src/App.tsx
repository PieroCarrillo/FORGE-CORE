import {
  Activity,
  BarChart3,
  Bot,
  Box,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  Gauge,
  LockKeyhole,
  LogOut,
  Mail,
  MemoryStick,
  MessageSquare,
  Minus,
  MonitorCog,
  PackageCheck,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  ThumbsUp,
  Trash2,
  Truck,
  UserCircle,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

type View = 'inicio' | 'catalogo' | 'detalle' | 'carrito' | 'comunidad' | 'perfil' | 'admin';
type Category = 'GPU' | 'RAM' | 'CPU' | 'SSD' | 'Fuente';
type UserRole = 'admin' | 'customer' | 'seller';

type Product = {
  id: number;
  slug: string;
  name: string;
  category: Category;
  brand: string;
  price: number;
  stock: number;
  rating: number;
  accent: string;
  imageUrl: string;
  specs: string[];
  description: string;
  active?: boolean;
};

type CartItem = Product & {
  quantity: number;
};

type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
};

type OrderSummary = {
  id: number;
  customer_name: string;
  customer_email?: string;
  payment_reference?: string;
  subtotal?: number | string;
  tax?: number | string;
  shipping?: number | string;
  discount?: number | string;
  promotion_code?: string;
  total: number | string;
  status: string;
  fulfillment_status?: 'new' | 'preparing' | 'shipped' | 'delivered';
  status_updated_at?: string;
  created_at?: string;
};

type ProductReview = {
  id: string;
  userId: number;
  userName: string;
  productId: number;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  status: 'published' | 'hidden';
  createdAt: string;
};

type AssistantRecommendation = {
  id: number;
  slug: string;
  name: string;
  category: Category;
  brand: string;
  price: number;
  stock: number;
  rating: number;
  imageUrl: string;
  reviewCount: number;
  reviewAverage: number;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  recommendations?: AssistantRecommendation[];
};

type CartToast = {
  productName: string;
  quantity: number;
};

type SystemMetric = {
  cpu_percent: string;
  memory_percent: string;
  disk_percent: string;
  process_count: number;
};

type AdminDashboard = {
  summary: {
    simulated_revenue?: number | string;
    total_revenue?: number | string;
    order_count?: number | string;
    total_orders?: number | string;
    low_stock_count?: number | string;
    low_stock_products?: number | string;
    active_products?: number | string;
    average_ticket?: number | string;
  };
  lowStock: Array<{ id: number; name: string; stock: number; category?: string }>;
  latestOrders: OrderSummary[];
};

type Promotion = {
  code: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number | string;
};

type AdminReports = {
  revenueByCategory: Array<{ category: string; revenue: number | string; units: number | string }>;
  topProducts: Array<{ product_name: string; units: number | string; revenue: number | string }>;
  ordersByStatus: Array<{ fulfillment_status: string; total: number | string }>;
  promotionUsage: Array<{ promotion_code: string; orders: number | string; discount_total: number | string }>;
};

type AdminProductForm = {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  price: string;
  stock: string;
  imageUrl: string;
  specs: string;
  description: string;
};

type AdminPromotionForm = {
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
};

type AuthForm = {
  identifier: string;
  name: string;
  username: string;
  email: string;
  password: string;
};

type ReviewForm = {
  productId: string;
  rating: string;
  title: string;
  comment: string;
};

const views: View[] = ['inicio', 'catalogo', 'detalle', 'carrito', 'comunidad', 'perfil', 'admin'];

function readViewFromHash(): View {
  const hash = window.location.hash.replace('#', '');
  return views.includes(hash as View) ? (hash as View) : 'inicio';
}

const videoUrl =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4';

const seedProducts: Product[] = [
  {
    id: 1,
    slug: 'rtx-4090-ultra',
    name: 'RTX 4090 Ultra',
    category: 'GPU',
    brand: 'NVIDIA',
    price: 2499,
    stock: 5,
    rating: 4.9,
    accent: '#49f0ff',
    imageUrl: '/assets/products/rtx-4090-ultra.jpg',
    specs: ['24 GB GDDR6X', 'PCIe 4.0', 'Ray Tracing', 'DLSS 3.5'],
    description: 'Tarjeta grafica de gama extrema para gaming 4K, renderizado y cargas IA.'
  },
  {
    id: 2,
    slug: 'venom-rgb-64gb',
    name: 'Venom RGB 64 GB',
    category: 'RAM',
    brand: 'KingForge',
    price: 389,
    stock: 18,
    rating: 4.8,
    accent: '#9be564',
    imageUrl: '/assets/products/venom-rgb-64gb.jpg',
    specs: ['DDR5', '6400 MHz', 'CL32', 'RGB Sync'],
    description: 'Kit dual channel para estaciones gamer, streaming y multitarea pesada.'
  },
  {
    id: 3,
    slug: 'ryzen-9-forge',
    name: 'Ryzen 9 Forge',
    category: 'CPU',
    brand: 'AMD',
    price: 719,
    stock: 9,
    rating: 4.7,
    accent: '#f6c453',
    imageUrl: '/assets/products/ryzen-9-forge.jpg',
    specs: ['16 nucleos', '32 hilos', '5.7 GHz boost', 'AM5'],
    description: 'Procesador de alto rendimiento para gaming competitivo y produccion.'
  },
  {
    id: 4,
    slug: 'nova-ssd-4tb',
    name: 'Nova SSD 4 TB',
    category: 'SSD',
    brand: 'CrucialX',
    price: 499,
    stock: 14,
    rating: 4.6,
    accent: '#c084fc',
    imageUrl: '/assets/products/nova-ssd-4tb.jpg',
    specs: ['NVMe Gen4', '7400 MB/s', 'Disipador', '5 anos garantia'],
    description: 'Almacenamiento ultrarrapido para juegos, proyectos y librerias pesadas.'
  },
  {
    id: 5,
    slug: 'titan-psu-1000w',
    name: 'Titan PSU 1000W',
    category: 'Fuente',
    brand: 'Corsair',
    price: 279,
    stock: 7,
    rating: 4.8,
    accent: '#60a5fa',
    imageUrl: '/assets/products/titan-psu-1000w.jpg',
    specs: ['80+ Platinum', 'ATX 3.0', 'PCIe 5.0', 'Modular'],
    description: 'Fuente estable para builds exigentes con GPUs de nueva generacion.'
  },
  {
    id: 6,
    slug: 'shadow-ram-32gb',
    name: 'Shadow RAM 32 GB',
    category: 'RAM',
    brand: 'G.Skill',
    price: 189,
    stock: 2,
    rating: 4.5,
    accent: '#fb7185',
    imageUrl: '/assets/products/shadow-ram-32gb.jpg',
    specs: ['DDR5', '6000 MHz', 'CL30', 'Perfil EXPO'],
    description: 'Memoria de baja latencia para equipos gamer compactos.'
  }
];

const categories: Array<'Todos' | Category> = ['Todos', 'GPU', 'RAM', 'CPU', 'SSD', 'Fuente'];
const accentPalette = ['#49f0ff', '#9be564', '#f6c453', '#c084fc', '#60a5fa', '#fb7185'];

const categoryOptions = [
  { id: '1', label: 'GPU' },
  { id: '2', label: 'RAM' },
  { id: '3', label: 'CPU' },
  { id: '4', label: 'SSD' },
  { id: '5', label: 'Fuente' }
];

const brandOptions = [
  { id: '1', label: 'NVIDIA' },
  { id: '2', label: 'AMD' },
  { id: '3', label: 'KingForge' },
  { id: '4', label: 'CrucialX' },
  { id: '5', label: 'Corsair' },
  { id: '6', label: 'G.Skill' }
];

const productImageOptions = seedProducts.map((product) => ({
  value: product.imageUrl,
  label: `${product.category} | ${product.name}`
}));

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path
        fill="rgb(222, 249, 252)"
        d="M 160 88 L 194 34 L 216 0 L 256 0 L 256 40 L 221.5 93.5 L 200 128 L 256 128 L 256 256 L 96 256 L 96 168 L 64.246 220 L 40 256 L 0 256 L 0 216 L 34 162 L 56 128 L 0 128 L 0 0 L 160 0 Z"
      />
    </svg>
  );
}

function App() {
  const [view, setView] = useState<View>(() => readViewFromHash());
  const [productList, setProductList] = useState<Product[]>(seedProducts);
  const [selected, setSelected] = useState<Product>(seedProducts[0]);
  const [category, setCategory] = useState<'Todos' | Category>('Todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'approved' | 'failed'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [latestMetric, setLatestMetric] = useState<SystemMetric | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [accountOrders, setAccountOrders] = useState<OrderSummary[]>([]);
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [communityReviews, setCommunityReviews] = useState<ProductReview[]>([]);
  const [accountReviews, setAccountReviews] = useState<ProductReview[]>([]);
  const [adminReviews, setAdminReviews] = useState<ProductReview[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    productId: String(seedProducts[0].id),
    rating: '5',
    title: '',
    comment: ''
  });
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [reviewMessage, setReviewMessage] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem('forge_core_token') ?? '');
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const raw = window.localStorage.getItem('forge_core_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [authForm, setAuthForm] = useState<AuthForm>({
    identifier: 'master',
    name: '',
    username: '',
    email: '',
    password: 'MasterForge2026!'
  });
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [cartLoaded, setCartLoaded] = useState(false);
  const [promotionCode, setPromotionCode] = useState('');
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [adminReports, setAdminReports] = useState<AdminReports | null>(null);
  const [adminProductForm, setAdminProductForm] = useState<AdminProductForm>(() => createDemoProductForm());
  const [adminSaveStatus, setAdminSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [adminSaveMessage, setAdminSaveMessage] = useState('');
  const [adminPromotionForm, setAdminPromotionForm] = useState<AdminPromotionForm>({
    code: 'FORGE15',
    description: '15% de descuento demo para productos seleccionados.',
    discountType: 'percent',
    discountValue: '15'
  });
  const [adminPromotionStatus, setAdminPromotionStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [adminPromotionMessage, setAdminPromotionMessage] = useState('');
  const [adminUserPage, setAdminUserPage] = useState(1);
  const [adminOrdersPage, setAdminOrdersPage] = useState(1);
  const [adminStockPage, setAdminStockPage] = useState(1);
  const [adminProductsPage, setAdminProductsPage] = useState(1);
  const [adminReviewsPage, setAdminReviewsPage] = useState(1);
  const [adminReviewRatingFilter, setAdminReviewRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantStatus, setAssistantStatus] = useState<'idle' | 'thinking' | 'error'>('idle');
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hola, soy Forge Bot. Puedo recomendarte GPU, CPU, RAM, SSD o fuente leyendo productos de MariaDB y reseñas de MongoDB. Preguntame algo como: Que grafica me conviene para 4K con $900?'
    }
  ]);
  const [cartToast, setCartToast] = useState<CartToast | null>(null);

  const featuredProducts = useMemo(() => productList.slice(0, Math.min(5, productList.length)), [productList]);
  const featuredProduct = featuredProducts[carouselIndex % Math.max(featuredProducts.length, 1)] ?? seedProducts[0];
  const isAdmin = authUser?.role === 'admin';
  const isSeller = authUser?.role === 'seller';
  const canManageProducts = isAdmin || isSeller;

  const filtered = useMemo(() => {
    return productList.filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const matchesSearch = [product.name, product.brand, product.category].join(' ').toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, productList, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const tax = subtotal * 0.18;
  const shipping = subtotal > 0 ? 25 : 0;
  const normalizedPromotionCode = promotionCode.trim().toUpperCase();
  const activePromotion = availablePromotions.find((promotion) => promotion.code.toUpperCase() === normalizedPromotionCode) ?? null;
  const discount = activePromotion
    ? activePromotion.discount_type === 'percent'
      ? subtotal * (Number(activePromotion.discount_value) / 100)
      : Math.min(subtotal, Number(activePromotion.discount_value))
    : 0;
  const total = Math.max(0, subtotal + tax + shipping - discount);
  const adminLatestOrders = dashboard?.latestOrders ?? [];
  const adminLowStockItems = dashboard?.lowStock?.length ? dashboard.lowStock : productList.filter((product) => product.stock <= 5);
  const filteredAdminReviews = adminReviewRatingFilter === 'all'
    ? adminReviews
    : adminReviews.filter((review) => review.rating === Number(adminReviewRatingFilter));
  const pagedAdminUsers = paginate(adminUsers, adminUserPage, 6);
  const pagedAdminOrders = paginate(adminLatestOrders, adminOrdersPage, 4);
  const pagedAdminStock = paginate(adminLowStockItems, adminStockPage, 5);
  const pagedAdminProducts = paginate(productList, adminProductsPage, 12);
  const pagedAdminReviews = paginate(filteredAdminReviews, adminReviewsPage, 8);

  useEffect(() => {
    const syncViewFromHash = () => setView(readViewFromHash());
    window.addEventListener('hashchange', syncViewFromHash);
    return () => window.removeEventListener('hashchange', syncViewFromHash);
  }, []);

  useEffect(() => {
    const nextHash = `#${view}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [view]);

  function authHeaders(extra?: HeadersInit): HeadersInit {
    return {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(extra ?? {})
    };
  }

  async function apiFetch(path: string, options: RequestInit = {}) {
    return fetch(path, {
      ...options,
      headers: authHeaders(options.headers)
    });
  }

  function saveSession(token: string, user: AuthUser) {
    setAuthToken(token);
    setAuthUser(user);
    window.localStorage.setItem('forge_core_token', token);
    window.localStorage.setItem('forge_core_user', JSON.stringify(user));
    setView(readViewFromHash());
  }

  function clearSession() {
    setAuthToken('');
    setAuthUser(null);
    setDashboard(null);
    setLatestMetric(null);
    setAdminUsers([]);
    setAccountOrders([]);
    setAccountReviews([]);
    setAdminReviews([]);
    setPurchasedProducts([]);
    setCommunityReviews([]);
    setProductReviews([]);
    setCart([]);
    setCartLoaded(false);
    setPromotionCode('');
    setAdminReports(null);
    setView('inicio');
    window.localStorage.removeItem('forge_core_token');
    window.localStorage.removeItem('forge_core_user');
  }

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    async function validateSession() {
      try {
        const response = await apiFetch('/api/auth/me');
        if (!response.ok) {
          throw new Error('Sesion expirada');
        }
        const data = (await response.json()) as { user: AuthUser };
        if (!cancelled) {
          setAuthUser(data.user);
          window.localStorage.setItem('forge_core_user', JSON.stringify(data.user));
        }
      } catch {
        if (!cancelled) clearSession();
      }
    }

    void validateSession();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) return;
        const data = (await response.json()) as Array<Omit<Product, 'accent'> & { accent?: string }>;
        if (!cancelled && data.length) {
          const normalized = data.map(normalizeProduct);
          setProductList(normalized);
          setSelected((current) => normalized.find((product) => product.id === current.id) ?? normalized[0]);
        }
      } catch {
        // La demo local conserva productos semilla si la API no esta activa.
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    setCartLoaded(false);
    void loadPersistentCart();
    void loadPromotions();
    void loadAccountOrders();
    void loadAccountReviews();
    void loadPurchasedProducts();
    void loadCommunityReviews();
  }, [authToken, authUser?.id]);

  useEffect(() => {
    if (!authUser || !cartLoaded) return;
    const timer = window.setTimeout(() => {
      void savePersistentCart();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [authToken, authUser?.id, cart, cartLoaded]);

  useEffect(() => {
    if (!authUser || !selected?.id) return;
    void loadProductReviews(selected.id);
  }, [authToken, authUser?.id, selected?.id]);

  useEffect(() => {
    if (!authUser || !productList.length) return;
    void loadCommunityReviews();
  }, [authToken, authUser?.id, productList.length]);

  useEffect(() => {
    if (!authUser) return;
    setReviewForm((form) => {
      if (!purchasedProducts.length) return { ...form, productId: '' };
      const currentProductStillPurchased = purchasedProducts.some((product) => String(product.id) === form.productId);
      return {
        ...form,
        productId: currentProductStillPurchased ? form.productId : String(purchasedProducts[0].id)
      };
    });
  }, [authUser, purchasedProducts]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function loadAdminData() {
      try {
        const [metricsResponse, dashboardResponse, usersResponse, reportsResponse] = await Promise.all([
          apiFetch('/api/admin/system-metrics'),
          apiFetch('/api/admin/dashboard'),
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/reports')
        ]);

        if (metricsResponse.ok) {
          const metrics = (await metricsResponse.json()) as SystemMetric[];
          if (!cancelled) setLatestMetric(metrics[0] ?? null);
        }
        if (dashboardResponse.ok) {
          const data = (await dashboardResponse.json()) as AdminDashboard;
          if (!cancelled) setDashboard(data);
        }
        if (usersResponse.ok) {
          const users = (await usersResponse.json()) as AuthUser[];
          if (!cancelled) setAdminUsers(users);
        }
        if (reportsResponse.ok && !cancelled) {
          setAdminReports((await reportsResponse.json()) as AdminReports);
        }
        const reviewsResponse = await apiFetch('/api/admin/reviews');
        if (reviewsResponse.ok && !cancelled) {
          setAdminReviews((await reviewsResponse.json()) as ProductReview[]);
        }
      } catch {
        if (!cancelled) setLatestMetric(null);
      }
    }

    void loadAdminData();
    const timer = window.setInterval(loadAdminData, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authToken, isAdmin]);

  useEffect(() => {
    if (carouselIndex >= featuredProducts.length) {
      setCarouselIndex(0);
    }
  }, [carouselIndex, featuredProducts.length]);

  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    const timer = window.setInterval(() => {
      setCarouselIndex((index) => (index + 1) % featuredProducts.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [featuredProducts.length]);

  useEffect(() => {
    if (view === 'admin' && !canManageProducts) {
      setView('catalogo');
    }
  }, [canManageProducts, view]);

  useEffect(() => {
    if (!cartToast) return;
    const timer = window.setTimeout(() => setCartToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [cartToast]);

  useEffect(() => {
    setAdminUserPage(1);
  }, [adminUsers.length]);

  useEffect(() => {
    setAdminOrdersPage(1);
  }, [adminLatestOrders.length]);

  useEffect(() => {
    setAdminStockPage(1);
  }, [adminLowStockItems.length]);

  useEffect(() => {
    setAdminProductsPage(1);
  }, [productList.length]);

  useEffect(() => {
    setAdminReviewsPage(1);
  }, [adminReviewRatingFilter, adminReviews.length]);

  async function loadPersistentCart() {
    try {
      const response = await apiFetch('/api/cart');
      if (!response.ok) {
        setCartLoaded(true);
        return;
      }
      const data = (await response.json()) as { items: Array<Omit<Product, 'accent'> & { accent?: string; quantity: number }> };
      setCart(data.items.map((item, index) => ({ ...normalizeProduct(item, index), quantity: item.quantity })));
    } catch {
      // Si la red falla, no borra el carrito visual actual.
    } finally {
      setCartLoaded(true);
    }
  }

  async function savePersistentCart() {
    try {
      await apiFetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) })
      });
    } catch {
      // La sincronizacion se reintenta en el siguiente cambio del carrito.
    }
  }

  async function loadPromotions() {
    try {
      const response = await fetch('/api/promotions');
      if (!response.ok) return;
      setAvailablePromotions((await response.json()) as Promotion[]);
    } catch {
      setAvailablePromotions([]);
    }
  }

  async function loadAccountOrders() {
    try {
      const response = await apiFetch('/api/account/orders');
      if (!response.ok) return;
      setAccountOrders((await response.json()) as OrderSummary[]);
    } catch {
      setAccountOrders([]);
    }
  }

  async function loadPurchasedProducts() {
    try {
      const response = await apiFetch('/api/account/purchased-products');
      if (!response.ok) {
        setPurchasedProducts([]);
        return;
      }
      const data = (await response.json()) as Array<Omit<Product, 'accent'> & { accent?: string }>;
      setPurchasedProducts(data.map((product, index) => normalizeProduct(product, index)));
    } catch {
      setPurchasedProducts([]);
    }
  }

  async function loadProductReviews(productId: number) {
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      if (!response.ok) return;
      setProductReviews((await response.json()) as ProductReview[]);
    } catch {
      setProductReviews([]);
    }
  }

  async function loadCommunityReviews() {
    try {
      const response = await fetch('/api/reviews');
      if (!response.ok) return;
      setCommunityReviews((await response.json()) as ProductReview[]);
    } catch {
      // Conserva el feed actual si una recarga puntual falla.
    }
  }

  async function loadAccountReviews() {
    try {
      const response = await apiFetch('/api/account/reviews');
      if (!response.ok) return;
      setAccountReviews((await response.json()) as ProductReview[]);
    } catch {
      setAccountReviews([]);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthStatus('loading');
    setAuthMessage('');

    try {
      if (authMode === 'reset') {
        const path = resetToken ? '/api/auth/password-reset/confirm' : '/api/auth/password-reset/request';
        const payload = resetToken
          ? { token: resetToken, password: resetPassword }
          : { identifier: authForm.identifier };
        const response = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? 'No se pudo completar la recuperacion');
        }
        if (!resetToken) {
          setResetToken(data.resetToken ?? '');
          setAuthMessage(data.resetToken ? `Token demo generado: ${data.resetToken}` : data.message);
        } else {
          setAuthMode('login');
          setAuthForm((form) => ({ ...form, password: resetPassword }));
          setResetToken('');
          setResetPassword('');
          setAuthMessage('Clave actualizada. Ya puedes iniciar sesion.');
        }
        setAuthStatus('idle');
        return;
      }

      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { identifier: authForm.identifier, password: authForm.password }
          : {
              name: authForm.name,
              username: authForm.username,
              email: authForm.email,
              password: authForm.password
            };
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo iniciar sesion');
      }
      saveSession(data.token, data.user);
      setAuthStatus('idle');
    } catch (error) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Error de autenticacion');
    }
  }

  async function quickLogin(identifier: string, password: string) {
    setAuthMode('login');
    setAuthForm((form) => ({ ...form, identifier, password }));
    setAuthStatus('loading');
    setAuthMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo iniciar sesion');
      }
      saveSession(data.token, data.user);
      setAuthStatus('idle');
    } catch (error) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Error de autenticacion');
    }
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  }

  function openProduct(product: Product) {
    setSelected(product);
    setView('detalle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAssistantRecommendation(recommendation: AssistantRecommendation) {
    const product = productList.find((item) => item.id === recommendation.id);
    if (product) {
      openProduct(product);
      setAssistantOpen(false);
      return;
    }
    setSearch(recommendation.name);
    setView('catalogo');
    setAssistantOpen(false);
  }

  async function sendAssistantMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = assistantInput.trim();
    if (!message || assistantStatus === 'thinking') return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message
    };
    setAssistantMessages((messages) => [...messages, userMessage]);
    setAssistantInput('');
    setAssistantStatus('thinking');

    try {
      const response = await apiFetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = (await response.json()) as { reply?: string; recommendations?: AssistantRecommendation[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'No pude responder ahora');
      }
      setAssistantMessages((messages) => [
        ...messages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.reply ?? 'Ya revise el catalogo y las reseñas, pero no encontre una recomendacion clara.',
          recommendations: data.recommendations ?? []
        }
      ]);
      setAssistantStatus('idle');
    } catch (error) {
      setAssistantStatus('error');
      setAssistantMessages((messages) => [
        ...messages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'No pude responder ahora. Intenta otra pregunta.'
        }
      ]);
    }
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    const existingCartItem = cart.find((item) => item.id === product.id);
    const toastQuantity = existingCartItem ? Math.min(existingCartItem.quantity + 1, product.stock) : 1;
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + 1, product.stock);
        return items.map((item) => (item.id === product.id ? { ...item, quantity: nextQuantity } : item));
      }
      return [...items, { ...product, quantity: 1 }];
    });
    setCartToast({ productName: product.name, quantity: toastQuantity });
    setPaymentStatus('idle');
  }

  function updateQuantity(productId: number, quantity: number) {
    setCart((items) =>
      items
        .map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) } : item))
        .filter((item) => item.quantity > 0)
    );
    setPaymentStatus('idle');
  }

  function removeItem(productId: number) {
    setCart((items) => items.filter((item) => item.id !== productId));
    setPaymentStatus('idle');
  }

  async function refreshStoreData() {
    const requests: Array<Promise<Response>> = [fetch('/api/products')];
    if (isAdmin) {
      requests.push(apiFetch('/api/admin/dashboard'));
    }

    const [productsResponse, dashboardResponse] = await Promise.all(requests);

    if (productsResponse.ok) {
      const products = (await productsResponse.json()) as Array<Omit<Product, 'accent'> & { accent?: string }>;
      setProductList(products.map(normalizeProduct));
    }

    if (dashboardResponse?.ok) {
      setDashboard((await dashboardResponse.json()) as AdminDashboard);
    }
  }

  function updateAdminProductForm(field: keyof AdminProductForm, value: string) {
    setAdminProductForm((form) => ({
      ...form,
      [field]: value,
      ...(field === 'name' ? { slug: makeSlug(value) } : {})
    }));
    setAdminSaveStatus('idle');
  }

  function startEditingProduct(product: Product) {
    const categoryId = categoryOptions.find((option) => option.label === product.category)?.id ?? '1';
    const brandId = brandOptions.find((option) => option.label === product.brand)?.id ?? '1';
    setEditingProductId(product.id);
    setAdminProductForm({
      name: product.name,
      slug: product.slug,
      categoryId,
      brandId,
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.imageUrl,
      specs: product.specs.join(', '),
      description: product.description
    });
    setView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setAdminProductForm(createDemoProductForm());
    setAdminSaveStatus('idle');
    setAdminSaveMessage('');
  }

  async function createAdminProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminSaveStatus('saving');
    setAdminSaveMessage('');

    try {
      const response = await apiFetch(editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products', {
        method: editingProductId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminProductForm.name,
          slug: adminProductForm.slug,
          description: adminProductForm.description,
          price: Number(adminProductForm.price),
          stock: Number(adminProductForm.stock),
          categoryId: Number(adminProductForm.categoryId),
          brandId: Number(adminProductForm.brandId),
          imageUrl: adminProductForm.imageUrl,
          specs: adminProductForm.specs.split(',').map((spec) => spec.trim()).filter(Boolean)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo crear el producto');
      }

      await refreshStoreData();
      setAdminSaveStatus('saved');
      setAdminSaveMessage(editingProductId ? 'Producto actualizado en MariaDB.' : 'Producto guardado en MariaDB. El catalogo y el dashboard fueron actualizados.');
      setEditingProductId(null);
      setAdminProductForm(createDemoProductForm());
    } catch (error) {
      setAdminSaveStatus('failed');
      setAdminSaveMessage(error instanceof Error ? error.message : 'No se pudo crear el producto');
    }
  }

  async function createAdminPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminPromotionStatus('saving');
    setAdminPromotionMessage('');

    try {
      const response = await apiFetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: adminPromotionForm.code,
          description: adminPromotionForm.description,
          discountType: adminPromotionForm.discountType,
          discountValue: Number(adminPromotionForm.discountValue)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo guardar el cupon');
      }

      setAdminPromotionStatus('saved');
      setAdminPromotionMessage(`Cupon ${data.code ?? adminPromotionForm.code.toUpperCase()} guardado en MariaDB.`);
      await Promise.all([loadPromotions(), isAdmin ? apiFetch('/api/admin/reports').then(async (reportsResponse) => {
        if (reportsResponse.ok) setAdminReports((await reportsResponse.json()) as AdminReports);
      }) : Promise.resolve()]);
    } catch (error) {
      setAdminPromotionStatus('failed');
      setAdminPromotionMessage(error instanceof Error ? error.message : 'No se pudo guardar el cupon');
    }
  }

  async function deactivateProduct(productId: number) {
    try {
      const response = await apiFetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'No se pudo desactivar el producto');
      }
      setProductList((products) => products.filter((product) => product.id !== productId));
      await refreshStoreData();
    } catch (error) {
      setAdminSaveStatus('failed');
      setAdminSaveMessage(error instanceof Error ? error.message : 'No se pudo desactivar el producto');
    }
  }

  async function updateOrderStatus(orderId: number, fulfillmentStatus: OrderSummary['fulfillment_status']) {
    if (!fulfillmentStatus) return;
    try {
      const response = await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillmentStatus })
      });
      if (!response.ok) return;
      const dashboardResponse = await apiFetch('/api/admin/dashboard');
      if (dashboardResponse.ok) setDashboard((await dashboardResponse.json()) as AdminDashboard);
    } catch {
      // El cambio de estado se puede reintentar desde el panel.
    }
  }

  function moveCarousel(direction: -1 | 1) {
    setCarouselIndex((index) => {
      const totalItems = Math.max(featuredProducts.length, 1);
      return (index + direction + totalItems) % totalItems;
    });
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewStatus('saving');
    setReviewMessage('');

    try {
      const productId = Number(reviewForm.productId);
      if (!productId || !purchasedProducts.some((product) => product.id === productId)) {
        throw new Error('Primero compra el producto para publicar una reseña verificada');
      }

      const response = await apiFetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: Number(reviewForm.rating),
          title: reviewForm.title,
          comment: reviewForm.comment
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo guardar la reseña');
      }

      const createdReview = data as ProductReview;
      setReviewStatus('saved');
      setReviewMessage('Reseña guardada en MongoDB Atlas.');
      setReviewForm((form) => ({ ...form, title: '', comment: '', rating: '5' }));
      setCommunityReviews((reviews) => [createdReview, ...reviews.filter((review) => review.id !== createdReview.id)]);
      setAccountReviews((reviews) => [createdReview, ...reviews.filter((review) => review.id !== createdReview.id)]);
      if (createdReview.productId === selected.id) {
        setProductReviews((reviews) => [createdReview, ...reviews.filter((review) => review.id !== createdReview.id)]);
      }
      const refreshes = [loadCommunityReviews(), loadAccountReviews()];
      if (createdReview.productId === selected.id) {
        refreshes.push(loadProductReviews(createdReview.productId));
      }
      await Promise.all(refreshes);
    } catch (error) {
      setReviewStatus('failed');
      setReviewMessage(error instanceof Error ? error.message : 'No se pudo guardar la reseña');
    }
  }

  async function markReviewHelpful(reviewId: string) {
    try {
      const response = await apiFetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' });
      if (!response.ok) return;
      await Promise.all([loadProductReviews(selected.id), loadCommunityReviews(), loadAccountReviews()]);
    } catch {
      // La accion de utilidad es secundaria: si falla, la UI se mantiene estable.
    }
  }

  async function hideReview(reviewId: string) {
    try {
      const response = await apiFetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
      if (!response.ok) return;
      setAdminReviews((reviews) => reviews.map((review) => (review.id === reviewId ? { ...review, status: 'hidden' } : review)));
      await loadCommunityReviews();
    } catch {
      // Moderacion silenciosa para no romper el panel admin.
    }
  }

  async function simulatePayment() {
    setPaymentStatus('processing');
    setPaymentMessage('');

    try {
      const response = await apiFetch('/api/orders/simulated-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: authUser?.name,
          customerEmail: authUser?.email,
          promotionCode: activePromotion?.code ?? '',
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity }))
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo simular el pago');
      }
      setPaymentStatus('approved');
      setPaymentMessage(`Pago aprobado con referencia ${data.paymentReference}.`);
      setCart([]);
      setPromotionCode('');
      await refreshStoreData();
      await loadAccountOrders();
      await loadPurchasedProducts();
    } catch (error) {
      setPaymentStatus('failed');
      setPaymentMessage(error instanceof Error ? error.message : 'No se pudo simular el pago');
    }
  }

  const navItems: Array<{ label: string; view: View }> = [
    { label: 'Inicio', view: 'inicio' },
    { label: 'Productos', view: 'catalogo' },
    { label: 'Comunidad', view: 'comunidad' },
    { label: 'Carrito', view: 'carrito' },
    { label: 'Perfil', view: 'perfil' },
    ...(canManageProducts ? [{ label: isSeller ? 'Vendedor' : 'Admin', view: 'admin' as View }] : [])
  ];

  if (!authUser) {
    return (
      <Shell>
        <main className="grid min-h-screen place-items-center px-5 py-10">
          <section className="grid w-full max-w-5xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex min-h-[520px] flex-col justify-between rounded-lg border border-white/10 bg-black/55 p-7 backdrop-blur-md">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/10">
                  <Logo />
                </div>
                <p className="mt-8 text-xs uppercase tracking-[0.28em] text-cyan-200">FORGE CORE PRO</p>
                <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight text-white">
                  Login con roles para clientes y administrador.
                </h1>
                <p className="mt-4 max-w-md leading-7 text-white/65">
                  El usuario master entra como admin. Los clientes solo ven catalogo, carrito, perfil y sus ultimos pedidos.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DemoAccessCard
                  title="Cliente demo"
                  subtitle="Compra simulada y perfil de pedidos."
                  user="cliente"
                  password="ClienteForge2026!"
                  onClick={() => quickLogin('cliente', 'ClienteForge2026!')}
                />
                <DemoAccessCard
                  title="Vendedor demo"
                  subtitle="Gestiona catalogo sin metricas sensibles."
                  user="vendedor"
                  password="VendedorForge2026!"
                  onClick={() => quickLogin('vendedor', 'VendedorForge2026!')}
                />
                <DemoAccessCard
                  title="Admin master"
                  subtitle="Control completo de usuarios, inventario, pedidos, reportes, metricas del servidor y moderacion."
                  user="master"
                  password="MasterForge2026!"
                  featured
                  onClick={() => quickLogin('master', 'MasterForge2026!')}
                />
              </div>
            </div>

            <form onSubmit={handleAuth} className="rounded-lg border border-white/10 bg-[#11151d]/[0.94] p-6 shadow-glow backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">{authMode === 'login' ? 'Acceso seguro' : authMode === 'register' ? 'Nuevo cliente' : 'Recuperacion demo'}</p>
                  <h2 className="mt-2 text-3xl font-semibold">{authMode === 'login' ? 'Iniciar sesion' : authMode === 'register' ? 'Crear cuenta' : 'Restablecer clave'}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthMessage('');
                    setResetToken('');
                  }}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10"
                >
                  {authMode === 'login' ? 'Registrarme' : 'Ya tengo cuenta'}
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                {authMode !== 'register' ? (
                  <AdminField label="Usuario o correo">
                    <div className="relative">
                      <UserCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        value={authForm.identifier}
                        onChange={(event) => setAuthForm((form) => ({ ...form, identifier: event.target.value }))}
                        className="field-control pl-10"
                        placeholder="master"
                      />
                    </div>
                  </AdminField>
                ) : (
                  <>
                    <AdminField label="Nombre completo">
                      <input value={authForm.name} onChange={(event) => setAuthForm((form) => ({ ...form, name: event.target.value }))} className="field-control" />
                    </AdminField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AdminField label="Usuario">
                        <input value={authForm.username} onChange={(event) => setAuthForm((form) => ({ ...form, username: event.target.value }))} className="field-control" />
                      </AdminField>
                      <AdminField label="Correo">
                        <input type="email" value={authForm.email} onChange={(event) => setAuthForm((form) => ({ ...form, email: event.target.value }))} className="field-control" />
                      </AdminField>
                    </div>
                  </>
                )}

                {(authMode !== 'reset' || resetToken) && (
                  <AdminField label={authMode === 'reset' ? 'Nuevo password' : 'Password'}>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        type="password"
                        value={authMode === 'reset' ? resetPassword : authForm.password}
                        onChange={(event) =>
                          authMode === 'reset'
                            ? setResetPassword(event.target.value)
                            : setAuthForm((form) => ({ ...form, password: event.target.value }))
                        }
                        className="field-control pl-10"
                        placeholder="********"
                      />
                    </div>
                  </AdminField>
                )}
                {authMode === 'reset' && resetToken && (
                  <AdminField label="Token demo">
                    <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} className="field-control" />
                  </AdminField>
                )}
              </div>

              <button disabled={authStatus === 'loading'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                {authMode === 'login' ? <ShieldCheck className="h-5 w-5" /> : authMode === 'register' ? <UserPlus className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                {authStatus === 'loading' ? 'Validando...' : authMode === 'login' ? 'Entrar a FORGE CORE' : authMode === 'register' ? 'Crear cliente' : resetToken ? 'Actualizar clave' : 'Generar token demo'}
              </button>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    setAuthMessage('');
                    setResetToken('');
                    setResetPassword('');
                  }}
                  className="mt-3 w-full rounded-full border border-white/10 px-4 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  Olvide mi clave
                </button>
              )}

              {authMessage && (
                <p className="mt-4 rounded-lg border border-red-300/40 bg-red-300/10 p-3 text-sm text-red-100">{authMessage}</p>
              )}
            </form>
          </section>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="relative z-10 flex min-h-screen flex-col">
        <nav className="flex flex-wrap items-center justify-center gap-2 px-4 pt-4 sm:gap-3 sm:px-8 sm:pt-6">
          <button
            onClick={() => setView('inicio')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/55 shadow-[0_0_30px_rgba(73,240,255,0.14)] backdrop-blur transition-transform hover:scale-105 sm:h-11 sm:w-11"
            aria-label="Ir al inicio"
          >
            <Logo />
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/55 px-3 py-2.5 shadow-[0_0_34px_rgba(0,0,0,0.28)] backdrop-blur sm:gap-6 sm:px-6 sm:py-3">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`rounded-full px-2 py-1 text-[12px] font-medium transition-colors duration-200 sm:text-[14px] ${
                  view === item.view ? 'bg-cyan-300 text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.label}
                  {item.view === 'carrito' && cartQuantity > 0 && (
                    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${view === item.view ? 'bg-black text-cyan-200' : 'bg-cyan-300 text-black'}`}>
                      {cartQuantity}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-sm text-white/70 backdrop-blur">
            <span className="hidden sm:inline">{authUser.username}</span>
            <span className={`rounded-full px-2 py-1 text-xs ${isAdmin ? 'bg-amber-300 text-black' : isSeller ? 'bg-lime-300 text-black' : 'bg-cyan-300 text-black'}`}>
              {authUser.role}
            </span>
            <button onClick={logout} className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar sesion">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </nav>

        <main className="flex-1">
          {view === 'inicio' && (
            <section className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-7xl items-center gap-8 px-6 py-10 sm:px-12 md:px-20 lg:grid-cols-[minmax(280px,420px)_minmax(560px,1fr)] lg:px-10 xl:px-0">
              <div className="max-w-sm">
                <button onClick={() => setView('catalogo')} className="group mb-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-400 transition-colors hover:text-blue-300">
                  Gaming hardware listo para batalla
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">-&gt;</span>
                </button>
                <h1 className="mb-3 text-[1.5rem] font-medium leading-[1.15] tracking-tight text-white sm:text-[1.75rem]">
                  FORGE CORE arma tu PC con componentes de alto rendimiento.
                </h1>
                <p className="mb-3 text-[13px] font-normal text-gray-300">
                  Sesiones con roles, inventario en MariaDB, compras simuladas y control de metricas del servidor.
                </p>
                <button onClick={() => setView('catalogo')} className="group inline-flex items-center gap-2 rounded-full border border-blue-400 px-5 py-2.5 text-[13px] font-medium text-blue-300 transition-all duration-200 hover:border-blue-500 hover:bg-blue-500 hover:text-white">
                  Explorar componentes
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">-&gt;</span>
                </button>
              </div>

              <div className="hidden self-center md:block">
                <div className="ml-auto w-full max-w-3xl rounded-lg border border-white/10 bg-black/[0.42] p-5 backdrop-blur-md">
                  <div className="grid grid-cols-3 gap-3">
                    {isAdmin ? (
                      <>
                        <Metric label="CPU server" value={latestMetric ? `${formatNumber(latestMetric.cpu_percent)}%` : 'Sin datos'} icon={<Cpu className="h-4 w-4" />} />
                        <Metric label="RAM usada" value={latestMetric ? `${formatNumber(latestMetric.memory_percent)}%` : 'Sin datos'} icon={<MemoryStick className="h-4 w-4" />} />
                        <Metric label="Pedidos" value={String(dashboard?.summary.order_count ?? dashboard?.summary.total_orders ?? 0)} icon={<PackageCheck className="h-4 w-4" />} />
                      </>
                    ) : (
                      <>
                        <Metric label="Cuenta" value="Cliente" icon={<UserCircle className="h-4 w-4" />} />
                        <Metric label="Carrito" value={String(cart.length)} icon={<ShoppingCart className="h-4 w-4" />} />
                        <Metric label="Pedidos" value={String(accountOrders.length)} icon={<PackageCheck className="h-4 w-4" />} />
                      </>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-[1.15fr_0.85fr] gap-3">
                    <div className="relative">
                      <ProductVisual product={featuredProduct} />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button onClick={() => moveCarousel(-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white transition hover:bg-white hover:text-black" aria-label="Producto anterior">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => moveCarousel(1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white transition hover:bg-white hover:text-black" aria-label="Producto siguiente">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/60">Carrusel destacado</p>
                      <h2 className="mt-2 text-2xl font-semibold">{featuredProduct.name}</h2>
                      <p className="mt-2 text-sm text-white/60">{featuredProduct.description}</p>
                      <div className="mt-4 flex gap-1.5">
                        {featuredProducts.map((product, index) => (
                          <button key={product.id} onClick={() => setCarouselIndex(index)} className={`h-1.5 rounded-full transition-all ${index === carouselIndex ? 'w-8 bg-cyan-300' : 'w-3 bg-white/25 hover:bg-white/45'}`} aria-label={`Ver ${product.name}`} />
                        ))}
                      </div>
                      <button onClick={() => openProduct(featuredProduct)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-200">
                        Ver detalle
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </section>
          )}

          {view === 'catalogo' && (
            <section className="px-5 py-10 sm:px-10 lg:px-16">
              <SectionHeader eyebrow="Catalogo de Hardware Pro" title="Componentes seleccionados para builds extremos" />
              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-sm transition ${category === item ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/10 bg-white/[0.08] text-white/75 hover:bg-white/[0.14]'}`}>
                      {item}
                    </button>
                  ))}
                </div>
                <label className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/[0.35] px-4 py-2 text-sm text-white/[0.65] md:w-80">
                  <Search className="h-4 w-4 shrink-0" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar GPU, RAM, CPU..." className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/40" />
                </label>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((product) => (
                  <article key={product.id} className="rounded-lg border border-white/10 bg-[#11151d]/90 p-4 shadow-glow backdrop-blur">
                    <ProductVisual product={product} />
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/[0.45]">{product.category}</p>
                        <h3 className="mt-1 text-xl font-semibold">{product.name}</h3>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/75">Stock {product.stock}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.specs.slice(0, 3).map((spec) => (
                        <span key={spec} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{spec}</span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/[0.45]">Precio</p>
                        <p className="text-2xl font-semibold">${product.price.toLocaleString('en-US')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openProduct(product)} className="rounded-full border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10">Detalle</button>
                        <button onClick={() => addToCart(product)} disabled={product.stock <= 0} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">Agregar</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === 'detalle' && (
            <section className="px-5 py-10 sm:px-10 lg:px-16">
              <div className="grid gap-8 rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5 backdrop-blur md:grid-cols-[0.95fr_1.05fr] lg:p-8">
                <ProductVisual product={selected} large />
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">{selected.category} | {selected.brand}</p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight">{selected.name}</h2>
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-200">
                    <Star className="h-4 w-4 fill-current" />
                    {selected.rating} rating de demo
                  </div>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-white/[0.65]">{selected.description}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {selected.specs.map((spec) => (
                      <div key={spec} className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
                        <p className="text-sm text-white/50">Especificacion</p>
                        <p className="mt-1 font-semibold">{spec}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-white/[0.45]">Precio final</p>
                      <p className="text-4xl font-semibold">${selected.price.toLocaleString('en-US')}</p>
                    </div>
                    <button onClick={() => addToCart(selected)} disabled={selected.stock <= 0} className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 py-3 font-semibold text-black hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
                      <ShoppingCart className="h-5 w-5" />
                      Agregar al carrito
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Comunidad del producto</p>
                    <h3 className="mt-2 text-2xl font-semibold">Opiniones sobre {selected.name}</h3>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-amber-200">
                      <Star className="h-5 w-5 fill-current" />
                      <p className="text-2xl font-semibold text-white">{averageRating(productReviews)}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/45">{productReviews.length} reseñas</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {productReviews.slice(0, 6).map((review) => (
                    <ReviewCard key={review.id} review={review} onHelpful={markReviewHelpful} />
                  ))}
                  {!productReviews.length && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55 lg:col-span-2">
                      Este producto todavia no tiene reseñas publicadas. Puedes crear una desde Comunidad.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {view === 'carrito' && (
            <section className="px-5 py-10 sm:px-10 lg:px-16">
              <SectionHeader eyebrow="Tu Carrito de Combate" title="Checkout con usuario autenticado e inventario controlado" />
              <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_380px]">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <article key={item.id} className="grid gap-4 rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-4 md:grid-cols-[160px_1fr_auto]">
                      <ProductVisual product={item} />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/[0.45]">{item.category}</p>
                        <h3 className="mt-1 text-xl font-semibold">{item.name}</h3>
                        <p className="mt-2 text-sm text-white/[0.55]">{item.description}</p>
                        <div className="mt-4 flex items-center gap-2">
                          <button aria-label="Reducir cantidad" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.15] hover:bg-white/10">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-9 text-center font-semibold">{item.quantity}</span>
                          <button aria-label="Aumentar cantidad" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.15] hover:bg-white/10">
                            <Plus className="h-4 w-4" />
                          </button>
                          <button aria-label="Eliminar producto" onClick={() => removeItem(item.id)} className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-red-400/[0.35] text-red-200 hover:bg-red-500/[0.15]">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-right text-2xl font-semibold">${(item.price * item.quantity).toLocaleString('en-US')}</p>
                    </article>
                  ))}
                  {!cart.length && (
                    <div className="rounded-lg border border-white/10 bg-[#11151d]/[0.82] p-8 text-center text-white/60">
                      Tu carrito esta vacio. Agrega productos desde el catalogo.
                    </div>
                  )}
                </div>
                <aside className="h-fit rounded-lg border border-white/10 bg-black/[0.45] p-5 backdrop-blur">
                  <h3 className="text-xl font-semibold">Resumen de orden</h3>
                  <p className="mt-2 text-sm text-white/50">Comprador: {authUser.name}</p>
                  <SummaryLine label="Subtotal" value={subtotal} />
                  <SummaryLine label="IGV 18%" value={tax} />
                  <SummaryLine label="Envio" value={shipping} />
                  <label className="mt-4 block">
                    <span className="text-xs uppercase tracking-[0.16em] text-white/45">Cupon demo</span>
                    <input
                      value={promotionCode}
                      onChange={(event) => setPromotionCode(event.target.value.toUpperCase())}
                      className="field-control mt-2"
                      placeholder="FORGE10"
                    />
                  </label>
                  {normalizedPromotionCode && (
                    <p className={`mt-2 text-xs ${activePromotion ? 'text-lime-200' : 'text-amber-200'}`}>
                      {activePromotion ? `${activePromotion.description} Descuento aplicado.` : 'Codigo no encontrado; no se aplicara descuento.'}
                    </p>
                  )}
                  {discount > 0 && <SummaryLine label="Descuento" value={-discount} />}
                  <div className="my-4 h-px bg-white/10" />
                  <SummaryLine label="Total" value={total} strong />
                  <button onClick={simulatePayment} disabled={cart.length === 0 || paymentStatus === 'processing'} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
                    <ShieldCheck className="h-5 w-5" />
                    {paymentStatus === 'processing' ? 'Procesando...' : 'Simular pago'}
                  </button>
                  {paymentStatus === 'approved' && <div className="mt-4 rounded-lg border border-lime-300/40 bg-lime-300/10 p-3 text-sm text-lime-100">{paymentMessage} El pedido queda vinculado al perfil.</div>}
                  {paymentStatus === 'failed' && <div className="mt-4 rounded-lg border border-red-300/40 bg-red-300/10 p-3 text-sm text-red-100">{paymentMessage}</div>}
                </aside>
              </div>
            </section>
          )}

          {view === 'comunidad' && (
            <section className="px-5 py-10 sm:px-10 lg:px-16">
              <SectionHeader eyebrow="Comunidad con MongoDB Atlas" title="Reseñas reales por usuario registrado" />
              <div className="mt-8 grid gap-5 lg:grid-cols-[420px_1fr]">
                <form onSubmit={submitReview} className="h-fit rounded-lg border border-white/10 bg-[#11151d]/[0.94] p-5 shadow-glow">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <MessageSquare className="h-5 w-5 text-cyan-200" />
                      Nueva reseña
                    </h3>
                    <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">MongoDB</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Estas opiniones se guardan separadas de MariaDB para demostrar una base NoSQL dedicada a comunidad.
                  </p>

                  <div className="mt-5 grid gap-3">
                    <AdminField label="Producto">
                      <select
                        value={reviewForm.productId}
                        onChange={(event) => setReviewForm((form) => ({ ...form, productId: event.target.value }))}
                        className="field-control"
                        disabled={!purchasedProducts.length}
                      >
                        {purchasedProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {!purchasedProducts.length && (
                        <p className="mt-2 text-xs leading-5 text-amber-100/75">
                          Primero compra un producto con este usuario para poder publicar una reseña verificada.
                        </p>
                      )}
                    </AdminField>
                    <AdminField label="Calificacion">
                      <select value={reviewForm.rating} onChange={(event) => setReviewForm((form) => ({ ...form, rating: event.target.value }))} className="field-control">
                        <option value="5">5 estrellas</option>
                        <option value="4">4 estrellas</option>
                        <option value="3">3 estrellas</option>
                        <option value="2">2 estrellas</option>
                        <option value="1">1 estrella</option>
                      </select>
                    </AdminField>
                    <AdminField label="Titulo">
                      <input
                        required
                        minLength={3}
                        maxLength={90}
                        value={reviewForm.title}
                        onChange={(event) => setReviewForm((form) => ({ ...form, title: event.target.value }))}
                        className="field-control"
                        placeholder="Buena compra para gaming"
                      />
                    </AdminField>
                    <label>
                      <span className="text-xs uppercase tracking-[0.16em] text-white/45">Comentario</span>
                      <textarea
                        required
                        minLength={8}
                        maxLength={1200}
                        value={reviewForm.comment}
                        onChange={(event) => setReviewForm((form) => ({ ...form, comment: event.target.value }))}
                        className="field-control mt-2 min-h-32 resize-none"
                        placeholder="Cuenta tu experiencia con el producto..."
                      />
                    </label>
                  </div>

                  <button disabled={reviewStatus === 'saving' || !purchasedProducts.length} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                    <MessageSquare className="h-4 w-4" />
                    {reviewStatus === 'saving' ? 'Guardando...' : 'Publicar reseña'}
                  </button>
                  {reviewMessage && (
                    <p className={`mt-4 rounded-lg border p-3 text-sm ${reviewStatus === 'saved' ? 'border-lime-300/40 bg-lime-300/10 text-lime-100' : 'border-red-300/40 bg-red-300/10 text-red-100'}`}>
                      {reviewMessage}
                    </p>
                  )}
                </form>

                <div className="rounded-lg border border-white/10 bg-black/[0.38] p-5 backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold">Feed de compradores</h3>
                      <p className="mt-1 text-sm text-white/50">Comentarios tipo marketplace con compra verificada cuando aplica.</p>
                    </div>
                    <button onClick={loadCommunityReviews} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10">Actualizar</button>
                  </div>
                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {communityReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} onHelpful={markReviewHelpful} />
                    ))}
                    {!communityReviews.length && (
                      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-white/55 xl:col-span-2">
                        Todavia no hay reseñas publicadas. Cuando configures MongoDB Atlas y un cliente publique una opinion, aparecera aqui.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === 'perfil' && (
            <section className="px-5 py-10 sm:px-10 lg:px-16">
              <SectionHeader eyebrow="Perfil del comprador" title="Cuenta, pedidos en MariaDB y reseñas en MongoDB" />
              <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="h-fit rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300 text-black">
                      <UserCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold">{authUser.name}</h3>
                      <p className="text-sm text-white/50">@{authUser.username}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <ProfileLine icon={<Mail className="h-4 w-4" />} label="Correo" value={authUser.email} />
                    <ProfileLine icon={<ShieldCheck className="h-4 w-4" />} label="Rol" value={authUser.role === 'admin' ? 'Administrador master' : authUser.role === 'seller' ? 'Vendedor' : 'Cliente'} />
                    <ProfileLine icon={<ShoppingCart className="h-4 w-4" />} label="Items en carrito" value={String(cart.length)} />
                    <ProfileLine icon={<PackageCheck className="h-4 w-4" />} label="Pedidos" value={String(accountOrders.length)} />
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <PackageCheck className="h-5 w-5 text-cyan-200" />
                      Ultimos pedidos
                    </h3>
                    <button onClick={loadAccountOrders} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10">Actualizar</button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {accountOrders.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                    {!accountOrders.length && <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">Todavia no hay pedidos para este usuario.</div>}
                  </div>

                  <div className="my-5 h-px bg-white/10" />

                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <MessageSquare className="h-5 w-5 text-cyan-200" />
                      Mis reseñas
                    </h3>
                    <button onClick={loadAccountReviews} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10">Actualizar</button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {accountReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} compact onHelpful={markReviewHelpful} />
                    ))}
                    {!accountReviews.length && <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">Aun no publicaste reseñas.</div>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === 'admin' && canManageProducts && (
            <section className="px-5 py-10 sm:px-10 lg:px-16">
              <SectionHeader eyebrow={isSeller ? 'Panel Vendedor' : 'Panel Admin Master'} title={isSeller ? 'Gestion de catalogo e inventario' : 'Usuarios, inventario, pedidos, reportes y metricas del sistema'} />
              {isAdmin ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Ventas simuladas" value={`$${formatMoney(dashboard?.summary.simulated_revenue ?? dashboard?.summary.total_revenue ?? 0)}`} icon={<BarChart3 className="h-5 w-5" />} />
                  <Metric label="Pedidos BD" value={String(dashboard?.summary.order_count ?? dashboard?.summary.total_orders ?? 0)} icon={<ShoppingCart className="h-5 w-5" />} />
                  <Metric label="Usuarios" value={String(adminUsers.length)} icon={<Users className="h-5 w-5" />} />
                  <Metric label="Reseñas MongoDB" value={String(adminReviews.length)} icon={<MessageSquare className="h-5 w-5" />} />
                </div>
              ) : (
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <Metric label="Productos activos" value={String(productList.length)} icon={<Box className="h-5 w-5" />} />
                  <Metric label="Stock bajo" value={String(productList.filter((product) => product.stock <= 5).length)} icon={<Gauge className="h-5 w-5" />} />
                  <Metric label="Rol" value="Vendedor" icon={<PackageCheck className="h-5 w-5" />} />
                </div>
              )}

              {isAdmin && <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <MonitorCog className="h-5 w-5 text-cyan-200" />
                    Metricas del servidor App EC2
                  </h3>
                  <div className="mt-5 grid gap-3">
                    <ResourceBar label="CPU" value={latestMetric ? Number(latestMetric.cpu_percent) : 0} displayValue={latestMetric ? `${formatNumber(latestMetric.cpu_percent)}%` : 'Sin datos'} />
                    <ResourceBar label="RAM" value={latestMetric ? Number(latestMetric.memory_percent) : 0} displayValue={latestMetric ? `${formatNumber(latestMetric.memory_percent)}%` : 'Sin datos'} />
                    <ResourceBar label="Disco" value={latestMetric ? Number(latestMetric.disk_percent) : 0} displayValue={latestMetric ? `${formatNumber(latestMetric.disk_percent)}%` : 'Sin datos'} />
                    <ResourceBar label="Procesos activos" value={latestMetric ? Math.min(100, latestMetric.process_count) : 0} displayValue={String(latestMetric?.process_count ?? 0)} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/[0.55]">
                    El worker de Node lee `/proc`, usa `os` y consulta `df`; luego guarda CPU, RAM, disco y procesos en MariaDB.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <Users className="h-5 w-5 text-cyan-200" />
                    Usuarios registrados
                  </h3>
                  <div className="mt-5 space-y-3">
                    {pagedAdminUsers.items.map((user) => (
                      <div key={user.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-3">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-white/[0.45]">{user.email}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] ${user.role === 'admin' ? 'bg-amber-300 text-black' : user.role === 'seller' ? 'bg-lime-300 text-black' : 'bg-cyan-300 text-black'}`}>{user.role}</span>
                      </div>
                    ))}
                    <PaginationControls page={adminUserPage} totalPages={pagedAdminUsers.totalPages} onPageChange={setAdminUserPage} />
                  </div>
                </div>
              </div>}

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
                <form onSubmit={createAdminProduct} className="rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <Plus className="h-5 w-5 text-cyan-200" />
                      {editingProductId ? 'Editar producto en MariaDB' : 'Crear producto en MariaDB'}
                    </h3>
                    <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">{isSeller ? 'Vendedor' : 'Admin'}</span>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <AdminField label="Nombre">
                      <input required value={adminProductForm.name} onChange={(event) => updateAdminProductForm('name', event.target.value)} className="field-control" />
                    </AdminField>
                    <AdminField label="Slug">
                      <input required value={adminProductForm.slug} onChange={(event) => updateAdminProductForm('slug', event.target.value)} className="field-control" />
                    </AdminField>
                    <AdminField label="Categoria">
                      <select value={adminProductForm.categoryId} onChange={(event) => updateAdminProductForm('categoryId', event.target.value)} className="field-control">
                        {categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </AdminField>
                    <AdminField label="Marca">
                      <select value={adminProductForm.brandId} onChange={(event) => updateAdminProductForm('brandId', event.target.value)} className="field-control">
                        {brandOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </AdminField>
                    <AdminField label="Precio USD">
                      <input required min="1" type="number" value={adminProductForm.price} onChange={(event) => updateAdminProductForm('price', event.target.value)} className="field-control" />
                    </AdminField>
                    <AdminField label="Stock">
                      <input required min="1" type="number" value={adminProductForm.stock} onChange={(event) => updateAdminProductForm('stock', event.target.value)} className="field-control" />
                    </AdminField>
                    <AdminField label="Imagen demo">
                      <select value={adminProductForm.imageUrl} onChange={(event) => updateAdminProductForm('imageUrl', event.target.value)} className="field-control">
                        {productImageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </AdminField>
                    <AdminField label="Specs">
                      <input required value={adminProductForm.specs} onChange={(event) => updateAdminProductForm('specs', event.target.value)} className="field-control" />
                    </AdminField>
                    <label className="md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.16em] text-white/45">Descripcion</span>
                      <textarea required value={adminProductForm.description} onChange={(event) => updateAdminProductForm('description', event.target.value)} className="field-control mt-2 min-h-24 resize-none" />
                    </label>
                  </div>
                  <button disabled={adminSaveStatus === 'saving'} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                    <Database className="h-4 w-4" />
                    {adminSaveStatus === 'saving' ? 'Guardando...' : editingProductId ? 'Actualizar producto' : 'Guardar producto'}
                  </button>
                  {editingProductId && (
                    <button type="button" onClick={resetProductForm} className="ml-2 mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 font-semibold text-white/75 transition hover:bg-white/10">
                      Cancelar edicion
                    </button>
                  )}
                  {adminSaveMessage && <p className={`mt-4 rounded-lg border p-3 text-sm ${adminSaveStatus === 'saved' ? 'border-lime-300/40 bg-lime-300/10 text-lime-100' : 'border-red-300/40 bg-red-300/10 text-red-100'}`}>{adminSaveMessage}</p>}
                </form>
                {isAdmin && (
                  <form onSubmit={createAdminPromotion} className="rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          <Sparkles className="h-5 w-5 text-cyan-200" />
                          Crear cupon demo
                        </h3>
                        <p className="mt-1 text-sm text-white/50">Queda activo para el checkout simulado.</p>
                      </div>
                      <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">Admin</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                      <AdminField label="Codigo">
                        <input
                          required
                          value={adminPromotionForm.code}
                          onChange={(event) => {
                            setAdminPromotionForm((form) => ({ ...form, code: event.target.value.toUpperCase() }));
                            setAdminPromotionStatus('idle');
                          }}
                          className="field-control"
                          placeholder="FORGE15"
                        />
                      </AdminField>
                      <AdminField label="Descripcion">
                        <input
                          required
                          value={adminPromotionForm.description}
                          onChange={(event) => {
                            setAdminPromotionForm((form) => ({ ...form, description: event.target.value }));
                            setAdminPromotionStatus('idle');
                          }}
                          className="field-control"
                          placeholder="Descuento para demo"
                        />
                      </AdminField>
                      <AdminField label="Tipo">
                        <select
                          value={adminPromotionForm.discountType}
                          onChange={(event) => {
                            setAdminPromotionForm((form) => ({ ...form, discountType: event.target.value as AdminPromotionForm['discountType'] }));
                            setAdminPromotionStatus('idle');
                          }}
                          className="field-control"
                        >
                          <option value="percent">Porcentaje</option>
                          <option value="fixed">Monto fijo USD</option>
                        </select>
                      </AdminField>
                      <AdminField label="Valor">
                        <input
                          required
                          min="1"
                          max={adminPromotionForm.discountType === 'percent' ? '90' : undefined}
                          type="number"
                          value={adminPromotionForm.discountValue}
                          onChange={(event) => {
                            setAdminPromotionForm((form) => ({ ...form, discountValue: event.target.value }));
                            setAdminPromotionStatus('idle');
                          }}
                          className="field-control"
                        />
                      </AdminField>
                    </div>
                    <button disabled={adminPromotionStatus === 'saving'} className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                      <Database className="h-4 w-4" />
                      {adminPromotionStatus === 'saving' ? 'Guardando...' : 'Guardar cupon'}
                    </button>
                    {!!availablePromotions.length && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {availablePromotions.slice(0, 5).map((promotion) => (
                          <span key={promotion.code} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/60">
                            {promotion.code}
                          </span>
                        ))}
                      </div>
                    )}
                    {adminPromotionMessage && <p className={`mt-4 rounded-lg border p-3 text-sm ${adminPromotionStatus === 'saved' ? 'border-lime-300/40 bg-lime-300/10 text-lime-100' : 'border-red-300/40 bg-red-300/10 text-red-100'}`}>{adminPromotionMessage}</p>}
                  </form>
                )}
                </div>
                <div className="rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <PackageCheck className="h-5 w-5 text-cyan-200" />
                    Ultimos pedidos y stock critico
                  </h3>
                  <div className="mt-5 grid gap-4">
                    <div className="space-y-3">
                      {pagedAdminOrders.items.map((order) => (
                        <div key={order.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <OrderRow order={order} plain />
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(['new', 'preparing', 'shipped', 'delivered'] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                  order.fulfillment_status === status ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'
                                }`}
                              >
                                {orderStatusLabel(status)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!adminLatestOrders.length && <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">Sin pedidos todavia.</div>}
                      <PaginationControls page={adminOrdersPage} totalPages={pagedAdminOrders.totalPages} onPageChange={setAdminOrdersPage} />
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="space-y-3">
                      {pagedAdminStock.items.map((product) => (
                        <div key={product.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-3">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-white/[0.45]">{'category' in product && product.category ? product.category : 'Stock bajo'}</p>
                          </div>
                          <span className="rounded-full bg-amber-300 px-3 py-1 text-sm text-black">{product.stock} und.</span>
                        </div>
                      ))}
                      <PaginationControls page={adminStockPage} totalPages={pagedAdminStock.totalPages} onPageChange={setAdminStockPage} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <Settings className="h-5 w-5 text-cyan-200" />
                      Gestion de productos
                    </h3>
                    <p className="mt-1 text-sm text-white/50">Editar precio, stock, imagen y desactivar productos del catalogo publico.</p>
                  </div>
                  <button onClick={resetProductForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10">Nuevo producto</button>
                </div>
                <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
                  {pagedAdminProducts.items.map((product) => (
                    <div key={product.id} className="grid gap-3 border-b border-white/10 bg-white/[0.04] p-3 last:border-b-0 md:grid-cols-[1fr_110px_90px_180px] md:items-center">
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-white/45">{product.category} | {product.brand}</p>
                      </div>
                      <p className="text-sm text-white/70">${product.price.toLocaleString('en-US')}</p>
                      <span className={`w-fit rounded-full px-3 py-1 text-sm ${product.stock <= 5 ? 'bg-amber-300 text-black' : 'bg-white/10 text-white/70'}`}>Stock {product.stock}</span>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button onClick={() => startEditingProduct(product)} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:bg-white/10">Editar</button>
                        <button onClick={() => deactivateProduct(product.id)} className="rounded-full border border-red-300/30 px-3 py-1.5 text-sm text-red-100 hover:bg-red-500/10">Desactivar</button>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls page={adminProductsPage} totalPages={pagedAdminProducts.totalPages} onPageChange={setAdminProductsPage} className="mt-4" />
              </div>

              {isAdmin && <div className="mt-5 rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <BarChart3 className="h-5 w-5 text-cyan-200" />
                      Reportes ejecutivos
                    </h3>
                    <p className="mt-1 text-sm text-white/50">Ventas por categoria, top productos, estados y uso de cupones.</p>
                  </div>
                  <span className="rounded-full border border-cyan-200/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">MariaDB</span>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <ReportMiniList title="Categorias" rows={(adminReports?.revenueByCategory ?? []).map((row) => `${row.category}: $${formatMoney(row.revenue)}`)} />
                  <ReportMiniList title="Top productos" rows={(adminReports?.topProducts ?? []).map((row) => `${row.product_name}: ${row.units} und.`)} />
                  <ReportMiniList title="Estados" rows={(adminReports?.ordersByStatus ?? []).map((row) => `${orderStatusLabel(row.fulfillment_status)}: ${row.total}`)} />
                  <ReportMiniList title="Cupones" rows={(adminReports?.promotionUsage ?? []).map((row) => `${row.promotion_code}: $${formatMoney(row.discount_total)}`)} />
                </div>
              </div>}

              {isAdmin && <div className="mt-5 rounded-lg border border-white/10 bg-[#11151d]/[0.92] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <ShieldCheck className="h-5 w-5 text-cyan-200" />
                      Moderacion de comunidad
                    </h3>
                    <p className="mt-1 text-sm text-white/50">Documentos de MongoDB Atlas: publicados, ocultos y utiles.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70">
                      <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
                      <select
                        value={adminReviewRatingFilter}
                        onChange={(event) => setAdminReviewRatingFilter(event.target.value as typeof adminReviewRatingFilter)}
                        className="bg-transparent text-sm outline-none"
                      >
                        <option value="all">Todas</option>
                        <option value="5">5 estrellas</option>
                        <option value="4">4 estrellas</option>
                        <option value="3">3 estrellas</option>
                        <option value="2">2 estrellas</option>
                        <option value="1">1 estrella</option>
                      </select>
                    </label>
                    <button
                      onClick={async () => {
                        const response = await apiFetch('/api/admin/reviews');
                        if (response.ok) setAdminReviews((await response.json()) as ProductReview[]);
                      }}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {pagedAdminReviews.items.map((review) => (
                    <ReviewCard key={review.id} review={review} onHide={hideReview} />
                  ))}
                  {!filteredAdminReviews.length && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55 lg:col-span-2">
                      Sin reseñas en MongoDB por ahora.
                    </div>
                  )}
                </div>
                <PaginationControls page={adminReviewsPage} totalPages={pagedAdminReviews.totalPages} onPageChange={setAdminReviewsPage} className="mt-4" />
              </div>}
            </section>
          )}
        </main>
        {cartToast && (
          <div className="fixed bottom-24 right-5 z-50 w-[min(360px,calc(100vw-2.5rem))] rounded-lg border border-cyan-200/25 bg-[#0d1118]/95 p-4 shadow-[0_0_34px_rgba(73,240,255,0.22)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-black">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">Producto agregado</p>
                <p className="mt-1 truncate text-sm text-white/60">{cartToast.productName}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-cyan-100/60">Cantidad en carrito: {cartToast.quantity}</p>
              </div>
            </div>
          </div>
        )}
        <AssistantBubble
          open={assistantOpen}
          messages={assistantMessages}
          input={assistantInput}
          status={assistantStatus}
          onOpenChange={setAssistantOpen}
          onInputChange={setAssistantInput}
          onSend={sendAssistantMessage}
          onOpenRecommendation={openAssistantRecommendation}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f0ee] text-white" data-build="roles-dashboard-v1">
      <video className="fixed inset-0 h-full w-full object-cover" autoPlay muted loop playsInline src={videoUrl} />
      <div className="fixed inset-0 bg-[#090b10]/[0.78]" />
      <div className="fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-black/[0.55] to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function AssistantBubble({
  open,
  messages,
  input,
  status,
  onOpenChange,
  onInputChange,
  onSend,
  onOpenRecommendation
}: {
  open: boolean;
  messages: ChatMessage[];
  input: string;
  status: 'idle' | 'thinking' | 'error';
  onOpenChange: (open: boolean) => void;
  onInputChange: (value: string) => void;
  onSend: (event?: FormEvent<HTMLFormElement>) => void;
  onOpenRecommendation: (recommendation: AssistantRecommendation) => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
      {open && (
        <section className="w-[min(420px,calc(100vw-2.5rem))] overflow-hidden rounded-lg border border-cyan-200/20 bg-[#0d1118]/95 shadow-[0_0_42px_rgba(73,240,255,0.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300 text-black">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Forge Bot</p>
                <p className="text-xs text-white/45">MariaDB + MongoDB Atlas</p>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar chat">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[430px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-lg border px-3 py-2 ${message.role === 'user' ? 'border-cyan-200/20 bg-cyan-300 text-black' : 'border-white/10 bg-white/[0.06] text-white'}`}>
                  <p className="text-sm leading-6">{message.text}</p>
                  {!!message.recommendations?.length && (
                    <div className="mt-3 space-y-2">
                      {message.recommendations.map((recommendation) => (
                        <button
                          key={recommendation.id}
                          onClick={() => onOpenRecommendation(recommendation)}
                          className="grid w-full grid-cols-[54px_1fr] gap-3 rounded-md border border-white/10 bg-black/25 p-2 text-left transition hover:border-cyan-200/40 hover:bg-white/10"
                        >
                          <img src={recommendation.imageUrl} alt={recommendation.name} className="h-14 w-14 rounded-md object-cover" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{recommendation.name}</span>
                            <span className="mt-1 block text-xs text-white/50">
                              {recommendation.category} | ${recommendation.price.toLocaleString('en-US')} | Stock {recommendation.stock}
                            </span>
                            <span className="mt-1 block text-xs text-cyan-100/65">
                              {recommendation.reviewCount} reseñas | {recommendation.reviewAverage}/5
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {status === 'thinking' && (
              <div className="w-fit rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/60">
                Revisando catalogo y reseñas...
              </div>
            )}
          </div>

          <form onSubmit={onSend} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Ej: Que grafica elijo para 1440p?"
            />
            <button disabled={!input.trim() || status === 'thinking'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Enviar pregunta">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => onOpenChange(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300 text-black shadow-[0_0_34px_rgba(73,240,255,0.34)] transition hover:scale-105 hover:bg-cyan-200"
        aria-label="Abrir Forge Bot"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}

function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-white/10 bg-[#10131a] ${large ? 'h-72' : 'h-40'}`} style={{ boxShadow: `0 0 38px ${product.accent}24` }}>
      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{product.brand}</p>
        <p className="mt-1 text-base font-semibold text-white drop-shadow">{product.name}</p>
      </div>
    </div>
  );
}

function DemoAccessCard({
  title,
  subtitle,
  user,
  password,
  featured = false,
  onClick
}: {
  title: string;
  subtitle: string;
  user: string;
  password: string;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition hover:border-cyan-200/50 hover:bg-white/[0.1] ${
        featured ? 'sm:col-span-2 border-cyan-200/20 bg-cyan-200/[0.08] p-5' : 'border-white/10 bg-white/[0.06]'
      }`}
    >
      <div className={featured ? 'grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end' : ''}>
        <div>
          <p className={featured ? 'text-xl font-semibold' : 'font-semibold'}>{title}</p>
          <p className={`${featured ? 'mt-2 max-w-md' : 'mt-1'} text-sm leading-6 text-white/55`}>{subtitle}</p>
        </div>
        <p className="mt-3 break-all rounded-md border border-cyan-100/10 bg-black/20 px-3 py-2 text-xs text-cyan-100/75 sm:mt-0">
          {user} / {password}
        </p>
      </div>
    </button>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">{eyebrow}</p>
      <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
      <div className="flex items-center justify-between text-white/50">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</span>
      {children}
    </label>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
  className = ''
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-sm text-white/60 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </button>
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
        Pagina {page} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`mt-3 flex items-center justify-between ${strong ? 'text-lg font-semibold text-white' : 'text-sm text-white/[0.65]'}`}>
      <span>{label}</span>
      <span>${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
    </div>
  );
}

function ResourceBar({ label, value, displayValue }: { label: string; value: number; displayValue?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-white/[0.65]">
        <span>{label}</span>
        <span>{displayValue ?? formatNumber(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function ProfileLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-center gap-2 text-white/55">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function OrderRow({ order, plain = false }: { order: OrderSummary; plain?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${plain ? '' : 'rounded-lg border border-white/10 bg-white/[0.06] p-3'}`}>
      <div>
        <p className="font-medium">Pedido #{order.id}</p>
        <p className="text-sm text-white/[0.45]">{order.payment_reference ?? order.customer_name}</p>
        {order.promotion_code && <p className="text-xs text-lime-200">Cupon {order.promotion_code}</p>}
      </div>
      <div className="text-right">
        <p className="font-semibold">${formatMoney(order.total)}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/55">{orderStatusLabel(order.fulfillment_status ?? 'new')}</p>
      </div>
    </div>
  );
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    new: 'Nuevo',
    preparing: 'Preparando',
    shipped: 'Enviado',
    delivered: 'Entregado'
  };
  return labels[status] ?? status;
}

function ReportMiniList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 4).map((row) => (
          <p key={row} className="truncate text-sm text-white/60">{row}</p>
        ))}
        {!rows.length && <p className="text-sm text-white/40">Sin datos aun.</p>}
      </div>
    </div>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-200">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < Math.round(rating) ? 'fill-current' : 'opacity-30'}`} />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  compact = false,
  onHelpful,
  onHide
}: {
  review: ProductReview;
  compact?: boolean;
  onHelpful?: (reviewId: string) => void;
  onHide?: (reviewId: string) => void;
}) {
  return (
    <article className={`rounded-lg border border-white/10 bg-white/[0.06] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ReviewStars rating={review.rating} />
            {review.verifiedPurchase && (
              <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[11px] font-semibold text-black">Compra verificada</span>
            )}
            {review.status === 'hidden' && (
              <span className="rounded-full bg-red-300 px-2 py-0.5 text-[11px] font-semibold text-black">Oculta</span>
            )}
          </div>
          <h4 className="mt-2 font-semibold text-white">{review.title}</h4>
        </div>
        <span className="shrink-0 text-xs text-white/40">{formatReviewDate(review.createdAt)}</span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-100/55">{review.productName}</p>
      <p className={`${compact ? 'mt-2 line-clamp-2' : 'mt-3'} text-sm leading-6 text-white/65`}>{review.comment}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-white/45">Por {review.userName}</span>
        <div className="flex items-center gap-2">
          {onHelpful && review.status === 'published' && (
            <button onClick={() => onHelpful(review.id)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              <ThumbsUp className="h-3.5 w-3.5" />
              Util {review.helpfulCount}
            </button>
          )}
          {onHide && review.status === 'published' && (
            <button onClick={() => onHide(review.id)} className="inline-flex items-center gap-1 rounded-full border border-red-300/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/10">
              <Trash2 className="h-3.5 w-3.5" />
              Ocultar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function normalizeProduct(product: Omit<Product, 'accent'> & { accent?: string }, index: number): Product {
  const known = seedProducts.find((item) => item.slug === product.slug);
  const category = categories.includes(product.category as Category) ? (product.category as Category) : 'GPU';

  return {
    ...product,
    category,
    imageUrl: product.imageUrl || known?.imageUrl || `/assets/products/${product.slug}.jpg`,
    accent: product.accent ?? known?.accent ?? accentPalette[index % accentPalette.length]
  };
}

function formatNumber(value: number | string) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function formatMoney(value: number | string) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages
  };
}

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

function averageRating(reviews: ProductReview[]) {
  if (!reviews.length) return '0.0';
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / reviews.length).toFixed(1);
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function createDemoProductForm(): AdminProductForm {
  const suffix = Date.now().toString().slice(-5);
  const name = `Quantum RTX Demo ${suffix}`;
  return {
    name,
    slug: makeSlug(name),
    categoryId: '1',
    brandId: '1',
    price: '1299',
    stock: '6',
    imageUrl: '/assets/products/rtx-4090-ultra.jpg',
    specs: '16 GB GDDR6X, PCIe 4.0, Ray Tracing',
    description: 'Producto demo agregado desde el panel admin para validar persistencia en MariaDB.'
  };
}

export default App;
