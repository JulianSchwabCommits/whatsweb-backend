### 1. AuthService (auth.service.spec.ts)
- Password Hashing mit bcrypt
- Password Vergleich
- Email Format Validierung
- Password Stärke Validierung

### 2. UserService (user.service.spec.ts)
- User Creation
- Duplicate Username Detection (ConflictException)
- Find User by Email
- Update User
- Error Handling

### 3. ChatGateway (chat-gateway.spec.ts)
- WebSocket Connection mit JWT
- Authentication Required
- XSS Sanitization (`<script>` Tags entfernen)

### 4. ConfigService (config.service.spec.ts)
- Port aus Environment
- Allowed Origins
- Production Environment Detection
- Server URL Generation

### 5. E2E Tests (app.e2e-spec.ts)
- Health Check
- Register → Login → Profile → Logout Flow
- Duplicate Username Rejection
- Invalid Email/Password Rejection
- Authentication without Token
- Input Validation (Email, Password, Username)