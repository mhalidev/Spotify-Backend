# Spotify Backend

A Node.js/Express backend for a Spotify-style music streaming service. It handles user authentication (with OTP email verification and refresh-token session management), role-based access for **users** vs **artists**, and a music/album catalog with audio file uploads.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
  - [Auth Routes](#auth-routes-auth)
  - [Music Routes](#music-routes-music)
- [Data Models](#data-models)
- [Roadmap](#roadmap)

## Features

- **JWT-based authentication** with short-lived access tokens (15 min) and long-lived refresh tokens (7 days), delivered via `httpOnly` cookies.
- **Session tracking** — every login creates a session record (IP address, user agent, hashed refresh token) so sessions can be individually or collectively revoked.
- **Refresh token rotation** — calling `/auth/refresh` issues a brand-new access + refresh token pair and invalidates the old one.
- **Email OTP verification** — new accounts are created unverified and must confirm via a one-time code sent by email.
- **Role-based access control** — accounts are `user` or `artist`; only artists can upload music or create albums.
- **Audio file uploads** — tracks are uploaded through Multer and stored via a cloud storage/CDN service, with only the resulting URL persisted in the database.
- **Music catalog** — list all tracks, list all albums, or fetch a single album with its tracks populated.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB with Mongoose |
| Auth | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` for password hashing |
| File uploads | Multer (in-memory) + ImageKit |
| Email | Nodemailer (via Gmail) |
| Validation | express-validator |
| Dev tooling | nodemon |

## Project Structure

```
Spotify-Backend/
├── server.js                  # Entry point — connects DB, starts the server
├── src/
│   ├── app.js                 # Express app setup, route mounting
│   ├── config/
│   │   └── config.js          # Centralized env variable access
│   ├── controllers/
│   │   ├── auth.controller.js     # register, login, logout, refresh, verifyOtp, allLogout
│   │   └── music.controller.js    # createMusic, createAlbum, getAllMusics, getAllAlbums, getAlbumById
│   ├── db/
│   │   └── db.js              # MongoDB connection
│   ├── middlewares/
│   │   ├── auth.middleware.js         # authuserMiddleware, authartistMiddleware
│   │   └── validation.middleware.js   # request body validation
│   ├── models/
│   │   ├── auth.model.js      # User schema
│   │   ├── session.model.js   # Session schema (refresh token tracking)
│   │   ├── otp.model.js       # OTP schema
│   │   ├── music.model.js     # Music schema
│   │   └── album.model.js     # Album schema
│   ├── routes/
│   │   ├── auth.route.js      # /auth/*
│   │   └── music.route.js     # /music/*
│   ├── services/
│   │   ├── storage.service.js # Uploads files to ImageKit
│   │   └── gmail.service.js   # Sends OTP emails
│   └── utils/
│       └── utils.js           # Helpers (e.g. generateOtp)
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [MongoDB](https://www.mongodb.com/) database (local or Atlas)
- An [ImageKit](https://imagekit.io/) account (for audio file storage)
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) or Google OAuth credentials (for sending OTP emails)

### Installation

```bash
git clone https://github.com/mhalidev/Spotify-Backend.git
cd Spotify-Backend
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DB_KEY=your_mongodb_connection_string
JWT_SECRET_ACCESS=your_access_token_secret
JWT_SECRET_REFRESH=your_refresh_token_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_USER=the_gmail_address_sending_otp_emails
```

> The Google credentials are used to send OTP verification emails via Gmail's API/Nodemailer. Cookies are also set with `secure: true`, so the server should be run behind HTTPS (or you'll need to relax this locally).

### Running the Server

```bash
npm run dev
```

The server starts on **`http://localhost:3000`**.

## Authentication Flow

1. **Register** (`POST /auth/register`) — account is created with `verified: false`; an OTP is emailed to the user.
2. **Verify OTP** (`POST /auth/verify-otp`) — confirms the account and marks it `verified: true`.
3. **Login** (`POST /auth/login`) — validates credentials, creates a session record, and returns two `httpOnly` cookies:
   - `acctoken` — access token, expires in 15 minutes
   - `reftoken` — refresh token, expires in 7 days (hashed and stored server-side in the session)
4. **Refresh** (`POST /auth/refresh`) — when the access token expires, the client calls this with the refresh cookie to get a new token pair (refresh token rotation).
5. **Logout** (`POST /auth/logout`) — revokes the current session only.
6. **All Logout** (`POST /auth/all-logout`) — revokes every active session for the user and clears both cookies (useful for "log out of all devices").

## API Reference

Base URL: `http://localhost:3000`

### Auth Routes (`/auth`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create a new account (`user` or `artist`). Sends an OTP to the given email. |
| POST | `/auth/login` | No | Authenticate and receive access/refresh token cookies. |
| POST | `/auth/verify-otp` | No | Confirm the OTP sent at registration. |
| POST | `/auth/refresh` | Refresh cookie | Rotate the access/refresh token pair. |
| POST | `/auth/logout` | Access cookie | Revoke the current session. |
| POST | `/auth/all-logout` | Refresh cookie | Revoke all sessions for the user. |

<details>
<summary><strong>POST /auth/register</strong></summary>

**Body**
```json
{
  "username": "mhali",
  "email": "mhali@example.com",
  "password": "yourpassword",
  "role": "artist"
}
```

**Response — 201**
```json
{
  "message": "User registered successfully",
  "username": "mhali",
  "email": "mhali@example.com",
  "role": "artist"
}
```
</details>

<details>
<summary><strong>POST /auth/verify-otp</strong></summary>

**Body**
```json
{
  "email": "mhali@example.com",
  "otp": "482913"
}
```

**Response — 200**
```json
{ "message": "OTP verified successfully", "user": { "...": "..." } }
```
</details>

<details>
<summary><strong>POST /auth/login</strong></summary>

**Body**
```json
{
  "email": "mhali@example.com",
  "password": "yourpassword"
}
```

**Response — 200** (also sets `acctoken` and `reftoken` cookies)
```json
{
  "message": "Login successful",
  "username": "mhali",
  "email": "mhali@example.com",
  "role": "artist"
}
```
</details>

<details>
<summary><strong>POST /auth/refresh</strong></summary>

Requires the `reftoken` cookie to be sent automatically by the client. No body needed.

**Response — 201**
```json
{ "access_token": "<new_jwt>" }
```
</details>

<details>
<summary><strong>POST /auth/logout</strong> / <strong>POST /auth/all-logout</strong></summary>

No body needed — the relevant cookie(s) are read automatically.

**Response — 200**
```json
{ "message": "Logged out successfully" }
```
</details>

---

### Music Routes (`/music`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/music/create-music` | Artist | Upload a track (multipart form). |
| POST | `/music/create-album` | Artist | Create an album from existing track IDs. |
| GET | `/music/get-all-musics` | User | List tracks (max 5). |
| GET | `/music/get-all-albums` | User | List albums (max 5). |
| GET | `/music/get-album/:id` | User | Get one album with its tracks populated. |

<details>
<summary><strong>POST /music/create-music</strong></summary>

`multipart/form-data`:

| Field | Type | Description |
|---|---|---|
| `title` | text | Track title |
| `music` | file | Audio file to upload |

**Response — 201**
```json
{
  "message": "Music Created",
  "music": {
    "_id": "...",
    "uri": "https://ik.imagekit.io/.../track.mp3",
    "title": "Song Name",
    "artist": "<artist_user_id>"
  }
}
```
</details>

<details>
<summary><strong>POST /music/create-album</strong></summary>

**Body**
```json
{
  "title": "My Album",
  "musics": ["<music_id_1>", "<music_id_2>"]
}
```

**Response — 201**
```json
{
  "message": "Album Created",
  "album": { "_id": "...", "title": "My Album", "musics": ["..."], "artist": "..." }
}
```
</details>

<details>
<summary><strong>GET /music/get-all-musics</strong></summary>

**Response — 200**
```json
{
  "message": "All Musics",
  "musics": [
    { "_id": "...", "title": "Song Name", "uri": "...", "artist": { "username": "...", "email": "..." } }
  ]
}
```
</details>

<details>
<summary><strong>GET /music/get-all-albums</strong></summary>

**Response — 200**
```json
{
  "message": "All Albums",
  "albums": [
    { "_id": "...", "title": "My Album", "artist": { "username": "...", "email": "..." } }
  ]
}
```
</details>

<details>
<summary><strong>GET /music/get-album/:id</strong></summary>

**Response — 200**
```json
{
  "message": "Album Found",
  "album": {
    "_id": "...",
    "title": "My Album",
    "musics": [{ "title": "Song Name", "uri": "..." }],
    "artist": { "username": "...", "email": "..." }
  }
}
```
</details>

## Data Models

**User**
| Field | Type | Notes |
|---|---|---|
| `username` | String | required |
| `email` | String | required, unique |
| `password` | String | required, hashed with bcrypt |
| `role` | String | `"user"` \| `"artist"`, default `"user"` |
| `verified` | Boolean | default `false` |

**Session**
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | required |
| `refreshToken` | String | SHA-256 hash, required |
| `ipAddress` | String | required |
| `userAgent` | String | required |
| `revoked` | Boolean | default `false` |

**OTP**
| Field | Type | Notes |
|---|---|---|
| `email` | String | required |
| `user` | ObjectId → User | required |
| `otp` | String | SHA-256 hash, required |

**Music**
| Field | Type | Notes |
|---|---|---|
| `uri` | String | required — file URL from storage service |
| `title` | String | required |
| `artist` | ObjectId → User | required |

**Album**
| Field | Type | Notes |
|---|---|---|
| `title` | String | required |
| `musics` | [ObjectId → Music] | |
| `artist` | ObjectId → User | |

## Roadmap

Ideas for extending this project further:

- [ ] Pagination for `/get-all-musics` and `/get-all-albums` (currently capped at 5 results)
- [ ] Search endpoint (by track/artist/album name)
- [ ] Rate limiting on auth routes
- [ ] Automated tests (Jest/Supertest)
- [ ] Swagger/OpenAPI documentation
- [ ] Dockerfile for containerized deployment

---

Built by [mhalidev](https://github.com/mhalidev)
