import 'dotenv/config';

// Configuracion central del backend.
// En AWS estas variables salen de /opt/forge-core/backend/.env.
export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  // USE_MOCK_DATA=true permite probar sin MariaDB; en produccion debe estar false.
  useMockData: process.env.USE_MOCK_DATA === 'true',
  database: {
    // En AWS DB_HOST debe ser la IP privada del servidor MariaDB.
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'forge_app',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'forge_core'
  },
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
    database: process.env.MONGODB_DB ?? 'forge_core'
  },
  metricsIntervalSeconds: Number(process.env.METRICS_INTERVAL_SECONDS ?? 30)
};
