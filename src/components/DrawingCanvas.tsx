import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { usePondStore } from '../store/pondStore'
import type { Point } from '../types'

function snapToGrid(val: number): number {
  return Math.round(val)
}

export default function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [cursor, setCursor] = useState<Point | null>(null)

  const {
    points, snapEnabled, pxPerMeter, floorPts,
    addPoint, updatePoint, removeLastPoint, clearPoints, toggleSnap,
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
    x: sx / pxPerMeter,
    y: (size.height - sy) / pxPerMeter,
  })

  const toScreen = (p: Point) => ({
    x: p.x * pxPerMeter,
    y: size.height - p.y * pxPerMeter,
  })

  const snap = (p: Point): Point =>
    snapEnabled ? { x: snapToGrid(p.x), y: snapToGrid(p.y) } : p

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()!.getPointerPosition()!
    const real = snap(toReal(pos.x, pos.y))

    if (points.length >= 3) {
      const { x: fx, y: fy } = toScreen(points[0])
      if (Math.hypot(pos.x - fx, pos.y - fy) < 14) return // close polygon
    }
    addPoint(real)
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setCursor(snap(toReal(pos.x, pos.y)))
  }

  const lastPt = points.at(-1)
  const distToCursor =
    lastPt && cursor
      ? Math.sqrt((cursor.x - lastPt.x) ** 2 + (cursor.y - lastPt.y) ** 2)
      : null

  const toFlat = (pts: Point[]) => pts.flatMap(p => [toScreen(p).x, toScreen(p).y])

  const lineFlat = toFlat(points)
  const closedFlat =
    points.length >= 3 ? [...lineFlat, lineFlat[0], lineFlat[1]] : lineFlat
  const cursorFlat =
    lastPt && cursor
      ? [toScreen(lastPt).x, toScreen(lastPt).y, toScreen(cursor).x, toScreen(cursor).y]
      : []

  const floorFlat = floorPts.length >= 3 ? toFlat(floorPts) : []

  const mX = Math.ceil(size.width / pxPerMeter) + 1
  const mY = Math.ceil(size.height / pxPerMeter) + 1
  const SUB = 5
  const gx = Array.from({ length: mX * SUB + 1 }, (_, i) => (i * pxPerMeter) / SUB)
  const gy = Array.from({ length: mY * SUB + 1 }, (_, i) => size.height - (i * pxPerMeter) / SUB)

  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-800">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
        <span className="text-slate-400">Top View (m)</span>
        <div className="flex-1" />
        <button
          onClick={toggleSnap}
          className={`px-2 py-0.5 rounded border transition-colors ${
            snapEnabled
              ? 'bg-sky-500/10 border-sky-500 text-sky-400'
              : 'border-slate-700 text-slate-500'
          }`}
        >
          Snap {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={removeLastPoint}
          disabled={points.length === 0}
          className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          onClick={clearPoints}
          disabled={points.length === 0}
          className="px-2 py-0.5 rounded border border-red-800 text-red-400 disabled:opacity-30"
        >
          Clear
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden cursor-crosshair">
        <Stage
          width={size.width}
          height={size.height}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          {/* Grid */}
          <Layer listening={false}>
            {gx.map((x, i) => (
              <Line key={`gx${i}`} points={[x, 0, x, size.height]}
                stroke={i % SUB === 0 ? '#1e3a5f' : '#152030'}
                strokeWidth={i % SUB === 0 ? 0.8 : 0.4} />
            ))}
            {gy.map((y, i) => (
              <Line key={`gy${i}`} points={[0, y, size.width, y]}
                stroke={i % SUB === 0 ? '#1e3a5f' : '#152030'}
                strokeWidth={i % SUB === 0 ? 0.8 : 0.4} />
            ))}
          </Layer>

          <Layer>
            {/* Top polygon fill + outline */}
            {points.length >= 3 && (
              <Line points={closedFlat} closed fill="rgba(14,165,233,0.07)"
                stroke="#0ea5e9" strokeWidth={1.5} />
            )}
            {points.length >= 1 && points.length < 3 && (
              <Line points={lineFlat} stroke="#0ea5e9" strokeWidth={1.5} />
            )}

            {/* Floor polygon (dashed) */}
            {floorFlat.length > 0 && (
              <Line points={[...floorFlat, floorFlat[0], floorFlat[1]]} closed
                stroke="#3b82f6" strokeWidth={1} dash={[5, 3]}
                fill="rgba(30,64,175,0.15)" />
            )}

            {/* Cursor guide line + distance label */}
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

            {/* Point handles */}
            {points.map((p, i) => {
              const s = toScreen(p)
              return (
                <Circle key={i} x={s.x} y={s.y} radius={5}
                  fill={i === 0 ? '#16a34a' : '#0ea5e9'}
                  stroke="white" strokeWidth={1.5} draggable
                  onDragMove={(e) =>
                    updatePoint(i, snap(toReal(e.target.x(), e.target.y())))
                  }
                />
              )
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
