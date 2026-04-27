# Social Account Delete API Request (Required)

This document defines the required backend API for social-login account deletion.

Scope
- This request is for social login accounts only.
- Supported providers in the current app: `apple`, `google`, `kakao`
- Normal ID/password account deletion is out of scope for this document.

## Why This Is Required

- The app currently supports social login without a separate signup screen.
- Even without a signup screen, the first social login effectively creates an internal service account.
- Users must still be able to delete that account inside the app.
- The current delete flow is password-based, so social accounts cannot complete deletion properly.

Current client usage
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/my/AccountSettingsScreen.tsx`
- `src/screens/my/edit/DeleteAccountScreen.tsx`

Goal
- Allow a logged-in social account user to delete their service account after provider-based re-authentication.
- Hard delete the internal service account and personal data covered by deletion policy.
- Invalidate the current app session after deletion.

---

## 1) Recommended API Shape

### Endpoint
`DELETE /api/users/me`

### Auth
- Required
- Bearer access token

### Request Body
One of the following payloads should be accepted based on provider.

#### Apple
```json
{
  "provider": "apple",
  "identityToken": "apple-identity-token",
  "authorizationCode": "apple-authorization-code"
}
```

#### Google
```json
{
  "provider": "google",
  "idToken": "google-id-token"
}
```

#### Kakao
```json
{
  "provider": "kakao",
  "accessToken": "kakao-access-token"
}
```

### Request Fields
- `provider` (string, required): `apple` | `google` | `kakao`
- `identityToken` (string, Apple only)
- `authorizationCode` (string, Apple only)
- `idToken` (string, Google only)
- `accessToken` (string, Kakao only)

Why this shape
- The app already gets these values during social login.
- Matching these fields keeps frontend integration minimal.
- Reusing `DELETE /api/users/me` is preferable because normal account deletion already targets the same resource.

---

## 2) Success Response

```json
{
  "success": true,
  "message": "Social account deleted successfully"
}
```

Recommended alternative response
```json
{
  "success": true,
  "data": null,
  "message": "Social account deleted successfully"
}
```

### Client Flow After Success
- frontend treats the account as deleted
- frontend runs local logout
- frontend clears local tokens and user session

---

## 3) Error Response

```json
{
  "success": false,
  "message": "Social re-authentication failed",
  "errorCode": "SOCIAL_REAUTH_FAILED"
}
```

Recommended cases
- missing provider
- missing required token/code for provider
- provider mismatch with current user account
- social token/code validation failure
- unauthenticated request
- already deleted or unavailable user
- internal deletion failure

Recommended status mapping
- `400`: invalid request body
- `401`: missing token or invalid app session
- `403`: provider verification failed or account mismatch
- `404`: user not found
- `500`: unexpected server error

---

## 4) Backend Behavior

- The backend should identify the target user from the app access token, not from request params.
- The backend should verify that the current user is actually a social account and determine the correct provider.
- The backend should validate the provider token/code for the current user before deletion.
- The backend should hard delete the internal service account after provider verification succeeds.
- The backend should irreversibly delete or anonymize related personal data according to legal retention requirements.
- The backend should invalidate refresh/access token usability after deletion.
- If provider unlink or revoke is supported, the backend may process it as part of deletion.

Important distinction
- This API is for deleting the app's internal service account.
- This API does not mean deleting the user's Google, Kakao, or Apple account itself.
- Provider-side revoke/unlink is optional policy work unless product/legal requirements say otherwise.

Policy fixed for this request
- hard delete

Remaining backend policy items
- immediate content deletion vs hidden/non-exposed state during deletion transaction
- audit/history retention policy
- provider revoke/unlink policy
- whether re-auth failure messages should be provider-specific

---

## 5) Current Client-Side Available Inputs

The current app already obtains the following values during login:

### Apple
Client currently has:
- `identityToken`
- `authorizationCode`
- `user`

Reference
- `src/screens/auth/LoginScreen.tsx`

### Google
Client currently has:
- `idToken`

Reference
- `src/screens/auth/LoginScreen.tsx`

### Kakao
Client currently has:
- `accessToken`

Reference
- `src/screens/auth/LoginScreen.tsx`

Because of this, the backend request body above can be supported without inventing a new client identity flow.

---

## 6) Frontend Follow-Up After API Is Ready

After the backend API is ready, frontend work will be:
- detect provider on delete-account screen
- request provider re-auth when needed
- call `DELETE /api/users/me` with provider-specific body
- keep the existing success path: local logout and session clear

Minimal frontend impact is expected if the backend accepts the payload shapes above.

---

## 7) Out of Scope

This document does not cover:
- deleting the user's provider account itself
- linking or merging multiple accounts
- normal ID/password account deletion
- account recovery after deletion
- admin-side forced deletion
