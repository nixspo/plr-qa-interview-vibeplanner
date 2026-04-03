# Vibe Planner — Regression Test Plan

**Author:** Nikola <br>
**Last Updated:** 2026-04-03 <br>
**Environment:** `http://localhost:3000` (Docker) <br>
**Credentials:** `test / V1b3Pl@nn3r!`

---

## 1. Introduction

This document serves as living test strategy for **Vibe Planner**, a logistics zone planning application. It covers core authentication flows, tour management (CRUD), geospatial area drawing, cross-view data consistency, and API contract validation.

Goal: To ensure that new features or fixes do not break existing logic or data synchronization between the Map and the Database.

---

## 2. Prioritisation Model

| Priority | Meaning |
|----------|---------|
| **P0** | Critical — system is unusable if this fails |
| **P1** | High — critical business logic or data integrity at risk |
| **P2** | Medium — edge cases, UX gaps, API edge cases |

---

## 3. Automation Strategy

| Tool | Scope | 
|------|-------|-----------|
| **Playwright (E2E)** | Smoke tests and "Happy Path" regression for Tour Creation and Authentication. To develop further 
| **Manual** | GExploratory testing for complex UI/UX map interactions and visual layout
| **Postman** | API tests |



---

## 4. Known Issues & Critical Findings

These were identified during exploratory analysis before writing the suite.

- **[P0] Login requires page refresh to proceed (AUTH-01) :** `Sign in` button only forwards user to the `Tours` page, if the sequence of `Sign in` > page refresh > `Sign in` was processed
- **[P1] No vehicle-weight validation (TOUR-04):** The backend accepts unrealistic payloads — e.g. 999,000 kg assigned to a Bicycle. There is no server-side constraint linking vehicle type to maximum weight.
- **[P2] Self-intersecting polygons (MAP-05):** An hourglass shaped polygon Is being accepted in the UI, might cause issues in GIS.
- **[P2] No terrain validation on map areas (MAP-06):** Users can draw delivery zones over the sea or other inaccessible terrain. The backend accepts any valid GeoJSON polygon regardless of geographic context.
- **[P2] Negative and null values accepted through API:** The check for unwelcome values is only performed on the UI level

---

## 5. Test Suite

**Primary Focus:**
* Business-critical flows 
* Data validation (Weight/Distance constraints).
* Real-time Map-Table synchronization.
* Edge cases in vehicle-specific logistics.

### Authentication

| ID | Title | Preconditions |Steps | Expected Result | Priority | Automation |
|:---|:------|:--------------|:------|:----------------|:--------:|:----------:|
| AUTH-01 | Valid login | App running on localhost:3000 | 1. Open `/`<br>2. Enter `{{credentials}}`<br>3. Click Login | **Expected:** Redirect to Tours view. No error. **Known issue:** page refresh required to Sign in | P0 | Playwright - DONE |
| AUTH-02 | Wrong password | App running | 1. Enter `test` / `wrongpassword`<br>2. Click Login | Error message shown. No redirect. | P1 | Playwright - TO DO |
| AUTH-03 | Wrong username | App running | 1. Enter `admin` / `V1b3Pl@nn3r!`<br>2. Click Login | Error message shown. No redirect. | P1 | Playwright - TO DO|
| AUTH-04 | Empty fields | App running | 1. Leave both fields empty<br>2. Click Login | Form validation error. No API request sent. | P1 | Playwright - TO DO |
| AUTH-05 | Direct URL without session | App running | 1. Without logging in, navigate to `/tours` | Redirected to login page. | P0 | Playwright - TO DO |


---

### Tour Management (CRUD)

| ID | Title | Preconditions |Steps | Expected Result | Priority | Automation |
|:---|:------|:--------------|:------|:----------------|:--------:|:----------:|
| TOUR-01 | Create tour — happy path | Logged in | 1. Click Add Tour<br>2. Enter: <br>tourNumber `1001`, <br>vehicle `Transporter 2.8t`, <br>maxWeight `500`, <br>maxVolume `10`, <br>range `100`<br>3. Submit | Tour appears in table with correct values. | P0 | Playwright - DONE |
| TOUR-02 | Create tour — duplicate tourNumber | Tour with nr 1001 already exists | 1. Create second tour with same number `1001` | Error message. Second tour not saved. | P1 | Playwright - TO DO |
| TOUR-03 | Create tour — missing required field | Logged in | 1. Leave `tourNumber` empty<br>2. Fill all other fields<br>3. Submit | Validation error shown. Tour not created. | P1 | Playwright - TO DO |
| TOUR-04 | Create tour — negative maxWeight | Logged in | 1. Enter `maxWeight: -1`<br>2. Submit | Validation error. Tour not created. | P1 | Playwright - TO DO |
| TOUR-05 | Create tour — zero in numeric fields | Logged in | 1. Enter `0` for maxWeight, maxVolume, range<br>2. Submit | Validation error or meaningful message. Tour not created. | P2 | Playwright - TO DO |
| TOUR-06 | Create tour — extreme weight for Bike | Logged in | 1. Select vehicle: `Bike`<br>2. Enter `maxWeight: 999000`<br>3. Submit | **Expected:** validation error (unrealistic for vehicle type).<br>**Known issue:** system currently accepts this. Document actual result. | P1 | Plywright - TO DO |
| TOUR-07 | Edit tour — change vehicle type | Existing tour | 1. Click Edit on existing tour<br>2. Change vehicle type<br>3. Save | Updated value visible in table. | P2 | Playwright - TO DO|
| TOUR-08 | Edit tour — change tourNumber to duplicate | At least 2 tours created | 1. Edit tour A<br>2. Change its `tourNumber` to match tour B<br>3. Save | Validation error. Change not saved. | P1 | Playwright - TO DO |
| TOUR-09 | Delete tour | At leaast 1 tour created | 1. Click Delete on a tour<br>2. Confirm | Tour removed from table. Tour preview no longer visible on map. | P0 | Playwright - DONE |
| TOUR-10 | Delete tour with drawn area | Tour with area created | 1. Delete a tour that has an area on the map | Tour and its polygon area are both removed. | P0 | Playwright - DONE |
| TOUR-11 | Empty state | At least 1 tour created | 1. Delete all tours<br>2. Observe Tours view | Empty state message shown. | P2 | Playwright - TO DO|

