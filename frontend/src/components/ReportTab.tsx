import { useState } from 'react'
import {
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface Room { id: string; name: string }
interface Props { rooms: Room[] }

const today  = () => new Date().toISOString().slice(0, 10)
const offset = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

type MsgType = 'idle' | 'warn' | 'loading' | 'success'

interface Msg { type: MsgType; text: string }

export function ReportTab({ rooms }: Props) {
  const [start,    setStart]    = useState(offset(-6))
  const [end,      setEnd]      = useState(today())
  const [selected, setSelected] = useState<Set<string>>(new Set(rooms.map(r => r.id)))
  const [msg,      setMsg]      = useState<Msg | null>(null)

  const allChecked = selected.size === rooms.length

  const toggleRoom = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(rooms.map(r => r.id)))
  }

  const setPreset = (p: string) => {
    if (p === 'today')     { setStart(today());     setEnd(today()) }
    if (p === 'yesterday') { setStart(offset(-1));  setEnd(offset(-1)) }
    if (p === 'week')      { setStart(offset(-6));  setEnd(today()) }
    if (p === 'month')     { setStart(offset(-29)); setEnd(today()) }
  }

  const download = () => {
    if (!start || !end)    { setMsg({ type: 'warn',    text: 'Please select start and end dates.' }); return }
    if (start > end)       { setMsg({ type: 'warn',    text: 'Start date must be before end date.' }); return }
    if (selected.size < 1) { setMsg({ type: 'warn',    text: 'Select at least one room.' }); return }

    const roomsParam = selected.size === rooms.length ? 'all' : [...selected].join(',')
    setMsg({ type: 'loading', text: 'Preparing download…' })
    const a = document.createElement('a')
    a.href = `/api/report?start=${start}&end=${end}&rooms=${roomsParam}`
    a.click()
    setTimeout(() => setMsg({ type: 'success', text: 'Download started.' }), 600)
  }

  return (
    <div className="animate-fadeUp">
      <div className="max-w-xl mx-auto">
        <div className="bg-panel border border-edge rounded-2xl p-6">

          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <DocumentChartBarIcon className="w-5 h-5 text-glow" />
            <h2 className="font-bold text-snow text-base">Download CSV Report</h2>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Start date', value: start, set: setStart },
              { label: 'End date',   value: end,   set: setEnd },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs text-dim mb-1.5 font-medium">{label}</label>
                <input
                  type="date"
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-full bg-ink border border-edge rounded-lg px-3 py-2 text-sm text-light focus:outline-none focus:border-accent transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            ))}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <span className="text-xs text-dim">Quick:</span>
            {[
              { key: 'today',     label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week',      label: 'Last 7 days' },
              { key: 'month',     label: 'Last 30 days' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className="text-xs border border-edge rounded-lg px-3 py-1 text-dim hover:text-light hover:border-soft transition-all"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Room selection */}
          <label className="block text-xs text-dim mb-2 font-medium">Rooms to include</label>
          <div className="bg-ink border border-edge rounded-xl p-4 mb-5 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm font-semibold text-snow">All rooms</span>
            </label>
            <div className="border-t border-edge" />
            {rooms.map(r => (
              <label key={r.id} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleRoom(r.id)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span className="text-sm text-light">{r.name}</span>
              </label>
            ))}
          </div>

          {/* Download button */}
          <button
            onClick={download}
            className="w-full bg-accent hover:bg-indigo-500 active:scale-95 text-white font-semibold rounded-xl py-2.5 text-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download CSV
          </button>

          {/* Status message */}
          {msg && (
            <div className={`mt-3 flex items-center justify-center gap-1.5 text-xs ${
              msg.type === 'warn'    ? 'text-warn' :
              msg.type === 'success' ? 'text-ok'   :
              msg.type === 'loading' ? 'text-muted' : 'text-dim'
            }`}>
              {msg.type === 'warn'    && <ExclamationTriangleIcon className="w-3.5 h-3.5" />}
              {msg.type === 'success' && <CheckCircleIcon className="w-3.5 h-3.5" />}
              {msg.type === 'loading' && <ClockIcon className="w-3.5 h-3.5" />}
              {msg.text}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}