# PlateApp 프론트엔드용 DB 문서 (Draft)

이 문서는 **프론트에서 DB 테이블 정보를 조회/검색/열람**하기 위한 카탈로그입니다.

## 모듈별 테이블 맵

### Auth/계정
- `fp_100`: 회원 마스터: 계정/프로필/권한/FCM 토큰/비공개 설정 등 사용자 기본 정보
- `fp_103`: 리프레시 토큰 관리: 사용자/디바이스 단위로 refresh_token과 만료(expiry_date) 저장
- `fp_105`: 로그인 이력: 로그인 시도 결과(성공/실패), IP/디바이스/OS/앱버전 등 메타 기록
- `fp_120`: 이메일 인증 코드: 이메일 인증 코드 발급/검증/만료 관리
- `fp_101`: 회원 정보 변경 이력: before/after 스냅샷과 변경 타입(change_tp)을 기록

### Social Login
- `fp_110`: 소셜로그인 매핑: user_id와 provider/provider_user_id를 연결하여 소셜 계정을 연동

### Friends/차단
- `fp_150`: 친구관리: 친구 요청/수락 상태(pending/accepted 등) 및 메시지 기록
- `fp_160`: 차단 관계: blocker가 blocked를 차단한 기록
- `fp_200`: 친구랑 방문한 곳: 방문 날짜/가게/메모를 기록(연관 feed_id 저장 가능)

### 알림
- `fp_20`: 알림: 수신자(receiver)에게 전달되는 인앱 알림(타입/메시지/참조ID, 읽음 여부 포함)

### Map/Place
- `fp_310`: 장소/지오코딩 정보: place_id 기반 주소/위경도/타입을 저장하며 use_yn/deleted_at로 소프트 상태 관리
- `fp_005`: 사용자 활동지역 매핑(지역 마스터): region_name을 depth/parent_id로 계층(트리) 구성

### Video
- `fp_300`: 비디오 콘텐츠: 동영상 파일/썸네일, 장소(place_id)/주소/가게명, 공개(open_yn) 및 사용(use_yn)/삭제(deleted_at) 상태 포함
- `fp_301`: 비디오 정보 변경이력: store_id 대상 변경(before/after)과 변경 타입을 기록
- `fp_303`: 비디오 썸네일 시청이력: 사용자/게스트가 특정 동영상(store_id)을 조회/노출한 기록
- `fp_305`: 비디오 시청이력: 재생 세션 기반 시청 로그(재생시간/디바이스/품질/완료여부 등)
- `fp_50`: 동영상(비디오/스토어) 좋아요: 사용자가 특정 동영상(store_id)에 좋아요를 누른 기록. use_yn/deleted_at로 소프트 삭제/해제 처리.
- `fp_440`: 동영상(스토어) 댓글: 특정 동영상(store_id)에 사용자가 작성한 댓글. use_yn/deleted_at로 소프트 삭제 처리.
- `fp_450`: 동영상(스토어) 대댓글: fp_440 댓글(comment_id)에 달리는 답글. use_yn/deleted_at로 소프트 삭제 처리.
- `fp_320`: 메뉴 정보: 가게/장소 기반 메뉴 항목(가격/설명/이미지, feed_id/place_id 연동 가능)

### Image Feed
- `fp_400`: 이미지 피드 게시물: 다중 이미지(images), 장소(place_id)/가게명, 썸네일 포함. use_yn으로 노출/비노출 관리
- `fp_401`: 이미지 피드 변경 이력: feed_id 대상 변경 코드(change_code)와 before/after JSON 스냅샷 기록
- `fp_60`: 이미지 피드 좋아요: 사용자가 특정 이미지 피드(feed_id)에 좋아요를 누른 기록. use_yn/deleted_at로 소프트 삭제/해제 처리.
- `fp_460`: 이미지 피드 댓글: 특정 이미지 피드(feed_id)에 사용자가 작성한 댓글. use_yn/deleted_at로 소프트 삭제 처리.
- `fp_470`: 이미지 피드 대댓글: fp_460 댓글(comment_id)에 달리는 답글. use_yn/deleted_at로 소프트 삭제 처리.
- `fp_350`: 태그 저장: 가게(store_id) 또는 이미지 피드(feed_id)에 연결된 태그 문자열을 저장

