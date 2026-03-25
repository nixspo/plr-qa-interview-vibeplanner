import { test, expect, type Page } from '@playwright/test'

const TOUR_NUMBER = 7777

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginViaApi(page: Page) {
  await page.goto('/')
  const res = await page.request.post('/api/auth/login', {
    data: { email: 'test@vibeplanner.com', password: 'V1b3Pl@nn3r!' },
  })
  const { token } = await res.json()
  await page.evaluate((t) => localStorage.setItem('token', t), token)
  await page.goto('/tours')
  await expect(page).toHaveURL('/tours')
}

async function getToken(page: Page): Promise<string> {
  return (await page.evaluate(() => localStorage.getItem('token'))) as string
}

async function cleanupTour(page: Page, tourNumber: number) {
  const token = await getToken(page)
  const res = await page.request.get('/api/tours', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const tours: Array<{ id: number; tourNumber: number }> = await res.json()
  const tour = tours.find((t) => t.tourNumber === tourNumber)
  if (tour) {
    await page.request.delete(`/api/tours/${tour.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }
}

async function createTourViaUi(
  page: Page,
  opts: { tourNumber: number; vehicleType: string; maxVolume: string; maxWeight: string; range: string }
) {
  await page.getByRole('button', { name: '+ New Tour' }).click()
  await page.getByLabel('Tour Number (1000–9999)').fill(String(opts.tourNumber))
  await page.getByLabel('Vehicle Type').selectOption(opts.vehicleType)
  await page.getByLabel('Max Volume (m³)').fill(opts.maxVolume)
  await page.getByLabel('Max Weight (kg)').fill(opts.maxWeight)
  await page.getByLabel('Range (km)').fill(opts.range)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(String(opts.tourNumber))).toBeVisible()
}

// ── Auth guard ────────────────────────────────────────────────────────────────

test('unauthenticated user visiting /tours is redirected to login', async ({ page }) => {
  await page.goto('/tours')
  await expect(page).toHaveURL('/login')
})

test('unauthenticated user visiting /tours/map is redirected to login', async ({ page }) => {
  await page.goto('/tours/map')
  await expect(page).toHaveURL('/login')
})

// ── Tours CRUD ────────────────────────────────────────────────────────────────

test.describe('Tours page', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
    await cleanupTour(page, TOUR_NUMBER)
    await page.reload()
  })

  test('Tours nav link is visible and active when on tours page', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Tours' })
    await expect(link).toBeVisible()
    await expect(link).toHaveClass(/nav-link--active/)
  })

  test('create a tour — appears in the table', async ({ page }) => {
    await createTourViaUi(page, {
      tourNumber: TOUR_NUMBER,
      vehicleType: 'Sprinter 3.5t',
      maxVolume: '8.5',
      maxWeight: '1500',
      range: '120',
    })

    await expect(page.getByText(String(TOUR_NUMBER))).toBeVisible()
    await expect(page.getByText('Sprinter 3.5t')).toBeVisible()
    await expect(page.getByText('8.5')).toBeVisible()
    await expect(page.getByText('1500')).toBeVisible()
    await expect(page.getByText('120')).toBeVisible()
  })

  test('create a tour — modal closes and form resets', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Tour' }).click()
    await expect(page.locator('.modal')).toBeVisible()

    await page.getByLabel('Tour Number (1000–9999)').fill(String(TOUR_NUMBER))
    await page.getByLabel('Vehicle Type').selectOption('Cargo Bike')
    await page.getByLabel('Max Volume (m³)').fill('3.0')
    await page.getByLabel('Max Weight (kg)').fill('250')
    await page.getByLabel('Range (km)').fill('50')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.locator('.modal')).not.toBeVisible()
  })

  test('cancel create — modal closes without adding a row', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Tour' }).click()
    await page.getByLabel('Tour Number (1000–9999)').fill('1234')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.locator('.modal')).not.toBeVisible()
    await expect(page.getByText('1234')).not.toBeVisible()
  })

  test('edit a tour — updated values appear in the table', async ({ page }) => {
    await createTourViaUi(page, {
      tourNumber: TOUR_NUMBER,
      vehicleType: 'Cargo Bike',
      maxVolume: '3.0',
      maxWeight: '250',
      range: '50',
    })

    await page.getByRole('button', { name: 'Edit' }).first().click()
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.getByLabel('Tour Number (1000–9999)')).toHaveValue(String(TOUR_NUMBER))

    await page.getByLabel('Vehicle Type').selectOption('Cargo Bike XL')
    await page.getByLabel('Max Volume (m³)').fill('5.0')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.locator('.modal')).not.toBeVisible()
    const row = page.locator('.tours-table tbody tr').filter({ hasText: String(TOUR_NUMBER) })
    await expect(row).toContainText('Cargo Bike XL')
    await expect(row.getByRole('cell', { name: '5', exact: true })).toBeVisible()
  })

  test('edit a tour — modal is pre-filled with existing values', async ({ page }) => {
    await createTourViaUi(page, {
      tourNumber: TOUR_NUMBER,
      vehicleType: 'Sprinter 5t',
      maxVolume: '10.0',
      maxWeight: '2000',
      range: '200',
    })

    await page.getByRole('button', { name: 'Edit' }).first().click()
    await expect(page.getByLabel('Tour Number (1000–9999)')).toHaveValue(String(TOUR_NUMBER))
    await expect(page.getByLabel('Vehicle Type')).toHaveValue('Sprinter 5t')
    await expect(page.getByLabel('Max Volume (m³)')).toHaveValue('10')
    await expect(page.getByLabel('Max Weight (kg)')).toHaveValue('2000')
    await expect(page.getByLabel('Range (km)')).toHaveValue('200')
  })

  test('delete a tour — row is removed from table', async ({ page }) => {
    await createTourViaUi(page, {
      tourNumber: TOUR_NUMBER,
      vehicleType: 'Box Truck 7.5t',
      maxVolume: '20.0',
      maxWeight: '5000',
      range: '300',
    })

    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal')).toContainText(String(TOUR_NUMBER))

    await page.locator('.modal__actions').getByRole('button', { name: 'Delete' }).click()

    await expect(page.locator('.modal')).not.toBeVisible()
    await expect(page.getByText(String(TOUR_NUMBER))).not.toBeVisible()
  })

  test('"View Map" button navigates to /tours/map', async ({ page }) => {
    await page.getByRole('button', { name: 'View Map' }).click()
    await expect(page).toHaveURL('/tours/map')
  })

  test('delete cancel — tour remains in table', async ({ page }) => {
    await createTourViaUi(page, {
      tourNumber: TOUR_NUMBER,
      vehicleType: 'Cargo Bike',
      maxVolume: '3.0',
      maxWeight: '250',
      range: '50',
    })

    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.locator('.modal')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.locator('.modal')).not.toBeVisible()
    await expect(page.getByText(String(TOUR_NUMBER))).toBeVisible()
  })
})

// ── Tour Map page ─────────────────────────────────────────────────────────────

test.describe('Tour Map page', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
    await cleanupTour(page, TOUR_NUMBER)
    await page.reload()
  })

  test('map page loads with sidebar and map', async ({ page }) => {
    await page.goto('/tours/map')
    await expect(page.locator('.map-sidebar')).toBeVisible()
    await expect(page.locator('.map-container')).toBeVisible()
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('map page shows "← Tours" back button', async ({ page }) => {
    await page.goto('/tours/map')
    await page.getByRole('button', { name: '← Tours' }).click()
    await expect(page).toHaveURL('/tours')
  })

  test('tour appears in sidebar after creation and area can be saved via API', async ({ page }) => {
    await createTourViaUi(page, {
      tourNumber: TOUR_NUMBER,
      vehicleType: 'Sprinter 3.5t',
      maxVolume: '8.5',
      maxWeight: '1500',
      range: '120',
    })

    // Navigate to map page
    await page.getByRole('button', { name: 'View Map' }).click()
    await expect(page).toHaveURL('/tours/map')

    // Tour should appear in the sidebar
    await expect(page.locator('.tour-list')).toContainText(String(TOUR_NUMBER))

    // Save area via API directly
    const token = await getToken(page)
    const toursRes = await page.request.get('/api/tours', { headers: { Authorization: `Bearer ${token}` } })
    const tours: Array<{ id: number; tourNumber: number }> = await toursRes.json()
    const tour = tours.find(t => t.tourNumber === TOUR_NUMBER)!

    const area = { type: 'Polygon', coordinates: [[[8.0, 48.0], [9.0, 48.0], [9.0, 49.0], [8.0, 48.0]]] }
    const patchRes = await page.request.patch(`/api/tours/${tour.id}/area`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { area },
    })
    expect(patchRes.status()).toBe(204)

    // Reload map page and verify the badge appears
    await page.reload()
    await expect(page.locator('.tour-list__badge').first()).toBeVisible()
  })
})
