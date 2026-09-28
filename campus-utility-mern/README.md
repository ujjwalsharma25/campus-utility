# MIET Campus Utility App — MERN, v2 (auth + payments + dashboards)

Full college-ready build: role-based login, food/print ordering with a Cash-or-UPI payment
choice, named queue tokens, and real dashboards with spend history for students and both kinds
of staff.

## What's new in this version

1. **Login/signup is the front door.** Nobody sees any panel until they sign in. Three roles:
   `student`, `canteen_owner`, `stationary_admin`. Each role only ever sees its own tabs.
2. **Payment mode on every order** — `Online` or `Cash`, no payment gateway or paid API used
   anywhere:
   - **Online**: the full bill is payable now through a free `upi://pay` deep link — tapping it
     opens whatever UPI app (GPay/PhonePe/Paytm/BHIM) the student already has installed,
     pre-filled with the amount. They just enter their PIN.
   - **Cash**: a ₹10 booking fee is payable the same way right now (so a token can't be reserved
     and abandoned), and the rest of the bill is paid in cash when the order is collected at the
     counter.
   - There is **no server-side payment verification** — that would require a paid gateway/webhook.
     Staff glance at the student's UPI success screen at handover, the same way a small shop does.
3. **The token shows the student's name**, not just a number.
4. **Student dashboard**: total spend, month-by-month spend bar chart, and a full order history
   list (status, payment mode, amount) — the "PhonePe-style" history you asked for.
5. **Owner dashboard** (separate data for canteen vs. stationary): today's revenue, this month's
   revenue, a daily revenue chart, active queue size, and a scrollable history of delivered
   orders with who ordered what and how they paid.
6. **Manage Menu** stays canteen-owner-only, now enforced by the backend, not just hidden in the UI.

## Project layout

```
campus-utility-mern/
├── backend/
│   ├── db.js                       Mongoose connection
│   ├── seed.js                       Seeds canteens, starter menu, demo staff logins
│   ├── server.js                       Express app entrypoint
│   ├── middleware/
│   │   └── auth.js                       requireAuth (JWT) + requireRole(...roles)
│   ├── models/
│   │   ├── User.js                        name, role, roll_no (students), phone, password (hashed), order_count
│   │   ├── Canteen.js                      name, is_open
│   │   ├── MenuItem.js                      canteen_id, item_name, price, is_available
│   │   ├── Order.js                          + payment_mode, advance_fee, amount_due_online/at_counter
│   │   └── PrintJob.js                        order_id, filename, pages, print_type
│   └── routes/
│       ├── auth.js                    POST /signup, POST /login, GET /me
│       ├── users.js                     GET /:id (profile lookup)
│       ├── canteens.js                    List + open/close toggle (owner only)
│       ├── menu.js                          Menu CRUD (owner only for writes)
│       ├── orders.js                          Create (transaction), FIFO queue, status flow, history
│       ├── leaderboard.js                       Top 4 students by order_count
│       └── analytics.js                           Owner revenue dashboard
└── frontend/
    └── src/
        ├── api.js                    Axios client - attaches JWT, handles 401s
        ├── context/AuthContext.jsx     Login/signup/logout state, persisted to localStorage
        ├── utils/upi.js                 Builds the free upi://pay deep link
        ├── App.jsx                       Auth gate + role-based tab routing
        └── components/
            ├── AuthPage.jsx                Login/signup, with a role picker
            ├── Navbar.jsx                    Role-aware tabs + logout
            ├── StudentPanel.jsx                Menu grid, cart, print upload, payment mode picker
            ├── StudentHistory.jsx                Student dashboard: spend + full history
            ├── CanteenPanel.jsx                    Live kitchen board
            ├── StationaryPanel.jsx                   Print job queue
            ├── ManageMenuPanel.jsx                     Add/edit/remove dishes (owner only)
            ├── OwnerDashboard.jsx                        Revenue dashboard (shared by both owner roles)
            ├── Leaderboard.jsx
            ├── Receipt.jsx                                 Digital coupon + "Pay via UPI" button
            └── TokenCard3D.jsx                               Pointer-driven 3D tilt card
```

