import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Generator from './pages/Generator.jsx'
import Library from './pages/Library.jsx'
import Settings from './pages/Settings.jsx'
import ViralResearch from './pages/ViralResearch.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/generator" replace />} />
        <Route path="generator" element={<Generator />} />
        <Route path="library" element={<Library />} />
        <Route path="viral" element={<ViralResearch />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
