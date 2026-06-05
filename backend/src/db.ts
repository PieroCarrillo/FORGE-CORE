import mysql, { RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';

// Pool de conexiones MariaDB.
// El pool reutiliza conexiones para no abrir/cerrar una conexion por cada request.
export const pool = mysql.createPool({
  ...config.database,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true
});

// Forma cruda de una fila SQL despues del JOIN products + categories + brands.
export type ProductRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  category_name: string;
  brand_name: string;
  price: string;
  stock: number;
  rating: string;
  description: string;
  image_url: string | null;
  specs_json: string;
  active: number;
};

// Traduce nombres de columnas SQL al contrato que consume React.
export function toProduct(row: ProductRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category_name,
    brand: row.brand_name,
    price: Number(row.price),
    stock: row.stock,
    rating: Number(row.rating),
    description: row.description,
    imageUrl: row.image_url ?? `/assets/products/${row.slug}.jpg`,
    specs: JSON.parse(row.specs_json || '[]'),
    active: Boolean(row.active)
  };
}
