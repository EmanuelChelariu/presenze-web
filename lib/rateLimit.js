/**
 * Rate limiter semplice in memoria per proteggere da brute-force.
 * Su Vercel serverless le istanze possono essere riciclate, ma offre
 * comunque una buona protezione base contro attacchi automatizzati.
 */

const attempts = new Map();

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5; // massimo 5 tentativi per finestra

/**
 * Controlla se un IP ha superato il limite di tentativi.
 * @param {string} ip - Indirizzo IP del client
 * @returns {{ blocked: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const key = `login:${ip}`;

  // Pulisci entries vecchie (ogni 100 chiamate)
  if (attempts.size > 1000) {
    for (const [k, v] of attempts) {
      if (now - v.windowStart > WINDOW_MS) {
        attempts.delete(k);
      }
    }
  }

  const record = attempts.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    // Nuova finestra
    attempts.set(key, { count: 1, windowStart: now });
    return { blocked: false, remaining: MAX_ATTEMPTS - 1, resetIn: 0 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const resetIn = Math.ceil((WINDOW_MS - (now - record.windowStart)) / 1000);
    return { blocked: true, remaining: 0, resetIn };
  }

  record.count++;
  return { blocked: false, remaining: MAX_ATTEMPTS - record.count, resetIn: 0 };
}
