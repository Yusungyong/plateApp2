# Database Columns Export

Generated from:

```sql
SELECT
    table_schema,
    table_name,
    ordinal_position,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY
    table_schema,
    table_name,
    ordinal_position;
```

Total tables: 45
Total columns: 381

## public.fp_005

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_005_id_seq'::regclass)` |
| 2 | region_name | character varying | 100 |  |  | NO | `` |
| 3 | depth | smallint |  | 16 | 0 | NO | `` |
| 4 | parent_id | integer |  | 32 | 0 | YES | `` |

## public.fp_100

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | username | character varying | 50 |  |  | NO | `` |
| 2 | password | character varying | 255 |  |  | YES | `` |
| 3 | email | character varying | 50 |  |  | YES | `` |
| 4 | phone | character varying | 12 |  |  | YES | `` |
| 5 | role | character varying | 3 |  |  | YES | `` |
| 6 | created_at | date |  |  |  | YES | `` |
| 7 | updated_at | date |  |  |  | YES | `` |
| 8 | active_region | character varying | 255 |  |  | YES | `` |
| 9 | profile_image_url | character varying | 255 |  |  | YES | `` |
| 10 | nick_name | character varying | 255 |  |  | YES | `` |
| 11 | code | character varying | 6 |  |  | YES | `` |
| 12 | fcm_token | text |  |  |  | YES | `` |
| 13 | is_private | boolean |  |  |  | YES | `false` |
| 14 | user_id | integer |  | 32 | 0 | NO | `nextval('fp_100_user_id_seq'::regclass)` |

## public.fp_101

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | username | character varying | 255 |  |  | NO | `` |
| 2 | history_id | bigint |  | 64 | 0 | NO | `nextval('fp_101_history_id_seq'::regclass)` |
| 3 | before_ex | text |  |  |  | YES | `` |
| 4 | after_ex | text |  |  |  | YES | `` |
| 5 | change_tp | character varying | 50 |  |  | NO | `` |
| 6 | created_dt | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |

## public.fp_103

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_103_id_seq'::regclass)` |
| 2 | username | character varying | 255 |  |  | NO | `` |
| 3 | refresh_token | text |  |  |  | NO | `` |
| 4 | expiry_date | timestamp with time zone |  |  |  | NO | `` |
| 5 | device_id | character varying | 255 |  |  | YES | `` |
| 6 | created_at | timestamp with time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |

## public.fp_105

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | login_id | bigint |  | 64 | 0 | NO | `nextval('member_login_history_login_id_seq'::regclass)` |
| 2 | username | character varying | 100 |  |  | NO | `` |
| 3 | login_datetime | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 4 | ip_address | character varying | 45 |  |  | YES | `` |
| 5 | login_status | character varying | 10 |  |  | NO | `` |
| 6 | fail_reason | text |  |  |  | YES | `` |
| 7 | device_model | character varying | 100 |  |  | YES | `` |
| 8 | os | character varying | 20 |  |  | YES | `` |
| 9 | os_version | character varying | 20 |  |  | YES | `` |
| 10 | app_version | character varying | 20 |  |  | YES | `` |
| 11 | device_id | character varying | 100 |  |  | YES | `` |
| 12 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |

## public.fp_110

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | social_id | integer |  | 32 | 0 | NO | `nextval('fp_110_social_id_seq'::regclass)` |
| 2 | user_id | integer |  | 32 | 0 | NO | `` |
| 3 | provider | character varying | 30 |  |  | NO | `` |
| 4 | provider_user_id | character varying | 255 |  |  | NO | `` |
| 5 | email | character varying | 255 |  |  | YES | `` |
| 6 | display_name | character varying | 255 |  |  | YES | `` |
| 7 | created_at | timestamp with time zone |  |  |  | YES | `now()` |

