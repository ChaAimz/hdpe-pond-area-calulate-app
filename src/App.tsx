import DrawingCanvas from './components/DrawingCanvas'
import ThreeDViewer from './components/ThreeDViewer'
import BottomBar from './components/BottomBar'
import ResultPanel from './components/ResultPanel'

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-sm font-semibold tracking-wide">HDPE POND CALCULATOR</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          New
        </button>
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
