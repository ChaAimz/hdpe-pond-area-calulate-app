import React, { useRef, useState, useEffect } from 'react'
import { RotateCcw, Crosshair, Ruler, Magnet, Undo2, Trash2 } from 'lucide-react'
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [cursor, setCursor] = useState<Point | null>(null)
  const [rawPos, setRawPos] = useState<{ x: number; y: number } | null>(null)
  const [defaultPpm, setDefaultPpm] = useState(40)
  const [ppm, setPpm] = useState(40)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [midDrag, setMidDrag] = useState<{ x: number; y: number } | null>(null)
  const [showDims, setShowDims] = useState(false)

  const {
    points, isClosed, snapEnabled, floorPts,
    addPoint, updatePoint, removeLastPoint, clearPoints, toggleSnap, closePolygon,
  } = usePondStore()

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
    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-800">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <span className="text-xs text-slate-400">Top View (m)</span>
        <div className="flex-1" />
        <select
          value={defaultPpm}
          onChange={e => {
            const p = Number(e.target.value)
            setDefaultPpm(p); setPpm(p); setOffset({ x: 0, y: 0 })
          }}
          className="px-1 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-400 text-xs"
        >
          {SCALE_PRESETS.map(s => (
            <option key={s.label} value={s.ppm}>{s.label}</option>
          ))}
        </select>
        <button title="Reset View"
          onClick={() => { setPpm(defaultPpm); setOffset({ x: 0, y: 0 }) }}
          className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        ><RotateCcw size={14} /></button>
        <button title="Center on polygon"
          disabled={points.length === 0}
          onClick={() => {
            const cx = points.reduce((s, p) => s + p.x, 0) / points.length
            const cy = points.reduce((s, p) => s + p.y, 0) / points.length
            setOffset({ x: size.width / 2 - cx * ppm, y: cy * ppm - size.height / 2 })
          }}
          className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30"
        ><Crosshair size={14} /></button>
        <button title={showDims ? 'Hide Dimensions' : 'Show Dimensions'}
          onClick={() => setShowDims(d => !d)}
          className={`p-1.5 rounded border transition-colors ${showDims ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'border-slate-700 text-slate-600 hover:text-slate-400'}`}
        ><Ruler size={14} /></button>
        <button title={snapEnabled ? 'Snap ON' : 'Snap OFF'}
          onClick={toggleSnap}
          className={`p-1.5 rounded border transition-colors ${snapEnabled ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'border-slate-700 text-slate-600 hover:text-slate-400'}`}
        ><Magnet size={14} /></button>
        <button title="Undo last point"
          onClick={removeLastPoint}
          disabled={points.length === 0}
          className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30"
        ><Undo2 size={14} /></button>
        <button title="Clear all points"
          onClick={clearPoints}
          disabled={points.length === 0}
          className="p-1.5 rounded border border-red-900 text-red-500 hover:text-red-300 hover:border-red-700 transition-colors disabled:opacity-30"
        ><Trash2 size={14} /></button>
      </div>

      <div ref={containerRef} className={`flex-1 overflow-hidden ${cursorClass}`}>
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
                      fill="#1e293b" stroke="#f59e0b" strokeWidth={0.6} cornerRadius={2} />
                    <Text x={lx - tw / 2 + 4} y={ly - 6}
                      text={label} fill="#fbbf24" fontSize={9} />
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
      </div>
    </div>
  )
}