---

### Map & Area drawing

| ID | Title | Preconditions |Steps | Expected Result | Priority | Automation |
|:---|:------|:--------------|:------|:----------------|:--------:|:----------:|
| MAP-01 | Map loads with no tours | Logged into the application | 1. Navigate to Map tab | Map renders. | P0 | Playwright - DONE |
| MAP-02 | Map loads with existing tours | At least 1 tour created | 1. Navigate to Map tab | Map renders. Existing tour preview visible. | P0 | Playwright - DONE |
| MAP-03 | Tour quick preview on map | At least 1 tour created | 1. Click on a tour preview on the map | Popup shows tour details (number, vehicle, max volume, max weight, range.) | P1 | Playwright - TO DO |
| MAP-04 | Draw valid polygon area | At least 1 tour without area created | 1. Select tour without area<br>2. Click 3+ points forming a polygon<br>3. Close and save | Area saved and visible on map. | P0 | Manual |
| MAP-05 | Area persists after page refresh | At least 1 tour without area created | 1. Draw and save area<br>2. Refresh browser<br> | Area still visible; data persisted correctly. | P0 | Manual |
| MAP-06 | Draw self-intersecting polygon | At least 1 tour without area created | 1. Draw a figure-8 shaped polygon<br>2. Save | **Expected:** validation error.<br>Document actual result. May cause GIS rendering issues. | P2 | Manual |
| MAP-07 | Draw area over sea / inaccessible terrain | At least 1 tour without area created | 1. Draw polygon over the North Sea<br>2. Save | **Expected:** warning or block.<br>**Known gap:** currently no terrain validation. Document actual result. | P2 | Manual |
| MAP-08 | Draw area with only 2 points | At least 1 tour without area created | 1. Click 2 points only<br> | Save option inaccessible. <br> Allowed to continue drawing or to cancel | P1 | Manual |
| MAP-09 | Edit existing polygon area | At least 1 tour with area created | 1. Select tour with drawn area<br>2. Click `Edit Area` <br> 3. Modify the polygon<br>4. Save | Updated area visible on map. | P1 | Manual |
| MAP-10 | Overlapping zones | At least 2 tours without area created | 1. Draw overlapping areas for both tours | Both areas saved. No data corruption. Visual overlap handled gracefully. | P2 | Manual |


---

### API Contract

| ID | Endpoint | Description | Expected Result | Priority | Automation |
|:---|:---------|:------------|:----------------|:--------:|:----------:|
| API-01 | API access without token | 1. `GET /api/tours` with no Authorization header | HTTP 401 Unauthorized. | P0 | Postman - DONE |
| API-02 | `GET /api/tours` | Fetch all tours with valid auth | HTTP 200. JSON array returned. | P0 | Postman - DONE |
| API-03 | `POST /api/tours` | Valid payload | HTTP 201. Response contains created tour with ID, provided details and timestamp. | P0 | Postman - DONE |
| API-04 | `POST /api/tours` | Missing `tourNumber` | HTTP 400 with error message. | P1 | Postman |
| API-05 | `POST /api/tours` | `maxWeight: -1` | HTTP 400. **Known gap:** Negative values are accepted via API | P2 | Postman |
| API-06 | `POST /api/tours` | String value in numeric field (e.g. `maxWeight: "heavy"`) | HTTP 400. | P2 | Postman |
| API-07 | `PATCH /api/tours/{id}/area` | Valid GeoJSON Polygon | HTTP 200. Area stored and retrievable. | P0 | Postman |
| API-08 | `PATCH /api/tours/{id}/area` | Empty coordinates `[]` | HTTP 400 with meaningful error. **Known gap:** Empty coordinates accepted | P2 | Postman |
| API-09 | `PATCH /api/tours/{id}/area` | Non-existent tour ID | HTTP 404. | P2 | Postman |
| API-10 | `DELETE /api/tours/{id}` | Existing tour | HTTP 204. Tour no longer in GET response. | P1 | Postman |
| API-11 | `DELETE /api/tours/{id}` | Non-existent ID | HTTP 404. | P2 | Postman |

---

## 6. Tradeoffs

The following areas are consciously deprioritised for this assignment.

| Area | Reason for exclusion |
|------|----------------------|
| Cross-browser testing | Playwright defaults to Chromium; Safari/Firefox deferred |
| Performance & load testing | Out of scope for regression suite |
| Visual regression (screenshots) | Replaced by manual checks for map component — reduces flakiness |
| Non-critical and Area drawing flows automation | Time limitation and potential flakiness |
| Responsive / mobile layout | Not a stated requirement of the application |
| all API tests in Playwright | Simplicity of testing API in Postman | 
| Multi-user / concurrent sessions | Single-user app by design (one hardcoded test account) |
| Modular Page Object Model (POM) for Playwright | Time limitation |
| Direct database container tests with use of PostgreSQL | Time limitation | 

---