## public.fp_120

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_120_id_seq'::regclass)` |
| 2 | email | character varying | 255 |  |  | NO | `` |
| 3 | verification_code | character varying | 6 |  |  | NO | `` |
| 4 | is_verified | boolean |  |  |  | YES | `false` |
| 5 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 6 | verified_at | timestamp without time zone |  |  |  | YES | `` |
| 7 | expires_at | timestamp without time zone |  |  |  | YES | `(CURRENT_TIMESTAMP + '00:10:00'::interval)` |

## public.fp_150

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_150_id_seq'::regclass)` |
| 2 | username | character varying | 20 |  |  | NO | `` |
| 3 | friend_name | character varying | 20 |  |  | NO | `` |
| 4 | status | character varying | 20 |  |  | NO | `'pending'::character varying` |
| 5 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 6 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 7 | initiator_username | character varying | 20 |  |  | YES | `` |
| 8 | message | text |  |  |  | YES | `` |
| 9 | accepted_at | timestamp without time zone |  |  |  | YES | `` |

## public.fp_160

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_160_id_seq'::regclass)` |
| 2 | blocker_username | character varying | 50 |  |  | NO | `` |
| 3 | blocked_username | character varying | 50 |  |  | NO | `` |
| 4 | blocked_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |

## public.fp_20

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_20_id_seq'::regclass)` |
| 2 | receiver_id | character varying | 50 |  |  | NO | `` |
| 3 | sender_id | character varying | 50 |  |  | YES | `` |
| 4 | type | character varying | 50 |  |  | NO | `` |
| 5 | reference_id | bigint |  | 64 | 0 | YES | `` |
| 6 | message | text |  |  |  | NO | `` |
| 7 | is_read | boolean |  |  |  | YES | `false` |
| 8 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 9 | comment_id | bigint |  | 64 | 0 | YES | `` |
| 10 | reply_id | bigint |  | 64 | 0 | YES | `` |

## public.fp_200

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_200_id_seq'::regclass)` |
| 2 | username | character varying | 100 |  |  | NO | `` |
| 3 | friend_name | character varying | 100 |  |  | NO | `` |
| 4 | store_id | integer |  | 32 | 0 | YES | `` |
| 5 | store_name | character varying | 255 |  |  | NO | `` |
| 6 | memo | text |  |  |  | YES | `` |
| 7 | visit_date | date |  |  |  | NO | `CURRENT_DATE` |
| 8 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 9 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 10 | address | character varying | 255 |  |  | YES | `` |
| 11 | feed_id | bigint |  | 64 | 0 | NO | `0` |

## public.fp_30

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_30_id_seq'::regclass)` |
| 2 | title | character varying | 200 |  |  | NO | `` |
| 3 | content | text |  |  |  | YES | `` |
| 4 | image_url | text |  |  |  | YES | `` |
| 5 | place_id | character varying | 100 |  |  | YES | `` |
| 6 | post_type | character varying | 20 |  |  | NO | `` |
| 7 | start_date | timestamp without time zone |  |  |  | YES | `` |
| 8 | end_date | timestamp without time zone |  |  |  | YES | `` |
| 9 | created_at | timestamp without time zone |  |  |  | YES | `now()` |
| 10 | updated_at | timestamp without time zone |  |  |  | YES | `now()` |
| 11 | is_active | boolean |  |  |  | YES | `true` |
| 12 | username | character varying | 50 |  |  | YES | `` |
| 15 | images | text |  |  |  | YES | `` |
| 16 | main_content | jsonb |  |  |  | YES | `` |

