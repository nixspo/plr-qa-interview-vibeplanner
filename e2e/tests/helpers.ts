import { expect, Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';
export const CREDENTIALS = { email: 'test@vibeplanner.com', password: 'V1b3Pl@nn3r!' };

export type Tour = {
  id: number;
  tourNumber: number;
  vehicleType: string;
  maxWeight: number;
  maxVolume: number;
  range: number;
  area: object | null;
};

export const login = async (page: Page) => {
  // TO DO: remove the timeouts once the login page is stable and doesn't require a reload to sign in successfully
  await page.goto(BASE_URL, { timeout: 30000 });
  await page.getByRole('button', { name: 'Get Started' }).click({ timeout: 10000 });

  await page.getByRole('textbox', { name: 'Email' }).fill(CREDENTIALS.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(CREDENTIALS.password);

  await page.getByRole('button', { name: 'Sign in' }).click({ timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.reload({ timeout: 30000 });

  const signInBtn = page.getByRole('button', { name: 'Sign in' });
  await signInBtn.waitFor({ state: 'visible', timeout: 15000 });
  await signInBtn.click({ timeout: 10000 });

  await expect(page.getByRole('link', { name: 'Tours' })).toBeVisible({ timeout: 15000 });
};

export const captureToken = (page: Page): { get: () => string } => {
  let token: string = '';
  page.on('request', req => {
    const auth = req.headers()['authorization'];
    if (auth) token = auth.replace('Bearer ', '');
  });
  return { get: () => token };
};


export const createTour = async (page: Page, { tourNumber, vehicle, volume, weight, range }: {
  tourNumber: number;
  vehicle: string;
  volume: number;
  weight: number;
  range: number;
}) => {
  await page.getByRole('link', { name: 'Tours' }).click();
  await page.getByRole('button', { name: '+ New Tour' }).click();
  await page.getByRole('spinbutton', { name: 'Tour Number (1000–9999)' }).fill(String(tourNumber));
  await page.getByLabel('Vehicle Type').selectOption(vehicle);
  await page.getByRole('spinbutton', { name: 'Max Volume (m³)' }).fill(String(volume));
  await page.getByRole('spinbutton', { name: 'Max Weight (kg)' }).fill(String(weight));
  await page.getByRole('spinbutton', { name: 'Range (km)' }).fill(String(range));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.modal')).not.toBeVisible();
}



export const deleteTourByNumber = async (page: Page, token: string, tourNumber: number) => {

  // get all tours
  const toursRes = await page.request.get(`${BASE_URL}/api/tours`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  const tours = await toursRes.json();
  
  //find the tour with the specified tourNumber
  const tour = tours.find((t: Tour) => t.tourNumber === tourNumber);
  
  // if found, delete it
  if (tour) {
    await page.request.delete(`${BASE_URL}/api/tours/${tour.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Cleanup: Tour #${tourNumber} (ID: ${tour.id}) deleted.`);
  } else {
    console.warn(`Cleanup: Tour #${tourNumber} not found.`);
  }
};
