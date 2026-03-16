import { useState } from 'react'

interface Room { id: string; name: string }

interface Props {
  rooms: Room[]
}

const today  = () => new Date().toISOString().slice(0, 10)
const offset = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function ReportTab({ rooms }: Props) {
  const [start,      setStart]      = useState(offset(-6))
  const [end,        setEnd]        = useState(today())
  const [selected,   setSelected]   = useState<Set<string>>(new Set(rooms.map(r => r.id)))
  const [msg,        setMsg]        = useState('')

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
    if (!start || !end)   { setMsg('⚠ Please select start and end dates.'); return }
    if (start > end)      { setMsg('⚠ Start date must be before end date.'); return }
    if (selected.size < 1){ setMsg('⚠ Select at least one room.'); return }
    const roomsParam = selected.size === rooms.length ? 'all' : [...selected].join(',')
    setMsg('⏳ Preparing download…')
    const a = document.createElement('a')
    a.href = `/api/report?start=${start}&end=${end}&rooms=${roomsParam}`
    a.click()
    setTimeout(() => setMsg('✅ Download started.'), 600)
  }

  return (
    <div className="animate-fadeUp">
      <div className="max-w-xl mx-auto">
        <div className="bg-panel border border-edge rounded-2xl p-6">

          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <SpreadsheetIcon />
            <h2 className="font-bold text-snow text-base">Download CSV Report</h2>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Start date', value: start, set: setStart },
              { label: 'End date',   value: end,   set: setEnd   },
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
            {['today', 'yesterday', 'week', 'month'].map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className="text-xs border border-edge rounded-lg px-3 py-1 text-dim hover:text-light hover:border-soft capitalize transition-all"
              >
                {p === 'week' ? 'Last 7 days' : p === 'month' ? 'Last 30 days' : p.charAt(0).toUpperCase() + p.slice(1)}
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
            <DownloadIcon />
            Download CSV
          </button>
          {msg && (
            <p className="mt-2 text-center text-xs text-dim">{msg}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SpreadsheetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-glow" fill="currentColor" viewBox="0 0 16 16">
      <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5zM3 12v-2h2v2zm0 1h2v2H4a1 1 0 0 1-1-1zm3 2v-2h3v2zm4 0v-2h3v1a1 1 0 0 1-1 1zm3-3h-3v-2h3zm-7 0v-2h3v2z"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
    </svg>
  )
}