## 1. Database setup (MongoDB)

`POST /api/orders` uses a Mongo **transaction**, which needs a replica set:

- **MongoDB Atlas** (free tier): already a replica set, just copy the connection string.
- **Local MongoDB**:
  ```bash
  mongod --dbpath /path/to/data --replSet rs0
  # in a second terminal, once:
  mongosh --eval "rs.initiate()"
  ```

## 2. Backend setup

```bash
cd backend
cp .env.example .env
# set MONGO_URI, a long random JWT_SECRET, and PAYEE_VPA/PAYEE_NAME to your college's real UPI ID
npm install
npm run seed     # creates canteens, starter menu, and two demo staff logins:
                  #   canteen_owner  -> phone 9000000001 / password canteen123
                  #   stationary_admin -> phone 9000000002 / password stationary123
npm run dev
```

Students don't need seeding — they sign up themselves from the app.

### Endpoints

| Method | Path                              | Auth                          | Purpose                                    |
|--------|------------------------------------|--------------------------------|----------------------------------------------|
| POST   | `/api/auth/signup`                   | —                                | Create a student or staff account            |
| POST   | `/api/auth/login`                      | —                                  | Log in, returns a JWT                          |
| GET    | `/api/auth/me`                           | any                                  | Current profile (for page refresh)              |
| GET    | `/api/canteens`                            | any                                    | List canteens/shops                              |
| PUT    | `/api/canteens/:id/toggle`                   | canteen_owner                          | Open/close a counter                              |
| GET    | `/api/menu/:canteenId`                         | any                                       | Menu for one canteen                               |
| POST/PUT/DELETE `/api/menu*`                     | canteen_owner                              | Manage Menu (add/edit/remove/toggle)                |
| POST   | `/api/orders`                                      | student                                      | Create an order (transaction, needs payment_mode)    |
| GET    | `/api/orders`                                        | canteen_owner / stationary_admin               | FIFO queue for that role's own order type              |
| GET    | `/api/orders/history/:userId`                          | student (own id only)                            | Full history + total/monthly spend                       |
| PUT    | `/api/orders/:id/status`                                 | matching staff role                                | Advance status one step (atomic)                            |
| GET    | `/api/leaderboard`                                         | any                                                   | Top 4 students by order_count                                 |
| GET    | `/api/analytics/summary`                                     | canteen_owner / stationary_admin                        | Revenue dashboard for that role                                 |

## 3. Frontend setup

```bash
cd frontend
cp .env.example .env    # set VITE_PAYEE_VPA / VITE_PAYEE_NAME to your college's real UPI ID
npm install
npm run dev
```

Vite proxies every `/api/*` call to the backend on port 5000.

## Photo upload for menu / shop items

- **Canteen owner** -> *Manage menu* tab, **Stationary admin** -> *Manage items* tab. Both can add an item
  with a photo, change the photo later, edit the price, mark out of stock, or remove it.
- Photos are saved on the server's local disk in `backend/uploads/` and served from `/uploads/...`.
  No paid image/CDN/cloud API is used. Limits: JPEG/PNG/WEBP, max 3 MB each.
- The backend stops a canteen owner from touching stationary items and vice versa (`assertOwnsCanteen`
  in `routes/menu.js`), even if someone calls the API directly.
- Students see dish photos in the Canteen grid, and the stationary shop's items (read-only, with photos)
  under the Print tab. **Note:** shop items are a price list only - students cannot add them to a cart or
  pay for them in the app; they are bought at the counter. Only food and print jobs go through the token flow.
- Back up `backend/uploads/` if you move the server - the photos are files, not database records.

## UPI app chooser

