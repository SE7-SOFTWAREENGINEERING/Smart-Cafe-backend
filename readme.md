# Cafeteria Booking System - Backend API (Step 1 - Mocked Data)

## 📋 Overview
This is a mocked API for the Smart Pre-Booking & Token System. All endpoints return static JSON responses for testing and frontend development.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## 📍 API Endpoints

### Health Check
- **GET** `/health` - Check if server is running

---

### 🎫 Booking Routes (`/api/bookings`)

#### Create Booking (User Story 1)
- **POST** `/api/bookings/create`
- Creates a 15-minute meal slot booking
- **Response**: Booking confirmation with ID and slot details

#### Cancel Booking (User Story 4)
- **PUT** `/api/bookings/:bookingId/cancel`
- Cancels a booking (must be done 30+ minutes before slot)
- **Response**: Cancellation confirmation

#### Reschedule Booking (User Story 4)
- **PUT** `/api/bookings/:bookingId/reschedule`
- Reschedules to a different time slot
- **Response**: Updated booking details

#### Get Student Bookings
- **GET** `/api/bookings/student/:studentId`
- Retrieves all bookings for a student
- **Response**: Array of booking objects

---

### 🎟️ Token Routes (`/api/tokens`)

#### Generate Token (User Story 2)
- **POST** `/api/tokens/generate`
- Generates a digital QR code token for confirmed booking
- **Response**: Token with QR code data

#### Validate Token (User Story 3)
- **POST** `/api/tokens/validate`
- Staff endpoint to validate scanned tokens
- **Body**: `{ "tokenId": "TKN-001", "scannedBy": "STAFF-001" }`
- **Response**: Validation result with student info

#### Get Token Details
- **GET** `/api/tokens/:tokenId`
- Retrieves token information
- **Response**: Token details including QR code

---

### 📅 Slot Routes (`/api/slots`)

#### Get Available Slots (User Story 6)
- **GET** `/api/slots/available?date=2024-01-31&startTime=12:00PM&endTime=2:00PM`
- Shows remaining slots for specific time period
- **Response**: Array of slots with capacity info

#### Get Slot Capacity (User Story 5)
- **GET** `/api/slots/:slotId/capacity`
- Gets current capacity for a specific slot
- **Response**: Capacity details and utilization

#### Release No-Show Slots (User Story 9)
- **POST** `/api/slots/:slotId/release-no-show`
- Automatically releases no-show slots after 5 minutes
- **Response**: Number of released slots

#### Get Slots by Date
- **GET** `/api/slots/date/:date`
- Gets all slots for a specific date
- **Response**: Complete slot schedule

---

### 👨‍💼 Admin Routes (`/api/admin`)

#### Create Priority Slot (User Story 7)
- **POST** `/api/admin/priority-slots/create`
- Sets priority slots for students with disabilities or tight schedules
- **Response**: Priority slot configuration

#### Get Priority Slots
- **GET** `/api/admin/priority-slots`
- Lists all priority slots
- **Response**: Array of priority slot configs

#### Update Priority Slot
- **PUT** `/api/admin/priority-slots/:prioritySlotId`
- Updates priority slot settings
- **Response**: Updated configuration

#### Delete Priority Slot
- **DELETE** `/api/admin/priority-slots/:prioritySlotId`
- Removes a priority slot
- **Response**: Deletion confirmation

#### Configure Capacity (User Story 5)
- **POST** `/api/admin/capacity/configure`
- Sets cafeteria capacity limits
- **Response**: Capacity configuration

#### Get Capacity Config
- **GET** `/api/admin/capacity/config`
- Retrieves current capacity settings
- **Response**: Capacity configuration

#### Get Dashboard Stats
- **GET** `/api/admin/dashboard/stats`
- Admin dashboard statistics
- **Response**: Booking stats, utilization rates, etc.

---

### 👷 Staff Routes (`/api/staff`)

#### Scan Token (User Story 3)
- **POST** `/api/staff/scan-token`
- Scans and validates student token at entrance
- **Body**: `{ "tokenId": "TKN-001", "staffId": "STAFF-001" }`
- **Response**: Validation result

#### Issue Walk-in Token (User Story 10)
- **POST** `/api/staff/walk-in/issue-token`
- Issues manual token for walk-in students
- **Body**: `{ "studentId": "STU-001", "slotId": "SLOT-001", "issuedBy": "STAFF-001" }`
- **Response**: Walk-in token with QR code

