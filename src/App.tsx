import { useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import DrawingCanvas from './components/DrawingCanvas'
import ThreeDViewer from './components/ThreeDViewer'
import BottomBar from './components/BottomBar'
import ResultPanel from './components/ResultPanel'
import { usePondStore } from './store/pondStore'

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { removeLastPoint, clearPoints, closePolygon, toggleSnap } = usePondStore()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') removeLastPoint()
      else if (e.key === 'Escape') clearPoints()
      else if (e.key === 'Enter') closePolygon()
      else if (e.key === 's' || e.key === 'S') toggleSnap()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [removeLastPoint, clearPoints, closePolygon, toggleSnap])

  function handleExport() {
    if (!rootRef.current) return
    toPng(rootRef.current, { pixelRatio: 2 }).then(dataUrl => {
      const a = document.createElement('a')
      a.download = 'hdpe-pond.png'
      a.href = dataUrl
      a.click()
    })
  }

  return (
    <div ref={rootRef} className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-sm font-semibold tracking-wide">HDPE POND CALCULATOR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1 rounded border border-sky-700 text-sky-400 hover:text-sky-200 hover:border-sky-500 transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            New
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <DrawingCanvas />
        <ThreeDViewer />
      </div>

      <BottomBar />
      <ResultPanel />
    </div>
  )
}