### Guestbook
- `fp_360`: 방명록: 가게/피드/장소 기반 방명록 글(공개범위 visibility, 이미지 JSON, 숨김 is_hidden, 작성 메타 포함)

### Report
- `fp_40`: 신고: 사용자/콘텐츠 신고 접수 및 플래그 처리 상태 기록

### Filters/Personalization
- `fp_410`: 유저 피드 필터 설정: 사용자별 현재 적용 중인 필터/정렬/기간/지역/소스 설정을 저장
- `fp_411`: 유저 필터 조건 변경 이력: filter_type별 조건(condition_1~4)과 정렬코드 변경 히스토리

### Seasonal Food
- `fp_340`: 절기/월 기반 제철 음식 목록(카테고리, 음식명)
- `fp_341`: 절기 기간 정의(시작/종료 날짜)
- `fp_99`: 음식 종류별 카테고리(음식/메뉴 분류 마스터)

### Recipe
- `fp_500`: 레시피 마스터: 작성자/제목/요약/조리시간/난이도/게시상태/게시일/집계(조회/좋아요) 관리
- `fp_501`: 레시피 카테고리 마스터: 카테고리명과 정렬 순서 관리
- `fp_502`: 레시피-카테고리 매핑: 레시피와 카테고리의 N:N 연결
- `fp_503`: 레시피 조리 단계: step_no 순서 기반 단계별 설명/이미지 관리
- `fp_504`: 레시피 재료: 레시피별 재료명/수량 텍스트 관리
- `fp_505`: 레시피 태그 마스터: 태그 문자열 관리(유니크)
- `fp_506`: 레시피-태그 매핑: 레시피와 태그의 N:N 연결
- `fp_507`: 레시피 좋아요: 사용자별 좋아요 이력(중복 방지) 관리

### Codes
- `fp_code`: 공통 코드: group_code 내 code를 정의하고 use_yn로 사용 여부 관리

---

# 테이블 카드

## Auth/계정

## fp_100
**설명**: 회원 마스터: 계정/프로필/권한/FCM 토큰/비공개 설정 등 사용자 기본 정보

**UI에서 자주 보는 컬럼(추천 Top)**: `username`, `password`, `email`, `phone`, `role`, `created_at`

**주의/메모**
-

---

## fp_103
**설명**: 리프레시 토큰 관리: 사용자/디바이스 단위로 refresh_token과 만료(expiry_date) 저장

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `username`, `refresh_token`, `expiry_date`, `device_id`, `created_at`

**주의/메모**
-

---

## fp_105
**설명**: 로그인 이력: 로그인 시도 결과(성공/실패), IP/디바이스/OS/앱버전 등 메타 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `login_id`, `username`, `login_datetime`, `ip_address`, `login_status`, `fail_reason`

**주의/메모**
- 이력 생성 가능: 로그인/로그아웃 API가 성공·실패 여부를 기록

---

## fp_120
**설명**: 이메일 인증 코드: 이메일 인증 코드 발급/검증/만료 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `email`, `verification_code`, `is_verified`, `created_at`, `verified_at`

**주의/메모**
-

---

## fp_101
**설명**: 회원 정보 변경 이력: before/after 스냅샷과 변경 타입(change_tp)을 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `username`, `history_id`, `before_ex`, `after_ex`, `change_tp`, `created_dt`

**주의/메모**
- 이력 생성 가능: 프로필/계정 수정 API가 완료되면 필수로 적재

---

## Social Login

## fp_110
**설명**: 소셜로그인 매핑: user_id와 provider/provider_user_id를 연결하여 소셜 계정을 연동

**UI에서 자주 보는 컬럼(추천 Top)**: `social_id`, `user_id`, `provider`, `provider_user_id`, `email`, `display_name`

**주의/메모**
-

---

## Friends/차단

## fp_150
**설명**: 친구관리: 친구 요청/수락 상태(pending/accepted 등) 및 메시지 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `username`, `friend_name`, `status`, `created_at`, `updated_at`

**주의/메모**
-

---

## fp_160
**설명**: 차단 관계: blocker가 blocked를 차단한 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `blocker_username`, `blocked_username`, `blocked_at`

**주의/메모**
-

---

## fp_200
**설명**: 친구랑 방문한 곳: 방문 날짜/가게/메모를 기록(연관 feed_id 저장 가능)

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `username`, `friend_name`, `store_id`, `store_name`, `memo`

