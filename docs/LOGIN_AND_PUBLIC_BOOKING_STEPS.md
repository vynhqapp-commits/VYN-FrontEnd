# Frontend: Login & Public Booking Steps

Use this guide to test **login** (dashboard, customer, admin) and **public booking** (no account) after seeding the backend.

---

## Prerequisites

1. **Backend**
   - From `salon-saas-backend`: run `php artisan migrate` then `php artisan db:seed`.
   - Start API: `php artisan serve` (default: http://localhost:8000).

2. **Frontend**
   - From `salon-saas-frontend`: set `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
   - Start app: `npm run dev`.

3. **Seeded accounts** (all password: `password`)

   | Role         | Email                  | Use case              |
   |-------------|------------------------|------------------------|
   | Admin       | admin@platform.com    | Admin panel            |
   | Salon Owner | owner@demosalon.com   | Salon dashboard        |
   | Staff       | staff1@demosalon.com   | Salon dashboard        |
   | Customer    | customer@example.com  | My Bookings (customer) |

---

## 1. Login steps

### 1.1 Salon dashboard (Owner / Staff)

1. Open the app (e.g. http://localhost:3000).
2. Go to **Login** (e.g. `/login` or the login link).
3. Enter:
   - **Email:** `owner@demosalon.com` (or `staff1@demosalon.com`).
   - **Password:** `password`.
4. Click **Log in**.
5. You should be redirected to the **dashboard** (e.g. `/dashboard`) and see salon data (locations, appointments, etc.).

### 1.2 Customer area (My Bookings)

1. Open the app and go to **Login**.
2. Enter:
   - **Email:** `customer@example.com`
   - **Password:** `password`
3. Click **Log in**.
4. You should be redirected to **My Bookings** (e.g. `/my-bookings`) and see the seeded appointments for that customer.

### 1.3 Admin panel

1. Go to **Login**.
2. Enter:
   - **Email:** `admin@platform.com`
   - **Password:** `password`
3. Click **Log in**.
4. You should be redirected to the **Admin** area (e.g. `/admin`) and see tenants and platform management.

### 1.4 Login with OTP (optional)

1. On the login page, enter **Email** only (e.g. `customer@example.com`).
2. Click **Send OTP**.
3. Check backend logs for the 6-digit OTP (or use a mail driver in production).
4. You are redirected to the verify-OTP page; enter the **code** and submit.
5. You should be logged in and redirected by role as above.

---

## 2. Public booking steps (no login)

Public booking lets a guest choose a salon, location, service, time slot, and submit their name/contact. No account is required.

### 2.1 Open the booking flow

1. From the home page, go to **Book** (e.g. `/book`).
2. You should see a list of **salons** (e.g. “Demo Salon” after seeding).

### 2.2 Choose salon and location

1. Click the **Demo Salon** card (or the seeded salon name).
2. The next screen shows:
   - **Locations** (e.g. “Main Branch”).
   - **Services** (e.g. Haircut, Manicure, etc.).
3. Select:
   - **Location:** e.g. “Main Branch”.
   - **Service:** e.g. “Haircut”.
   - **Date:** pick a future date (e.g. tomorrow).

### 2.3 Get time slots

1. After selecting location, service, and date, the app fetches **availability** (e.g. from `/api/public/availability`).
2. A list of **time slots** appears (e.g. 09:00, 09:30, 10:00…).
3. Click one slot to select it (e.g. 10:00–10:30).

### 2.4 Enter guest details and confirm

1. Fill in:
   - **Name** (required): e.g. “John Guest”.
   - **Phone** (optional): e.g. “+15551234567”.
   - **Email** (optional): e.g. “john@example.com”.
2. Click **Confirm booking** (or equivalent).
3. The app sends a **book** request (e.g. `POST /api/public/book`) with:
   - `tenant_id`, `location_id`, `service_id`, `start_at`, `client_name`, `client_phone`, `client_email`.
4. You should see a **success** message and a confirmation (e.g. appointment id or “Booking confirmed”).

### 2.5 Verify in dashboard (optional)

1. Log in as **Salon Owner** or **Staff** (`owner@demosalon.com` / `password`).
2. Open **Appointments** (or calendar) in the dashboard.
3. You should see the new appointment for “John Guest” at the chosen time.

---

## 3. Quick checklist

- [ ] Backend migrated and seeded; `php artisan serve` running.
- [ ] Frontend `NEXT_PUBLIC_API_URL` points to backend (e.g. http://localhost:8000).
- [ ] **Login (Owner):** owner@demosalon.com → redirect to dashboard.
- [ ] **Login (Customer):** customer@example.com → redirect to My Bookings; appointments visible.
- [ ] **Login (Admin):** admin@platform.com → redirect to admin panel.
- [ ] **Public book:** /book → choose salon → location, service, date → pick slot → enter name/phone/email → confirm → success.
- [ ] New public booking appears in dashboard appointments when logged in as salon.

---

## 4. Troubleshooting

| Issue | Check |
|-------|--------|
| “Cannot reach the server” | Backend running at `NEXT_PUBLIC_API_URL`; CORS allows the frontend origin. |
| Login returns 401 | Email/password correct; user exists and has `role` set (run seed again if needed). |
| Dashboard empty or 403 | User has `tenant_id` (owner/staff); frontend sends `X-Tenant-ID` (set automatically after login). |
| Public book: no salons | Run `php artisan db:seed`; tenant has `is_active = true`. |
| Public book: no slots | Branch has at least one **staff**; service exists and is active; date is in the future. |
| Customer “My Bookings” empty | Customer user must have a **customer** record with `user_id` = that user (seeder does this for customer@example.com). |
