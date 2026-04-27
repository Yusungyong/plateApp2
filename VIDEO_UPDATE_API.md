# Video Update API (with File Replacement)

## Base
- Base URL: `/api`
- Auth: `Authorization: Bearer {access_token}`

---

## 1) Update Video + Replace File (multipart)

**Endpoint**  
`PATCH /api/videos/{storeId}`

**Content-Type**  
`multipart/form-data`

**Form Fields**
- `file` (optional, video file)
  - 파일이 포함되면 서버는 **video file/thumbnail/duration/size**를 재계산
- `storeName` (required)
- `placeId` (required)
- `address` (required)
- `lat` (required)
- `lng` (required)
- `description` (optional)
- `withFriends` (optional, string: `@alice @bob` 형태 가능)
- `muteYn` (optional, `Y` or `N`)
- `openYn` (optional, `Y` or `N`)
- `useYn` (optional, `Y` or `N`)

**Response 200**
```json
{
  "storeId": 123,
  "fileName": "foodvideos/2026/01/12/.../original.mp4",
  "thumbnail": "foodimages/2026/01/12/.../thumb300.jpg",
  "videoDuration": 120,
  "videoSize": 34883766,
  "updatedAt": "2026-01-12T10:10:00Z"
}
```

**Notes**
- `file`이 없으면 **메타만 수정**
- `file`이 있으면 **video metadata 재생성**

---

## 2) Update Video Metadata Only (JSON)

**Endpoint**  
`PATCH /api/videos/{storeId}`

**Content-Type**  
`application/json`

**Request Body**
```json
{
  "storeName": "홍대맛집",
  "placeId": "ChIJ...",
  "address": "서울 마포구 ...",
  "description": "내용 수정",
  "withFriends": "@alice @bob",
  "muteYn": "N",
  "openYn": "Y",
  "useYn": "Y"
}
```

**Response 200**
```json
{
  "ok": true
}
```

---

## 3) Error Cases

**401 Unauthorized**
```json
{
  "success": false,
  "message": "AUTH_REQUIRED"
}
```

**403 Forbidden** (Not owner)
```json
{
  "success": false,
  "message": "NOT_OWNER"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "message": "INVALID_INPUT"
}
```

---

## Recommended Server Behavior
1. `file` 포함 시: 파일 저장 + 썸네일 생성 + duration/size 갱신
2. `placeId/lat/lng/address` 갱신 시 `fp_310` 업데이트(없으면 생성)
3. `withFriends`는 문자열 그대로 저장하거나 파싱 처리
4. `updated_at` 갱신
*** End Patch");"}}