#### Check Walk-in Availability
- **GET** `/api/staff/walk-in/check-availability?slotId=SLOT-001`
- Checks if walk-in is available for current slot
- **Response**: Availability status

#### Get Current Slot Status
- **GET** `/api/staff/current-slot`
- Gets real-time status of current slot
- **Response**: Slot status with check-ins

#### Mark No-Show
- **POST** `/api/staff/mark-no-show`
- Marks a booking as no-show
- **Body**: `{ "bookingId": "BK-001", "markedBy": "STAFF-001" }`
- **Response**: No-show confirmation

#### Get Staff Dashboard
- **GET** `/api/staff/dashboard/:staffId`
- Staff member's personal dashboard
- **Response**: Shift info and stats

---

### 🔔 Notification Routes (`/api/notifications`)

#### Send Notification (User Story 8)
- **POST** `/api/notifications/send`
- Sends push notification to student
- **Body**: `{ "studentId": "STU-001", "bookingId": "BK-001", "type": "slot_reminder" }`
- **Response**: Notification delivery status

#### Schedule Notification
- **POST** `/api/notifications/schedule`
- Schedules notification (10 minutes before slot)
- **Body**: `{ "bookingId": "BK-001", "scheduledTime": "2024-01-31T11:50:00Z" }`
- **Response**: Scheduled notification details

#### Get Student Notifications
- **GET** `/api/notifications/student/:studentId`
- Retrieves notification history
- **Response**: Array of notifications

#### Mark Notification as Read
- **PUT** `/api/notifications/:notificationId/read`
- Marks notification as read
- **Response**: Update confirmation

#### Get Notification Preferences
- **GET** `/api/notifications/preferences/:studentId`
- Gets student's notification settings
- **Response**: Preference configuration

#### Update Notification Preferences
- **PUT** `/api/notifications/preferences/:studentId`
- Updates notification settings
- **Body**: `{ "pushEnabled": true, "reminderMinutes": 15 }`
- **Response**: Updated preferences

---

## 📁 Project Structure

```
cafeteria-booking-system/
├── server.js                 # Main server file
├── package.json             # Dependencies
├── routes/
│   ├── bookingRoutes.js     # Booking endpoints
│   ├── tokenRoutes.js       # Token generation & validation
│   ├── slotRoutes.js        # Slot management
│   ├── adminRoutes.js       # Admin functions
│   ├── staffRoutes.js       # Staff operations
│   └── notificationRoutes.js # Notifications
└── README.md                # This file
```

## 🎯 User Stories Coverage

✅ **User Story 1**: Book 15-minute meal slots  
✅ **User Story 2**: Receive digital QR code tokens  
✅ **User Story 3**: Staff can scan and validate tokens  
✅ **User Story 4**: Cancel/reschedule up to 30 minutes before  
✅ **User Story 5**: System limits tokens based on capacity  
✅ **User Story 6**: View remaining slots for time periods  
✅ **User Story 7**: Priority slots for special needs students  
✅ **User Story 8**: Push notifications 10 minutes before slot  
✅ **User Story 9**: Auto-release no-show slots after 5 minutes  
✅ **User Story 10**: Walk-in mode for manual token issuance  

## 🧪 Testing the API

You can test the API using:
- **cURL**
- **Postman**
- **Thunder Client** (VS Code extension)
- **Browser** (for GET requests)

### Example cURL Commands:

```bash
# Health check
curl http://localhost:3000/health

# Create booking
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Content-Type: application/json" \
  -d '{"studentId": "STU-12345", "slotTime": "12:00 PM"}'

# Get available slots
curl "http://localhost:3000/api/slots/available?date=2024-01-31"

# Validate token
curl -X POST http://localhost:3000/api/tokens/validate \
  -H "Content-Type: application/json" \
  -d '{"tokenId": "TKN-001", "scannedBy": "STAFF-001"}'
```

## 📝 Notes

- All responses are mocked with static data
- No database connection required for this step
- All endpoints return success responses
- Suitable for frontend development and testing
- Next step will implement actual business logic and database

## 🔜 Next Steps

1. Set up database (MongoDB/PostgreSQL)
2. Implement actual business logic
3. Add authentication & authorization
4. Implement real QR code generation
5. Add input validation
6. Implement notification service
7. Add error handling
8. Write unit tests

---

**Version**: 1.0.0 (Mocked Data)  
**Status**: Development - Step 1 Complete ✅