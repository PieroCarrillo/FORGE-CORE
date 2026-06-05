import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';
import { config } from './config.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

// Contrato de datos enviado desde el worker hacia el hilo principal.
type WorkerMetric = {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  process_count: number;
  load_avg: number;
};

// Levanta el worker de metricas. Este worker corre separado para no bloquear las rutas HTTP.
export function startMetricsWorker() {
  const workerPath = join(currentDir, 'workers', 'metricsWorker.js');
  const worker = new Worker(workerPath, {
    workerData: {
      intervalMs: config.metricsIntervalSeconds * 1000
    }
  });

  // Cada mensaje del worker se persiste en MariaDB mediante un stored procedure.
  worker.on('message', async (metric: WorkerMetric) => {
    try {
      await pool.query('CALL sp_register_system_metric(?, ?, ?, ?, ?)', [
        metric.cpu_percent,
        metric.memory_percent,
        metric.disk_percent,
        metric.process_count,
        metric.load_avg
      ]);
    } catch (error) {
      console.error('No se pudo guardar la metrica del sistema:', error);
    }
  });

  // Si el worker falla, el backend sigue vivo y deja el error en logs de systemd.
  worker.on('error', (error) => {
    console.error('Worker de metricas detenido por error:', error);
  });

  return worker;
}
