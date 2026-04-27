# Place Search Proxy API Request (Required)

This document defines the required backend API for place search proxying.

## Why This Is Required

- The app currently calls Naver Local Search directly from the client.
- The app bundle currently contains `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET`.
- `NAVER_CLIENT_SECRET` must not remain in the client app.

Current client usage
- `src/screens/my/FriendVisitHistoryScreen.tsx`
- `src/screens/videoFeeds/VideoPostEditorScreen.tsx`
- `src/screens/ImageFeed/ImageFeedEditorScreen.tsx`

Goal
- Move Naver Local Search calls to the backend.
- Let the client call only an internal app API.
- Keep the response shape close enough to current client expectations so frontend changes stay minimal.

---

## 1) Place Search Proxy

### Endpoint
`GET /api/places/search`

### Query Params
- `query` (string, required): search keyword
- `limit` (number, optional, default 8): max number of items to return

### Example Request
`GET /api/places/search?query=성수%20파스타&limit=8`

### Response
```json
{
  "items": [
    {
      "title": "<b>플레이트</b> 파스타",
      "roadAddress": "서울 성동구 연무장길 00",
      "address": "서울 성동구 성수동2가 000-00",
      "mapx": "1270456789",
      "mapy": "375432198",
      "placeId": null
    }
  ]
}
```

### Required Response Fields
- `title` (string): place name
- `roadAddress` (string | null)
- `address` (string | null)
- `mapx` (string | null)
- `mapy` (string | null)

### Optional Response Fields
- `placeId` (string | null): can be added later if backend supports internal place mapping

### Notes
- Returning `title`, `roadAddress`, `address`, `mapx`, `mapy` keeps frontend migration minimal because the current client already reads those exact keys.
- `title` may include HTML markup exactly like Naver response. The app already strips it client-side.
- If backend wants to normalize the response internally, it should still expose the fields above for compatibility.

---

## 2) Error Response

```json
{
  "success": false,
  "message": "Invalid query",
  "errorCode": "BAD_REQUEST"
}
```

Recommended cases
- empty query
- upstream provider failure
- rate limit

---

## 3) Backend Behavior

- The backend should call Naver Local Search with server-side credentials.
- The backend should not expose `NAVER_CLIENT_SECRET` to the client.
- The backend should trim empty queries and return `400` for invalid input.
- The backend should return an empty `items` array when no results exist.
- The backend may cap `limit` internally, for example `max 10`.

---

## 4) Frontend Impact After API Is Ready

The following client-side direct calls can be replaced with `/api/places/search`:
- `src/screens/my/FriendVisitHistoryScreen.tsx`
- `src/screens/videoFeeds/VideoPostEditorScreen.tsx`
- `src/screens/ImageFeed/ImageFeedEditorScreen.tsx`

After the proxy API is applied:
- remove direct calls to `https://openapi.naver.com/v1/search/local.json`
- remove client usage of `NAVER_CLIENT_SECRET`
- keep existing suggestion UI logic with minimal response mapping changes
