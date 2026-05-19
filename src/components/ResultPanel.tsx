import { usePondStore } from '../store/pondStore'
import { shoelaceArea } from '../lib/geometry'
import { useLang } from '../i18n/LangContext'

function StatCard({ label, value, unit, highlight = false }: {
  label: string; value: string; unit: string; highlight?: boolean
}) {
  return (
    <div className={`basis-[calc(50%-0.5rem)] min-w-[110px] rounded-lg px-3 py-2 text-center md:basis-0 md:flex-1 ${
      highlight ? 'bg-green-100/80 border border-green-200 dark:bg-green-950/40 dark:border-green-900/40' : 'bg-gray-100 dark:bg-slate-800'
    }`}>
      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 dark:text-slate-400">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${highlight ? 'text-green-600 dark:text-green-400' : 'text-sky-500 dark:text-sky-400'}`}>
        {value}
      </div>
      <div className="text-[9px] text-gray-400 dark:text-slate-600">{unit}</div>
    </div>
  )
}

export default function ResultPanel() {
  const { t } = useLang()
  const { points, result, slope } = usePondStore()

  const warnings: string[] = []
  if (points.length > 0 && points.length < 3) warnings.push(t('warnMinPoints'))
  if (points.length >= 3 && shoelaceArea(points) < 1) warnings.push(t('warnTinyArea'))
  if (slope.degrees <= 0 || slope.degrees >= 90) warnings.push(t('warnSlopeRange'))

  return (
    <div className="bg-gray-100 border-t border-sky-100 px-4 py-2.5 shrink-0 dark:bg-slate-900 dark:border-sky-900/30">
      {warnings.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {warnings.map(w => (
            <span key={w} className="text-xs bg-amber-100 border border-amber-200 text-amber-600 rounded px-2 py-0.5 dark:bg-amber-950/50 dark:border-amber-800/50 dark:text-amber-400">
              ⚠ {w}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest dark:text-slate-300">{t('results')}</span>
        </div>
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <StatCard label={t('floorArea')} value={result ? result.floorArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label={t('slopeArea')} value={result ? result.slopeArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label={t('perimeter')} value={result ? result.perimeter.toFixed(1) : '—'} unit="m" />
          <StatCard label={t('totalArea')} value={result ? result.totalArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label={t('hdpeArea')} value={result ? result.hdpeArea.toFixed(1) : '—'} unit="m²" />
          <StatCard label={t('rollCount')} value={result ? String(result.rollCount) : '—'} unit="rolls" highlight />
        </div>
      </div>
    </div>
  )
}