The pay button opens a `upi://pay` link. If the phone has more than one UPI app (GPay + PhonePe + Paytm),
Android/iOS itself shows an "Open with..." chooser; with only one UPI app it opens directly. The app can't
pre-select a specific one.

## Payment confirmation (v4)

Nothing is sent to the server until the student confirms payment: "Continue to payment" opens a popup with
the UPI button, the UPI ID (with Copy button, for Fam or any UPI app) and a field for the 12-digit UPI
reference (UTR). The order (and token) is created only after that reference is entered. A reference can't
be reused on a second order. The queue cards show the paid amount, the reference and any cash to collect.
Without a payment gateway the app cannot verify a payment itself - staff should match the reference in
their own UPI app. Only the frontend `.env` needs the UPI ID (`VITE_PAYEE_VPA`).

## New-order voice alerts (v4)

Canteen and stationary staff screens have a "Turn on alerts" bar. After one click (browsers require it),
every new order plays a chime and is read out, e.g. "New order, token F 003, from Ujjwal. 2 Burger, 1 Tea.
Payment done online, 70 rupees." or "...Cash order. Collect 15 rupees at the counter." A system
notification is also shown where the browser allows it (https or localhost only). Alerts work while the
tab is open; background tabs can be delayed, so keep the tab in front on the counter device.

## How the ₹10 cash advance works

Choosing **Cash** at checkout still opens a UPI deep link for exactly ₹10 (`advance_fee` on the
order). The remaining bill (`amount_due_at_counter`) is paid in cash on pickup. Choosing
**Online** opens a UPI deep link for the full bill and nothing is due at the counter. Both figures
are computed server-side in `routes/orders.js` (`CASH_ADVANCE_FEE = 10`) and returned on every
order, so the receipt and the dashboards always agree.

## Status flow & security

`Pending → Preparing → Ready → Delivered`, one step at a time, enforced by:
- the Mongoose `enum` on `order_status`,
- a server-side check that a `canteen_owner` can only touch `Food` orders and a
  `stationary_admin` only `Print` orders,
- an atomic `findOneAndUpdate` keyed on the *current* status so two staff tapping the same token
  at once can't double-advance it.

Every route except `/api/auth/*` requires a valid JWT (`requireAuth`), and role-specific routes
also run `requireRole(...)` — a student's token can't call the Manage Menu or status-update
endpoints even by hitting the API directly.

## Design notes

Same midnight-indigo/marigold/teal language as before, now carried through the new Auth page,
dashboards, and payment picker. Every menu tile, queue token, and dashboard card keeps the
pointer-driven 3D tilt (`TokenCard3D.jsx`); dashboards add gradient stat cards and a lightweight
CSS bar chart (no charting library needed) for the spend/revenue history.

---

## Deploy on Render (one link, free)

The backend serves the built frontend, so the whole app lives on a single URL.

1. **Atlas**: create a free cluster -> Database Access (user + password) -> Network Access -> add `0.0.0.0/0`. Copy the connection string and add the DB name, e.g. `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/campus_utility`.
2. **Seed once (from your PC)**: put that Atlas string as `MONGO_URI` in `backend/.env`, then `cd backend && npm install && npm run seed`.
3. **GitHub**: push this whole folder to a new repo (`.env` files are git-ignored).
4. **Render**: New + -> Blueprint (uses `render.yaml`) -> pick the repo -> paste `MONGO_URI` when asked -> Apply. First build takes a few minutes.
   Or manually: New Web Service, Build Command `npm run build`, Start Command `npm start`, and add the env vars listed in `render.yaml`.
5. Open the `https://<name>.onrender.com` link. Check `/api/health` shows `"db": "connected"`.

Notes:
- `VITE_*` variables are baked in at build time; change them and redeploy.
- Free Render sleeps after ~15 min idle (first open is slow) and its disk is temporary, so uploaded photos vanish on restart. Use Cloudinary or similar for real use.
- Change the seeded staff passwords after first login.
