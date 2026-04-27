# Search API Specification (Draft)

This document defines a unified search API for PlateApp. It is intended for backend implementation and frontend integration.

## Goals
- Provide a single search endpoint for places and content (video/image).
- Support search suggestions (auto-complete) with low latency.
- Enable common filters: category, tags, radius, sorting.

---

## 1) Search Suggestions

### Endpoint
`GET /api/search/suggest`

### Query Params
- `q` (string, required): user input text
- `limit` (number, optional, default 10): max items to return
- `scope` (string, optional): `place` | `tag` | `all` (default `all`)

### Response
```json
{
  "items": [
    {
      "type": "place",
      "label": "플레이트 한식당",
      "placeId": "ChIJSx7Z2VqefDURb7FQx3qX-4A",
      "address": "서울 송파구 ...",
      "lat": 37.5119,
      "lng": 127.0991
    },
    {
      "type": "tag",
      "label": "#데이트",
      "tag": "데이트"
    }
  ]
}
```

### Notes
- This can reuse existing map suggestion logic but should include tag suggestions.
- Frontend will show suggestions grouped by type.

---

## 2) Unified Search

### Endpoint
`GET /api/search`

### Query Params
- `q` (string, optional): search text (when omitted, treat as "browse" with filters)
- `type` (string, optional): `all` | `place` | `video` | `image` (default `all`)
- `page` (number, optional, default 0)
- `size` (number, optional, default 20)

### Filters
- `category` (string, optional): example values `KOREAN`, `JAPANESE`, `CHINESE`, `CAFE`, `DESSERT`
- `tags` (string, optional): comma-separated tags (e.g. `데이트,혼밥`)
- `radius` (number, optional, meters, default 1500)
- `lat` (number, optional): required if `radius` is used
- `lng` (number, optional): required if `radius` is used
- `sort` (string, optional): `RECENT` | `POPULAR` | `DISTANCE` (default `RECENT`)

### Response (Unified)
```json
{
  "page": 0,
  "size": 20,
  "total": 123,
  "items": [
    {
      "type": "place",
      "placeId": "ChIJSx7Z2VqefDURb7FQx3qX-4A",
      "storeId": 123,
      "storeName": "플레이트 한식당",
      "address": "서울 송파구 ...",
      "lat": 37.5119,
      "lng": 127.0991,
      "distanceM": 420,
      "feedCount": 12,
      "contentType": "BOTH",
      "imageFeedId": 9001,
      "thumbnail": "https://cdn.example.com/thumb.jpg"
    },
    {
      "type": "video",
      "storeId": 123,
      "placeId": "ChIJSx7Z2VqefDURb7FQx3qX-4A",
      "title": "오늘의 맛집",
      "address": "서울 송파구 ...",
      "thumbnail": "https://cdn.example.com/video_thumb.jpg",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "type": "image",
      "feedId": 456,
      "placeId": "ChIJSx7Z2VqefDURb7FQx3qX-4A",
      "storeName": "플레이트 한식당",
      "address": "서울 송파구 ...",
      "thumbnail": "https://cdn.example.com/image_thumb.jpg",
      "createdAt": "2025-01-02T00:00:00Z"
    }
  ]
}
```

### Notes
- For `type=place`, `items` should match current map marker fields for compatibility.
- For `type=video` and `type=image`, include minimal fields to open viewers directly.

---

## 3) Optional: Segmented Search (Alternative)

If backend prefers separate endpoints, use:
- `GET /api/search/places`
- `GET /api/search/videos`
- `GET /api/search/images`

Responses can follow the same item shapes as the unified response.

---

## 4) Error Response
```json
{
  "success": false,
  "message": "Invalid query",
  "errorCode": "BAD_REQUEST"
}
```

---

## 5) Mapping to DB Tables
- Places: `fp_310`
- Videos: `fp_300`
- Images: `fp_400`
- Tags: `fp_350`

---

## 6) Open Questions
- Tag matching: OR vs AND
- Popular sorting definition for content
- If `q` is empty and `type=all`, should return trending content or empty list?
