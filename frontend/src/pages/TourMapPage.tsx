import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import Navbar from '../components/Navbar'

interface Tour {
  id: number
  tourNumber: number
  vehicleType: string
  maxVolume: number
  maxWeight: number
  range: number
  area: object | null
}

type MapMode = 'idle' | 'draw' | 'edit'

const TOUR_COLORS = [
  '#00FFC1', '#FF6B6B', '#4ECDC4', '#FFE66D',
  '#A8E6CF', '#FF8B94', '#88C0D0', '#EBCB8B',
  '#B48EAD', '#81A1C1', '#A3BE8C', '#D08770',
]

function tourColor(tourNumber: number): string {
  return TOUR_COLORS[tourNumber % TOUR_COLORS.length]
}

// ── Map controller: renders polygons and handles draw/edit modes ──────────────

interface MapControllerProps {
  tours: Tour[]
  selectedId: number | null
  mode: MapMode
  onSelect: (id: number) => void
  onAreaChange: (tourId: number, area: object | null) => void
  onModeChange: (mode: MapMode) => void
}

function MapController({ tours, selectedId, mode, onSelect, onAreaChange, onModeChange }: MapControllerProps) {
  const map = useMap()
  const layersRef = useRef<Map<number, L.Polygon>>(new Map())
  const drawingTourIdRef = useRef<number | null>(null)

  // Keep ref in sync with current selectedId for draw handler
  useEffect(() => {
    drawingTourIdRef.current = mode === 'draw' ? selectedId : null
  }, [mode, selectedId])

  // Initialize geoman once
  useEffect(() => {
    map.pm.setGlobalOptions({ snappable: false, preventMarkerRemoval: false })

    const handleCreate = (e: L.LeafletEvent) => {
      const tourId = drawingTourIdRef.current
      if (tourId === null) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = (e as any).layer as L.Polygon
      const geojson = layer.toGeoJSON()
      map.removeLayer(layer)
      onAreaChange(tourId, geojson.geometry)
      onModeChange('idle')
    }

    map.on('pm:create', handleCreate)
    return () => { map.off('pm:create', handleCreate) }
  }, [map, onAreaChange, onModeChange])

  // Activate / deactivate draw mode
  useEffect(() => {
    if (mode === 'draw' && selectedId !== null) {
      const color = tourColor(tours.find(t => t.id === selectedId)?.tourNumber ?? 0)
      map.pm.enableDraw('Polygon', {
        snappable: false,
        pathOptions: { color, fillColor: color, fillOpacity: 0.25, weight: 2 },
      } as Parameters<typeof map.pm.enableDraw>[1])
    } else {
      map.pm.disableDraw()
    }
  }, [mode, selectedId, map, tours])

  // Render / re-render all polygons when tours or selection changes
  useEffect(() => {
    // Disable edit on all layers before removing
    layersRef.current.forEach(layer => {
      if (layer.pm.enabled()) layer.pm.disable()
      map.removeLayer(layer)
    })
    layersRef.current.clear()

    const allBounds: L.LatLngBounds[] = []

    tours.forEach(tour => {
      if (!tour.area) return

      const color = tourColor(tour.tourNumber)
      const isSelected = tour.id === selectedId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coords = (tour.area as any).coordinates[0].map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      )

      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.15,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 1 : 0.6,
      })

      polygon.bindTooltip(`Tour ${tour.tourNumber}`, { sticky: true })
      polygon.on('click', () => onSelect(tour.id))
      polygon.addTo(map)
      layersRef.current.set(tour.id, polygon)
      allBounds.push(polygon.getBounds())
    })

    if (allBounds.length > 0) {
      map.fitBounds(
        allBounds.reduce((acc, b) => acc.extend(b)),
        { padding: [40, 40], maxZoom: 14 }
      )
    }
  }, [tours, selectedId, map, onSelect])

  // Enable / disable vertex editing on the selected layer
  useEffect(() => {
    layersRef.current.forEach((layer, id) => {
      if (mode === 'edit' && id === selectedId) {
        layer.pm.enable({ allowSelfIntersection: false })
      } else {
        if (layer.pm.enabled()) layer.pm.disable()
      }
    })

    if (mode !== 'edit') return

    const selectedLayer = selectedId !== null ? layersRef.current.get(selectedId) : null
    if (!selectedLayer) return

    const handleEdit = () => {
      const updated = selectedLayer.toGeoJSON()
      onAreaChange(selectedId!, updated.geometry)
    }

    selectedLayer.on('pm:edit', handleEdit)
    return () => { selectedLayer.off('pm:edit', handleEdit) }
  }, [mode, selectedId, onAreaChange])

  return null
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TourMapPage() {
  const navigate = useNavigate()
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mode, setMode] = useState<MapMode>('idle')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/tours', { headers })
      .then(r => r.json())
      .then(setTours)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectedTour = tours.find(t => t.id === selectedId) ?? null

  // Called by MapController when a polygon is drawn or edited
  const handleAreaChange = useCallback((tourId: number, area: object | null) => {
    setTours(prev => prev.map(t => t.id === tourId ? { ...t, area } : t))
    setMode('idle')
  }, [])

  async function saveArea(tourId: number, area: object | null) {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/tours/${tourId}/area`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ area }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSaveError('Failed to save area. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!selectedTour) return
    await saveArea(selectedTour.id, selectedTour.area)
  }

  async function handleClearArea() {
    if (!selectedTour) return
    setTours(prev => prev.map(t => t.id === selectedTour.id ? { ...t, area: null } : t))
    setMode('idle')
    await saveArea(selectedTour.id, null)
  }

  return (
    <>
      <Navbar />
      <div className="map-page">
        {/* ── Sidebar ── */}
        <aside className="map-sidebar">
          <div className="map-sidebar__header">
            <button className="btn-sm btn-secondary" onClick={() => navigate('/tours')}>
              ← Tours
            </button>
            <h2>Tour Areas</h2>
          </div>

          {loading ? (
            <p className="map-sidebar__hint">Loading…</p>
          ) : tours.length === 0 ? (
            <p className="map-sidebar__hint">No tours yet.</p>
          ) : (
            <ul className="tour-list">
              {tours.map(tour => (
                <li
                  key={tour.id}
                  className={`tour-list__item${selectedId === tour.id ? ' tour-list__item--selected' : ''}`}
                  onClick={() => { setSelectedId(tour.id); setMode('idle') }}
                >
                  <span
                    className="tour-list__dot"
                    style={{ background: tourColor(tour.tourNumber) }}
                  />
                  <div className="tour-list__info">
                    <span className="tour-list__number">#{tour.tourNumber}</span>
                    <span className="tour-list__type">{tour.vehicleType}</span>
                  </div>
                  {tour.area && <span className="tour-list__badge">area</span>}
                </li>
              ))}
            </ul>
          )}

          {/* ── Selected tour panel ── */}
          {selectedTour && (
            <div className="map-panel">
              <div className="map-panel__title">Tour #{selectedTour.tourNumber}</div>
              <div className="map-panel__row">
                <span>Vehicle</span><span>{selectedTour.vehicleType}</span>
              </div>
              <div className="map-panel__row">
                <span>Max Volume</span><span>{selectedTour.maxVolume} m³</span>
              </div>
              <div className="map-panel__row">
                <span>Max Weight</span><span>{selectedTour.maxWeight} kg</span>
              </div>
              <div className="map-panel__row">
                <span>Range</span><span>{selectedTour.range} km</span>
              </div>

              {saveError && <p className="error-text" style={{ marginTop: '0.75rem' }}>{saveError}</p>}

              <div className="map-panel__actions">
                {mode === 'idle' && (
                  <>
                    {!selectedTour.area ? (
                      <button
                        className="btn-sm btn-primary"
                        onClick={() => setMode('draw')}
                      >
                        Draw Area
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => setMode('edit')}
                        >
                          Edit Area
                        </button>
                        <button
                          className="btn-sm btn-danger"
                          onClick={handleClearArea}
                          disabled={saving}
                        >
                          Clear
                        </button>
                        <button
                          className="btn-sm btn-primary"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {mode === 'draw' && (
                  <>
                    <p className="map-sidebar__hint">Click on the map to draw a polygon. Double-click to finish.</p>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => setMode('idle')}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {mode === 'edit' && (
                  <>
                    <p className="map-sidebar__hint">Drag vertices to reshape. Click Save when done.</p>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => setMode('idle')}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-sm btn-primary"
                      onClick={async () => { setMode('idle'); await saveArea(selectedTour.id, selectedTour.area) }}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ── Map ── */}
        <div className="map-container">
          <MapContainer
            center={[51.0, 10.0]}
            zoom={6}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController
              tours={tours}
              selectedId={selectedId}
              mode={mode}
              onSelect={id => { setSelectedId(id); setMode('idle') }}
              onAreaChange={handleAreaChange}
              onModeChange={setMode}
            />
          </MapContainer>
        </div>
      </div>
    </>
  )
}
