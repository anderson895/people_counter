import { useEffect, useState } from 'react'
import type { LogRow } from '../types'

export function LogTab() {
  const [rows,    setRows]    = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/recent_logs')
      const data: LogRow[] = await res.json()
      setRows(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-dim">
          15-Minute Snapshots
        </p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs border border-edge rounded-lg px-3 py-1.5 text-dim hover:text-light hover:border-soft transition-all"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      <div className="bg-panel border border-edge rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              {['Timestamp', 'Room', 'Count'].map(h => (
                <th key={h} className="text-left text-[10px] font-mono font-bold uppercase tracking-widest text-dim px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="text-center text-dim text-sm py-12">
                  <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                  Loading…
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={3} className="text-center text-red-400 text-sm py-12">
                  Failed to load logs.
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-dim text-sm py-12">
                  No logs yet — first snapshot at the next 15-minute mark.
                </td>
              </tr>
            )}
            {!loading && !error && rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-edge/40 hover:bg-white/[0.03] transition-colors ${i % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
              >
                <td className="px-5 py-3 font-mono text-xs text-light">{r.ts}</td>
                <td className="px-5 py-3">
                  <span className="bg-accent/10 text-glow text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {r.room_name}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono font-bold text-snow">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
    </svg>
  )
}
