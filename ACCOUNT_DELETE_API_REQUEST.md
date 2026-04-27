# Account Delete API Request (Required)

This document defines the required backend API for normal account deletion.

Scope
- This request is for general ID/password accounts only.
- Social login account deletion is out of scope for this document.

## Why This Is Required

- The app already has a delete-account screen and client flow.
- The client currently expects a password-based account deletion API.
- At the moment, the backend feature appears to be missing or not available.
- Without this API, the delete-account screen cannot complete the user flow.

Current client usage
- `src/screens/my/AccountSettingsScreen.tsx`
- `src/screens/my/edit/DeleteAccountScreen.tsx`
- `src/api/profileApi.ts`

Goal
- Let a logged-in user delete their own account after confirming the current password.
- Hard delete the internal service account and personal data covered by deletion policy.
- Invalidate the current session as part of account deletion.
- Keep the frontend flow minimal by matching the current client expectation.

---

## 1) Account Delete

### Endpoint
`DELETE /api/users/me`

### Auth
- Required
- Bearer access token

### Request Body
```json
{
  "password": "current-password"
}
```

### Request Fields
- `password` (string, required): current account password for final identity confirmation

### Success Response
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

Recommended alternative response
```json
{
  "success": true,
  "data": null,
  "message": "Account deleted successfully"
}
```

### Client Flow After Success
- frontend treats the account as deleted
- frontend runs local logout
- frontend clears local tokens and user session

---

## 2) Error Response

```json
{
  "success": false,
  "message": "Password does not match",
  "errorCode": "INVALID_PASSWORD"
}
```

Recommended cases
- missing password
- wrong password
- unauthenticated request
- already deleted or unavailable user
- internal deletion failure

Recommended status mapping
- `400`: missing or invalid request body
- `401`: missing token or invalid token
- `403` or `400`: password mismatch
- `404`: user not found
- `500`: unexpected server error

---

## 3) Backend Behavior

- The backend should identify the target user from the access token, not from request params.
- The backend should verify the submitted password against the current user account.
- The backend should hard delete the internal service account after password verification succeeds.
- The backend should irreversibly delete or anonymize related personal data according to legal retention requirements.
- The backend should invalidate refresh/access token usability after deletion.
- The backend should return a clear error message when password verification fails.
- The backend should be idempotent enough to avoid partial deletion states where possible.

Policy fixed for this request
- hard delete

Remaining backend policy items
- immediate content deletion vs hidden/non-exposed state during deletion transaction
- audit/history retention policy
- refresh token revocation strategy

---

## 4) Frontend Assumption

The current client already expects this exact flow:
- user enters current password
- client calls `DELETE /api/users/me` with `{ password }`
- client logs out locally on success

Current frontend reference
- `src/screens/my/edit/DeleteAccountScreen.tsx`
- `src/api/profileApi.ts`
- `src/auth/AuthProvider.tsx`

Because of this, matching the endpoint and request body above will keep frontend changes minimal.

---

## 5) Out of Scope

This document does not cover:
- social login account deletion
- re-auth with provider token/code
- account recovery after deletion
- admin-side forced deletion

If social login deletion is needed, it should be documented in a separate API request.