**주의/메모**
-

---

## 알림

## fp_20
**설명**: 알림: 수신자(receiver)에게 전달되는 인앱 알림(타입/메시지/참조ID, 읽음 여부 포함)

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `receiver_id`, `sender_id`, `type`, `reference_id`, `message`

**주의/메모**
-

---

## Map/Place

## fp_310
**설명**: 장소/지오코딩 정보: place_id 기반 주소/위경도/타입을 저장하며 use_yn/deleted_at로 소프트 상태 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `formatted_address`, `latitude`, `longitude`, `place_id`, `types`

**주의/메모**
- 지도/근처 검색 핵심: `place_id`, `latitude`, `longitude`, `types[]`.

---

## fp_005
**설명**: 사용자 활동지역 매핑(지역 마스터): region_name을 depth/parent_id로 계층(트리) 구성

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `region_name`, `depth`, `parent_id`

**주의/메모**
-

---

## Video

## fp_300
**설명**: 비디오 콘텐츠: 동영상 파일/썸네일, 장소(place_id)/주소/가게명, 공개(open_yn) 및 사용(use_yn)/삭제(deleted_at) 상태 포함

**UI에서 자주 보는 컬럼(추천 Top)**: `store_id`, `title`, `file_name`, `address`, `username`, `updated_at`

**주의/메모**
-

---

## fp_301
**설명**: 비디오 정보 변경이력: store_id 대상 변경(before/after)과 변경 타입을 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `change_hist_seq`, `store_id`, `change_name`, `change_tp`, `before_ex`, `after_ex`

**주의/메모**
- 이력 생성 가능: 영상 메타 편집/검수 승인 시 바로 적재

---

## fp_303
**설명**: 비디오 썸네일 시청이력: 사용자/게스트가 특정 동영상(store_id)을 조회/노출한 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `username`, `store_id`, `watched_at`, `guest_id`, `is_guest`

**주의/메모**
-

---

## fp_305
**설명**: 비디오 시청이력: 재생 세션 기반 시청 로그(재생시간/디바이스/품질/완료여부 등)

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `username`, `store_id`, `timestamp`, `duration_watched`, `device_info`

**주의/메모**
-

---

## fp_50
**설명**: 동영상(비디오/스토어) 좋아요: 사용자가 특정 동영상(store_id)에 좋아요를 누른 기록. use_yn/deleted_at로 소프트 삭제/해제 처리.

**UI에서 자주 보는 컬럼(추천 Top)**: `username`, `store_id`, `use_yn`, `deleted_at`, `created_at`, `updated_at`

**주의/메모**
- 좋아요는 로그인 사용자만 권장(guest면 401/로그인 유도).
- `use_yn`/`deleted_at` 소프트 상태를 화면에 같이 표기하면 운영이 편함.

---

## fp_440
**설명**: 동영상(스토어) 댓글: 특정 동영상(store_id)에 사용자가 작성한 댓글. use_yn/deleted_at로 소프트 삭제 처리.

**UI에서 자주 보는 컬럼(추천 Top)**: `comment_id`, `store_id`, `username`, `content`, `created_at`, `updated_at`

**주의/메모**
-

---

## fp_450
**설명**: 동영상(스토어) 대댓글: fp_440 댓글(comment_id)에 달리는 답글. use_yn/deleted_at로 소프트 삭제 처리.

**UI에서 자주 보는 컬럼(추천 Top)**: `reply_id`, `content`, `username`, `comment_id`, `created_at`, `updated_at`

**주의/메모**
-

---

## fp_320
**설명**: 메뉴 정보: 가게/장소 기반 메뉴 항목(가격/설명/이미지, feed_id/place_id 연동 가능)

**UI에서 자주 보는 컬럼(추천 Top)**: `item_id`, `store_id`, `item_name`, `price`, `description`, `menu_image`

**주의/메모**
-

---

## Image Feed

## fp_400
**설명**: 이미지 피드 게시물: 다중 이미지(images), 장소(place_id)/가게명, 썸네일 포함. use_yn으로 노출/비노출 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `feed_no`, `username`, `content`, `images`, `created_at`, `updated_at`

**주의/메모**
-

---

