# Image Feed Grouped Viewer API

세로 스와이프 = **식당 그룹**,  
가로 스와이프 = **해당 식당 이미지 목록 (5장씩 추가 로드)**.

---

## 1) 식당 그룹 목록 (Vertical)
```
GET /api/image-feeds/groups
```

### Query
- `limit` (default 20)
- `cursor` (optional, paging)
- `sort` (RECENT | NEARBY)
- `lat`, `lng`, `radius` (optional, for NEARBY)

### Response
```json
{
  "items": [
    {
      "groupId": "place:ChIJ...",
      "placeId": "ChIJ...",
      "storeName": "남포면옥",
      "address": "서울 마포구 ...",
      "thumbnail": "feed/2026/01/04/....jpg",
      "imageCount": 12,
      "latestFeedId": 345,
      "latestCreatedAt": "2026-01-04T10:00:00Z"
    }
  ],
  "nextCursor": "2026-01-04T10:00:00Z|345",
  "hasMore": true
}
```

### Notes
- `groupId` 규칙:  
  - placeId 있으면 `place:{placeId}`  
  - 없으면 `store:{storeName}`  
- `thumbnail`은 대표 이미지 1장

---

## 2) 식당 그룹 내 이미지 목록 (Horizontal)
```
GET /api/image-feeds/groups/{groupId}/images
```

### Query
- `limit` (default 5)
- `cursor` (optional)

### Response
```json
{
  "items": [
    {
      "feedId": 345,
      "fileName": "feed/2026/01/04/....jpg",
      "createdAt": "2026-01-04T10:00:00Z",
      "username": "writer1",
      "nickName": "작성자"
    }
  ],
  "nextCursor": "2026-01-04T10:00:00Z|345",
  "hasMore": true
}
```

### Notes
- **가로 스와이프 마지막 도달 시** 다음 5장 요청
- 커서 키: `createdAt|feedId`

---

## Recommended Flow
1) `/api/image-feeds/groups` 호출 → 세로 스와이프 데이터 구성  
2) 특정 그룹 진입 → `/api/image-feeds/groups/{groupId}/images` 호출  
3) 가로 스와이프 마지막 도달 시 `cursor`로 추가 요청

