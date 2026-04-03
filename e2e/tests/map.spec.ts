import { test, expect } from '@playwright/test';
import { captureToken, createTour, deleteTourByNumber, login } from './helpers';

test.describe('Map', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MAP-01 | Map loads with no tours', async ({ page }) => {


    await page.getByRole('link', { name: 'Map' }).click();

  
    const mapContainer = page.locator('.map-container'); 
    await expect(mapContainer).toBeVisible();

    await expect(mapContainer.locator('.leaflet-tile-loaded').first()).toBeVisible(); 
    await expect(page.locator('.map-sidebar__hint')).toBeVisible();
  });

   test('MAP-02 | Map loads with no tours', async ({ page }) => {

      const tokenHolder = captureToken(page);

 await createTour(page, {
      tourNumber: 7777,
      vehicle: 'Cargo Bike XL',
      volume: 10,
      weight: 200,
      range: 30,
    });
    
    await page.getByRole('link', { name: 'Map' }).click();

  
    const mapContainer = page.locator('.map-container'); 
    await expect(mapContainer).toBeVisible();

    await expect(mapContainer.locator('.leaflet-tile-loaded').first()).toBeVisible(); 
    const tourItem = page.locator('.tour-list__item').filter({ hasText: '#7777' })
    await expect(tourItem).toBeVisible();
    await expect(tourItem.locator('.tour-list__type')).toHaveText('Cargo Bike XL');

    // Test cleanup
  const token = tokenHolder.get();
  await deleteTourByNumber(page, token, 7777);
  });

});
