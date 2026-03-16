import { useState } from 'react'
import { useOccupancySocket } from './hooks/useOccupancySocket'
import { RoomCard }   from './components/RoomCard'
import { LogTab }     from './components/LogTab'
import { ReportTab }  from './components/ReportTab'
import type { Tab }   from './types'

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { status, wsState } = useOccupancySocket()

  const rooms = status?.rooms ?? []

  return (
    <div className="min-h-screen bg-ink font-sans text-light">

      {/* ── Top bar ── */}
      <header className="bg-panel border-b border-edge px-6 py-3 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
            <BuildingIcon />
          </div>
          <span className="font-mono font-bold text-snow tracking-tight text-sm">
            Occupancy Monitor
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* WS status badge */}
          <WsBadge state={wsState} />
          {/* Server clock */}
          {status && (
            <span className="font-mono text-xs text-muted tabular-nums">
              {status.server_time}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Tabs ── */}
        <nav className="flex gap-1 border-b border-edge mb-6">
          {(['dashboard', 'log', 'report'] as Tab[]).map(t => (
            <TabBtn key={t} id={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </nav>

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="animate-fadeUp">
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-dim mb-4">
              Live Occupancy
            </p>
            {rooms.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-dim text-sm">
                <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2" />
                Waiting for data…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((room, i) => (
                  <RoomCard key={room.id} room={room} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Log ── */}
        {tab === 'log' && <LogTab />}

        {/* ── Reports ── */}
        {tab === 'report' && (
          <ReportTab rooms={rooms.map(r => ({ id: r.id, name: r.name }))} />
        )}

      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────

const TAB_LABELS: Record<Tab, { label: string; icon: JSX.Element }> = {
  dashboard: { label: 'Dashboard', icon: <GridIcon /> },
  log:       { label: 'Log',       icon: <ClockIcon /> },
  report:    { label: 'Reports',   icon: <DownloadIcon /> },
}

function TabBtn({ id, active, onClick }: { id: Tab; active: boolean; onClick: () => void }) {
  const { label, icon } = TAB_LABELS[id]
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 font-semibold text-sm px-4 py-2.5 transition-all border-b-2 -mb-px ${
        active
          ? 'text-white border-accent'
          : 'text-dim border-transparent hover:text-light'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function WsBadge({ state }: { state: string }) {
  const cfg = {
    open:       { dot: 'bg-ok animate-pulse',    text: 'Live',         color: 'text-ok' },
    connecting: { dot: 'bg-warn animate-pulse',  text: 'Connecting…',  color: 'text-warn' },
    closed:     { dot: 'bg-dim',                 text: 'Disconnected', color: 'text-dim' },
    error:      { dot: 'bg-red-500',             text: 'Error',        color: 'text-red-400' },
  }[state] ?? { dot: 'bg-dim', text: state, color: 'text-dim' }

  return (
    <span className={`flex items-center gap-1.5 text-xs font-mono ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  )
}

function BuildingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-glow" fill="currentColor" viewBox="0 0 16 16">
      <path d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V10a.5.5 0 0 1 .342-.474L6 7.64V4.5a.5.5 0 0 1 .276-.447l8-4a.5.5 0 0 1 .487.022M6 8.694 1 10.36V15h5zM7 15h2v-1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V15h2V1.309l-7 3.5z"/>
    </svg>
  )
}
function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/>
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
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
