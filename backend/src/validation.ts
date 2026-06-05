export type OrderItemInput = {
  productId: number;
  quantity: number;
};

export function parseLoginPayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('payload de login invalido');
  }

  const source = value as Record<string, unknown>;
  const identifier = String(source.identifier ?? source.email ?? source.username ?? '').trim().toLowerCase();
  const password = String(source.password ?? '');

  if (identifier.length < 3) {
    throw new Error('usuario o correo invalido');
  }
  if (password.length < 6) {
    throw new Error('password debe tener al menos 6 caracteres');
  }

  return { identifier, password };
}

export function parseRegisterPayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('payload de registro invalido');
  }

  const source = value as Record<string, unknown>;
  const name = String(source.name ?? '').trim();
  const username = String(source.username ?? '').trim().toLowerCase();
  const email = String(source.email ?? '').trim().toLowerCase();
  const password = String(source.password ?? '');

  if (name.length < 2 || name.length > 120) {
    throw new Error('name debe tener entre 2 y 120 caracteres');
  }
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) {
    throw new Error('username solo acepta letras, numeros, punto, guion y guion bajo');
  }
  if (!email.includes('@') || email.length > 160) {
    throw new Error('email invalido');
  }
  if (password.length < 8 || password.length > 120) {
    throw new Error('password debe tener entre 8 y 120 caracteres');
  }

  return { name, username, email, password };
}

// Validador comun para ids, stock y cantidades.
export function parsePositiveInteger(value: unknown, field: string) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${field} debe ser un entero positivo`);
  }
  return numberValue;
}

// Valida el arreglo de items recibido por carrito y checkout.
export function parseOrderItems(value: unknown): OrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('items debe contener al menos un producto');
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`items[${index}] no es valido`);
    }
    const source = item as Record<string, unknown>;
    return {
      productId: parsePositiveInteger(source.productId ?? source.product_id, `items[${index}].productId`),
      quantity: parsePositiveInteger(source.quantity, `items[${index}].quantity`)
    };
  });
}

// Valida el payload del panel Admin antes de insertar/actualizar productos.
export function parseProductPayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('payload de producto invalido');
  }
  const source = value as Record<string, unknown>;
  const required = ['name', 'slug', 'description'];
  for (const field of required) {
    if (typeof source[field] !== 'string' || String(source[field]).trim().length < 2) {
      throw new Error(`${field} es requerido`);
    }
  }

  return {
    name: String(source.name).trim(),
    slug: String(source.slug).trim().toLowerCase(),
    description: String(source.description).trim(),
    price: Number(source.price),
    stock: parsePositiveInteger(source.stock, 'stock'),
    categoryId: parsePositiveInteger(source.categoryId ?? source.category_id, 'categoryId'),
    brandId: parsePositiveInteger(source.brandId ?? source.brand_id, 'brandId'),
    imageUrl: typeof source.imageUrl === 'string' ? source.imageUrl.trim() : typeof source.image_url === 'string' ? source.image_url.trim() : '',
    specs: Array.isArray(source.specs) ? source.specs.map(String) : []
  };
}

// Valida los mensajes de Comunidad antes de guardarlos en buyer_messages.
export function parseCommunityMessagePayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('payload de mensaje invalido');
  }

  const source = value as Record<string, unknown>;
  const author = String(source.author ?? '').trim();
  const product = String(source.product ?? '').trim();
  const message = String(source.message ?? '').trim();

  if (author.length < 2 || author.length > 120) {
    throw new Error('author debe tener entre 2 y 120 caracteres');
  }
  if (product.length < 2 || product.length > 160) {
    throw new Error('product debe tener entre 2 y 160 caracteres');
  }
  if (message.length < 3 || message.length > 1000) {
    throw new Error('message debe tener entre 3 y 1000 caracteres');
  }

  return { author, product, message };
}
