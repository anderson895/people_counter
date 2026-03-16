import { useEffect, useRef, useState, useCallback } from 'react'
import type { StatusPayload } from '../types'

type WsState = 'connecting' | 'open' | 'closed' | 'error'

interface UseOccupancySocketReturn {
  status:    StatusPayload | null
  wsState:   WsState
  reconnect: () => void
}

// Always use the current page's host — works in both dev (port 3000)
// and production (port 5000). Vite proxies /ws → Flask in dev.
function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host  = window.location.host
  return `${proto}//${host}/ws/status`
}

const RECONNECT_MS = 2000

export function useOccupancySocket(): UseOccupancySocketReturn {
  const [status,   setStatus]   = useState<StatusPayload | null>(null)
  const [wsState,  setWsState]  = useState<WsState>('connecting')
  const wsRef      = useRef<WebSocket | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // Close any existing socket first
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    setWsState('connecting')
    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setWsState('open')
    }

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return
      try {
        setStatus(JSON.parse(evt.data) as StatusPayload)
      } catch { /* ignore malformed */ }
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setWsState('error')
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setWsState('closed')
      timerRef.current = setTimeout(connect, RECONNECT_MS)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      wsRef.current?.close()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [connect])

  return { status, wsState, reconnect: connect }
}