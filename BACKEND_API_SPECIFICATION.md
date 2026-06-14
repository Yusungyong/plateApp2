# PlateApp 백엔드 API 설계서

## 📋 개요

이 문서는 PlateApp 프론트엔드에서 필요한 **좋아요**와 **댓글/답글** 기능의 백엔드 API 명세서입니다.

- **우선순위**: Phase 1 (최우선)
- **영향도**: 높음 - 사용자 참여도를 높이는 핵심 기능
- **프론트엔드 준비 상태**: 완료 (UI 및 API 통합 코드 구현 완료)

---

## 📊 데이터베이스 스키마 참조

### 좋아요 테이블
- **fp_50**: 비디오 피드(스토어) 좋아요
- **fp_60**: 이미지 피드 좋아요

### 댓글/답글 테이블
- **fp_440**: 비디오 피드(스토어) 댓글
- **fp_450**: 비디오 피드(스토어) 답글
- **fp_460**: 이미지 피드 댓글
- **fp_470**: 이미지 피드 답글

### 공통 컬럼 구조

**좋아요 테이블 (fp_50, fp_60)**
```sql
- id: BIGINT (PK, AUTO_INCREMENT)
- username: VARCHAR (사용자명)
- store_id or feed_id: BIGINT (대상 ID)
- use_yn: CHAR(1) DEFAULT 'Y' (사용 여부, 소프트 삭제)
- deleted_at: TIMESTAMP NULL (삭제 일시)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**댓글 테이블 (fp_440, fp_460)**
```sql
- comment_id: BIGINT (PK, AUTO_INCREMENT)
- store_id or feed_id: BIGINT (대상 ID)
- username: VARCHAR (작성자)
- content: TEXT (댓글 내용)
- use_yn: CHAR(1) DEFAULT 'Y' (사용 여부)
- deleted_at: TIMESTAMP NULL (삭제 일시)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**답글 테이블 (fp_450, fp_470)**
```sql
- reply_id: BIGINT (PK, AUTO_INCREMENT)
- comment_id: BIGINT (FK, 부모 댓글 ID)
- username: VARCHAR (작성자)
- content: TEXT (답글 내용)
- use_yn: CHAR(1) DEFAULT 'Y' (사용 여부)
- deleted_at: TIMESTAMP NULL (삭제 일시)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

---

## 🔐 인증 및 공통 사항

### 인증 방식
- **Bearer Token** 사용
- 모든 요청 헤더에 `Authorization: Bearer {token}` 필수

### 공통 응답 포맷

**성공 응답**
```json
{
  "success": true,
  "data": {...}
}
```

**에러 응답**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적 에러 메시지"
  }
}
```

### 페이지네이션
모든 리스트 API는 다음 쿼리 파라미터를 지원:
- `limit` (기본값: 20, 최대: 100)
- `offset` (기본값: 0)

응답에 페이지네이션 정보 포함:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## ❤️ 1. 좋아요 시스템

### 1.1 비디오 피드(스토어) 좋아요 토글

**테이블**: `fp_50`

**Endpoint**: `POST /api/stores/{storeId}/likes/toggle`

**설명**: 비디오 피드에 좋아요를 추가하거나 취소합니다. 토글 방식으로 동작합니다.

**Request**
```http
POST /api/stores/123/likes/toggle
Authorization: Bearer {token}
Content-Type: application/json
```

**Response**
```json
{
  "success": true,
  "isLiked": true,
  "likeCount": 42
}
```

**비즈니스 로직**
1. 현재 사용자(username)와 `storeId`로 fp_50 테이블 조회
2. 레코드가 없거나 `use_yn='N'`인 경우:
   - 새 레코드 생성 또는 `use_yn='Y'`, `deleted_at=NULL`로 업데이트
   - `isLiked=true` 반환
3. 레코드가 있고 `use_yn='Y'`인 경우:
   - `use_yn='N'`, `deleted_at=현재시간`으로 업데이트 (소프트 삭제)
   - `isLiked=false` 반환
4. 해당 `storeId`의 전체 좋아요 수 계산 (`use_yn='Y'` AND `deleted_at IS NULL`)
5. `likeCount` 반환

**에러 케이스**
- `401 Unauthorized`: 인증 토큰 없음 또는 만료
- `404 Not Found`: 존재하지 않는 storeId
- `500 Internal Server Error`: 서버 오류

