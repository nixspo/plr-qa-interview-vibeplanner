import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ToursPage from './pages/ToursPage'
import TourMapPage from './pages/TourMapPage'

function App() {
  const token = localStorage.getItem('token')
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/tours" element={token ? <ToursPage /> : <Navigate to="/login" />} />
      <Route path="/tours/map" element={token ? <TourMapPage /> : <Navigate to="/login" />} />
    </Routes>
  )
}

export default App
