# Recipe API Request (Draft)

This document defines the minimal backend contract for the new Recipe tab.

## 1) Tables (proposal)

### recipe
Table name: `fp_500`
- `id` (PK, bigint)
- `author_id` (FK -> fp_100.id)
- `title` (varchar)
- `slug` (varchar, unique, optional)
- `summary` (varchar, optional)
- `content` (text, optional)
- `servings` (int, optional)
- `cook_time_min` (int, optional)
- `difficulty` (enum: EASY|MEDIUM|HARD, optional)
- `thumbnail_url` (varchar, optional)
- `cover_url` (varchar, optional)
- `view_count` (int, default 0)
- `like_count` (int, default 0)
- `is_published` (boolean, default true)
- `published_at` (timestamp, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes
- `(created_at)`
- `(published_at)`
- `(is_published, created_at)`
- `(view_count)`
- `(like_count)`

### recipe_category
Table name: `fp_501`
- `id` (PK, bigint)
- `name` (varchar)
- `sort_order` (int, default 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### recipe_category_map
Table name: `fp_502`
- `recipe_id` (FK -> fp_500.id)
- `category_id` (FK -> fp_501.id)
- `created_at` (timestamp)

Index
- `(category_id, recipe_id)`
- `(recipe_id, category_id)`

### recipe_step
Table name: `fp_503`
- `id` (PK, bigint)
- `recipe_id` (FK -> fp_500.id)
- `step_no` (int)
- `title` (varchar, optional)
- `description` (text)
- `image_url` (varchar, optional)

Index
- `(recipe_id, step_no)`

### recipe_ingredient
Table name: `fp_504`
- `id` (PK, bigint)
- `recipe_id` (FK -> fp_500.id)
- `name` (varchar)
- `quantity` (varchar, optional)  // "1컵", "2큰술" 등

Index
- `(recipe_id)`

### recipe_like (optional for v1)
Table name: `fp_507`
- `id` (PK, bigint)
- `recipe_id` (FK -> fp_500.id)
- `user_id` (FK -> fp_100.id)
- `created_at` (timestamp)

Unique
- `(recipe_id, user_id)`

### recipe_tag
Table name: `fp_505`
- `id` (PK, bigint)
- `name` (varchar)
- `created_at` (timestamp)

Unique
- `(name)`

### recipe_tag_map
Table name: `fp_506`
- `recipe_id` (FK -> fp_500.id)
- `tag_id` (FK -> fp_505.id)
- `created_at` (timestamp)

Index
- `(tag_id, recipe_id)`
- `(recipe_id, tag_id)`

## 2) Endpoints

### 2-1) Categories
`GET /api/recipes/categories`

Response
```json
{
  "items": [
    { "id": 1, "name": "한식", "sortOrder": 0 }
  ]
}
```

### 2-2) Recipe list (for tabs)
`GET /api/recipes`

Query params
- `q` (string, optional)
- `categoryId` (number, optional)
- `sort` (string, optional): `RECENT` | `POPULAR`
- `page` (number, optional, default 0)
- `size` (number, optional, default 20)

Response
```json
{
  "page": 0,
  "size": 20,
  "total": 120,
  "items": [
    {
      "id": 101,
      "title": "토마토 파스타",
      "summary": "집에서 만드는 레스토랑 맛",
      "thumbnailUrl": "https://cdn.example.com/recipe/101.jpg",
      "cookTimeMin": 20,
      "difficulty": "EASY",
      "likeCount": 12,
      "viewCount": 340
    }
  ]
}
```

### 2-3) Recipe detail
`GET /api/recipes/{recipeId}`

Response
```json
{
  "id": 101,
  "title": "토마토 파스타",
  "summary": "집에서 만드는 레스토랑 맛",
  "content": "간단한 소개 텍스트...",
  "thumbnailUrl": "https://cdn.example.com/recipe/101.jpg",
  "coverUrl": "https://cdn.example.com/recipe/101-cover.jpg",
  "cookTimeMin": 20,
  "servings": 2,
  "difficulty": "EASY",
  "categories": [{ "id": 1, "name": "양식" }],
  "tags": [{ "id": 1, "name": "간편식" }],
  "ingredients": [
    { "name": "스파게티면", "quantity": "100g" },
    { "name": "토마토소스", "quantity": "1컵" }
  ],
  "steps": [
    { "stepNo": 1, "description": "물 1L를 끓인다.", "imageUrl": null },
    { "stepNo": 2, "description": "면을 8분 삶는다.", "imageUrl": null }
  ],
  "likeCount": 12,
  "viewCount": 340,
  "createdAt": "2025-01-02T12:34:56Z"
}
```

### 2-4) Recipe search (optional)
If search tab should query recipes:
`GET /api/recipes/search?q=...`

## 3) Notes
- `is_published=false` recipes should not appear in list.
- `viewCount` can be incremented on detail view (server-side).
- If likes are not implemented yet, keep `likeCount=0`.

## 4) SQL DDL (MySQL 8.0)

Assumptions
- DB: MySQL 8.0+
- Existing user table: `fp_100(id)` (if your user table PK/name is different, change FK target)
- Charset/collation: `utf8mb4`

```sql
CREATE TABLE IF NOT EXISTS fp_500 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  author_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NULL,
  summary VARCHAR(500) NULL,
  content TEXT NULL,
  servings INT NULL,
  cook_time_min INT NULL,
  difficulty ENUM('EASY','MEDIUM','HARD') NULL,
  thumbnail_url VARCHAR(1024) NULL,
  cover_url VARCHAR(1024) NULL,
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_slug (slug),
  KEY idx_recipe_created_at (created_at),
  KEY idx_recipe_published_at (published_at),
  KEY idx_recipe_pub_created (is_published, created_at),
  KEY idx_recipe_view_count (view_count),
  KEY idx_recipe_like_count (like_count),
  CONSTRAINT fk_fp_500_author FOREIGN KEY (author_id) REFERENCES fp_100(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_501 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_502 (
  recipe_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (recipe_id, category_id),
  KEY idx_recipe_category_map_cat_recipe (category_id, recipe_id),
  CONSTRAINT fk_fp_502_recipe FOREIGN KEY (recipe_id) REFERENCES fp_500(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_502_category FOREIGN KEY (category_id) REFERENCES fp_501(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_503 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  recipe_id BIGINT NOT NULL,
  step_no INT NOT NULL,
  title VARCHAR(255) NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(1024) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_step_no (recipe_id, step_no),
  KEY idx_recipe_step_recipe_no (recipe_id, step_no),
  CONSTRAINT fk_fp_503_recipe FOREIGN KEY (recipe_id) REFERENCES fp_500(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_504 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  recipe_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recipe_ingredient_recipe (recipe_id),
  CONSTRAINT fk_fp_504_recipe FOREIGN KEY (recipe_id) REFERENCES fp_500(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_505 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_506 (
  recipe_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (recipe_id, tag_id),
  KEY idx_recipe_tag_map_tag_recipe (tag_id, recipe_id),
  CONSTRAINT fk_fp_506_recipe FOREIGN KEY (recipe_id) REFERENCES fp_500(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_506_tag FOREIGN KEY (tag_id) REFERENCES fp_505(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fp_507 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  recipe_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_like_recipe_user (recipe_id, user_id),
  KEY idx_recipe_like_user (user_id),
  CONSTRAINT fk_fp_507_recipe FOREIGN KEY (recipe_id) REFERENCES fp_500(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_507_user FOREIGN KEY (user_id) REFERENCES fp_100(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 5) PostgreSQL One-shot Script

- Script file: `RECIPE_TABLES_POSTGRES.sql`
- Run:
```bash
psql -h <host> -U <user> -d <db_name> -f RECIPE_TABLES_POSTGRES.sql
```
