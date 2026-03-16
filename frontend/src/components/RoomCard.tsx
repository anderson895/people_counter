import { useEffect, useRef, useState } from 'react'
import type { RoomStatus } from '../types'

interface Props {
  room:  RoomStatus
  index: number
}

function fmt(v: number | string): string {
  return v === '—' || v === undefined ? '—' : String(v)
}

function fmtTime(ts: string): string {
  if (!ts || ts === '—') return '—'
  return ts.slice(11, 16)   // HH:MM
}

export function RoomCard({ room, index }: Props) {
  const prevCount  = useRef(room.live_count)
  const [pop, setPop] = useState(false)

  useEffect(() => {
    if (room.live_count !== prevCount.current) {
      prevCount.current = room.live_count
      setPop(true)
      const t = setTimeout(() => setPop(false), 350)
      return () => clearTimeout(t)
    }
  }, [room.live_count])

  return (
    <div
      className="group bg-panel border border-edge rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Room label */}
      <p className="text-xs font-mono font-bold uppercase tracking-widest text-dim mb-2">
        {room.name}
      </p>

      {/* Live count — pops on change */}
      <p
        key={room.live_count}
        className={`text-6xl font-mono font-bold text-snow leading-none transition-colors ${pop ? 'animate-countPop text-glow' : ''}`}
      >
        {room.live_count}
      </p>
      <p className="text-xs text-dim mt-1.5 mb-4">people detected</p>

      {/* Stats row */}
      <div className="border-t border-edge pt-3 grid grid-cols-3 gap-2">
        <Stat label="Last log" value={fmt(room.last_count)} />
        <Stat label="At"       value={fmtTime(room.last_logged)} mono />
        <Stat label="1h avg"   value={fmt(room.avg_count)} />
      </div>
    </div>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-ink border border-edge rounded-xl px-3 py-2 text-center">
      <p className="text-[10px] text-dim uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs font-bold text-light ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
