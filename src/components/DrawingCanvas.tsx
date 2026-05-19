import React, { useRef, useState, useEffect } from 'react'
import { RotateCcw, Crosshair, Ruler, Magnet, Undo2, Trash2 } from 'lucide-react'
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useLang } from '../i18n/LangContext'
import { usePondStore } from '../store/pondStore'
import type { Point } from '../types'

function snapToGrid(val: number): number {
  return Math.round(val)
}

const SUB = 5

const SCALE_PRESETS = [
  { label: '1:25',  ppm: 160 },
  { label: '1:50',  ppm: 80  },
  { label: '1:100', ppm: 40  },
  { label: '1:200', ppm: 20  },
  { label: '1:500', ppm: 8   },
]

function niceScale(ppm: number, maxPx: number): number {
  const maxM = maxPx / ppm
  for (const v of [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1]) {
    if (v <= maxM) return v
  }
  return 0.1
}

export default function DrawingCanvas() {
  const { t } = useLang()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [cursor, setCursor] = useState<Point | null>(null)
  const [rawPos, setRawPos] = useState<{ x: number; y: number } | null>(null)
  const [defaultPpm, setDefaultPpm] = useState(40)
  const [ppm, setPpm] = useState(40)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [midDrag, setMidDrag] = useState<{ x: number; y: number } | null>(null)
  const [showDims, setShowDims] = useState(false)
  const [editingEdge, setEditingEdge] = useState<{
    index: number; inputValue: string; x: number; y: number
  } | null>(null)

  const {
    points, isClosed, snapEnabled, floorPts,
    addPoint, updatePoint, removeLastPoint, clearPoints, toggleSnap, closePolygon,
  } = usePondStore()

  function confirmEdgeEdit() {
    if (!editingEdge) return
    const newLen = parseFloat(editingEdge.inputValue)
    if (isNaN(newLen) || newLen <= 0) { setEditingEdge(null); return }
    const n = points.length
    const a = points[editingEdge.index]
    const b = points[(editingEdge.index + 1) % n]
    const dx = b.x - a.x, dy = b.y - a.y
    const curLen = Math.sqrt(dx * dx + dy * dy)
    if (curLen < 1e-10) { setEditingEdge(null); return }
    const scale = newLen / curLen
    updatePoint((editingEdge.index + 1) % n, { x: a.x + dx * scale, y: a.y + dy * scale })
    setEditingEdge(null)
  }

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    ro.observe(containerRef.current)
    const rect = containerRef.current.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })
    return () => ro.disconnect()
  }, [])

  const toReal = (sx: number, sy: number): Point => ({
    x: (sx - offset.x) / ppm,
    y: (size.height - sy + offset.y) / ppm,
  })

  const toScreen = (p: Point) => ({
    x: p.x * ppm + offset.x,
    y: size.height - p.y * ppm + offset.y,
  })

  const snap = (p: Point): Point =>
    snapEnabled ? { x: snapToGrid(p.x), y: snapToGrid(p.y) } : p

  function handleWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1
    const newPpm = Math.max(5, Math.min(200, ppm * factor))
    const scale = newPpm / ppm
    setOffset(o => ({
      x: pos.x + (o.x - pos.x) * scale,
      y: (size.height - pos.y) * (scale - 1) + o.y * scale,
    }))
    setPpm(newPpm)
  }

  function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      e.evt.preventDefault()
      setMidDrag({ x: e.evt.clientX, y: e.evt.clientY })
    }
  }

  function handleMouseUp(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) setMidDrag(null)
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    if (isClosed) return

    if (points.length >= 3) {
      const { x: fx, y: fy } = toScreen(points[0])
      if (Math.hypot(pos.x - fx, pos.y - fy) < 14) {
        closePolygon()
        return
      }
    }
    addPoint(snap(toReal(pos.x, pos.y)))
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return

    if (midDrag) {
      const dx = e.evt.clientX - midDrag.x
      const dy = e.evt.clientY - midDrag.y
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
      setMidDrag({ x: e.evt.clientX, y: e.evt.clientY })
      return
    }

    setRawPos(pos)
    setCursor(snap(toReal(pos.x, pos.y)))
  }

  const lastPt = points.at(-1)
  const distToCursor =
    !isClosed && lastPt && cursor
      ? Math.sqrt((cursor.x - lastPt.x) ** 2 + (cursor.y - lastPt.y) ** 2)
      : null

  const nearFirst =
    !isClosed && points.length >= 3 && rawPos
      ? Math.hypot(rawPos.x - toScreen(points[0]).x, rawPos.y - toScreen(points[0]).y) < 14
      : false

  const toFlat = (pts: Point[]) => pts.flatMap(p => [toScreen(p).x, toScreen(p).y])

  const lineFlat = toFlat(points)
  const polyFlat = isClosed ? [...lineFlat, lineFlat[0], lineFlat[1]] : lineFlat
  const cursorFlat =
    !isClosed && lastPt && cursor
      ? [toScreen(lastPt).x, toScreen(lastPt).y, toScreen(cursor).x, toScreen(cursor).y]
      : []
  const floorFlat = floorPts.length >= 3 ? toFlat(floorPts) : []

  // Grid: compute visible lines in screen space
  const minorStep = ppm / SUB
  const kXLeft = Math.floor(-offset.x / minorStep) - 1
  const kXRight = Math.ceil((size.width - offset.x) / minorStep) + 1
  const gxLines = Array.from({ length: Math.max(0, kXRight - kXLeft + 1) }, (_, i) => {
    const k = kXLeft + i
    return { x: k * minorStep + offset.x, major: k % SUB === 0 }
  }).filter(l => l.x >= -1 && l.x <= size.width + 1)

  const kYBottom = Math.floor(offset.y / minorStep) - 1
  const kYTop = Math.ceil((size.height + offset.y) / minorStep) + 1
  const gyLines = Array.from({ length: Math.max(0, kYTop - kYBottom + 1) }, (_, i) => {
    const k = kYBottom + i
    return { y: size.height + offset.y - k * minorStep, major: k % SUB === 0 }
  }).filter(l => l.y >= -1 && l.y <= size.height + 1)

  const cursorClass = midDrag ? 'cursor-grabbing' : (isClosed ? 'cursor-default' : 'cursor-crosshair')

  const scaleM = niceScale(ppm, 160)
  const scalePx = scaleM * ppm
  const scaleX = 16
  const scaleY = size.height - 16
  const scaleLabel = scaleM >= 1 ? `${scaleM} m` : `${scaleM * 100} cm`

  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-b border-gray-200 shrink-0 dark:bg-slate-900 dark:border-slate-800">
        <span className="text-xs text-gray-500 dark:text-slate-400">{t('topView')}</span>
        <div className="flex-1" />
        <select
          value={defaultPpm}
          onChange={e => {
            const p = Number(e.target.value)
            setDefaultPpm(p); setPpm(p); setOffset({ x: 0, y: 0 })
          }}
          className="px-1 py-0.5 rounded border border-gray-300 bg-white text-gray-500 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        >
          {SCALE_PRESETS.map(s => (
            <option key={s.label} value={s.ppm}>{s.label}</option>
          ))}
        </select>
        <button title={t('resetView')}
          onClick={() => { setPpm(defaultPpm); setOffset({ x: 0, y: 0 }) }}
          className="p-1.5 rounded border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500"
        ><RotateCcw size={14} /></button>
        <button title={t('centerPolygon')}
          disabled={points.length === 0}
          onClick={() => {
            const cx = points.reduce((s, p) => s + p.x, 0) / points.length
            const cy = points.reduce((s, p) => s + p.y, 0) / points.length
            setOffset({ x: size.width / 2 - cx * ppm, y: cy * ppm - size.height / 2 })
          }}
          className="p-1.5 rounded border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500"
        ><Crosshair size={14} /></button>
        <button title={showDims ? t('hideDimensions') : t('showDimensions')}
          onClick={() => setShowDims(d => !d)}
          className={`p-1.5 rounded border transition-colors ${showDims ? 'bg-amber-500/10 border-amber-500 text-amber-500 dark:text-amber-400' : 'border-gray-300 text-gray-400 hover:text-gray-500 dark:border-slate-700 dark:text-slate-600 dark:hover:text-slate-400'}`}
        ><Ruler size={14} /></button>
        <button title={snapEnabled ? t('snapOn') : t('snapOff')}
          onClick={toggleSnap}
          className={`p-1.5 rounded border transition-colors ${snapEnabled ? 'bg-sky-500/10 border-sky-500 text-sky-500 dark:text-sky-400' : 'border-gray-300 text-gray-400 hover:text-gray-500 dark:border-slate-700 dark:text-slate-600 dark:hover:text-slate-400'}`}
        ><Magnet size={14} /></button>
        <button title={t('undoPoint')}
          onClick={removeLastPoint}
          disabled={points.length === 0}
          className="p-1.5 rounded border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500"
        ><Undo2 size={14} /></button>
        <button title={t('clearAll')}
          onClick={clearPoints}
          disabled={points.length === 0}
          className="p-1.5 rounded border border-red-200 text-red-500 hover:text-red-600 hover:border-red-400 transition-colors disabled:opacity-30 dark:border-red-900 dark:text-red-400 dark:hover:text-red-300 dark:hover:border-red-700"
        ><Trash2 size={14} /></button>
      </div>

      <div ref={containerRef} className={`flex-1 overflow-hidden relative ${cursorClass}`}>
        <Stage
          width={size.width}
          height={size.height}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onMouseLeave={() => { setCursor(null); setRawPos(null); setMidDrag(null) }}
        >
          <Layer listening={false}>
            {gxLines.map((l, i) => (
              <Line key={`gx${i}`} points={[l.x, 0, l.x, size.height]}
                stroke={l.major ? '#1e3a5f' : '#152030'}
                strokeWidth={l.major ? 0.8 : 0.4} />
            ))}
            {gyLines.map((l, i) => (
              <Line key={`gy${i}`} points={[0, l.y, size.width, l.y]}
                stroke={l.major ? '#1e3a5f' : '#152030'}
                strokeWidth={l.major ? 0.8 : 0.4} />
            ))}
          </Layer>

          <Layer>
            {points.length >= 1 && (
              <Line
                points={polyFlat}
                closed={isClosed}
                fill={isClosed ? 'rgba(14,165,233,0.07)' : undefined}
                stroke="#0ea5e9"
                strokeWidth={1.5}
              />
            )}

            {floorFlat.length > 0 && (
              <Line points={[...floorFlat, floorFlat[0], floorFlat[1]]} closed
                stroke="#3b82f6" strokeWidth={1} dash={[5, 3]}
                fill="rgba(30,64,175,0.15)" />
            )}

            {cursorFlat.length > 0 && (
              <Line points={cursorFlat} stroke="#f59e0b" strokeWidth={1} dash={[4, 3]} />
            )}
            {distToCursor !== null && cursor && (
              <>
                <Rect x={toScreen(cursor).x + 8} y={toScreen(cursor).y - 20}
                  width={56} height={16} fill="#1e293b"
                  stroke="#f59e0b" strokeWidth={0.8} cornerRadius={3} />
                <Text x={toScreen(cursor).x + 10} y={toScreen(cursor).y - 17}
                  text={`${distToCursor.toFixed(1)} m`} fill="#fbbf24" fontSize={10} />
              </>
            )}

            {points.map((p, i) => {
              const s = toScreen(p)
              const isFirst = i === 0
              const highlight = isFirst && nearFirst
              return (
                <Circle key={i} x={s.x} y={s.y}
                  radius={highlight ? 8 : 5}
                  fill={isFirst ? '#16a34a' : '#0ea5e9'}
                  stroke={highlight ? '#4ade80' : 'white'}
                  strokeWidth={highlight ? 2.5 : 1.5}
                  draggable={!nearFirst || !isFirst}
                  onDragMove={(e) =>
                    updatePoint(i, snap(toReal(e.target.x(), e.target.y())))
                  }
                />
              )
            })}

            {/* Dimension labels */}
            {showDims && points.length >= 2 && (() => {
              const n = points.length
              const edgeCount = isClosed ? n : n - 1
              const scx = points.reduce((s, p) => s + toScreen(p).x, 0) / n
              const scy = points.reduce((s, p) => s + toScreen(p).y, 0) / n
              return Array.from({ length: edgeCount }, (_, i) => {
                const a = points[i], b = points[(i + 1) % n]
                const sa = toScreen(a), sb = toScreen(b)
                const mx = (sa.x + sb.x) / 2, my = (sa.y + sb.y) / 2
                const odx = mx - scx, ody = my - scy
                const olen = Math.sqrt(odx * odx + ody * ody) || 1
                const lx = mx + (odx / olen) * 16, ly = my + (ody / olen) * 16
                const realLen = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
                const label = realLen >= 10 ? `${realLen.toFixed(1)}m` : `${realLen.toFixed(2)}m`
                const tw = label.length * 6 + 8
                return (
                  <React.Fragment key={`dim${i}`}>
                    <Rect x={lx - tw / 2} y={ly - 9} width={tw} height={14}
                      fill="rgba(15,23,42,0.85)" stroke="#92400e" strokeWidth={1} cornerRadius={3}
                      onClick={(e) => {
                        e.cancelBubble = true
                        setEditingEdge({ index: i, inputValue: realLen.toFixed(2), x: lx, y: ly - 9 })
                      }}
                      onMouseEnter={e => { e.target.stroke('#fbbf24'); e.target.getLayer()?.batchDraw() }}
                      onMouseLeave={e => { e.target.stroke('#92400e'); e.target.getLayer()?.batchDraw() }}
                    />
                    <Text x={lx - tw / 2 + 4} y={ly - 6}
                      text={label} fill="#fbbf24" fontSize={9} listening={false} />
                  </React.Fragment>
                )
              })
            })()}

            {/* Scale bar */}
            <Line points={[scaleX, scaleY, scaleX + scalePx, scaleY]} stroke="#94a3b8" strokeWidth={1.5} />
            <Line points={[scaleX, scaleY - 5, scaleX, scaleY + 5]} stroke="#94a3b8" strokeWidth={1.5} />
            <Line points={[scaleX + scalePx, scaleY - 5, scaleX + scalePx, scaleY + 5]} stroke="#94a3b8" strokeWidth={1.5} />
            <Text x={scaleX} y={scaleY - 18} width={scalePx} align="center"
              text={scaleLabel} fill="#94a3b8" fontSize={10} />
          </Layer>
        </Stage>

        {/* Edge-length edit popover */}
        {editingEdge && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setEditingEdge(null)} />
            <div
              className="absolute z-50 bg-slate-900 dark:bg-slate-900 border border-sky-700 rounded-lg shadow-2xl p-3 flex flex-col gap-2 min-w-[160px]"
              style={{ left: editingEdge.x, top: editingEdge.y - 72, transform: 'translateX(-50%)' }}
            >
              <div className="text-xs text-slate-400 font-medium">แก้ไขความยาวเส้น</div>
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="number" min="0.01" step="0.01"
                  value={editingEdge.inputValue}
                  onChange={e => setEditingEdge(ev => ev ? { ...ev, inputValue: e.target.value } : null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmEdgeEdit()
                    if (e.key === 'Escape') setEditingEdge(null)
                    e.stopPropagation()
                  }}
                  className="w-24 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white focus:border-sky-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">m</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={confirmEdgeEdit}
                  className="flex-1 text-xs py-1 bg-sky-600 hover:bg-sky-500 rounded text-white transition-colors">
                  OK
                </button>
                <button onClick={() => setEditingEdge(null)}
                  className="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors">
                  ยกเลิก
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
