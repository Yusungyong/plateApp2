# Map Filter API Requirements (Draft)

## Summary
The current map API only supports radius-based queries.
To enable category and hashtag filters from the frontend UI, new query params and backend filtering are needed.

## Current API
- Endpoint: `GET /api/map/stores/nearby`
- Params: `lat`, `lng`, `radius`, `limit`
- Source: `src/api/mapStoreApi.ts`

## Proposed API Extensions
### Request (query params)
- `lat` (number, required)
- `lng` (number, required)
- `radius` (number, optional, meters; default 1500)
- `limit` (number, optional; default 60)
- `category` (string, optional)
  - Example values: `KOREAN`, `JAPANESE`, `CHINESE`, `CAFE`, `DESSERT`
  - Maps to `fp_310.types` or a code table (e.g., `fp_code`)
- `tags` (string, optional)
  - Comma-separated hashtags, e.g. `데이트,혼밥`
  - Maps to `fp_350` (tag table)

### Response
- Same as current `NearbyStoreMarkersResponse`
- No response shape changes required for basic filtering

## Data Sources
- Category: `fp_310.types` (place types) or `fp_code` mapping
- Hashtag: `fp_350` (tag storage for store/feed)

## Backend Behavior (Suggested)
- Filter stores by radius (existing)
- If `category` provided: filter by mapped type/category
- If `tags` provided: match any tag (OR) or all tags (AND) — choose and document

## Example Requests
```http
GET /api/map/stores/nearby?lat=37.5112&lng=127.0984&radius=1500&limit=60
```

```http
GET /api/map/stores/nearby?lat=37.5112&lng=127.0984&radius=1500&category=KOREAN&tags=%EB%8D%B0%EC%9D%B4%ED%8A%B8,%ED%98%BC%EB%B0%A5
```

## Example Response (unchanged)
```json
{
  "items": [
    {
      "storeId": 123,
      "placeId": "ChIJSx7Z2VqefDURb7FQx3qX-4A",
      "storeName": "플레이트 한식당",
      "address": "서울 송파구 ...",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "lat": 37.5119,
      "lng": 127.0991,
      "distanceM": 420,
      "feedCount": 12,
      "contentType": "BOTH",
      "imageFeedId": 9001
    }
  ]
}
```

## Response Semantics
- `distanceM` should reflect the distance from request `lat/lng`.
- `contentType` indicates available content for the store (`IMAGE`, `VIDEO`, `BOTH`).

## Frontend Impact
- UI already collects `category`, `tags`, `radius`
- Add params to `fetchNearbyStoreMarkers` once API supports them

## Open Questions
- Category source of truth: `fp_310.types` vs `fp_code`
- Tag matching semantics: OR vs AND
- Tag scope: store-level only, or include feeds linked to store
