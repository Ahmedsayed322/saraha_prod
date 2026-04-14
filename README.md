# Saraha API

> A robust, secure backend API for an anonymous messaging platform (Saraha clone).

## 🚀 Overview

The Saraha API is an enterprise-grade backend service built to handle user registration, secure authentication, and the core functionality of sending and receiving messages anonymously. It leverages modern web development practices to ensure data security, robust session management, efficient file handling, and resilient response times.

## 🛠️ Technology Stack

- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose
- **Caching & Memory:** Redis
- **Authentication:** JWT (JSON Web Tokens) with Refresh Tokens
- **Third-Party Login:** Google Auth Library
- **Security & Cryptography:** 
  - Password hashing via bcrypt & Argon2
  - Asymmetric encryption for sensitive fields (e.g., Phone numbers)
  - Content Security via Helmet
  - CORS with managed allowlists
- **Rate Limiting:** Express-rate-limit via Redis (Global, Short, and Medium Limiters)
- **Data Validation:** Joi
- **File Uploads:** Multer with direct Cloudinary integration
- **Emails:** Nodemailer (OTP and Link-based verification)

## ✨ Key Features

### User Management & Security
- **Robust Authentication:** Secure registration and login flows using JWT (Access & Refresh tokens).
- **Google OAuth:** Integrated with Google for automatic, secure signups and signins.
- **Two-Factor Authentication (2FA):** Opt-in OTP verification for account access for enhanced security.
- **Password Recovery:** Versatile recovery methods, supporting both OTP codes and single-use email links.
- **Data Protection:** Phone numbers and other sensitive data are securely encrypted asymmetrically in the database.
- **Role-Based Access:** Role segregation (User vs. Admin limits).

### Communication
- **Anonymous Messaging:** Core logic to allow users to receive anonymous messages safely.
- **Rich Media:** Send up to 3 attachments per message directly stored in Cloudinary.

### Profile Personalization
- **Image Management:** Easy endpoint handlers for profile picture and cover picture (up to 2 files) uploads.
- **Public & Private Profiles:** Shareable profile endpoints with visit counting functionalities (viewable by admins or profile operators).

### Resilient Architecture
- **API Guardrails:** Integrated rate limiting rules protecting against Brute Force & DDoS, utilizing global, short-term, and medium-term strictness rules.
- **Data Validation:** Strict payload and body validation using Joi before controllers are ever reached.
- **Error Handling:** Centralized known and global error handling middlewares for deterministic API responses.

---

## 🌐 Postman Collection
You can easily explore and test the entire Saraha API using our fully configured Postman Workspace and Collection:
[**View Saraha API Postman Collection**](https://www.postman.com/ahmedsayed422/workspace/assignment4/request/34640816-84560aab-a24e-41b5-bf5f-e4ddd4ce921e?action=share&creator=34640816&active-environment=34640816-794679cb-9174-4661-a0e9-cf3d709440e8)

---

## 📂 API Endpoints Guide

Here is an overview of the primary modules available:

### 👤 User Module (`/users`)
**Authentication & Registration**
- `POST /signup` - Register a new user and generate a verification OTP.
- `PATCH /confirm-email` - Complete registration using OTP.
- `POST /signup/gmail` - Quick authenticate via Google account.
- `POST /signin` - Base login route.
- `POST /confirm-login-otp` - Confirm login when 2FA is triggered.
- `POST /refresh-token` - Refresh expired JWT access token.
- `DELETE /logout` - Logout the device securely.

**Account Security (2FA & Password Reset)**
- `POST /trigger-2FA` - Initiate 2FA protection flow.
- `PATCH /confirm-triggering-2FA` - Verify 2FA enablement OTP.
- `POST /forget-password` / `POST /forget-password-link` - Initiate forgotten password flows.
- `PATCH /confirm-forget-password` / `PATCH /confirm-forget-password-link` - Commit new password.
- `PATCH /update-password` - Rotate password for a logged-in account.

**Profile Management**
- `GET /profile` - Retrieve the active user's details.
- `PATCH /update-profile` - Update profile text-data.
- `GET /share-profile/:id` - Fetch public user info to send messages to.
- `POST /upload/profile-pic` - Cloudinary avatar upload.
- `PATCH /cover-pics` - Cloudinary cover photos upload.
- `DELETE /remove-profilePic` - Remove assigned avatar.
- `GET /visit-count/:id` - Get total visits to a profile.

### ✉️ Message Module (`/messages`)
- `POST /send` - Send an anonymous message to a `receiverId` with up to 3 attachments.
- `GET /` - Check all received anonymous messages.
- `GET /:id` - Retrieve a specific message.

---

## ⚙️ Project Structure

```text
src/
├── config/             # Environment variables and internal configurations
├── DB/                 # MongoDB schemas and Redis setups
│   └── models/         # Mongoose User & Message schemas
├── middlewares/        # Custom Express middlewares (Auth, Upload, Validation, Errors)
├── modules/            # Feature modules containing Routes, Controllers & Services
│   ├── user/           
│   └── message/        
├── utils/              # Helper functions (Cryptography, Limiters, Mailers, Enums)
├── app.bootstrap.js    # Application setup, middleware hooks, and routing entry
└── main.js             # Starting port listeners
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) Server or Atlas URI
- [Redis](https://redis.io/) Server
- A [Cloudinary](https://cloudinary.com/) Developer account for Media handling.

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd Saraha
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file at the exact root of the project with the following configuration details:
   ```env
   # Network Configuration
   PORT=3000
   NODE_ENV=development

   # Database Providers
   MONGO_URI=your_mongodb_connection_string
   REDIS_URL=your_redis_connection_string

   # Authentication Secrets
   JWT_SECRET=your_jwt_access_secret
   REFRESH_TOKEN_SECRET=your_jwt_refresh_secret
   RESET_TOKEN_SECRET=your_jwt_reset_secret

   # Cloudinary Media Keys
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Nodemailer SMTP Setup
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   
   # CORS configuration
   WHITE_LIST=["http://localhost:3000", "your_frontend_domain"]
   ```

4. **Boot up:**
   ```bash
   # Development Mode
   npm run start:dev
   
   # Production Mode
   npm run start:prod
   ```

## 🤝 Contribution Guidelines

Contributions are always welcome. Please open an issue to discuss a proposed change before filing your pull request to maintain architectural consistency.

## 📄 License
This project is licensed under the ISC License.