## fp_401
**설명**: 이미지 피드 변경 이력: feed_id 대상 변경 코드(change_code)와 before/after JSON 스냅샷 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `history_id`, `feed_id`, `username`, `change_code`, `before_info`, `after_info`

**주의/메모**
- 이력 생성 가능: 이미지 피드 편집/검수 종료 시 필수 기록

---

## fp_60
**설명**: 이미지 피드 좋아요: 사용자가 특정 이미지 피드(feed_id)에 좋아요를 누른 기록. use_yn/deleted_at로 소프트 삭제/해제 처리.

**UI에서 자주 보는 컬럼(추천 Top)**: `username`, `feed_id`, `use_yn`, `deleted_at`, `created_at`, `updated_at`

**주의/메모**
- 좋아요는 로그인 사용자만 권장(guest면 401/로그인 유도).
- `use_yn`/`deleted_at` 소프트 상태를 화면에 같이 표기하면 운영이 편함.

---

## fp_460
**설명**: 이미지 피드 댓글: 특정 이미지 피드(feed_id)에 사용자가 작성한 댓글. use_yn/deleted_at로 소프트 삭제 처리.

**UI에서 자주 보는 컬럼(추천 Top)**: `comment_id`, `feed_id`, `username`, `content`, `use_yn`, `deleted_at`

**주의/메모**
-

---

## fp_470
**설명**: 이미지 피드 대댓글: fp_460 댓글(comment_id)에 달리는 답글. use_yn/deleted_at로 소프트 삭제 처리.

**UI에서 자주 보는 컬럼(추천 Top)**: `reply_id`, `comment_id`, `username`, `content`, `use_yn`, `deleted_at`

**주의/메모**
-

---

## fp_350
**설명**: 태그 저장: 가게(store_id) 또는 이미지 피드(feed_id)에 연결된 태그 문자열을 저장

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `store_id`, `feed_id`, `tags`, `created_at`, `updated_at`

**주의/메모**
-

---

## Guestbook

## fp_360
**설명**: 방명록: 가게/피드/장소 기반 방명록 글(공개범위 visibility, 이미지 JSON, 숨김 is_hidden, 작성 메타 포함)

**UI에서 자주 보는 컬럼(추천 Top)**: `gb_id`, `store_id`, `feed_id`, `username`, `content`, `custom_images`

**주의/메모**
-

---

## Report

## fp_40
**설명**: 신고: 사용자/콘텐츠 신고 접수 및 플래그 처리 상태 기록

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `reporter_username`, `target_username`, `target_type`, `target_id`, `reason`

**주의/메모**
-

---

## Filters/Personalization

## fp_410
**설명**: 유저 피드 필터 설정: 사용자별 현재 적용 중인 필터/정렬/기간/지역/소스 설정을 저장

**UI에서 자주 보는 컬럼(추천 Top)**: `username`, `filter_type`, `image_yn`, `time_filter`, `region_filter`, `post_sorted`

**주의/메모**
-

---

## fp_411
**설명**: 유저 필터 조건 변경 이력: filter_type별 조건(condition_1~4)과 정렬코드 변경 히스토리

**UI에서 자주 보는 컬럼(추천 Top)**: `history_id`, `username`, `filter_type`, `condition_1`, `condition_2`, `condition_3`

**주의/메모**
-

---

## Seasonal Food

## fp_340
**설명**: 절기/월 기반 제철 음식 목록(카테고리, 음식명)

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `seasonal_term`, `month`, `category`, `food_name`

**주의/메모**
-

---

## fp_341
**설명**: 절기 기간 정의(시작/종료 날짜)

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `seasonal_term`, `start_date`, `end_date`

**주의/메모**
-

---

## fp_99
**설명**: 음식 종류별 카테고리(음식/메뉴 분류 마스터)

**UI에서 자주 보는 컬럼(추천 Top)**: `menu_id`, `name`, `category`

**주의/메모**
-

---

## Recipe

## fp_500
**설명**: 레시피 마스터: 작성자/제목/요약/본문/조리시간/난이도/게시상태/게시일/집계(조회수,좋아요) 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `author_id`, `title`, `summary`, `cook_time_min`, `published_at`

**주의/메모**
- 목록은 `is_published=1` 기준 노출 권장.

---

## fp_501
**설명**: 레시피 카테고리 마스터: 카테고리명과 정렬 순서 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `name`, `sort_order`

