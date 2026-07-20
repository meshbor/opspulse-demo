import { useMemo, useState } from 'react'
import {
  aggregate,
  alertsFromEvents,
  sparkPoints,
  type OpsEvent,
  type Severity,
} from './data/ops'
import { useEventFeed } from './hooks/useEventFeed'
import { useTabPresence } from './hooks/useTabPresence'
import './App.css'

function Sparkline({ points }: { points: number[] }) {
  const w = 160
  const h = 36
  const step = w / Math.max(1, points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${(1 - p) * (h - 4) + 2}`)
    .join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function severityClass(s: Severity) {
  return `sev sev-${s}`
}

export default function App() {
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<'all' | Severity>('all')
  const events = useEventFeed(paused)
  const tabs = useTabPresence()
  const stats = useMemo(() => aggregate(events), [events])
  const alerts = useMemo(() => alertsFromEvents(events), [events])
  const spark = useMemo(() => sparkPoints(events), [events])

  const visible: OpsEvent[] =
    filter === 'all' ? events : events.filter((e) => e.severity === filter)

  return (
    <div className="app">
      <header className="banner">
        <div className="brand">
          <span className="logo" aria-hidden />
          <div>
            <p className="product-name">OpsPulse</p>
            <p className="tagline">Демо итогового продукта · курс React Advanced</p>
          </div>
        </div>
        <p className="banner-note">
          Студенты соберут полную версию: WebSocket, Shared Worker, virtualization,
          агрегации в Worker, degraded mode, тесты.
        </p>
      </header>

      <div className="topbar">
        <div className="stats">
          <div className="stat">
            <span className="label">Rate / с</span>
            <span className="value mono">{stats.rate.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="label">Окно 60с</span>
            <span className="value mono">{stats.recentCount}</span>
          </div>
          <div className="stat">
            <span className="label">Critical</span>
            <span className="value mono warn">{stats.bySeverity.critical}</span>
          </div>
          <div className="stat">
            <span className="label">Вкладки</span>
            <span className="value mono">{tabs}</span>
          </div>
          <div className="stat">
            <span className="label">Канал</span>
            <span className="value live">
              <i className="pulse" />
              {paused ? 'paused' : 'live sim'}
            </span>
          </div>
        </div>
        <button type="button" className="chip" onClick={() => setPaused((p) => !p)}>
          {paused ? '▶ Поток' : '❚❚ Пауза'}
        </button>
      </div>

      <main className="grid">
        <section className="widgets">
          <article className="card">
            <h2>Поток / 60с</h2>
            <Sparkline points={spark} />
            <p className="muted small">Плотность событий (sim)</p>
          </article>
          <article className="card">
            <h2>Severity</h2>
            <ul className="bars">
              {(['info', 'warn', 'critical'] as Severity[]).map((s) => (
                <li key={s}>
                  <span className={severityClass(s)}>{s}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${s}`}
                      style={{
                        width: `${Math.min(100, stats.bySeverity[s] * 8)}%`,
                      }}
                    />
                  </div>
                  <span className="mono">{stats.bySeverity[s]}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>Top services</h2>
            <ol className="top-list">
              {stats.top.map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span className="mono">{count}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="card alerts-card">
            <h2>Алерты</h2>
            <ul className="alerts">
              {alerts.map((a) => (
                <li key={a.id} className={a.severity === 'critical' ? 'flash' : ''}>
                  <span className={severityClass(a.severity)}>{a.title}</span>
                  <p>{a.detail}</p>
                  <time className="mono muted">
                    {new Date(a.at).toLocaleTimeString('ru-RU')}
                  </time>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="feed">
          <div className="feed-head">
            <h2>Лента событий</h2>
            <div className="filters">
              {(['all', 'info', 'warn', 'critical'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={filter === f ? 'chip active' : 'chip'}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ul className="event-list">
            {visible.map((e) => (
              <li key={e.id} className="event-row">
                <span className={severityClass(e.severity)}>{e.severity}</span>
                <span className="svc mono">{e.service}</span>
                <span className="msg">{e.message}</span>
                <time className="mono muted">
                  {new Date(e.at).toLocaleTimeString('ru-RU')}
                </time>
              </li>
            ))}
          </ul>
          <p className="footer-note">
            Откройте во второй вкладке — счётчик «Вкладки» обновится. В курсе здесь
            Shared Worker + один WebSocket на все вкладки.
          </p>
        </section>
      </main>
    </div>
  )
}
