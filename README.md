# Genie Sevai — Admin panel & professional portal

The operations panel for **Genie Sevai** staff, and the portal where professionals (employees) work their jobs. It works with the [API](https://github.com/iamselva3/genie-sevai-backend) and the [customer web app](https://github.com/iamselva3/genie-sevai-frontend). The end-to-end tests for all three live in the web app repo, under `e2e/`.

Stack: React 18, Vite, Tailwind CSS v4, TanStack Query and React Router.

```bash
npm install
npm run dev       # http://localhost:5274
npm run build     # type-check + production build to dist/
npm run preview   # serve dist/ on :5274
```

Set `VITE_API_URL` (see `.env.example`) when the API is not on `http://localhost:5100/api/v1`.

## Sign in

- **Team** tab:
  - `admin@sevai.in` / `Admin@12345` (admin)
  - `ops@sevai.in` / `Ops@12345` (manager, no Staff page)
- **Professional** tab: a professional's phone number and password. Seeded pros use `Pro@12345`, for example `9000000001`.

## What staff can do

- **Control what customers see.**
  - Each service is **Live**, **Unavailable** (shown with a reason, can't be booked) or **Hidden**, and can be limited to certain cities.
  - Each category has a "Visible on site" switch. Cities can be turned on or off.
- **Assign professionals (employees) to bookings.** Only eligible pros are offered: same city, trained for the category, and free at that time. Busy pros show the clashing booking. Staff can also reassign, unassign, move a booking through its statuses, reschedule and cancel.
- **Manage the rest:** professionals, customers (block or unblock), coupons, reviews (hide), enquiries, professional applications (turn one into a professional) and staff accounts (admins only).
- **Home page banners:** create, edit, reorder, schedule and switch off the offer banners customers see. Each banner has a colour, text, a photo (resized in the browser to WebP, at most 1600 px wide, before upload) or a built-in illustration, a target (service, category, coupon or link) and optional cities. A live preview shows the banner while you edit.
- **Dashboard:** today's numbers, a 7-day chart, and bookings that still need a professional.

Professionals see only **My jobs**. They mark "On the way", start the job with the customer's 4-digit PIN, then mark it completed.

Black, white and yellow only, with no gradients. Confirmations use in-page dialogs, never browser pop-ups.
