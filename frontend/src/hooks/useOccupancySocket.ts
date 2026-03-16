import { useEffect, useRef, useState, useCallback } from 'react'
import type { StatusPayload } from '../types'

type WsState = 'connecting' | 'open' | 'closed' | 'error'

interface UseOccupancySocketReturn {
  status:    StatusPayload | null
  wsState:   WsState
  reconnect: () => void
}

const WS_URL = (() => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host  = window.location.host
  return `${proto}//${host}/ws/status`
})()

const RECONNECT_MS = 2000

export function useOccupancySocket(): UseOccupancySocketReturn {
  const [status,  setStatus]  = useState<StatusPayload | null>(null)
  const [wsState, setWsState] = useState<WsState>('connecting')
  const wsRef     = useRef<WebSocket | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    setWsState('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setWsState('open')
    }

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return
      try {
        const payload = JSON.parse(evt.data) as StatusPayload
        setStatus(payload)
      } catch { /* ignore malformed */ }
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setWsState('error')
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setWsState('closed')
      // Auto-reconnect
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
