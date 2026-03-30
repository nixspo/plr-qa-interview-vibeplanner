import { useState, useRef, useEffect } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { VibeLogo } from './VibeLogo'

function parseJwt(token: string): Record<string, string> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const claims = token ? parseJwt(token) : {}
  const fullName = claims.full_name || ''
  const initials = fullName ? getInitials(fullName) : '?'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/')
    window.location.reload()
  }

  return (
    <nav className="navbar">
      <VibeLogo small />
      {token && (
        <div className="navbar-links">
          <NavLink to="/tours" end className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            Tours
          </NavLink>
          <NavLink to="/tours/map" className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            Map
          </NavLink>
        </div>
      )}
      {token ? (
        <div className="navbar-user" ref={menuRef}>
          <button
            className="avatar-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="avatar-menu">
              <div className="avatar-menu-name">{fullName}</div>
              <div className="avatar-menu-divider" />
              <button className="avatar-menu-item" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => navigate('/login')}>
          Sign in
        </button>
      )}
    </nav>
  )
}
