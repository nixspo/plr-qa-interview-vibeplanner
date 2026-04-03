import { test, expect, request } from '@playwright/test';
import { BASE_URL, login, createTour, Tour, captureToken, deleteTourByNumber } from './helpers';

test.describe('Tour Management', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TOUR-01 | Create tour — happy path', async ({ page }) => {
      const tokenHolder = captureToken(page);

    await createTour(page, {
      tourNumber: 2137,
      vehicle: 'Transporter 2.8t',
      volume: 10,
      weight: 500,
      range: 100,
    });

    await expect(page.locator('.modal')).not.toBeVisible();

    const tourRow = page.getByRole('row').filter({ hasText: '2137' });

    await expect(tourRow).toBeVisible(); 
    await expect(tourRow.getByRole('cell', { name: 'Transporter 2.8t', exact: true })).toBeVisible();
    await expect(tourRow.getByRole('cell', { name: '10', exact: true })).toBeVisible();
    await expect(tourRow.getByRole('cell', { name: '500', exact: true })).toBeVisible();
    await expect(tourRow.getByRole('cell', { name: '100', exact: true })).toBeVisible();

   // Test cleanup
  const token = tokenHolder.get();
  await deleteTourByNumber(page, token, 2137);
  });
  

  test('TOUR-09 | Delete tour', async ({ page }) => {

    await createTour(page, {
      tourNumber: 9999,
      vehicle: 'Sprinter 5t',
      volume: 15,
      weight: 800,
      range: 200,
    });

    await expect(page.getByRole('cell', { name: '9999' })).toBeVisible();

    await page.getByRole('row', { name: /9999/ }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: /Delete Tour 9999/ })).toBeVisible();
    await page.locator('.btn-primary.btn-danger-solid').click();

    await expect(page.getByRole('cell', { name: '9999' })).not.toBeVisible();
  });

  test('TOUR-10 | Delete tour with drawn area', async ({ page, request }) => {
  const tokenHolder = captureToken(page);

  await createTour(page, {
    tourNumber: 1000,
    vehicle: 'Transporter 2.8t',
    volume: 10,
    weight: 500,
    range: 100,
  });

  const token = tokenHolder.get();

  // Fetch all tours to find the ID of the newly created tour
  const toursResponse = await page.request.get(`${BASE_URL}/api/tours`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tours = await toursResponse.json();
  const tour = tours.find((t: Tour) => t.tourNumber === 1000);
  const tourId = tour.id;

  // Assign a delivery area to the tour via API
  await page.request.patch(`${BASE_URL}/api/tours/${tourId}/area`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      area: {
        type: 'Polygon',
        coordinates: [[
          [13.37, 52.52],
          [13.40, 52.52],
          [13.40, 52.50],
          [13.37, 52.50],
          [13.37, 52.52],
        ]],
      },
    },
  });

  // Sanity check — area exists before deletion
  const toursBeforeDelete = await request.get(`${BASE_URL}/api/tours`, {
  headers: { Authorization: `Bearer ${token}` },
});
  const toursBeforeDeleteJson = await toursBeforeDelete.json();
  const tourBefore = toursBeforeDeleteJson.find((t: Tour) => t.id === tourId);
  expect(tourBefore.area).not.toBeNull();

  // Sanity check — tour visible on the list
  await page.getByRole('link', { name: 'Map' }).click();
  await expect(page.locator('.tour-list__item', { hasText: '#1000' })).toBeVisible();

  // Delete tour
  await page.getByRole('link', { name: 'Tours' }).click();
  await page.getByRole('row', { name: /1000/ }).getByRole('button', { name: 'Delete' }).click();
  await page.locator('.btn-primary.btn-danger-solid').click();

  // Verify tour gone from table
  await expect(page.getByRole('cell', { name: '1000' })).not.toBeVisible();

  // Verify tour and its area are gone via API
  const toursAfterDelete = await page.request.get(`${BASE_URL}/api/tours`, {
  headers: { Authorization: `Bearer ${token}` },
});
  const toursAfterDeleteJson = await toursAfterDelete.json();
  const tourAfter = toursAfterDeleteJson.find((t: Tour) => t.id === tourId);
  expect(tourAfter).toBeUndefined();

  // Verify tour preview no longer listed on map
  await page.getByRole('link', { name: 'Map' }).click();
  await expect(page.locator('.tour-list__item', { hasText: '#1000' })).not.toBeVisible();
});

});
