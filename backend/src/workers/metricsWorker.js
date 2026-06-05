import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import { parentPort, workerData } from 'node:worker_threads';

const execFileAsync = promisify(execFile);

// Toma una muestra acumulada de CPU desde el modulo os.
// Para calcular uso real se comparan dos muestras separadas por unos milisegundos.
function readCpuSample() {
  const cpus = os.cpus();
  return cpus.reduce(
    (acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      return {
        idle: acc.idle + cpu.times.idle,
        total: acc.total + total
      };
    },
    { idle: 0, total: 0 }
  );
}

// Usa `df -P /` para obtener el porcentaje de disco usado en Linux.
async function getDiskUsagePercent() {
  try {
    const { stdout } = await execFileAsync('df', ['-P', '/']);
    const [, dataLine] = stdout.trim().split('\n');
    const columns = dataLine.trim().split(/\s+/);
    return Number(columns[4].replace('%', ''));
  } catch {
    return 0;
  }
}

// Cuenta procesos leyendo carpetas numericas dentro de /proc.
async function getProcessCount() {
  try {
    const entries = await readdir('/proc');
    return entries.filter((entry) => /^\d+$/.test(entry)).length;
  } catch {
    try {
      const uptime = await readFile('/proc/uptime', 'utf8');
      return uptime ? 1 : 0;
    } catch {
      return 0;
    }
  }
}

// Recolecta todas las metricas que luego se guardan en system_metrics.
async function collectMetric() {
  const before = readCpuSample();
  await new Promise((resolve) => setTimeout(resolve, 350));
  const after = readCpuSample();

  const idleDelta = after.idle - before.idle;
  const totalDelta = after.total - before.total;
  const cpuPercent = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;
  const memoryPercent = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

  return {
    cpu_percent: Number(cpuPercent.toFixed(2)),
    memory_percent: Number(memoryPercent.toFixed(2)),
    disk_percent: Number((await getDiskUsagePercent()).toFixed(2)),
    process_count: await getProcessCount(),
    load_avg: Number(os.loadavg()[0].toFixed(2))
  };
}

// Envia una medicion al hilo principal.
async function tick() {
  const metric = await collectMetric();
  parentPort?.postMessage(metric);
}

// Primera medicion inmediata y luego mediciones periodicas segun METRICS_INTERVAL_SECONDS.
void tick();
setInterval(() => void tick(), Number(workerData.intervalMs ?? 30000));
