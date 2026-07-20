export type Severity = 'info' | 'warn' | 'critical'

export type OpsEvent = {
  id: string
  at: number
  service: string
  message: string
  severity: Severity
}

export type Alert = {
  id: string
  title: string
  detail: string
  severity: Severity
  at: number
}

const SERVICES = [
  'auth-gateway',
  'payments-api',
  'card-issuer',
  'notify-hub',
  'risk-engine',
  'session-store',
]

const MESSAGES: Record<Severity, string[]> = {
  info: [
    'healthcheck ok',
    'cache warm completed',
    'deploy slot rotated',
    'replica caught up',
  ],
  warn: [
    'latency p95 > 400ms',
    'retry budget 60%',
    'queue depth rising',
    'TLS renew in 7d',
  ],
  critical: [
    'error rate spike',
    'circuit open',
    'pod crash loop',
    'dependency timeout',
  ],
}

let seq = 0

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rollSeverity(): Severity {
  const r = Math.random()
  if (r > 0.92) return 'critical'
  if (r > 0.72) return 'warn'
  return 'info'
}

export function makeEvent(now = Date.now()): OpsEvent {
  const severity = rollSeverity()
  seq += 1
  return {
    id: `e-${seq}-${now}`,
    at: now,
    service: pick(SERVICES),
    message: pick(MESSAGES[severity]),
    severity,
  }
}

export function seedEvents(count = 40, now = Date.now()): OpsEvent[] {
  return Array.from({ length: count }, (_, i) => {
    const severity: Severity =
      i % 11 === 0 ? 'critical' : i % 4 === 0 ? 'warn' : 'info'
    seq += 1
    return {
      id: `e-seed-${seq}`,
      at: now - (count - i) * 1200,
      service: SERVICES[i % SERVICES.length],
      message: pick(MESSAGES[severity]),
      severity,
    }
  }).reverse()
}

export function aggregate(events: OpsEvent[], windowMs = 60_000) {
  const cutoff = Date.now() - windowMs
  const recent = events.filter((e) => e.at >= cutoff)
  const bySeverity = { info: 0, warn: 0, critical: 0 }
  const byService = new Map<string, number>()
  for (const e of recent) {
    bySeverity[e.severity] += 1
    byService.set(e.service, (byService.get(e.service) ?? 0) + 1)
  }
  const top = [...byService.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const rate = recent.length / (windowMs / 1000)
  return { recentCount: recent.length, bySeverity, top, rate }
}

export function alertsFromEvents(events: OpsEvent[]): Alert[] {
  return events
    .filter((e) => e.severity !== 'info')
    .slice(0, 8)
    .map((e) => ({
      id: `a-${e.id}`,
      title: e.severity === 'critical' ? 'Critical signal' : 'Warning',
      detail: `${e.service}: ${e.message}`,
      severity: e.severity,
      at: e.at,
    }))
}

/** sparkline points 0..1 from recent event density buckets */
export function sparkPoints(events: OpsEvent[], buckets = 24): number[] {
  const now = Date.now()
  const span = 60_000
  const out = Array.from({ length: buckets }, () => 0)
  for (const e of events) {
    const age = now - e.at
    if (age < 0 || age > span) continue
    const idx = Math.min(buckets - 1, Math.floor((age / span) * buckets))
    out[buckets - 1 - idx] += 1
  }
  const max = Math.max(1, ...out)
  return out.map((v) => v / max)
}