## public.fp_300

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | store_id | integer |  | 32 | 0 | NO | `` |
| 2 | title | character varying | 255 |  |  | YES | `` |
| 3 | file_name | character varying | 255 |  |  | YES | `` |
| 4 | address | character varying | 255 |  |  | YES | `` |
| 5 | username | character varying | 20 |  |  | NO | `` |
| 9 | updated_at | date |  |  |  | NO | `CURRENT_TIMESTAMP` |
| 10 | created_at | date |  |  |  | NO | `CURRENT_TIMESTAMP` |
| 11 | thumbnail | character varying | 255 |  |  | YES | `` |
| 14 | store_name | character varying | 50 |  |  | YES | `` |
| 16 | open_yn | character | 1 |  |  | YES | `'Y'::bpchar` |
| 19 | use_yn | character | 1 |  |  | NO | `'Y'::bpchar` |
| 20 | deleted_at | date |  |  |  | YES | `` |
| 22 | place_id | character varying | 255 |  |  | YES | `` |
| 23 | video_duration | integer |  | 32 | 0 | YES | `` |
| 24 | mute_yn | character varying | 1 |  |  | YES | `'N'::character varying` |
| 25 | video_size | numeric |  | 10 | 2 | YES | `` |

## public.fp_301

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | change_hist_seq | bigint |  | 64 | 0 | NO | `nextval('change_hist_seq'::regclass)` |
| 2 | store_id | bigint |  | 64 | 0 | NO | `` |
| 3 | change_name | character varying | 255 |  |  | NO | `` |
| 4 | change_tp | character varying | 50 |  |  | NO | `` |
| 5 | before_ex | text |  |  |  | YES | `` |
| 6 | after_ex | text |  |  |  | YES | `` |
| 7 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |

## public.fp_303

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_303_id_seq'::regclass)` |
| 2 | username | character varying | 50 |  |  | NO | `` |
| 3 | store_id | bigint |  | 64 | 0 | NO | `` |
| 4 | watched_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |
| 5 | guest_id | character varying | 100 |  |  | YES | `` |
| 6 | is_guest | boolean |  |  |  | NO | `false` |

## public.fp_305

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_305_id_seq'::regclass)` |
| 2 | username | character varying | 20 |  |  | NO | `` |
| 3 | store_id | integer |  | 32 | 0 | NO | `` |
| 4 | timestamp | timestamp with time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 5 | duration_watched | integer |  | 32 | 0 | YES | `` |
| 6 | device_info | character varying | 255 |  |  | YES | `` |
| 7 | ip_address | character varying | 45 |  |  | YES | `` |
| 8 | session_id | character varying | 255 |  |  | YES | `` |
| 9 | video_quality | character varying | 10 |  |  | YES | `` |
| 10 | completion_status | boolean |  |  |  | YES | `` |
| 11 | comments | text |  |  |  | YES | `` |
| 12 | use_yn | character | 1 |  |  | NO | `'N'::bpchar` |
| 13 | deleted_at | date |  |  |  | YES | `` |
| 14 | user_id | integer |  | 32 | 0 | YES | `` |

## public.fp_310

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_310_id_seq'::regclass)` |
| 2 | formatted_address | character varying | 255 |  |  | YES | `` |
| 3 | latitude | double precision |  | 53 |  | YES | `` |
| 4 | longitude | double precision |  | 53 |  | YES | `` |
| 5 | place_id | character varying | 255 |  |  | YES | `` |
| 6 | types | ARRAY |  |  |  | YES | `` |
| 7 | street_number | character varying | 50 |  |  | YES | `` |
| 8 | route | character varying | 255 |  |  | YES | `` |
| 9 | locality | character varying | 255 |  |  | YES | `` |
| 10 | administrative_area_level_1 | character varying | 255 |  |  | YES | `` |
| 11 | administrative_area_level_2 | character varying | 255 |  |  | YES | `` |
| 12 | country | character varying | 255 |  |  | YES | `` |
| 13 | postal_code | character varying | 50 |  |  | YES | `` |
| 15 | use_yn | character | 1 |  |  | NO | `'N'::bpchar` |
| 16 | deleted_at | date |  |  |  | YES | `` |

