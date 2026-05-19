import { usePondStore } from '../store/pondStore'
import { HDPE_PRESETS } from '../types'
import { useLang } from '../i18n/LangContext'
import { Input } from './ui/input'
import { Label } from './ui/label'

export default function BottomBar() {
  const { t } = useLang()
  const {
    depth, slope, hdpePreset, overlapPercent,
    setDepth, setSlopeRatio, setSlopeDegrees, setHdpePreset, setOverlapPercent,
  } = usePondStore()

  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 shrink-0 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex flex-wrap gap-x-4 gap-y-2">

        <div className="flex min-w-[160px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <Label className="text-[10px] text-gray-500 uppercase tracking-widest dark:text-slate-400">
            {t('depth')}
          </Label>
          <div className="flex items-center gap-1">
            <Input
              type="number" min={0} step={0.1} value={depth}
              onChange={e => setDepth(Math.max(0, parseFloat(e.target.value) || 0))}
              className="h-7 w-16 text-sm text-right px-2 bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-slate-400">m</span>
          </div>
        </div>

        <div className="flex min-w-[220px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <Label className="text-[10px] text-gray-500 uppercase tracking-widest dark:text-slate-400">
            {t('slope')}
          </Label>
          <div className="flex flex-wrap items-center gap-1">
            <Input
              type="number" min={0.1} step={0.1}
              value={parseFloat(slope.ratio.toFixed(2))}
              onChange={e => setSlopeRatio(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="h-7 w-14 text-sm text-right px-2 bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-slate-400">: 1  =</span>
            <Input
              type="number" min={1} max={89} step={0.1}
              value={parseFloat(slope.degrees.toFixed(1))}
              onChange={e => setSlopeDegrees(Math.min(89, Math.max(1, parseFloat(e.target.value) || 1)))}
              className="h-7 w-14 text-sm text-right px-2 bg-gray-50 border-sky-200 text-sky-500 dark:bg-slate-950 dark:border-sky-800 dark:text-sky-400"
            />
            <span className="text-xs text-gray-500 dark:text-slate-400">°</span>
          </div>
        </div>

        <div className="flex min-w-[160px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <Label className="text-[10px] text-gray-500 uppercase tracking-widest dark:text-slate-400">
            {t('hdpeRoll')}
          </Label>
          <select value={hdpePreset.label}
            onChange={e => {
              const p = HDPE_PRESETS.find(p => p.label === e.target.value)
              if (p) setHdpePreset(p)
            }}
            className="h-7 bg-gray-50 border border-gray-300 rounded-md px-2 text-sm text-gray-900 focus:outline-none focus:border-sky-500 dark:bg-slate-950 dark:border-slate-700 dark:text-white">
            {HDPE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>

        <div className="flex min-w-[160px] basis-full flex-col gap-1 md:basis-[calc(50%-0.5rem)] lg:basis-0 lg:flex-1">
          <Label className="text-[10px] text-gray-500 uppercase tracking-widest dark:text-slate-400">
            {t('overlap')}
          </Label>
          <div className="flex items-center gap-1">
            <Input
              type="number" min={0} max={50} step={1} value={overlapPercent}
              onChange={e => setOverlapPercent(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
              className="h-7 w-14 text-sm text-right px-2 bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-slate-400">%</span>
          </div>
        </div>

      </div>
    </div>
  )
}
