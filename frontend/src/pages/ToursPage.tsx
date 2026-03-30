import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const VEHICLE_TYPES = [
  'Cargo Bike',
  'Cargo Bike XL',
  'Sprinter 3.5t',
  'Sprinter 5t',
  'Transporter 2.8t',
  'Box Truck 7.5t',
  'Box Truck 12t',
]

interface Tour {
  id: number
  tourNumber: number
  maxVolume: number
  maxWeight: number
  range: number
  vehicleType: string
}

interface FormState {
  tourNumber: string
  maxVolume: string
  maxWeight: string
  range: string
  vehicleType: string
}

const emptyForm = (): FormState => ({
  tourNumber: '',
  maxVolume: '',
  maxWeight: '',
  range: '',
  vehicleType: VEHICLE_TYPES[0],
})

export default function ToursPage() {
  const navigate = useNavigate()
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null)
  const [deleting, setDeleting] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  async function fetchTours() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tours', { headers })
      if (!res.ok) throw new Error('Failed to load tours')
      setTours(await res.json())
    } catch {
      setError('Could not load tours. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTours() }, [])

  function openCreate() {
    setEditingTour(null)
    setForm(emptyForm())
    setFormError('')
    setShowModal(true)
  }

  function openEdit(tour: Tour) {
    setEditingTour(tour)
    setForm({
      tourNumber: String(tour.tourNumber),
      maxVolume: String(tour.maxVolume),
      maxWeight: String(tour.maxWeight),
      range: String(tour.range),
      vehicleType: tour.vehicleType,
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    const tourNumber = parseInt(form.tourNumber)
    const maxVolume = parseFloat(form.maxVolume)
    const maxWeight = parseFloat(form.maxWeight)
    const range = parseFloat(form.range)

    if (isNaN(tourNumber) || tourNumber < 1000 || tourNumber > 9999) {
      setFormError('Tour number must be a 4-digit number (1000–9999).')
      return
    }
    if (isNaN(maxVolume) || maxVolume <= 0) { setFormError('Max volume must be a positive number.'); return }
    if (isNaN(maxWeight) || maxWeight <= 0) { setFormError('Max weight must be a positive number.'); return }
    if (isNaN(range) || range <= 0) { setFormError('Range must be a positive number.'); return }

    setSaving(true)
    setFormError('')
    try {
      const url = editingTour ? `/api/tours/${editingTour.id}` : '/api/tours'
      const method = editingTour ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ tourNumber, maxVolume, maxWeight, range, vehicleType: form.vehicleType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || 'Failed to save tour.')
        return
      }
      setShowModal(false)
      await fetchTours()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/tours/${deleteTarget.id}`, { method: 'DELETE', headers })
      setDeleteTarget(null)
      await fetchTours()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="tours-page">
        <div className="page-header">
          <h1>Tours</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/tours/map')}>View Map</button>
            <button className="btn-primary" onClick={openCreate}>+ New Tour</button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : tours.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>No tours yet. Create one to get started.</p>
        ) : (
          <div className="table-wrapper">
            <table className="tours-table">
              <thead>
                <tr>
                  <th>Tour #</th>
                  <th>Vehicle Type</th>
                  <th>Max Volume (m³)</th>
                  <th>Max Weight (kg)</th>
                  <th>Range (km)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tours.map((tour) => (
                  <tr key={tour.id}>
                    <td className="tour-number">{tour.tourNumber}</td>
                    <td>{tour.vehicleType}</td>
                    <td>{tour.maxVolume}</td>
                    <td>{tour.maxWeight}</td>
                    <td>{tour.range}</td>
                    <td className="tour-actions">
                      <button className="btn-sm btn-secondary" onClick={() => openEdit(tour)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => setDeleteTarget(tour)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal__title">{editingTour ? 'Edit Tour' : 'New Tour'}</h2>

            <div className="form-group">
              <label htmlFor="tourNumber">Tour Number (1000–9999)</label>
              <input
                id="tourNumber"
                type="number"
                min={1000}
                max={9999}
                value={form.tourNumber}
                onChange={(e) => setForm({ ...form, tourNumber: e.target.value })}
                placeholder="e.g. 1042"
              />
            </div>

            <div className="form-group">
              <label htmlFor="vehicleType">Vehicle Type</label>
              <select
                id="vehicleType"
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              >
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="maxVolume">Max Volume (m³)</label>
                <input
                  id="maxVolume"
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.maxVolume}
                  onChange={(e) => setForm({ ...form, maxVolume: e.target.value })}
                  placeholder="e.g. 8.5"
                />
              </div>
              <div className="form-group">
                <label htmlFor="maxWeight">Max Weight (kg)</label>
                <input
                  id="maxWeight"
                  type="number"
                  min={0}
                  value={form.maxWeight}
                  onChange={(e) => setForm({ ...form, maxWeight: e.target.value })}
                  placeholder="e.g. 1500"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="range">Range (km)</label>
              <input
                id="range"
                type="number"
                min={0}
                value={form.range}
                onChange={(e) => setForm({ ...form, range: e.target.value })}
                placeholder="e.g. 120"
              />
            </div>

            {formError && <p className="error-text">{formError}</p>}

            <div className="modal__actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal">
            <h2 className="modal__title">Delete Tour {deleteTarget.tourNumber}?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              This will permanently delete tour <strong style={{ color: 'var(--text)' }}>#{deleteTarget.tourNumber}</strong> ({deleteTarget.vehicleType}). This action cannot be undone.
            </p>
            <div className="modal__actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary btn-danger-solid" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
