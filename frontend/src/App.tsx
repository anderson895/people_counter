import { useState } from 'react'
import { useOccupancySocket } from './hooks/useOccupancySocket'
import { RoomCard }  from './components/RoomCard'
import { LogTab }    from './components/LogTab'
import { ReportTab } from './components/ReportTab'
import type { Tab }  from './types'
import {
  BuildingOffice2Icon,
  Squares2X2Icon,
  ClockIcon,
  ArrowDownTrayIcon,
  SignalIcon,
  SignalSlashIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { status, wsState } = useOccupancySocket()
  const rooms = status?.rooms ?? []

  return (
    <div className="min-h-screen bg-ink font-sans text-light">

      {/* Top bar */}
      <header className="bg-panel border-b border-edge px-6 py-3 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
            <BuildingOffice2Icon className="w-4 h-4 text-glow" />
          </div>
          <span className="font-mono font-bold text-snow tracking-tight text-sm">
            Occupancy Monitor
          </span>
        </div>

        <div className="flex items-center gap-3">
          <WsBadge state={wsState} />
          {status && (
            <span className="font-mono text-xs text-muted tabular-nums">
              {status.server_time}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-edge mb-6">
          {(['dashboard', 'log', 'report'] as Tab[]).map(t => (
            <TabBtn key={t} id={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </nav>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="animate-fadeUp">
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-dim mb-4">
              Live Occupancy
            </p>
            {rooms.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-dim text-sm gap-2">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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

        {tab === 'log'    && <LogTab />}
        {tab === 'report' && (
          <ReportTab rooms={rooms.map(r => ({ id: r.id, name: r.name }))} />
        )}

      </div>
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────

const TAB_META: Record<Tab, { label: string; Icon: React.ElementType }> = {
  dashboard: { label: 'Dashboard', Icon: Squares2X2Icon },
  log:       { label: 'Log',       Icon: ClockIcon },
  report:    { label: 'Reports',   Icon: ArrowDownTrayIcon },
}

function TabBtn({ id, active, onClick }: { id: Tab; active: boolean; onClick: () => void }) {
  const { label, Icon } = TAB_META[id]
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 font-semibold text-sm px-4 py-2.5 transition-all border-b-2 -mb-px ${
        active ? 'text-white border-accent' : 'text-dim border-transparent hover:text-light'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

// ── WS badge ──────────────────────────────────────────────────

function WsBadge({ state }: { state: string }) {
  const cfg: Record<string, { icon: React.ReactNode; text: string; color: string }> = {
    open:       { icon: <SignalIcon className="w-3.5 h-3.5" />,       text: 'Live',         color: 'text-ok' },
    connecting: { icon: <SignalIcon className="w-3.5 h-3.5" />,       text: 'Connecting…',  color: 'text-warn' },
    closed:     { icon: <SignalSlashIcon className="w-3.5 h-3.5" />,  text: 'Disconnected', color: 'text-dim' },
    error:      { icon: <ExclamationCircleIcon className="w-3.5 h-3.5" />, text: 'Error',   color: 'text-red-400' },
  }
  const c = cfg[state] ?? cfg.closed
  return (
    <span className={`flex items-center gap-1.5 text-xs font-mono ${c.color}`}>
      {c.icon}
      {c.text}
    </span>
  )
}