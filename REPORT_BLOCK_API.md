# Report & Block API (Frontend ↔ Backend)

이 문서는 **신고(fp_40)**, **차단(fp_160)** 기능을 위한 API 명세입니다.  
프론트에서 필요한 최소 필드만 사용하도록 작성했습니다.

---

## 1) 신고 생성 (fp_40)

**Endpoint**  
`POST /api/reports`

**Headers**  
`Authorization: Bearer {access_token}`  
`Content-Type: application/json`

**Request Body**
```json
{
  "targetType": "video",
  "targetId": 123,
  "targetUsername": "writer1",
  "reason": "SPAM"
}
```

**Fields**
- `targetType`: `video | image | comment | user` (필수)
- `targetId`: 대상 콘텐츠 ID (필수)
- `targetUsername`: 대상 사용자명 (옵션)
- `reason`: 신고 사유 코드 (필수)
  - 예시: `SPAM`, `INAPPROPRIATE`, `COPYRIGHT`, `OTHER`

**Response**
```json
{
  "ok": true,
  "reportId": 555
}
```

**DB 매핑 (fp_40)**
- `reporter_username` ← 토큰에서 추출
- `target_username` ← targetUsername
- `target_type` ← targetType
- `target_id` ← targetId
- `reason` ← reason
- `created_at` ← 서버 생성

---

## 2) 차단 생성 (fp_160)

**Endpoint**  
`POST /api/blocks`

**Headers**  
`Authorization: Bearer {access_token}`  
`Content-Type: application/json`

**Request Body**
```json
{
  "blockedUsername": "writer1"
}
```

**Response**
```json
{
  "ok": true
}
```

**DB 매핑 (fp_160)**
- `blocker_username` ← 토큰에서 추출
- `blocked_username` ← blockedUsername
- `blocked_at` ← 서버 생성

---

## (선택) 차단 해제

**Endpoint**  
`DELETE /api/blocks/{blockedUsername}`

**Response**
```json
{
  "ok": true
}
```

---

## 프론트 사용 흐름

1) **점 세개 → 신고**  
  - 사유 선택 → `POST /api/reports`

2) **점 세개 → 차단**  
  - 확인 → `POST /api/blocks`

