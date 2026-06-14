import { getGuestParams } from './guestParams';

export type RecommendationSurface =
  | 'HOME_FEED'
  | 'NEARBY'
  | 'SEASONAL'
  | 'FRIEND'
  | 'STORE_DETAIL_SIMILAR';

export type RecommendationTargetType =
  | 'STORE'
  | 'IMAGE_FEED'
  | 'VIDEO_FEED'
  | 'SEASONAL_MENU';

export type RecommendationScoreBreakdown = {
  nearby?: number;
  categoryAffinity?: number;
  friendSignal?: number;
  popularity?: number;
  seasonal?: number;
  similarity?: number;
  seenPenalty?: number;
};

export type RecommendationItem = {
  id: string;
  surface: RecommendationSurface;
  targetType: RecommendationTargetType;
  title: string;
  subtitle?: string | null;
  storeId?: number | null;
  placeId?: string | null;
  feedId?: number | null;
  videoFeedId?: number | null;
  seasonalFoodId?: number | null;
  storeName?: string | null;
  address?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  distanceM?: number | null;
  friendNames?: string[];
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  reasonLabels: string[];
  isSeen?: boolean;
};

export type RecommendationSection = {
  key: RecommendationSurface;
  title: string;
  subtitle: string;
  items: RecommendationItem[];
};

export type RecommendationResponse = {
  requestId: string;
  generatedAt: string;
  sections: RecommendationSection[];
};

export type FetchRecommendationsParams = {
  surfaces?: RecommendationSurface[];
  limitPerSurface?: number;
  location?: { latitude: number; longitude: number } | null;
  currentMonth?: number;
  baseStoreId?: number | null;
  baseFeedId?: number | null;
};

const nowIso = () => new Date().toISOString();

const currentMonth = () => new Date().getMonth() + 1;