## public.fp_320

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | item_id | character varying |  |  |  | NO | `nextval('fp_320_item_id_seq'::regclass)` |
| 2 | store_id | integer |  | 32 | 0 | YES | `` |
| 3 | item_name | character varying | 255 |  |  | NO | `` |
| 4 | price | character varying | 7 |  |  | NO | `` |
| 5 | description | text |  |  |  | YES | `` |
| 6 | menu_image | character varying | 255 |  |  | YES | `` |
| 7 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 8 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 9 | use_yn | character | 1 |  |  | NO | `'N'::bpchar` |
| 10 | deleted_at | date |  |  |  | YES | `` |
| 11 | feed_id | integer |  | 32 | 0 | YES | `` |
| 12 | menu_title | character varying | 255 |  |  | YES | `` |
| 13 | place_id | character varying | 255 |  |  | YES | `` |
| 14 | store_name | character varying | 255 |  |  | YES | `` |

## public.fp_340

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_340_id_seq'::regclass)` |
| 2 | seasonal_term | character varying | 20 |  |  | NO | `` |
| 3 | month | integer |  | 32 | 0 | NO | `` |
| 4 | category | character varying | 20 |  |  | NO | `` |
| 5 | food_name | character varying | 50 |  |  | NO | `` |

## public.fp_341

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_341_id_seq'::regclass)` |
| 2 | seasonal_term | character varying | 20 |  |  | NO | `` |
| 3 | start_date | date |  |  |  | NO | `` |
| 4 | end_date | date |  |  |  | NO | `` |

## public.fp_350

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_350_id_seq'::regclass)` |
| 2 | store_id | integer |  | 32 | 0 | YES | `0` |
| 3 | feed_id | integer |  | 32 | 0 | YES | `0` |
| 4 | tags | character varying | 255 |  |  | NO | `` |
| 5 | created_at | timestamp without time zone |  |  |  | NO | `now()` |
| 6 | updated_at | timestamp without time zone |  |  |  | NO | `now()` |

## public.fp_360

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | gb_id | bigint |  | 64 | 0 | NO | `nextval('fp_360_gb_id_seq'::regclass)` |
| 2 | store_id | bigint |  | 64 | 0 | YES | `` |
| 3 | feed_id | bigint |  | 64 | 0 | NO | `` |
| 4 | username | character varying | 50 |  |  | NO | `` |
| 5 | content | text |  |  |  | NO | `` |
| 6 | custom_images | jsonb |  |  |  | NO | `'[]'::jsonb` |
| 7 | visibility | USER-DEFINED |  |  |  | NO | `'public'::guestbook_visibility` |
| 8 | created_at | timestamp with time zone |  |  |  | NO | `now()` |
| 9 | updated_at | timestamp with time zone |  |  |  | NO | `now()` |
| 10 | target_username | text |  |  |  | YES | `` |
| 11 | display_image | text |  |  |  | YES | `` |
| 12 | store_name | text |  |  |  | YES | `` |
| 13 | place_id | text |  |  |  | YES | `` |
| 14 | is_hidden | boolean |  |  |  | NO | `false` |
| 15 | writer_profile_image | text |  |  |  | YES | `` |
| 16 | write_ip | inet |  |  |  | YES | `` |
| 17 | user_agent | text |  |  |  | YES | `` |

## public.fp_40

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | integer |  | 32 | 0 | NO | `nextval('fp_40_id_seq'::regclass)` |
| 2 | reporter_username | character varying | 50 |  |  | NO | `` |
| 3 | target_username | character varying | 50 |  |  | NO | `` |
| 4 | target_type | character varying | 30 |  |  | NO | `` |
| 5 | target_id | integer |  | 32 | 0 | NO | `` |
| 6 | reason | text |  |  |  | YES | `` |
| 7 | submitted_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 8 | target_flag | character | 1 |  |  | NO | `'Y'::bpchar` |
| 9 | unflagged_at | timestamp without time zone |  |  |  | YES | `` |

