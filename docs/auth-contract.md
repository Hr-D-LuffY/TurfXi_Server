# TurfXI — Auth & Identity API Contract
**Owner:** Shihab (Auth & Identity / Match & Stats)  
**Status:** Implemented & Verified  

---

## 1. Token Strategy & Delivery

- **Access Token:**
  - Sent in response JSON: `{ data: { accessToken, ... } }`.
  - Frontend stores it in `turfxi_token` cookie and attaches it via HTTP header:
    ```http
    Authorization: Bearer <accessToken>
    ```
  - **Payload Claims:**
    ```json
    {
      "sub": "user_cuid",
      "email": "user@example.com",
      "role": "NORMAL | PLAYER | TURF_OWNER | ADMIN",
      "membershipTier": "FREE | SILVER | GOLD",
      "iat": 1700000000,
      "exp": 1700000900
    }
    ```
  - Duration: `15m` (configurable via `JWT_EXPIRES_IN`).

- **Refresh Token:**
  - Returned in JSON `{ data: { refreshToken } }` AND set as an `httpOnly`, `SameSite=Lax` cookie (`turfxi_refresh_token`).
  - Duration: `7d` (configurable via `JWT_REFRESH_EXPIRES_IN`).

- **Socket.io Handshake:**
  - Connect with `{ auth: { token: "<accessToken>" } }` or header `Authorization: Bearer <accessToken>`.
  - On connection, user is automatically joined to room `user:<userId>`.

---

## 2. API Endpoints

### `POST /api/auth/register`
Creates a user, wallet (`balance: 0`), and optional player profile.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "NORMAL", // Optional: "NORMAL" | "PLAYER"
  "playerProfile": { // Optional
    "position": "Forward",
    "preferredFoot": "Right",
    "city": "Dhaka",
    "area": "Dhanmondi",
    "skillLevel": "Intermediate"
  }
}
```

**Success Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "cmv...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "PLAYER",
      "membershipTier": "FREE",
      "suspended": false,
      "createdAt": "2026-10-22T...",
      "updatedAt": "2026-10-22T...",
      "wallet": {
        "id": "cmv...",
        "userId": "cmv...",
        "balance": "0.00"
      },
      "playerProfile": {
        "id": "cmv...",
        "userId": "cmv...",
        "position": "Forward",
        "preferredFoot": "Right",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "skillLevel": "Intermediate"
      }
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  },
  "message": "Account created successfully"
}
```

---

### `POST /api/auth/login`
Authenticates existing users via email and password.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```

**Success Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "cmv...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "PLAYER",
      "membershipTier": "FREE",
      "wallet": { "balance": "0.00" },
      "playerProfile": { ... }
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  },
  "message": "Logged in successfully"
}
```

---

### `POST /api/auth/refresh`
Rotates/refreshes an access token.

**Request Body:** (Optional if `turfxi_refresh_token` cookie is present)
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Success Response (200 OK):**
```json
{
  "data": {
    "accessToken": "eyJhbGci..."
  }
}
```

---

### `POST /api/auth/logout`
Clears refresh token cookie.

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### `GET /api/auth/me`
Fetches current authenticated user profile and wallet.  
**Headers:** `Authorization: Bearer <accessToken>`

**Success Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "cmv...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "PLAYER",
      "membershipTier": "FREE",
      "wallet": { "balance": "0.00" },
      "playerProfile": { ... }
    }
  }
}
```

---

### Error Envelope (Consistent format for all failures)
```json
{
  "error": {
    "message": "Human readable error message",
    "code": "OPTIONAL_ERROR_CODE"
  }
}
```
