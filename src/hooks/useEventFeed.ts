import { useEffect, useState } from 'react'
import { makeEvent, seedEvents, type OpsEvent } from '../data/ops'

const MAX = 120
const TICK_MS = 700

export function useEventFeed(paused: boolean) {
  const [events, setEvents] = useState<OpsEvent[]>(() => seedEvents())

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setEvents((prev) => {
        const burst = Math.random() > 0.7 ? 2 : 1
        const next = [...prev]
        for (let i = 0; i < burst; i++) next.unshift(makeEvent())
        return next.slice(0, MAX)
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [paused])

  return events
}
