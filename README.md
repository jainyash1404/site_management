# Construction Manager

- `client/` – React + TypeScript + Vite + Tailwind frontend
- `server/` – Express + TypeScript + MongoDB (Mongoose) backend
- `mock-server/` – optional fake API (in-memory) to try the UI without a database

Both `server/.env` and `client/.env` are already filled in for running on your own computer.

## Run on your computer
Needs Node.js 20+ and MongoDB (install MongoDB Community locally, **or** make a free MongoDB Atlas cluster and paste its
connection string into `MONGODB_URI` in `server/.env`).

```
npm run setup     # installs everything (once)
npm run seed      # creates the owner login + default categories (once)
npm run dev       # starts API on :5000 and website on :5173
```
Open http://localhost:5173. The owner login is `ADMIN_PHONE` / `ADMIN_PASSWORD` from `server/.env`
(change the phone to the real number **before** `npm run seed`).

## How accounts work
- **Owner/Admin:** created by `npm run seed`. Forgot the admin password? Put a new `ADMIN_PASSWORD` in `server/.env` and run `npm run reset-admin`.
- **Workers:** the owner adds them in *Workers*, or a worker uses **Sign up** on the home page. Sign-ups cannot log in until the owner
  clicks *Activate* in Workers (a banner on the dashboard shows pending requests).
- **Forgot password:** from the home page or login page. If the worker gave an email and SMTP is set in `.env`, a reset link is emailed.
  Without SMTP the link is printed in the server console. The owner also sees "Password reset requested" in Workers and can type a new password in *Edit*.

## Receipts
Leave the Cloudinary values empty to store photos on this computer (`server/uploads`, shown via expiring signed links).
For a real deployment fill in the 3 Cloudinary values, otherwise photos disappear when the host's disk resets.

## Deploy
- **API** (Render, Railway…): build `npm install && npm run build`, start `npm start`, in the `server` folder. Set all variables from `server/.env`
  on the host (do not upload the `.env` file). Use a **new** `JWT_SECRET`, Atlas for `MONGODB_URI`, `NODE_ENV=production`,
  `CORS_ORIGINS` and `APP_URL` = your website address, `PUBLIC_URL` = your API address, plus Cloudinary and SMTP.
- **Website** (Vercel, Netlify…): build `npm run build` in `client`, publish `dist/`, set `VITE_API_BASE_URL=https://<your-api>/api/v1`,
  and rewrite all paths to `/index.html` (single-page app).

## Tests
`cd server && MONGODB_URI=mongodb://127.0.0.1:27017/construction_test npm test` – uses a real MongoDB and wipes that test database.

## Security notes
`.env` contains secrets: never share it or commit it (`.gitignore` already excludes it).
