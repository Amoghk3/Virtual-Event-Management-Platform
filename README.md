# 🎉 Virtual Event Management Platform  
A complete event management backend built with **Node.js, Express, MongoDB**, with **JWT Authentication**, **Role-based Access**, **Email Notifications**, and **Jest + Supertest** automated tests.

---

## 🚀 Features
- User Registration & Login (JWT-based)
- Role-based Access Control  
  - **superadmin → can update roles**
  - **organizer → can manage events**
  - **attendee → can register/unregister**
- Event CRUD (Create, Update, Delete)
- Event Registration System  
  - Prevent duplicate registration  
  - Enforce capacity limits  
- Email Notifications (welcome, role changed, registration)
- Complete Automated Test Suite using Jest + Supertest
- MongoDB (Mongoose) Models
- Clean Modular Architecture

---

## 🏗️ System Architecture

```mermaid
flowchart TD

%% USER SIDE
subgraph Client["Client (Postman / Web App)"]
    A1[Register / Login]
    A2[Access Events]
    A3[Admin Role Management]
end

Client -->|HTTP Requests| B[Express Server (server.js)]

%% ROUTES
subgraph Routes["API Routes Layer"]
    R1[/authRoutes.js/]
    R2[/eventRoutes.js/]
    R3[/adminRoutes.js/]
end

B --> R1
B --> R2
B --> R3

%% CONTROLLERS
subgraph Controllers["Controller Layer"]
    C1[authController.js]
    C2[eventController.js]
    C3[adminController.js]
end

R1 --> C1
R2 --> C2
R3 --> C3

%% MIDDLEWARE
subgraph Middleware["Middleware"]
    M1[auth.js\nJWT Verification & Role Check]
end

R2 --> M1
R3 --> M1

%% MODELS
subgraph Models["MongoDB Models"]
    Mdl1[(User)]
    Mdl2[(Event)]
end

C1 --> Mdl1
C2 --> Mdl2
C3 --> Mdl1

%% DATABASE
subgraph MongoDB["MongoDB Database"]
    DB1[(Users Collection)]
    DB2[(Events Collection)]
end

Mdl1 --> DB1
Mdl2 --> DB2

%% EMAIL SERVICE
subgraph Utils["emailService.js (SMTP / No-Op Mode)"]
end

C1 --> Utils
C2 --> Utils
C3 --> Utils

%% TESTS
subgraph Tests["Jest + Supertest"]
    T1[auth.test.js]
    T2[events.test.js]
end

T1 --> B
T2 --> B
```

---

## 📂 Folder Structure
```
/Virtual-Event-Management-Platform
│── controllers/
│   ├── authController.js
│   ├── adminController.js
│   └── eventController.js
│
│── middleware/
│   └── auth.js
│
│── models/
│   ├── User.js
│   └── Event.js
│
│── routes/
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   └── eventRoutes.js
│
│── tests/
│   ├── auth.test.js
│   └── events.test.js
│
│── utils/
│   └── emailService.js
│
│── server.js
│── package.json
│── README.md
│── .env
```

---

## ⚙️ Environment Variables

Create a `.env` file:

```
PORT=5000
MONGO_URI=your_mongo_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

🔹 During testing, emails are **NOT sent** (emailService auto-switches to mock mode).

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/Virtual-Event-Management-Platform.git
cd Virtual-Event-Management-Platform
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Set up environment variables  
Create `.env` (see above section).

### 4️⃣ Start the server
```bash
npm start
```

Server runs on:  
📍 `http://localhost:5000`

---

## 🔑 API Endpoints

### **AUTH ROUTES**
| Method | Endpoint        | Description |
|--------|------------------|-------------|
| POST   | `/api/auth/register` | Register a new user |
| POST   | `/api/auth/login`    | Login and receive JWT |

---

### **ADMIN ROUTES** (Superadmin only)
| Method | Endpoint                      | Description |
|--------|--------------------------------|-------------|
| PATCH  | `/api/admin/users/:id/role`   | Update user role |

Body:
```json
{ "role": "organizer" }
```

---

### **EVENT ROUTES**
| Method | Endpoint                 | Role | Description |
|--------|---------------------------|-------|-------------|
| POST   | `/api/events`             | organizer | Create event |
| PUT    | `/api/events/:id`         | organizer | Update event |
| DELETE | `/api/events/:id`         | organizer | Delete event |
| POST   | `/api/events/:id/register`   | attendee | Register for event |
| POST   | `/api/events/:id/unregister` | attendee | Unregister |

---

## 🧪 Running Tests

### Run full test suite:
```bash
npm test
```

Includes:

✔️ User Registration  
✔️ Login  
✔️ Role updates  
✔️ Event CRUD  
✔️ Registration & capacity checks  
✔️ Duplicate registration prevention  

---

## 🤝 Contribution

1. Fork this project  
2. Create a feature branch  
3. Commit your changes  
4. Open a Pull Request