const monthSeasonalName = (month: number) => {
  const names = [
    '굴',
    '딸기',
    '주꾸미',
    '봄동',
    '참외',
    '매실',
    '옥수수',
    '전복',
    '전어',
    '꽃게',
    '무',
    '대구',
  ];
  return names[Math.max(0, Math.min(11, month - 1))] ?? '제철 메뉴';
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const withScore = (
  item: Omit<RecommendationItem, 'score' | 'reasonLabels'> & {
    reasonLabels?: string[];
  },
): RecommendationItem => {
  const breakdown = item.scoreBreakdown;
  const score = clampScore(
    (breakdown.nearby ?? 0) +
      (breakdown.categoryAffinity ?? 0) +
      (breakdown.friendSignal ?? 0) +
      (breakdown.popularity ?? 0) +
      (breakdown.seasonal ?? 0) +
      (breakdown.similarity ?? 0) -
      (breakdown.seenPenalty ?? 0),
  );

  const labels = item.reasonLabels ?? [
    breakdown.nearby ? '가까운 위치' : null,
    breakdown.categoryAffinity ? '취향 카테고리' : null,
    breakdown.friendSignal ? '친구 반응' : null,
    breakdown.popularity ? '최근 인기' : null,
    breakdown.seasonal ? '제철 메뉴' : null,
    breakdown.similarity ? '최근 본 콘텐츠와 유사' : null,
  ].filter((label): label is string => Boolean(label));

  return {
    ...item,
    score,
    reasonLabels: labels,
  };
};

const buildMockRecommendationResponse = (
  params?: FetchRecommendationsParams,
): RecommendationResponse => {
  const month = params?.currentMonth ?? currentMonth();
  const seasonalName = monthSeasonalName(month);
  const requestId = `mock-reco-${Date.now()}`;

  const sections: RecommendationSection[] = [
    {
      key: 'HOME_FEED',
      title: '오늘의 추천',
      subtitle: '위치, 취향, 친구 반응을 점수로 합산한 추천입니다.',
      items: [
        withScore({
          id: 'home-video-1001',
          surface: 'HOME_FEED',
          targetType: 'VIDEO_FEED',
          title: '광화문 장어덮밥 영상',
          subtitle: '가까운 위치와 최근 인기 반응이 높아요.',
          storeId: 1001,
          placeId: 'mock-place-1001',
          videoFeedId: 9001,
          storeName: '양산도 광화문점',
          address: '서울시 종로구',
          category: '일식',
          thumbnailUrl: 'https://picsum.photos/id/292/900/1200',
          distanceM: 820,
          scoreBreakdown: {
            nearby: 30,
            categoryAffinity: 20,
            popularity: 15,
            seenPenalty: 0,
          },
        }),
        withScore({
          id: 'home-image-2001',
          surface: 'HOME_FEED',
          targetType: 'IMAGE_FEED',
          title: '성수 디저트 이미지 기록',
          subtitle: '좋아요한 디저트 카테고리와 비슷해요.',
          feedId: 2001,
          storeName: '모스 베이크하우스',
          address: '서울시 성동구',
          category: '디저트',
          thumbnailUrl: 'https://picsum.photos/id/225/900/1200',
          scoreBreakdown: {
            categoryAffinity: 20,
            popularity: 15,
            similarity: 10,
            seenPenalty: 5,
          },
        }),
      ],
    },
    {
      key: 'NEARBY',
      title: '내 주변 추천',
      subtitle: '현재 위치와 가까운 가게를 우선 보여줍니다.',
      items: [
        withScore({
          id: 'nearby-store-3001',
          surface: 'NEARBY',
          targetType: 'STORE',
          title: '걸어서 가기 좋은 점심 후보',
          subtitle: '약 6분 거리 · 한식',
          storeId: 3001,
          placeId: 'mock-place-3001',
          storeName: '북촌 밥상',
          address: '서울시 종로구',
          category: '한식',
          thumbnailUrl: 'https://picsum.photos/id/431/900/1200',
          distanceM: 430,
          scoreBreakdown: {
            nearby: 30,
            categoryAffinity: 20,
            popularity: 8,
          },
        }),
      ],
    },
    {
      key: 'SEASONAL',
      title: '제철 메뉴 추천',
      subtitle: `${month}월에 먼저 볼 ${seasonalName} 기반 추천입니다.`,
      items: [
        withScore({
          id: `seasonal-${month}`,
          surface: 'SEASONAL',
          targetType: 'SEASONAL_MENU',
          title: `${seasonalName} 제철 메뉴`,
          subtitle: '이번 달 제철 재료와 연결된 레시피/가게를 확인해보세요.',
          seasonalFoodId: month,
          category: '제철',
          thumbnailUrl: 'https://picsum.photos/id/1060/900/1200',
          scoreBreakdown: {
            seasonal: 15,
            popularity: 10,
          },
        }),
      ],
    },
    {
      key: 'FRIEND',
      title: '친구가 반응한 맛집',
      subtitle: '친구 좋아요/저장 신호가 있는 맛집입니다.',
      items: [
        withScore({
          id: 'friend-store-4001',
          surface: 'FRIEND',
          targetType: 'STORE',
          title: '친구들이 저장한 연남 파스타',
          subtitle: '민지, 수아가 반응했어요.',
          storeId: 4001,
          placeId: 'mock-place-4001',
          storeName: '연남 오스테리아',
          address: '서울시 마포구',
          category: '양식',
          friendNames: ['민지', '수아'],
          thumbnailUrl: 'https://picsum.photos/id/1080/900/1200',
          scoreBreakdown: {
            friendSignal: 20,
            categoryAffinity: 20,
            popularity: 12,
          },
        }),
      ],
    },
    {
      key: 'STORE_DETAIL_SIMILAR',
      title: '비슷한 맛집',
      subtitle: '최근 본 매장과 유사한 카테고리의 후보입니다.',
      items: [
        withScore({
          id: 'similar-store-5001',
          surface: 'STORE_DETAIL_SIMILAR',
          targetType: 'STORE',
          title: '최근 본 일식과 비슷한 후보',
          subtitle: '같은 카테고리와 인기 신호를 반영했어요.',
          storeId: 5001,
          placeId: 'mock-place-5001',
          storeName: '스시 아카이브',
          address: '서울시 용산구',
          category: '일식',
          thumbnailUrl: 'https://picsum.photos/id/823/900/1200',
          scoreBreakdown: {
            categoryAffinity: 20,
            similarity: 15,
            popularity: 15,
          },
        }),
      ],
    },
  ];

  const allowed = params?.surfaces?.length ? new Set(params.surfaces) : null;
  const limit = params?.limitPerSurface ?? 6;

  return {
    requestId,
    generatedAt: nowIso(),
    sections: sections
      .filter((section) => !allowed || allowed.has(section.key))
      .map((section) => ({
        ...section,
        items: section.items.slice(0, limit),
      })),
  };
};

export async function fetchRecommendations(
  params?: FetchRecommendationsParams,
): Promise<RecommendationResponse> {
  await getGuestParams();
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 120));
  return buildMockRecommendationResponse(params);
}