---

### 1.2 비디오 피드 좋아요 상태 조회

**Endpoint**: `GET /api/stores/{storeId}/likes/status`

**Request**
```http
GET /api/stores/123/likes/status
Authorization: Bearer {token}
```

**Response**
```json
{
  "isLiked": true,
  "likeCount": 42
}
```

**비즈니스 로직**
1. 현재 사용자가 해당 `storeId`에 좋아요를 눌렀는지 확인 (`use_yn='Y'` AND `deleted_at IS NULL`)
2. 전체 좋아요 수 조회
3. 결과 반환

---

### 1.3 비디오 피드 좋아요한 사용자 목록

**Endpoint**: `GET /api/stores/{storeId}/likes/users`

**Request**
```http
GET /api/stores/123/likes/users?limit=20&offset=0
Authorization: Bearer {token}
```

**Query Parameters**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response**
```json
{
  "data": [
    {
      "username": "john_doe",
      "nickname": "John",
      "profileImageUrl": "https://example.com/profile.jpg",
      "activeRegion": "서울시 강남구",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**비즈니스 로직**
1. fp_50 테이블에서 `store_id={storeId}` AND `use_yn='Y'` AND `deleted_at IS NULL` 조건으로 조회
2. fp_100 (사용자 테이블)과 JOIN하여 사용자 정보 가져오기
3. `created_at` DESC 정렬 (최근 좋아요한 순)
4. 페이지네이션 적용
5. 결과 반환

---

### 1.4 이미지 피드 좋아요 토글

**테이블**: `fp_60`

**Endpoint**: `POST /api/image-feeds/{feedId}/likes/toggle`

**Request**
```http
POST /api/image-feeds/456/likes/toggle
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "isLiked": true,
  "likeCount": 28
}
```

**비즈니스 로직**: 비디오 피드와 동일 (테이블만 fp_60 사용)

---

### 1.5 이미지 피드 좋아요 상태 조회

**Endpoint**: `GET /api/image-feeds/{feedId}/likes/status`

**Request**
```http
GET /api/image-feeds/456/likes/status
Authorization: Bearer {token}
```

**Response**
```json
{
  "isLiked": false,
  "likeCount": 28
}
```

---

### 1.6 이미지 피드 좋아요한 사용자 목록

**Endpoint**: `GET /api/image-feeds/{feedId}/likes/users`

**Request**
```http
GET /api/image-feeds/456/likes/users?limit=20&offset=0
Authorization: Bearer {token}
```

**Response**: 비디오 피드와 동일한 포맷

---

## 💬 2. 댓글/답글 시스템

### 공통 타입 정의

```typescript
type Comment = {
  commentId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  useYn: string;
  deletedAt?: string | null;
  replyCount: number;
  isOwner: boolean;
};

