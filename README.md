# CSRM Frontend (React + Vite)

## Run
    npm install
    npm run dev        # http://localhost:5173

## Config
Backend URL is set in `.env` (VITE_API_URL, default http://localhost:8080).

## Expected API
POST /api/auth/register, POST /api/auth/login -> {token, role, username, id}
GET/POST/PUT/DELETE /api/resources
GET /api/bookings?resourceId&date, GET /api/bookings/my, POST/PUT/DELETE /api/bookings/{id}
GET /api/admin/users, PUT /api/admin/users/{id}, GET /api/admin/stats
GET /api/audit?userId&date, POST /api/services
