# Blocked Users API (Frontend ↔ Backend)

차단 사용자 목록/해제를 위한 API 명세입니다.

---

## 1) 차단 목록 조회

**Endpoint**  
`GET /api/blocks`

**Headers**  
`Authorization: Bearer {access_token}`

**Query**
- `limit` (number, optional, default 20)
- `offset` (number, optional, default 0)

**Response**
```json
{
  "items": [
    {
      "blockedUsername": "user123",
      "blockedNickname": "홍길동",
      "blockedProfileImageUrl": "https://...",
      "blockedActiveRegion": "서울 강남구",
      "blockedAt": "2026-01-20T10:20:30"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**DB 매핑 (fp_160 + fp_100)**
- `blocker_username` ← 토큰에서 추출
- `blocked_username` ← blockedUsername
- `blocked_at` ← blockedAt
- `fp_100.nick_name` → blockedNickname
- `fp_100.profile_image_url` → blockedProfileImageUrl
- `fp_100.active_region` → blockedActiveRegion

---

## 2) 차단 해제

**Endpoint**  
`DELETE /api/blocks/{blockedUsername}`

**Headers**  
`Authorization: Bearer {access_token}`

**Response**
```json
{
  "ok": true
}
```

---

## 3) 차단 생성 (기존)

**Endpoint**  
`POST /api/blocks`

**Headers**  
`Authorization: Bearer {access_token}`  
`Content-Type: application/json`

**Request Body**
```json
{
  "blockedUsername": "user123"
}
```

**Response**
```json
{
  "ok": true
}
```