type Reply = {
  replyId: number;
  commentId: number;
  username: string;
  nickname?: string | null;
  profileImageUrl?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  useYn: string;
  deletedAt?: string | null;
  isOwner: boolean;
};
```

---

### 2.1 비디오 피드 댓글 목록 조회

**테이블**: `fp_440`

**Endpoint**: `GET /api/stores/{storeId}/comments`

**Request**
```http
GET /api/stores/123/comments?limit=20&offset=0
Authorization: Bearer {token}
```

**Query Parameters**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response**
```json
{
  "data": [
    {
      "commentId": 1,
      "username": "john_doe",
      "nickname": "John",
      "profileImageUrl": "https://example.com/profile.jpg",
      "content": "정말 멋진 영상이네요!",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": null,
      "useYn": "Y",
      "deletedAt": null,
      "replyCount": 3,
      "isOwner": false
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

**비즈니스 로직**
1. fp_440 테이블에서 `store_id={storeId}` AND `use_yn='Y'` AND `deleted_at IS NULL` 조건으로 조회
2. fp_100 (사용자 테이블)과 JOIN하여 사용자 정보 가져오기
3. 각 댓글의 답글 개수 계산 (fp_450에서 `use_yn='Y'` AND `deleted_at IS NULL`)
4. `isOwner`: 현재 사용자와 댓글 작성자가 같으면 true
5. `created_at` DESC 정렬 (최신순)
6. 페이지네이션 적용
7. 결과 반환

---

### 2.2 비디오 피드 댓글 작성

**Endpoint**: `POST /api/stores/{storeId}/comments`

**Request**
```http
POST /api/stores/123/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "정말 멋진 영상이네요!"
}
```

**Response**
```json
{
  "commentId": 1,
  "username": "john_doe",
  "nickname": "John",
  "profileImageUrl": "https://example.com/profile.jpg",
  "content": "정말 멋진 영상이네요!",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": null,
  "useYn": "Y",
  "deletedAt": null,
  "replyCount": 0,
  "isOwner": true
}
```

**검증**
- `content`: 필수, 1자 이상 500자 이하

**비즈니스 로직**
1. 입력 검증
2. fp_440 테이블에 새 레코드 생성
   - `store_id`, `username`, `content`
   - `use_yn='Y'`, `deleted_at=NULL`
3. 생성된 댓글 정보와 사용자 정보 JOIN하여 반환

---

### 2.3 비디오 피드 댓글 수정

**Endpoint**: `PUT /api/stores/{storeId}/comments/{commentId}`

**Request**
```http
PUT /api/stores/123/comments/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "수정된 댓글 내용입니다."
}
```

**Response**
```json
{
  "commentId": 1,
  "username": "john_doe",
  "nickname": "John",
  "profileImageUrl": "https://example.com/profile.jpg",
  "content": "수정된 댓글 내용입니다.",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "useYn": "Y",
  "deletedAt": null,
  "replyCount": 0,
  "isOwner": true
}
```

**권한 체크**
- 댓글 작성자(username)와 현재 사용자가 일치해야 함
- 일치하지 않으면 `403 Forbidden` 반환

**비즈니스 로직**
1. 권한 확인
2. `content`와 `updated_at` 업데이트
3. 수정된 댓글 정보 반환

---

### 2.4 비디오 피드 댓글 삭제

**Endpoint**: `DELETE /api/stores/{storeId}/comments/{commentId}`

**Request**
```http
DELETE /api/stores/123/comments/1
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true
}
```

**권한 체크**: 수정과 동일

**비즈니스 로직**
1. 권한 확인
2. **소프트 삭제**: `use_yn='N'`, `deleted_at=현재시간`으로 업데이트
3. **CASCADE**: 해당 댓글의 모든 답글도 소프트 삭제 (fp_450에서 `comment_id={commentId}`)
4. 성공 응답 반환

---

### 2.5 비디오 피드 답글 목록 조회

**테이블**: `fp_450`

**Endpoint**: `GET /api/stores/{storeId}/comments/{commentId}/replies`

**Request**
```http
GET /api/stores/123/comments/1/replies?limit=20&offset=0
Authorization: Bearer {token}
```

**Response**
```json
{
  "data": [
    {
      "replyId": 1,
      "commentId": 1,
      "username": "jane_smith",
      "nickname": "Jane",
      "profileImageUrl": "https://example.com/jane.jpg",
      "content": "저도 동감해요!",
      "createdAt": "2024-01-15T10:35:00Z",
      "updatedAt": null,
      "useYn": "Y",
      "deletedAt": null,
      "isOwner": false
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

**비즈니스 로직**
1. fp_450 테이블에서 `comment_id={commentId}` AND `use_yn='Y'` AND `deleted_at IS NULL` 조회
2. fp_100과 JOIN하여 사용자 정보 가져오기
3. `isOwner` 계산
4. `created_at` ASC 정렬 (오래된 순)
5. 페이지네이션 적용

---

### 2.6 비디오 피드 답글 작성

**Endpoint**: `POST /api/stores/{storeId}/comments/{commentId}/replies`

**Request**
```http
POST /api/stores/123/comments/1/replies
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "저도 동감해요!"
}
```

**Response**
```json
{
  "replyId": 1,
  "commentId": 1,
  "username": "jane_smith",
  "nickname": "Jane",
  "profileImageUrl": "https://example.com/jane.jpg",
  "content": "저도 동감해요!",
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": null,
  "useYn": "Y",
  "deletedAt": null,
  "isOwner": true
}
```

**비즈니스 로직**
1. 입력 검증
2. 부모 댓글(commentId) 존재 여부 확인
3. fp_450 테이블에 새 레코드 생성
4. 생성된 답글 정보 반환

---

### 2.7 비디오 피드 답글 수정

**Endpoint**: `PUT /api/stores/{storeId}/comments/{commentId}/replies/{replyId}`

**Request**
```http
PUT /api/stores/123/comments/1/replies/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "수정된 답글입니다."
}
```

**Response**: 답글 객체 (`updatedAt` 포함)

---

### 2.8 비디오 피드 답글 삭제

**Endpoint**: `DELETE /api/stores/{storeId}/comments/{commentId}/replies/{replyId}`

**Request**
```http
DELETE /api/stores/123/comments/1/replies/1
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true
}
```

**비즈니스 로직**
1. 권한 확인
2. **소프트 삭제**: `use_yn='N'`, `deleted_at=현재시간`
3. 성공 응답

---

### 2.9-2.16 이미지 피드 댓글/답글 API

이미지 피드의 댓글/답글 API는 비디오 피드와 **동일한 구조**이며, URL과 테이블만 다릅니다:

**URL 패턴**
- `POST /api/image-feeds/{feedId}/comments`
- `GET /api/image-feeds/{feedId}/comments`
- `PUT /api/image-feeds/{feedId}/comments/{commentId}`
- `DELETE /api/image-feeds/{feedId}/comments/{commentId}`
- `POST /api/image-feeds/{feedId}/comments/{commentId}/replies`
- `GET /api/image-feeds/{feedId}/comments/{commentId}/replies`
- `PUT /api/image-feeds/{feedId}/comments/{commentId}/replies/{replyId}`
- `DELETE /api/image-feeds/{feedId}/comments/{commentId}/replies/{replyId}`

**테이블**
- 댓글: `fp_460`
- 답글: `fp_470`

---

## 🔍 에러 코드 정의

### 인증/권한 (4xx)
- `AUTH_REQUIRED` (401): 인증이 필요합니다
- `INVALID_TOKEN` (401): 유효하지 않은 토큰입니다
- `TOKEN_EXPIRED` (401): 토큰이 만료되었습니다
- `FORBIDDEN` (403): 권한이 없습니다 (본인 댓글이 아님)

### 유효성 검증 (4xx)
- `INVALID_INPUT` (400): 잘못된 입력입니다
- `MISSING_REQUIRED_FIELD` (400): 필수 필드가 누락되었습니다
- `CONTENT_TOO_LONG` (400): 내용이 너무 깁니다 (500자 초과)
- `CONTENT_EMPTY` (400): 내용이 비어있습니다

### 리소스 (4xx)
- `NOT_FOUND` (404): 리소스를 찾을 수 없습니다
- `STORE_NOT_FOUND` (404): 존재하지 않는 storeId입니다
- `FEED_NOT_FOUND` (404): 존재하지 않는 feedId입니다
- `COMMENT_NOT_FOUND` (404): 존재하지 않는 commentId입니다

### 서버 (5xx)
- `INTERNAL_SERVER_ERROR` (500): 서버 내부 오류가 발생했습니다
- `DATABASE_ERROR` (500): 데이터베이스 오류가 발생했습니다

---

## 📈 성능 고려사항

### 1. 인덱싱
```sql
-- fp_50 (비디오 좋아요)
CREATE INDEX idx_fp50_store_user ON fp_50(store_id, username);
CREATE INDEX idx_fp50_user ON fp_50(username);
CREATE INDEX idx_fp50_created ON fp_50(created_at DESC);