## public.fp_400

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | feed_no | integer |  | 32 | 0 | NO | `nextval('fp_400_feed_no_seq'::regclass)` |
| 2 | username | character varying | 50 |  |  | NO | `` |
| 3 | content | text |  |  |  | NO | `` |
| 4 | images | text |  |  |  | YES | `` |
| 5 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 6 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 7 | feed_title | character varying | 255 |  |  | YES | `` |
| 8 | location | character varying | 50 |  |  | YES | `` |
| 9 | store_name | character varying | 50 |  |  | YES | `` |
| 10 | place_id | character varying | 255 |  |  | YES | `` |
| 11 | use_yn | character varying | 1 |  |  | NO | `'Y'::character varying` |
| 12 | thumbnail | character varying | 255 |  |  | YES | `` |

## public.fp_401

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | history_id | bigint |  | 64 | 0 | NO | `nextval('fp_401_history_id_seq'::regclass)` |
| 2 | feed_id | bigint |  | 64 | 0 | NO | `` |
| 3 | username | text |  |  |  | NO | `` |
| 4 | change_code | smallint |  | 16 | 0 | NO | `` |
| 5 | before_info | jsonb |  |  |  | NO | `` |
| 6 | after_info | jsonb |  |  |  | NO | `` |
| 7 | ip_addr | inet |  |  |  | YES | `` |
| 8 | created_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_410

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | username | character varying | 50 |  |  | NO | `` |
| 2 | filter_type | character varying | 50 |  |  | NO | `` |
| 3 | image_yn | character varying | 10 |  |  | NO | `` |
| 4 | time_filter | character varying | 10 |  |  | YES | `` |
| 5 | region_filter | character varying | 10 |  |  | YES | `` |
| 6 | post_sorted | character varying | 10 |  |  | YES | `` |
| 7 | sort_code | integer |  | 32 | 0 | YES | `` |
| 8 | created_at | timestamp with time zone |  |  |  | YES | `now()` |
| 9 | updated_at | timestamp with time zone |  |  |  | YES | `now()` |
| 10 | post_source | character varying | 20 |  |  | YES | `` |

## public.fp_411

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | history_id | integer |  | 32 | 0 | NO | `nextval('fp_411_history_id_seq'::regclass)` |
| 2 | username | character varying | 50 |  |  | NO | `` |
| 3 | filter_type | character varying | 50 |  |  | NO | `` |
| 4 | condition_1 | character varying | 10 |  |  | YES | `` |
| 5 | condition_2 | character varying | 10 |  |  | YES | `` |
| 6 | condition_3 | character varying | 10 |  |  | YES | `` |
| 7 | condition_4 | character varying | 10 |  |  | YES | `` |
| 8 | sort_code | integer |  | 32 | 0 | YES | `` |
| 9 | created_at | timestamp with time zone |  |  |  | YES | `now()` |

## public.fp_440

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | comment_id | integer |  | 32 | 0 | NO | `nextval('fp_440_comment_id_seq'::regclass)` |
| 2 | store_id | integer |  | 32 | 0 | NO | `` |
| 3 | username | character varying | 255 |  |  | NO | `` |
| 4 | content | text |  |  |  | NO | `` |
| 5 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 6 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 8 | use_yn | character varying | 1 |  |  | NO | `'Y'::bpchar` |
| 9 | deleted_at | date |  |  |  | YES | `` |
| 10 | user_id | integer |  | 32 | 0 | YES | `` |

## public.fp_450

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | reply_id | integer |  | 32 | 0 | NO | `nextval('fp_450_reply_id_seq'::regclass)` |
| 2 | content | text |  |  |  | NO | `` |
| 3 | username | character varying | 50 |  |  | NO | `` |
| 4 | comment_id | integer |  | 32 | 0 | NO | `` |
| 5 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 6 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 7 | use_yn | character varying | 1 |  |  | YES | `'Y'::bpchar` |
| 8 | deleted_at | timestamp without time zone |  |  |  | YES | `` |

