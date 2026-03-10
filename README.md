# Smart Cafe Backend

Node.js/Express.js backend API for the Smart Cafe application.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Security**: Helmet, CORS, Rate Limiting

## Features

- ✅ JWT-based authentication with OTP password reset
- ✅ Role-Based Access Control (RBAC) with 6 roles
- ✅ User management with status control
- ✅ Menu and menu item management
- ✅ Slot-based booking system
- ✅ Dashboard APIs for each role
- ✅ System settings management
- ✅ Comprehensive Jest test suite
- ✅ **Continuous Integration (GitHub Actions)**: Automated testing suite on every push and pull request with embedded MongoDB service.
- ✅ **Optimized Containerization (Docker)**: Multi-stage, production-ready `Dockerfile` optimized for speed and cold-start performance.
- ✅ **Clean Codebase**: Fully standardized UTF-8 configuration files (such as `.gitignore`), guaranteeing no ghost-tracked `node_modules`.

## User Roles

| Role | Description |
|------|-------------|
| `user` | Students booking meals |
| `canteen_staff` | Staff managing queues |
| `kitchen_staff` | Staff preparing food |
| `counter_staff` | Staff serving food |
| `manager` | Manages operations |
| `admin` | Full system access |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Running

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Database Seeding

```bash
# Seed with sample data
npm run seed
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/send-otp` | Request password reset OTP |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| PATCH | `/api/users/:id/role` | Update role |
| PATCH | `/api/users/:id/status` | Suspend/activate |

### Menus & Menu Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menus` | List menus |
| POST | `/api/menus` | Create menu |
| GET | `/api/menu-items` | List items |
| POST | `/api/menu-items` | Create item |
| PATCH | `/api/menu-items/:id/toggle` | Toggle availability |

### Slots & Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/slots/today` | Today's slots |
| POST | `/api/slots` | Create slot |
| GET | `/api/bookings/my` | My bookings |
| POST | `/api/bookings` | Create booking |
| POST | `/api/bookings/:id/cancel` | Cancel |
| POST | `/api/bookings/:id/complete` | Complete (staff) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/admin` | Admin stats |
| GET | `/api/dashboard/manager` | Manager stats |
| GET | `/api/dashboard/staff` | Staff stats |
| GET | `/api/dashboard/student` | Student stats |

## Project Structure

```
src/
├── config/         # Configuration (database, JWT)
├── controllers/    # Route handlers
├── middlewares/    # Auth, RBAC, validation, errors
├── models/         # Mongoose schemas
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Helpers, errors, responses
├── validations/    # Joi schemas
├── tests/          # Jest tests
├── scripts/        # Seeding scripts
├── app.js          # Express app
└── server.js       # Server entry
```

## Test Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartcafe.com | admin123 |
| Manager | manager@smartcafe.com | manager123 |
| Staff | canteen@smartcafe.com | staff123 |
| Student | student@college.edu | student123 |

## License

MIT
