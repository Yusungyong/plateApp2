# Report History API (Frontend ↔ Backend)

신고 내역 조회를 위한 API 명세입니다.

---

## 1) 신고 내역 조회

**Endpoint**  
`GET /api/reports`

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
      "reportId": 555,
      "targetType": "video",
      "targetId": 123,
      "targetUsername": "writer1",
      "reason": "SPAM",
      "description": "가게명/추가 내용",
      "placeId": "ChIJ...",
      "storeName": "맛집 브이로그",
      "thumbnail": "https://...",
      "status": "RECEIVED",
      "createdAt": "2026-01-20T12:30:00",
      "resolvedAt": null
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Fields**
- `reportId`: 신고 ID
- `targetType`: `video | image | comment | user`
- `targetId`: 대상 ID
- `targetUsername`: 대상 사용자명 (옵션)
- `placeId`: 영상 신고일 때 이동에 필요한 placeId (옵션)
- `storeName`: 영상/이미지 제목 또는 가게명 (옵션)
- `thumbnail`: 미리보기 이미지 (옵션)
- `reason`: 신고 사유(코드 또는 기타 입력값)
- `description`: 기타 입력 상세 (옵션)
- `status`: 처리 상태 (예: `RECEIVED`, `IN_REVIEW`, `DONE`)
- `createdAt`: 신고 생성 시각
- `resolvedAt`: 처리 완료 시각

---

## DB 매핑 (fp_40)
- `report_id` → reportId
- `target_type` → targetType
- `target_id` → targetId
- `target_username` → targetUsername
- `reason` → reason
- `description` → description
- `status` → status
- `created_at` → createdAt
- `resolved_at` → resolvedAt
