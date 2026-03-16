// ── API / WebSocket types ──────────────────────────────────────

export interface RoomStatus {
  id:           string
  name:         string
  live_count:   number
  last_logged:  string   // ISO datetime string or '—'
  last_count:   number | string
  avg_count:    number | string
}

export interface StatusPayload {
  rooms:       RoomStatus[]
  server_time: string
}

export interface LogRow {
  id:        number
  ts:        string
  room_id:   string
  room_name: string
  count:     number
}

export type Tab = 'dashboard' | 'log' | 'report'
