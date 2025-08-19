import { Outlet } from 'react-router-dom'
import './App.css'
import BackgroundCanvas from './three/BackgroundCanvas'

function App() {
  return (
    <div id="root-layout">
      <BackgroundCanvas />
      <div className="content-layer">
        <Outlet />
      </div>
    </div>
  )
}

export default App
