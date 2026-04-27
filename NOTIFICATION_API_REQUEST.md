# Notification API Request (SNS-style)

This document describes the notification API contract needed by the app.

## 1) List notifications

`GET /api/notifications`

Query params
- `limit` (number, optional, default 20)
- `offset` (number, optional, default 0)
- `unreadOnly` (boolean, optional, default false)

Response (list)
```json
{
  "items": [
    {
      "notificationId": 123,
      "userId": 45,
      "type": "COMMENT",
      "title": "새 댓글",
      "message": "홍길동님이 댓글을 남겼습니다.",
      "targetType": "post",
      "targetId": 987,
      "isRead": false,
      "readAt": null,
      "createdAt": "2025-01-02T12:34:56Z",
      "actorUserId": 78,
      "actorUsername": "hong",
      "actorProfileImageUrl": "https://cdn.example.com/profile.jpg",
      "data": {
        "deepLink": "plateapp://post/987"
      }
    }
  ]
}
```

Notes
- App accepts list payloads as `items` or raw array (see `src/api/notificationsApi.ts`).
- `data.deepLink` is optional; `targetType/targetId` is the primary navigation.

## 2) Unread count

`GET /api/notifications/unread-count`

Response
```json
{
  "count": 5
}
```

## 3) Mark as read

`PUT /api/notifications/{notificationId}/read`

Response: `204 No Content` (or empty JSON OK)

## 4) Mark all as read

`PUT /api/notifications/read-all`

Response: `204 No Content` (or empty JSON OK)

## 5) Delete one

`DELETE /api/notifications/{notificationId}`

Response: `204 No Content` (or empty JSON OK)

## 6) Delete all

`DELETE /api/notifications/all`

Response: `204 No Content` (or empty JSON OK)

## 7) Enums

Notification `type` (string enum)
- `LIKE`
- `COMMENT`
- `REPLY`
- `FOLLOW`
- `MENTION`
- `SYSTEM`

## 8) DB field mapping

- `notificationId` -> `fp_20.id`
- `userId` -> `fp_20.receiver_id`
- `actorUserId` -> `fp_20.sender_id`
- `type` -> `fp_20.type`
- `message` -> `fp_20.message`
- `targetType` -> `fp_20.target_type`
- `targetId` -> `fp_20.target_id`
- `isRead` -> `fp_20.is_read`
- `readAt` -> `fp_20.read_at` (optional; can be null)
- `createdAt` -> `fp_20.created_at`

## 9) Implementation notes

- Sort by `createdAt` desc by default.
- If `unreadOnly=true`, return only `is_read=false`.
- `actor*` fields are optional for system notifications.
