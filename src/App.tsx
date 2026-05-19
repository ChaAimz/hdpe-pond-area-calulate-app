import { useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { Moon, Sun } from 'lucide-react'
import DrawingCanvas from './components/DrawingCanvas'
import ThreeDViewer from './components/ThreeDViewer'
import BottomBar from './components/BottomBar'
import ResultPanel from './components/ResultPanel'
import { useTheme } from './context/ThemeContext'
import { usePondStore } from './store/pondStore'

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
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
    <div ref={rootRef} className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden dark:bg-slate-950 dark:text-white">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-sm font-semibold tracking-wide">HDPE POND CALCULATOR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1 rounded border border-sky-200 text-sky-500 hover:text-sky-600 hover:border-sky-400 transition-colors dark:border-sky-700 dark:text-sky-400 dark:hover:text-sky-200 dark:hover:border-sky-500"
          >
            Export PNG
          </button>
          <button
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center text-xs px-3 py-1 rounded border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-500"
          >
            New
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <DrawingCanvas />
        <ThreeDViewer />
      </div>

      <BottomBar />
      <ResultPanel />
    </div>
  )
}