**주의/메모**
-

---

## fp_502
**설명**: 레시피-카테고리 매핑: 레시피와 카테고리의 N:N 연결

**UI에서 자주 보는 컬럼(추천 Top)**: `recipe_id`, `category_id`, `created_at`

**주의/메모**
- `recipe_id + category_id` 복합키/유니크 권장.

---

## fp_503
**설명**: 레시피 조리 단계: step_no 순서 기반 단계별 설명/이미지 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `recipe_id`, `step_no`, `title`, `description`, `image_url`

**주의/메모**
- 상세 화면 렌더링은 `step_no` 오름차순 권장.

---

## fp_504
**설명**: 레시피 재료: 레시피별 재료명/수량 텍스트 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `recipe_id`, `name`, `quantity`

**주의/메모**
-

---

## fp_505
**설명**: 레시피 태그 마스터: 태그 문자열 관리(유니크)

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `name`, `created_at`

**주의/메모**
- `name` 유니크 제약 권장.

---

## fp_506
**설명**: 레시피-태그 매핑: 레시피와 태그의 N:N 연결

**UI에서 자주 보는 컬럼(추천 Top)**: `recipe_id`, `tag_id`, `created_at`

**주의/메모**
- 태그 기반 검색 시 `tag_id` 인덱스 필수.

---

## fp_507
**설명**: 레시피 좋아요: 사용자별 좋아요 이력(중복 방지) 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `id`, `recipe_id`, `user_id`, `created_at`

**주의/메모**
- `recipe_id + user_id` 유니크 제약 권장.

---

## Codes

## fp_code
**설명**: 공통 코드: group_code 내 code를 정의하고 use_yn로 사용 여부 관리

**UI에서 자주 보는 컬럼(추천 Top)**: `code`, `group_code`, `use_yn`, `code_ex`, `group_code_ex`, `created_at`

**주의/메모**
- 프론트는 코드값 하드코딩 최소화: `group_code` 기준으로 내려받아 렌더링 권장.

---

# fp_code 코드 사전

## group_code=001 (기준정보 변경유형)
| code | use_yn | code_ex | created_at | updated_at |
|---|---|---|---|---|
| CD_001 | Y | 타이틀 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |
| CD_002 | Y | 주소 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |
| CD_003 | Y | 전화번호 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |
| CD_004 | Y | 카테고리 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |
| CD_005 | Y | 상세정보 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |
| CD_006 | Y | 주차정보 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |
| CD_007 | Y | 공개여부 변경 | 2024-11-24 10:00:39.601 | 2024-11-24 10:00:39.601 |

## group_code=002 (사용자정보 게시물필터)
| code | use_yn | code_ex | created_at | updated_at |
|---|---|---|---|---|
| CD_001 | Y | 최신순 | 2024-11-30 05:40:37.046 | 2024-11-30 05:40:37.046 |
| CD_002 | Y | 좋아요 높은 순 | 2024-11-30 05:41:17.347 | 2025-01-19 11:55:49.265 |
| CD_003 | Y | 댓글 많은 순 | 2024-11-30 05:41:32.086 | 2025-01-19 11:56:15.745 |
| CD_004 | Y | 조회수 높은 순 | 2024-11-30 05:41:53.723 | 2025-01-19 11:56:33.251 |

## group_code=003 (사용자 정보변경)
| code | use_yn | code_ex | created_at | updated_at |
|---|---|---|---|---|
| CD_001 | Y | 이메일 주소 변경 | 2024-12-08 13:00:50.685 | 2024-12-08 13:00:50.685 |
| CD_002 | Y | 전화번호 변경 | 2024-12-08 13:00:50.685 | 2024-12-08 13:00:50.685 |
| CD_003 | Y | 비밀번호 변경 | 2024-12-08 13:00:50.685 | 2024-12-08 13:00:50.685 |
| CD_004 | Y | 권한 변경 | 2024-12-08 13:00:50.685 | 2024-12-08 13:00:50.685 |
| CD_005 | Y | 활동지역 변경 | 2024-12-08 13:00:50.685 | 2024-12-08 13:00:50.685 |
| CD_006 | Y | 프로필이미지 변경 | 2024-12-08 13:00:50.685 | 2024-12-08 13:00:50.685 |
| CD_007 | Y | 회원탈퇴 | 2024-12-08 13:26:13.702 | 2025-03-24 19:00:20.074 |
| CD_008 | Y | 닉네임 변경 | 2025-01-19 22:53:33.728 | 2025-01-19 22:53:33.728 |
| CD_009 | Y | 닉네임 표출방식 변경 | 2025-01-19 22:53:50.720 | 2025-01-19 22:53:50.720 |
| CD_010 | Y | 회원가입 | 2025-03-24 19:07:03.905 | 2025-03-24 19:07:03.905 |

