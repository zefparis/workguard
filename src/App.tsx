import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Enroll } from './pages/Enroll'
import { CheckIn } from './pages/CheckIn'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/enroll"  element={<Enroll />} />
        <Route path="/checkin" element={<CheckIn />} />
      </Routes>
    </BrowserRouter>
  )
}