-- fp_60 (이미지 좋아요)
CREATE INDEX idx_fp60_feed_user ON fp_60(feed_id, username);
CREATE INDEX idx_fp60_user ON fp_60(username);
CREATE INDEX idx_fp60_created ON fp_60(created_at DESC);

-- fp_440 (비디오 댓글)
CREATE INDEX idx_fp440_store ON fp_440(store_id);
CREATE INDEX idx_fp440_user ON fp_440(username);
CREATE INDEX idx_fp440_created ON fp_440(created_at DESC);

-- fp_450 (비디오 답글)
CREATE INDEX idx_fp450_comment ON fp_450(comment_id);
CREATE INDEX idx_fp450_user ON fp_450(username);
CREATE INDEX idx_fp450_created ON fp_450(created_at ASC);

-- fp_460 (이미지 댓글)
CREATE INDEX idx_fp460_feed ON fp_460(feed_id);
CREATE INDEX idx_fp460_user ON fp_460(username);
CREATE INDEX idx_fp460_created ON fp_460(created_at DESC);

-- fp_470 (이미지 답글)
CREATE INDEX idx_fp470_comment ON fp_470(comment_id);
CREATE INDEX idx_fp470_user ON fp_470(username);
CREATE INDEX idx_fp470_created ON fp_470(created_at ASC);
```

### 2. 쿼리 최적화
- 좋아요 수 조회 시 COUNT() 대신 집계 테이블 또는 Redis 캐싱 고려
- 댓글 목록 조회 시 N+1 문제 방지 (JOIN 사용)
- `use_yn='Y' AND deleted_at IS NULL` 조건은 항상 함께 사용

### 3. 캐싱 전략
- 좋아요 수: Redis에 1분간 캐싱
- 댓글 수: Redis에 30초간 캐싱
- 사용자 프로필 정보: 5분간 캐싱

---

## 🔒 보안 고려사항

### 1. 권한 검증
- 모든 수정/삭제 요청에서 작성자 확인 필수
- SQL Injection 방지: Prepared Statement 사용

### 2. Rate Limiting
- 좋아요 토글: 10회/분
- 댓글 작성: 5회/분
- 답글 작성: 10회/분

### 3. 입력 검증
- 댓글/답글 내용: HTML 태그 제거 또는 이스케이프
- XSS 공격 방지

---

## 📋 테스트 케이스

### 좋아요 시스템
- [ ] 좋아요 추가 성공
- [ ] 좋아요 취소 성공
- [ ] 중복 토글 시 올바른 동작
- [ ] 존재하지 않는 storeId/feedId에 좋아요 시 404
- [ ] 인증되지 않은 사용자의 좋아요 시 401
- [ ] 소프트 삭제된 좋아요는 카운트에서 제외

### 댓글/답글 시스템
- [ ] 댓글 작성 성공
- [ ] 댓글 수정 성공 (본인만)
- [ ] 댓글 삭제 성공 (본인만)
- [ ] 답글 작성 성공
- [ ] 답글 수정 성공 (본인만)
- [ ] 답글 삭제 성공 (본인만)
- [ ] 댓글 삭제 시 답글 CASCADE 삭제
- [ ] 타인의 댓글 수정/삭제 시도 시 403
- [ ] 빈 content로 작성 시 400
- [ ] 500자 초과 content 작성 시 400
- [ ] 소프트 삭제된 댓글/답글은 목록에서 제외

---

## 🚀 구현 우선순위

### Phase 1 (필수 - 1주)
1. 비디오 피드 좋아요 API (토글, 상태, 사용자 목록)
2. 이미지 피드 좋아요 API (토글, 상태, 사용자 목록)

### Phase 2 (핵심 - 1주)
3. 비디오 피드 댓글 CRUD
4. 비디오 피드 답글 CRUD

### Phase 3 (완성 - 1주)
5. 이미지 피드 댓글 CRUD
6. 이미지 피드 답글 CRUD

---

## 📝 프론트엔드 통합 상태

### 완료된 작업
✅ API 클라이언트 함수 작성 완료
- `src/api/likesApi.ts`
- `src/api/commentsApi.ts`

✅ 커스텀 훅 작성 완료
- `src/hooks/useLike.ts` (Optimistic UI 지원)
- `src/hooks/useComments.ts` (페이지네이션 지원)

✅ UI 컴포넌트 통합 완료
- `VideoReelItem.tsx`: 좋아요 훅 통합
- `VideoOverlayUI.tsx`: 좋아요/댓글 UI
- `ViewerOverlays.tsx`: 이미지 피드 좋아요 UI
- `VideoLikesModal.tsx`: 좋아요한 사용자 목록
- `ImageLikesModal.tsx`: 좋아요한 사용자 목록

### 백엔드 구현 후 즉시 작동 가능
백엔드 API가 이 명세서대로 구현되면 프론트엔드는 **추가 코드 수정 없이** 즉시 작동합니다.

---

## 📞 문의사항

API 구현 중 질문이나 변경 요청이 있으면 프론트엔드 팀에 문의해주세요.

**작성일**: 2026-01-15
**버전**: 1.0
**작성자**: PlateApp Frontend Team