## group_code=004 (친구관계상태)
| code | use_yn | code_ex | created_at | updated_at |
|---|---|---|---|---|
| CD_001 | Y | 요청 | 2024-12-20 01:47:55.773 | 2024-12-20 01:47:55.773 |
| CD_002 | Y | 승인 | 2024-12-20 01:47:55.773 | 2024-12-20 01:47:55.773 |
| CD_003 | Y | 거절 | 2024-12-20 01:47:55.773 | 2024-12-20 01:47:55.773 |

## group_code=005 (사용자 계정 표출방식)
| code | use_yn | code_ex | created_at | updated_at |
|---|---|---|---|---|
| CD_001 | Y | 닉네임 | 2025-01-19 20:49:07.980 | 2025-01-19 20:49:07.980 |
| CD_002 | Y | 계정 | 2025-01-19 20:49:07.980 | 2025-01-19 20:49:07.980 |
| CD_003 | Y | 닉네임(계정) | 2025-01-19 20:49:07.980 | 2025-01-19 20:49:07.980 |
| CD_004 | Y | (계정)닉네임 | 2025-01-19 20:49:07.980 | 2025-01-19 20:49:07.980 |

## group_code=006 (홈화면표출방식코드)
| code | use_yn | code_ex | created_at | updated_at |
|---|---|---|---|---|
| CD_001 | Y | 최근 가장 Hot한 식당 | 2025-01-22 20:47:22.483 | 2025-01-22 20:47:22.483 |
| CD_002 | Y | 내 주변의 인기식당 | 2025-01-22 20:47:22.483 | 2025-01-22 20:47:22.483 |
| CD_003 | Y | 최근 좋아요가 가장 많은 식당 | 2025-01-22 20:47:22.483 | 2025-01-22 20:47:22.483 |
| CD_004 | Y | 주변에 예약 가능한 식당 | 2025-01-22 20:47:22.483 | 2025-01-22 20:47:22.483 |

---

# API 명세 초안 (이력 생성 관련)

## POST /api/auth/login-events
- **의미**: 로그인 시도 결과를 즉시 `fp_105`에 기록
- **요청**
  ```json
  {
    "username": "plate_master",
    "status": "SUCCESS",        // 또는 FAIL
    "ipAddress": "203.0.113.5",
    "deviceInfo": "iOS/18.1",
    "failReason": null
  }
  ```
- **응답**
  ```json
  { "id": 12345, "loggedAt": "2025-01-25T02:14:00Z" }
  ```

## POST /api/users/{username}/profile-history
- **연동 테이블**: `fp_101`
- **요청 본문**
  ```json
  {
    "changeType": "NICKNAME",
    "before": { "nickname": "old" },
    "after": { "nickname": "new" },
    "memo": "사용자가 마이페이지에서 변경"
  }
  ```
- **응답**: `{ "historyId": 9876 }`

## POST /api/videos/{storeId}/change-history
- **연동 테이블**: `fp_301`
- 영상 메타 편집/검수 완료 시 호출
- **요청 본문**
  ```json
  {
    "changeName": "title",
    "before": "이전 제목",
    "after": "새 제목",
    "changeType": "CD_001",
    "editor": "admin01"
  }
  ```
- **응답**: `{ "changeHistSeq": 442 }`

## POST /api/image-feeds/{feedId}/change-history
- **연동 테이블**: `fp_401`
- **요청 본문**
  ```json
  {
    "changeCode": "CD_002",
    "beforeInfo": { "content": "old" },
    "afterInfo": { "content": "new" },
    "moderator": "inspector02"
  }
  ```
- **응답**: `{ "historyId": 556 }`

> 위 4개 API는 “이력 생성 가능” 항목과 1:1 대응하며, 백엔드가 구현 시 각 테이블과 코드 그룹을 참고하면 됩니다.
