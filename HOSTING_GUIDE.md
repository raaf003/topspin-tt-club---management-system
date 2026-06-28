# Hosting Guide

This project is prepared for hosting on **Render** (Backend) and **Vercel** (Frontend).

## Backend (Render)

1. **Build Command:** `npm install && npm run build`
2. **Start Command:** `npm start`
3. **Environment Variables:**
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A secure random string for signing JWT tokens.
   - `FRONTEND_URL`: The URL of your hosted frontend (e.g., `https://your-app.vercel.app`). This is used for CORS.
   - `PORT`: Usually set by Render (defaults to `5000` if not set).

## Frontend (Vercel)

1. **Framework Preset:** Vite
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. **Environment Variables:**
   - `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend.onrender.com/api`).
   - `VITE_SOCKET_URL`: Your backend base URL (e.g., `https://your-backend.onrender.com`).

---

### Local Development

1. Copy `backend/.env.example` to `backend/.env` and fill in the values.
2. Copy `frontend/.env.example` to `frontend/.env` and fill in the values.