## public.fp_460

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | comment_id | integer |  | 32 | 0 | NO | `nextval('fp_460_comment_id_seq'::regclass)` |
| 2 | feed_id | integer |  | 32 | 0 | NO | `` |
| 3 | username | character varying | 255 |  |  | NO | `` |
| 4 | content | text |  |  |  | NO | `` |
| 5 | use_yn | character | 1 |  |  | NO | `'Y'::bpchar` |
| 6 | deleted_at | timestamp without time zone |  |  |  | YES | `` |
| 7 | created_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |
| 8 | updated_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |

## public.fp_470

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | reply_id | integer |  | 32 | 0 | NO | `nextval('fp_470_reply_id_seq'::regclass)` |
| 2 | comment_id | integer |  | 32 | 0 | NO | `` |
| 3 | username | character varying | 255 |  |  | NO | `` |
| 4 | content | text |  |  |  | NO | `` |
| 5 | use_yn | character | 1 |  |  | NO | `'Y'::bpchar` |
| 6 | deleted_at | timestamp without time zone |  |  |  | YES | `` |
| 7 | created_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |
| 8 | updated_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |

## public.fp_50

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | username | character varying | 50 |  |  | NO | `` |
| 2 | store_id | integer |  | 32 | 0 | NO | `` |
| 3 | use_yn | character | 1 |  |  | NO | `'N'::bpchar` |
| 4 | deleted_at | date |  |  |  | YES | `` |
| 5 | created_at | timestamp without time zone |  |  |  | YES | `` |
| 6 | updated_at | timestamp without time zone |  |  |  | YES | `` |
| 7 | user_id | integer |  | 32 | 0 | YES | `` |

## public.fp_500

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_500_id_seq'::regclass)` |
| 2 | author_id | bigint |  | 64 | 0 | NO | `` |
| 3 | title | character varying | 255 |  |  | NO | `` |
| 4 | slug | character varying | 255 |  |  | YES | `` |
| 5 | summary | character varying | 500 |  |  | YES | `` |
| 6 | content | text |  |  |  | YES | `` |
| 7 | servings | integer |  | 32 | 0 | YES | `` |
| 8 | cook_time_min | integer |  | 32 | 0 | YES | `` |
| 9 | difficulty | character varying | 10 |  |  | YES | `` |
| 10 | thumbnail_url | character varying | 1024 |  |  | YES | `` |
| 11 | cover_url | character varying | 1024 |  |  | YES | `` |
| 12 | view_count | integer |  | 32 | 0 | NO | `0` |
| 13 | like_count | integer |  | 32 | 0 | NO | `0` |
| 14 | is_published | boolean |  |  |  | NO | `true` |
| 15 | published_at | timestamp with time zone |  |  |  | YES | `` |
| 16 | created_at | timestamp with time zone |  |  |  | NO | `now()` |
| 17 | updated_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_501

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_501_id_seq'::regclass)` |
| 2 | name | character varying | 100 |  |  | NO | `` |
| 3 | sort_order | integer |  | 32 | 0 | NO | `0` |
| 4 | created_at | timestamp with time zone |  |  |  | NO | `now()` |
| 5 | updated_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_502

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | recipe_id | bigint |  | 64 | 0 | NO | `` |
| 2 | category_id | bigint |  | 64 | 0 | NO | `` |
| 3 | created_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_503

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_503_id_seq'::regclass)` |
| 2 | recipe_id | bigint |  | 64 | 0 | NO | `` |
| 3 | step_no | integer |  | 32 | 0 | NO | `` |
| 4 | title | character varying | 255 |  |  | YES | `` |
| 5 | description | text |  |  |  | NO | `` |
| 6 | image_url | character varying | 1024 |  |  | YES | `` |

