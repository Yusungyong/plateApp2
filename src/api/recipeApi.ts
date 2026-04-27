import api from './axiosInstance';

export type RecipeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type RecipeCategory = {
  id: number;
  name: string;
  sortOrder?: number;
};

export type RecipeListItem = {
  id: number;
  title: string;
  summary?: string | null;
  thumbnailUrl?: string | null;
  cookTimeMin?: number | null;
  difficulty?: RecipeDifficulty | null;
  likeCount?: number;
  viewCount?: number;
  publishedAt?: string | null;
};

export type RecipeListResponse = {
  page: number;
  size: number;
  total: number;
  items: RecipeListItem[];
};

export type RecipeDetail = {
  id: number;
  title: string;
  summary?: string | null;
  content?: string | null;
  thumbnailUrl?: string | null;
  coverUrl?: string | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  difficulty?: RecipeDifficulty | null;
  categories?: RecipeCategory[];
  tags?: Array<{ id: number; name: string }>;
  ingredients?: Array<{ name: string; quantity?: string | null }>;
  steps?: Array<{
    stepNo: number;
    title?: string | null;
    description: string;
    imageUrl?: string | null;
  }>;
  likeCount?: number;
  viewCount?: number;
  createdAt?: string;
  publishedAt?: string | null;
};

const unwrap = (data: any) => data?.data ?? data ?? {};

export const fetchRecipeCategories = async (): Promise<RecipeCategory[]> => {
  const res = await api.get('/api/recipes/categories');
  const payload = unwrap(res.data);
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  return items.map((item: any) => ({
    id: Number(item.id),
    name: String(item.name ?? ''),
    sortOrder:
      typeof item.sortOrder === 'number'
        ? item.sortOrder
        : typeof item.sort_order === 'number'
          ? item.sort_order
          : undefined,
  }));
};

export const fetchRecipes = async (params: {
  q?: string;
  categoryId?: number;
  sort?: 'RECENT' | 'POPULAR';
  page?: number;
  size?: number;
}): Promise<RecipeListResponse> => {
  const res = await api.get('/api/recipes', { params });
  const payload = unwrap(res.data);
  return {
    page: payload.page ?? 0,
    size: payload.size ?? params.size ?? 20,
    total: payload.total ?? payload.totalElements ?? 0,
    items: Array.isArray(payload.items) ? payload.items : [],
  };
};

export const fetchRecipeDetail = async (recipeId: number): Promise<RecipeDetail> => {
  const res = await api.get(`/api/recipes/${recipeId}`);
  return unwrap(res.data);
};
