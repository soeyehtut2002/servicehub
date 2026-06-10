#  ServiceHub — Local Services Marketplace

ServiceHub is a full-stack web marketplace that connects **customers** with local **service providers**. Customers can discover, book, and review services; providers manage their listings, schedules, and earnings; and administrators oversee the entire platform through a dedicated dashboard.

---

##  Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [How It Works](#-how-it-works)
- [API Routes](#-api-routes)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Default Admin Account](#-default-admin-account)

---

##  Features

###  Authentication & Users
- JWT-based login / registration with role selection (`customer`, `provider`)
- Password reset via email (Nodemailer token flow)
- Profile management with avatar upload (Multer)
- Account types: `freelancer` or `business`

###  Service Discovery
- Browse and search all listed services with category filters
- Autocomplete search bar with live suggestions
- Service detail page with photos, description, pricing, review and ratings

###  Booking System
- Customers book services by selecting available time slots
- Providers define weekly schedules and block specific dates
- Capacity management — multiple teams can run parallel bookings
- Booking statuses: `pending → confirmed → completed / cancelled`
- Cancellation tracking with reason, timestamp, and who cancelled

### 💬 Real-Time Chat
- WebSocket-powered messaging via **Socket.io**
- Private 1-to-1 conversations between customers and providers
- Online presence indicators (green dot)
- Unread message count badges
- Persisted message history in PostgreSQL

###  In-App Notifications
- Real-time push notifications for booking events (confirmed, cancelled, completed)
- Notification bell with unread count in the Navbar
- Mark individual or all notifications as read

###  Reviews & Ratings
- Customers leave star ratings + text reviews after a completed booking
- Admin can flag/unflag inappropriate reviews
- Average rating displayed on every service card

###  Admin Dashboard
- Platform-wide statistics (users, bookings, revenue)
- Manage all users (activate / deactivate)
- View and manage all bookings and services
- Flag reviews for policy violations

### Provider Tools
- Provider dashboard with booking inbox and earnings overview
- Schedule management — set working hours per day of week
- Block holidays and leave dates
- Manage service listings (create, edit, toggle availability)
- View detailed booking history and chat with customers

---

## Tech Stack

### Backend
| Technology | Role |
|---|---|
| **Node.js** | Runtime environment |
| **Express.js** | REST API framework |
| **PostgreSQL** | Relational database |
| **Socket.io** | WebSocket server for real-time features |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **bcrypt** | Password hashing |
| **Multer** | File / image uploads |
| **Nodemailer** | Transactional emails (password reset) |
| **express-validator** | Input validation |
| **dotenv** | Environment configuration |

### Frontend
| Technology | Role |
|---|---|
| **React 19** | UI library |
| **Vite** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client for REST calls |
| **Socket.io-client** | WebSocket client for real-time chat & notifications |
| **react-hot-toast** | Toast notification system |
| **Vanilla CSS** | Custom design system (light blue & white palette) |

---

##  Project Structure

```
service-hub-projects/
│
├── backend/                    # Express API
│   ├── config/
│   │   └── db.js               # PostgreSQL connection pool
│   ├── controllers/            # Business logic handlers
│   ├── db/
│   │   └── schema.sql          # Full database schema + seed
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   ├── routes/                 # Route definitions
│   │   ├── authRoutes.js
│   │   ├── serviceRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── providerRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── timeSlotRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── scheduleRoutes.js
│   ├── services/
│   │   ├── notificationService.js   # Emit real-time notifications
│   │   └── socketState.js           # Shared Socket.io state
│   ├── uploads/                # Uploaded images (served statically)
│   ├── server.js               # Entry point — Express + Socket.io
│   ├── verify.js               # JWT debug utility
│   └── package.json
│
├── frontend/                   # React SPA
│   ├── public/
│   └── src/
│       ├── api/                # Axios instance & API helpers
│       ├── assets/             # Static images / icons
│       ├── components/         # Reusable UI components
│       │   ├── Navbar.jsx
│       │   ├── ServiceCard.jsx
│       │   ├── BookingModal.jsx
│       │   ├── ReviewForm.jsx
│       │   ├── NotificationBell.jsx
│       │   ├── SearchAutocomplete.jsx
│       │   ├── StarRating.jsx
│       │   ├── StatusBadge.jsx
│       │   └── ProtectedRoute.jsx
│       ├── context/
│       │   ├── AuthContext.jsx     # Global auth state
│       │   └── SocketContext.jsx   # Socket.io connection context
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Services.jsx
│       │   ├── ServiceDetail.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── ResetPassword.jsx
│       │   ├── CustomerDashboard.jsx
│       │   ├── ProviderDashboard.jsx
│       │   ├── ProviderSchedulePage.jsx
│       │   ├── AdminDashboard.jsx
│       │   ├── ProfilePage.jsx
│       │   └── ChatPage.jsx
│       ├── utils/              # Helper functions
│       ├── App.jsx             # Root component + routing
│       ├── main.jsx            # React entry point
│       └── index.css           # Global design system
│
├── migrate.js                  # Safe incremental DB migrations
├── setup-db.js                 # First-time DB creation + schema
├── reset-admin.js              # Reset admin account credentials
└── package.json                # Root workspace config
```

---

##  Database Schema

The PostgreSQL database contains the following core tables:

| Table | Description |
|---|---|
| `users` | All platform users (customer, provider, admin) |
| `services` | Service listings created by providers |
| `bookings` | Booking records linking customers ↔ services |
| `reviews` | Star ratings and text reviews on completed bookings |
| `messages` | Persisted 1-to-1 chat messages |
| `notifications` | In-app notification records per user |
| `time_slots` | Available booking slots per service |
| `service_schedules` | Per-service weekly availability (day + hours) |
| `service_blocked_dates` | Dates a provider is unavailable |

---

## ⚙️ How It Works

### Authentication Flow
1. User registers with email, password, name, and role.
2. Password is hashed with **bcrypt** before storage.
3. On login, the server issues a signed **JWT** (expires in 7 days).
4. The React app stores the token in `localStorage` via `AuthContext`.
5. Every API request includes the token in the `Authorization: Bearer <token>` header.
6. Protected routes on the frontend use `ProtectedRoute` to check the role claim in the JWT.

### Real-Time Communication (Socket.io)
1. On login, `SocketContext` opens a persistent WebSocket connection, authenticating via the JWT passed in `socket.handshake.auth`.
2. The server maintains an `onlineUsers` Map (`userId → socketId`).
3. **Chat:** When a user sends a message, the server saves it to PostgreSQL and immediately emits `receive_message` to the recipient's socket if they are online.
4. **Notifications:** `notificationService` creates a `notifications` row in the DB and simultaneously emits `new_notification` to the target user's socket so the bell updates in real time.

### Booking & Availability Flow
1. Provider sets weekly working hours via `service_schedules`.
2. Provider can block specific dates in `service_blocked_dates`.
3. Provider (or the system) generates `time_slots` for each working day with capacity constraints (`max_capacity`, `booked_count`).
4. Customer selects an open slot in `BookingModal`; a booking record is created and the slot's `booked_count` is incremented.
5. When `booked_count >= max_capacity`, the slot is marked `is_booked = TRUE` and hidden from customers.

### File Uploads
- Provider profile photos and service images are uploaded via **Multer**.
- Files are stored on disk under `backend/uploads/`.
- The backend serves the `uploads/` folder as a static directory at `/uploads`.

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and receive JWT |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/services` | List all services (with filters) |
| GET | `/api/services/:id` | Get single service details |
| POST | `/api/services` | Create a service (provider) |
| PUT | `/api/services/:id` | Update a service (provider) |
| GET | `/api/bookings` | Get user's bookings |
| POST | `/api/bookings` | Create a booking |
| PUT | `/api/bookings/:id/status` | Update booking status |
| GET | `/api/reviews/:serviceId` | Get reviews for a service |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/messages/:userId` | Get conversation history |
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/read-all` | Mark all notifications read |
| GET | `/api/slots/:serviceId` | Get time slots for a service |
| POST | `/api/slots` | Create time slots (provider) |
| GET | `/api/schedule/:serviceId` | Get weekly schedule |
| PUT | `/api/schedule/:serviceId` | Update weekly schedule |
| GET | `/api/profile` | Get current user profile |
| PUT | `/api/profile` | Update profile (with image upload) |
| GET | `/api/admin/stats` | Platform statistics (admin) |
| GET | `/api/admin/users` | All users (admin) |
| GET | `/api/admin/bookings` | All bookings (admin) |

---

##  Getting Started

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** v14+
- **npm** v9+

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd service-hub-projects
```

### 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and JWT secret
```

### 3. Set up the database
```bash
# From the project root:
node setup-db.js
```

### 4. Run migrations (for existing databases)
```bash
node migrate.js
```

### 5. Start the backend
```bash
cd backend
npm install
npm run dev
# API runs on http://localhost:5000
```

### 6. Start the frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

---

##  Environment Variables

Create `backend/.env` with the following:

```env
# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/servicehub

# JWT
JWT_SECRET=your_super_secret_key_here

# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# Email (for password reset)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

##  Default Admin Account

After running `node setup-db.js`, an admin account is seeded automatically:

| Field | Value |
|---|---|
| **Email** | `admin@servicehub.com` |
| **Password** | `admin123` |

>  Change this password immediately after first login in a production environment.

To reset the admin credentials at any time:
```bash
node reset-admin.js
```

---

## 📄 License

This project was built as a Final Year Project for Lithan Educlaas. All rights reserved.