## public.fp_504

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_504_id_seq'::regclass)` |
| 2 | recipe_id | bigint |  | 64 | 0 | NO | `` |
| 3 | name | character varying | 255 |  |  | NO | `` |
| 4 | quantity | character varying | 100 |  |  | YES | `` |
| 5 | created_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_505

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_505_id_seq'::regclass)` |
| 2 | name | character varying | 100 |  |  | NO | `` |
| 3 | created_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_506

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | recipe_id | bigint |  | 64 | 0 | NO | `` |
| 2 | tag_id | bigint |  | 64 | 0 | NO | `` |
| 3 | created_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_507

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | id | bigint |  | 64 | 0 | NO | `nextval('fp_507_id_seq'::regclass)` |
| 2 | recipe_id | bigint |  | 64 | 0 | NO | `` |
| 3 | user_id | bigint |  | 64 | 0 | NO | `` |
| 4 | created_at | timestamp with time zone |  |  |  | NO | `now()` |

## public.fp_60

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | username | character varying | 255 |  |  | NO | `` |
| 2 | feed_id | integer |  | 32 | 0 | NO | `nextval('fp_60_feed_id_seq'::regclass)` |
| 3 | use_yn | character | 1 |  |  | NO | `` |
| 4 | deleted_at | timestamp without time zone |  |  |  | YES | `` |
| 5 | created_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |
| 6 | updated_at | timestamp without time zone |  |  |  | NO | `CURRENT_TIMESTAMP` |

## public.fp_900

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | faq_id | integer |  | 32 | 0 | NO | `nextval('fp_900_faq_id_seq'::regclass)` |
| 2 | username | character varying | 20 |  |  | NO | `` |
| 3 | category | character varying | 50 |  |  | NO | `` |
| 4 | title | character varying | 200 |  |  | NO | `` |
| 5 | answer | text |  |  |  | NO | `` |
| 6 | is_pinned | boolean |  |  |  | NO | `false` |
| 7 | view_count | integer |  | 32 | 0 | NO | `0` |
| 8 | display_order | integer |  | 32 | 0 | NO | `0` |
| 9 | status_code | character varying | 20 |  |  | NO | `'published'::character varying` |
| 10 | created_at | timestamp without time zone |  |  |  | NO | `now()` |
| 11 | updated_at | timestamp without time zone |  |  |  | NO | `now()` |

## public.fp_901

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | qna_id | integer |  | 32 | 0 | NO | `nextval('fp_901_qna_id_seq'::regclass)` |
| 2 | username | character varying | 20 |  |  | YES | `` |
| 3 | guest_name | character varying | 100 |  |  | YES | `` |
| 4 | guest_email | character varying | 255 |  |  | YES | `` |
| 5 | category | character varying | 50 |  |  | NO | `` |
| 6 | question | text |  |  |  | NO | `` |
| 7 | answer | text |  |  |  | YES | `` |
| 8 | status_code | character varying | 20 |  |  | NO | `'received'::character varying` |
| 9 | is_public | boolean |  |  |  | NO | `true` |
| 10 | created_at | timestamp without time zone |  |  |  | NO | `now()` |
| 11 | updated_at | timestamp without time zone |  |  |  | NO | `now()` |
| 12 | answered_at | timestamp without time zone |  |  |  | YES | `` |

## public.fp_99

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | menu_id | integer |  | 32 | 0 | NO | `nextval('fp_99_menu_id_seq'::regclass)` |
| 2 | name | character varying | 100 |  |  | NO | `` |
| 3 | category | character varying | 255 |  |  | YES | `` |

## public.fp_code

| Ordinal | Column | Data Type | Char Length | Numeric Precision | Numeric Scale | Nullable | Default |
|---:|---|---|---:|---:|---:|---|---|
| 1 | code | character varying | 6 |  |  | NO | `` |
| 2 | group_code | character varying | 3 |  |  | NO | `` |
| 3 | use_yn | character | 1 |  |  | YES | `'Y'::bpchar` |
| 4 | code_ex | character varying | 100 |  |  | YES | `` |
| 5 | group_code_ex | character varying | 100 |  |  | YES | `` |
| 6 | created_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
| 7 | updated_at | timestamp without time zone |  |  |  | YES | `CURRENT_TIMESTAMP` |
