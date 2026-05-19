import { usePondStore } from '../store/pondStore'
import { HDPE_PRESETS } from '../types'

export default function BottomBar() {
  const {
    depth, slope, hdpePreset, overlapPercent,
    setDepth, setSlopeRatio, setSlopeDegrees, setHdpePreset, setOverlapPercent,
  } = usePondStore()

  return (
    <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 shrink-0">
      <div className="flex flex-wrap gap-x-4 gap-y-2">

        <div className="flex min-w-[160px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">ความลึก</label>
          <div className="flex items-center gap-1">
            <input type="number" min={0} step={0.1} value={depth}
              onChange={e => setDepth(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">m</span>
          </div>
        </div>

        <div className="flex min-w-[220px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">Slope (H:V ↔ °)</label>
          <div className="flex flex-wrap items-center gap-1">
            <input type="number" min={0.1} step={0.1}
              value={parseFloat(slope.ratio.toFixed(2))}
              onChange={e => setSlopeRatio(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">: 1  =</span>
            <input type="number" min={1} max={89} step={0.1}
              value={parseFloat(slope.degrees.toFixed(1))}
              onChange={e => setSlopeDegrees(Math.min(89, Math.max(1, parseFloat(e.target.value) || 1)))}
              className="w-14 bg-slate-950 border border-sky-800 rounded px-2 py-1 text-sm text-right text-sky-400 focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">°</span>
          </div>
        </div>

        <div className="flex min-w-[160px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">HDPE Roll</label>
          <select value={hdpePreset.label}
            onChange={e => {
              const p = HDPE_PRESETS.find(p => p.label === e.target.value)
              if (p) setHdpePreset(p)
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-sky-500">
            {HDPE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>

        <div className="flex min-w-[160px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">Overlap</label>
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={50} step={1} value={overlapPercent}
              onChange={e => setOverlapPercent(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-right text-white focus:outline-none focus:border-sky-500" />
            <span className="text-xs text-slate-500">%</span>
          </div>
        </div>

      </div>
    </div>
  )
}
