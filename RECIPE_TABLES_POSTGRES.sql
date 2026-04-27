-- Recipe sample seed for PostgreSQL (insert only)
-- Usage:
--   psql -h <host> -U <user> -d <db_name> -f RECIPE_TABLES_POSTGRES.sql
--
-- Assumption:
--   fp_500 ~ fp_507 tables already exist.
--   fp_100.id exists optionally (if not, seed uses fallback user id 1).

BEGIN;

INSERT INTO fp_501 (name, sort_order)
VALUES
  ('한식', 1),
  ('양식', 2),
  ('일식', 3),
  ('디저트', 4),
  ('다이어트', 5)
ON CONFLICT (name) DO UPDATE
SET sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO fp_505 (name)
VALUES
  ('간편식'),
  ('혼밥'),
  ('고단백'),
  ('주말요리'),
  ('매콤')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_author_id BIGINT := 1;
  v_like_user_id BIGINT := 1;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'fp_100'
      AND column_name = 'id'
  ) THEN
    SELECT id INTO v_author_id
    FROM fp_100
    ORDER BY id
    LIMIT 1;

    IF v_author_id IS NULL THEN
      v_author_id := 1;
    END IF;

    SELECT id INTO v_like_user_id
    FROM fp_100
    ORDER BY id DESC
    LIMIT 1;

    IF v_like_user_id IS NULL THEN
      v_like_user_id := v_author_id;
    END IF;
  END IF;

  INSERT INTO fp_500 (
    author_id,
    title,
    slug,
    summary,
    content,
    servings,
    cook_time_min,
    difficulty,
    thumbnail_url,
    cover_url,
    view_count,
    like_count,
    is_published,
    published_at
  )
  VALUES
    (
      v_author_id,
      '토마토 파스타',
      'tomato-pasta',
      '집에서 만드는 기본 토마토 파스타',
      '팬 하나로 완성하는 토마토 파스타 레시피입니다.',
      2,
      20,
      'EASY',
      'https://cdn.example.com/recipes/tomato-pasta-thumb.jpg',
      'https://cdn.example.com/recipes/tomato-pasta-cover.jpg',
      124,
      18,
      TRUE,
      NOW()
    ),
    (
      v_author_id,
      '간장 닭볶음',
      'soy-chicken-stirfry',
      '짭조름한 간장 베이스 닭볶음',
      '단짠 비율을 맞춘 간장 닭볶음 레시피입니다.',
      3,
      35,
      'MEDIUM',
      'https://cdn.example.com/recipes/soy-chicken-thumb.jpg',
      'https://cdn.example.com/recipes/soy-chicken-cover.jpg',
      86,
      12,
      TRUE,
      NOW()
    ),
    (
      v_author_id,
      '두부 샐러드 볼',
      'tofu-salad-bowl',
      '가볍게 먹는 고단백 샐러드',
      '두부와 채소를 곁들인 샐러드 볼 레시피입니다.',
      1,
      15,
      'EASY',
      'https://cdn.example.com/recipes/tofu-salad-thumb.jpg',
      'https://cdn.example.com/recipes/tofu-salad-cover.jpg',
      55,
      9,
      TRUE,
      NOW()
    )
  ON CONFLICT (slug) DO UPDATE
  SET summary = EXCLUDED.summary,
      content = EXCLUDED.content,
      servings = EXCLUDED.servings,
      cook_time_min = EXCLUDED.cook_time_min,
      difficulty = EXCLUDED.difficulty,
      thumbnail_url = EXCLUDED.thumbnail_url,
      cover_url = EXCLUDED.cover_url,
      is_published = EXCLUDED.is_published,
      published_at = EXCLUDED.published_at,
      updated_at = NOW();

  INSERT INTO fp_502 (recipe_id, category_id)
  SELECT r.id, c.id
  FROM fp_500 r
  JOIN fp_501 c ON c.name = '양식'
  WHERE r.slug = 'tomato-pasta'
  ON CONFLICT DO NOTHING;

  INSERT INTO fp_502 (recipe_id, category_id)
  SELECT r.id, c.id
  FROM fp_500 r
  JOIN fp_501 c ON c.name = '한식'
  WHERE r.slug = 'soy-chicken-stirfry'
  ON CONFLICT DO NOTHING;

  INSERT INTO fp_502 (recipe_id, category_id)
  SELECT r.id, c.id
  FROM fp_500 r
  JOIN fp_501 c ON c.name = '다이어트'
  WHERE r.slug = 'tofu-salad-bowl'
  ON CONFLICT DO NOTHING;

  INSERT INTO fp_506 (recipe_id, tag_id)
  SELECT r.id, t.id
  FROM fp_500 r
  JOIN fp_505 t ON t.name = '간편식'
  WHERE r.slug = 'tomato-pasta'
  ON CONFLICT DO NOTHING;

  INSERT INTO fp_506 (recipe_id, tag_id)
  SELECT r.id, t.id
  FROM fp_500 r
  JOIN fp_505 t ON t.name = '주말요리'
  WHERE r.slug = 'soy-chicken-stirfry'
  ON CONFLICT DO NOTHING;

  INSERT INTO fp_506 (recipe_id, tag_id)
  SELECT r.id, t.id
  FROM fp_500 r
  JOIN fp_505 t ON t.name = '고단백'
  WHERE r.slug = 'tofu-salad-bowl'
  ON CONFLICT DO NOTHING;

  INSERT INTO fp_504 (recipe_id, name, quantity)
  SELECT r.id, x.name, x.quantity
  FROM fp_500 r
  JOIN (
    VALUES
      ('tomato-pasta', '스파게티면', '160g'),
      ('tomato-pasta', '토마토소스', '1컵'),
      ('tomato-pasta', '올리브오일', '1큰술'),
      ('soy-chicken-stirfry', '닭다리살', '500g'),
      ('soy-chicken-stirfry', '간장', '4큰술'),
      ('soy-chicken-stirfry', '다진마늘', '1큰술'),
      ('tofu-salad-bowl', '두부', '1모'),
      ('tofu-salad-bowl', '믹스채소', '2컵'),
      ('tofu-salad-bowl', '발사믹드레싱', '2큰술')
  ) AS x(slug, name, quantity) ON x.slug = r.slug
  WHERE NOT EXISTS (
    SELECT 1
    FROM fp_504 i
    WHERE i.recipe_id = r.id
      AND i.name = x.name
      AND COALESCE(i.quantity, '') = COALESCE(x.quantity, '')
  );

  INSERT INTO fp_503 (recipe_id, step_no, title, description, image_url)
  SELECT r.id, x.step_no, x.title, x.description, x.image_url
  FROM fp_500 r
  JOIN (
    VALUES
      ('tomato-pasta', 1, '면 삶기', '끓는 물에 소금을 넣고 면을 8분 삶아요.', NULL),
      ('tomato-pasta', 2, '소스 만들기', '팬에 오일과 토마토소스를 넣고 끓여요.', NULL),
      ('tomato-pasta', 3, '마무리', '면과 소스를 섞고 치즈를 뿌려 마무리해요.', NULL),
      ('soy-chicken-stirfry', 1, '밑간', '닭고기에 간장 1큰술과 후추를 넣고 10분 재워요.', NULL),
      ('soy-chicken-stirfry', 2, '볶기', '센 불에서 닭고기를 볶아 겉면을 익혀요.', NULL),
      ('soy-chicken-stirfry', 3, '소스', '간장, 물, 올리고당을 넣고 졸여 완성해요.', NULL),
      ('tofu-salad-bowl', 1, '두부 굽기', '두부를 노릇하게 구워 식혀요.', NULL),
      ('tofu-salad-bowl', 2, '채소 준비', '채소를 씻어 물기를 제거해요.', NULL),
      ('tofu-salad-bowl', 3, '담기', '그릇에 담고 드레싱을 뿌려 완성해요.', NULL)
  ) AS x(slug, step_no, title, description, image_url) ON x.slug = r.slug
  ON CONFLICT (recipe_id, step_no) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url;

  INSERT INTO fp_507 (recipe_id, user_id)
  SELECT r.id, v_like_user_id
  FROM fp_500 r
  WHERE r.slug IN ('tomato-pasta', 'soy-chicken-stirfry')
  ON CONFLICT (recipe_id, user_id) DO NOTHING;
END $$;

COMMIT;
