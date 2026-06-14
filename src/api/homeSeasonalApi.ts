import api from './axiosInstance';
import type { SeasonalHomeData, SeasonalHeroItem } from '../screens/home/types';
import { getGuestParams } from './guestParams';

const unwrap = (data: any) => data?.data ?? data ?? {};

const ENGLISH_TEXT_REGEX = /[A-Za-z]/;

const CATEGORY_LABELS: Record<string, string> = {
  fruit: '과일',
  fruits: '과일',
  vegetable: '채소',
  vegetables: '채소',
  veggie: '채소',
  veggies: '채소',
  greens: '채소/나물',
  seafood: '해산물',
  shellfish: '패류',
  fish: '생선',
  fishes: '생선',
  seaweed: '해조류',
  mushroom: '버섯',
  mushrooms: '버섯',
  grain: '곡물',
  grains: '곡물',
  vegetableherbs: '채소/나물',
  vegetableandherbs: '채소/나물',
  vegetablesandherbs: '채소/나물',
};

const FOOD_NAME_LABELS: Record<string, string> = {
  strawberry: '딸기',
  strawberries: '딸기',
  oyster: '굴',
  oysters: '굴',
  spinach: '시금치',
  maesaengi: '매생이',
  seaweed: '매생이',
  yellowtail: '방어',
  springcabbage: '봄동',
  springgreens: '봄동',
  webfootoctopus: '주꾸미',
  jukkumi: '주꾸미',
  garlicshoot: '마늘쫑',
  garlicshoots: '마늘쫑',
  garlicscape: '마늘쫑',
  garlicscapes: '마늘쫑',
  squid: '한치',
  koreanmelon: '참외',
  orientalmelon: '참외',
  chamoe: '참외',
  plum: '매실',
  greenplum: '매실',
  maesil: '매실',
  pomfret: '병어',
  silverpomfret: '병어',
  hairtail: '병어',
  eel: '장어',
  apricot: '살구',
  peach: '복숭아',
  peaches: '복숭아',
  seasquirt: '멍게',
  watermelon: '수박',
  cucumber: '오이',
  seabass: '농어',
  corn: '옥수수',
  abalone: '전복',
  pear: '배',
  matsutake: '송이',
  saury: '전어',
  persimmon: '감',
  bluecrab: '꽃게',
  crab: '꽃게',
  shiitake: '표고버섯',
  shiitakemushroom: '표고버섯',
  radish: '무',
  cod: '대구',
  apple: '사과',
  tangerine: '귤',
  mandarin: '귤',
  cabbage: '배추',
  potato: '감자',
  potatoes: '감자',
  gamja: '감자',
};

const SOLAR_TERM_LABELS: Record<string, string> = {
  startofspring: '입춘',
  rainwater: '우수',
  awakeningofinsects: '경칩',
  springequinox: '춘분',
  clearandbright: '청명',
  grainrain: '곡우',
  startofsummer: '입하',
  grainfull: '소만',
  graininear: '망종',
  summersolstice: '하지',
  minorheat: '소서',
  majorheat: '대서',
  startofautumn: '입추',
  limitofheat: '처서',
  whitedew: '백로',
  autumnalequinox: '추분',
  colddew: '한로',
  frostdescent: '상강',
  startofwinter: '입동',
  minorsnow: '소설',
  majorsnow: '대설',
  wintersolstice: '동지',
  minorcold: '소한',
  majorcold: '대한',
  ipchun: '입춘',
  usu: '우수',
  gyeongchip: '경칩',
  chunbun: '춘분',
  cheongmyeong: '청명',
  gogu: '곡우',
  ipha: '입하',
  iphwa: '입하',
  soman: '소만',
  mangjong: '망종',
  haji: '하지',
  soseo: '소서',
  daeseo: '대서',
  ipchu: '입추',
  cheoseo: '처서',
  baengno: '백로',
  chubun: '추분',
  hanro: '한로',
  sanggang: '상강',
  ipdong: '입동',
  soseol: '소설',
  daeseol: '대설',
  dongji: '동지',
  sohan: '소한',
  daehan: '대한',
};

const MONTH_NUMBER_BY_NAME: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const normalizeLookupKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');

const hasEnglishText = (value: string) => ENGLISH_TEXT_REGEX.test(value);

const translateMappedText = (value: unknown, dictionary: Record<string, string>) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return dictionary[normalizeLookupKey(text)] ?? text;
};

const extractMonthNumber = (value: string) => {
  const numericMatch = value.match(/(?:^|\b)(1[0-2]|[1-9])(?:st|nd|rd|th)?(?:\s*month)?(?:\b|$)/i);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  const lower = value.toLowerCase();
  for (const [monthName, monthNumber] of Object.entries(MONTH_NUMBER_BY_NAME)) {
    if (lower.includes(monthName)) {
      return monthNumber;
    }
  }

  return null;
};

const toKoreanCategory = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  const translated = translateMappedText(text, CATEGORY_LABELS);
  if (translated !== text) {
    return translated;
  }

  return hasEnglishText(text) ? '기타' : text;
};

const toKoreanFoodName = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return translateMappedText(text, FOOD_NAME_LABELS);
};

const toKoreanSeasonalTerm = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  return translateMappedText(text, SOLAR_TERM_LABELS);
};

const toKoreanMonthLabel = (value: unknown, month: number) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return `${month}월의 제철`;
  }
  if (!hasEnglishText(text)) {
    return text;
  }

  const normalized = normalizeLookupKey(text);
  if (['todaysseasonal', 'todayseasonal', 'seasonaltoday', 'todaysinseason', 'todaysinseasonfoods'].includes(normalized)) {
    return '오늘의 제철';
  }

  const translatedMonth = extractMonthNumber(text) ?? month;
  return `${translatedMonth}월의 제철`;
};

const buildDefaultHeadline = (
  basis: SeasonalHomeData['basisInfo']['basis'],
  month: number,
) => (basis === 'TERM' ? '이번 절기에 먼저 보는 대표 제철 재료' : `${month}월에 먼저 보는 대표 제철 재료`);

const buildDefaultSubcopy = (foodName: string) => {
  const safeFoodName = foodName && !hasEnglishText(foodName) ? foodName : '제철 음식';
  return `${safeFoodName}를 중심으로 제철 재료 흐름을 탐색합니다.`;
};

const buildSoftPalette = (accentColor?: string | null) => {
  const fallback = '#8A673E';
  const accent = accentColor || fallback;
  const lower = accent.toLowerCase();

  if (['#a7c84b', '#4e9b7c', '#769a58'].includes(lower)) {
    return {
      accentColor: accent,
      accentSoftColor: '#EEF5DE',
      orbStrongColor: '#D7E7A3',
      orbSoftColor: '#E8F1C5',
    };
  }
  if (['#6d879f', '#577492', '#587694'].includes(lower)) {
    return {
      accentColor: accent,
      accentSoftColor: '#E8EEF4',
      orbStrongColor: '#CBD9E4',
      orbSoftColor: '#DDE7EF',
    };
  }
  if (['#9a6848', '#b16159', '#d97942'].includes(lower)) {
    return {
      accentColor: accent,
      accentSoftColor: '#F7EBDD',
      orbStrongColor: '#E8CCB1',
      orbSoftColor: '#F1E0CF',
    };
  }
  return {
    accentColor: accent,
    accentSoftColor: '#F4EEE7',
    orbStrongColor: '#E5D6C6',
    orbSoftColor: '#EFE5D9',
  };
};

const normalizeFood = (food: any, index: number) => ({
  seasonalFoodId: Number(food?.seasonalFoodId ?? food?.seasonal_food_id ?? food?.id ?? index + 1),
  seasonalTerm: toKoreanSeasonalTerm(food?.seasonalTerm ?? food?.seasonal_term ?? null),
  month: Number(food?.month ?? new Date().getMonth() + 1),
  foodName: toKoreanFoodName(food?.foodName ?? food?.food_name ?? food?.name ?? ''),
  category: toKoreanCategory(food?.category ?? ''),
  cardImageUrl: food?.cardImageUrl ?? food?.card_image_url ?? null,
  cardImageMobileUrl: food?.cardImageMobileUrl ?? food?.card_image_mobile_url ?? null,
});

const buildHeroStats = (hero: ReturnType<typeof normalizeFood>, basis: SeasonalHomeData['basisInfo']['basis'], totalFoods: number) => [
  { label: '카테고리', value: hero.category || '-' },
  { label: basis === 'TERM' ? '절기' : '월', value: basis === 'TERM' ? String(hero.seasonalTerm ?? '-') : `${hero.month}월` },
  { label: '항목', value: `${totalFoods}개` },
];

const normalizeHero = (
  hero: any,
  basis: SeasonalHomeData['basisInfo']['basis'],
  foods: SeasonalHomeData['foods'],
): SeasonalHeroItem | null => {
  if (!hero) {
    return null;
  }

  const normalizedFood = normalizeFood(hero, 0);
  if (!normalizedFood.seasonalFoodId || !normalizedFood.foodName) {
    return null;
  }

  const accent = buildSoftPalette(hero?.accentColor ?? hero?.accent_color);
  const month = normalizedFood.month;
  const rawHeadline = String(hero?.headline ?? '').trim();
  const rawSubcopy = String(hero?.subcopy ?? '').trim();
  const headline = rawHeadline && !hasEnglishText(rawHeadline)
    ? rawHeadline
    : buildDefaultHeadline(basis, month);
  const subcopy = rawSubcopy && !hasEnglishText(rawSubcopy)
    ? rawSubcopy
    : buildDefaultSubcopy(normalizedFood.foodName);

  return {
    seasonalFoodId: normalizedFood.seasonalFoodId,
    month,
    monthLabel: toKoreanMonthLabel(hero?.monthLabel ?? hero?.month_label ?? `${month}월의 제철`, month),
    seasonalTerm: normalizedFood.seasonalTerm,
    name: normalizedFood.foodName,
    category: normalizedFood.category,
    headline,
    subcopy,
    cardImageUrl: normalizedFood.cardImageUrl,
    cardImageMobileUrl: normalizedFood.cardImageMobileUrl,
    accentColor: accent.accentColor,
    accentSoftColor: accent.accentSoftColor,
    orbStrongColor: accent.orbStrongColor,
    orbSoftColor: accent.orbSoftColor,
    stats: buildHeroStats(normalizedFood, basis, foods.length),
  };
};

const normalizeHomeSeasonalResponse = (payload: any): SeasonalHomeData => {
  const basisInfo: SeasonalHomeData['basisInfo'] = {
    basis: payload?.basisInfo?.basis === 'TERM' ? 'TERM' : 'MONTH',
    referenceDate: payload?.basisInfo?.referenceDate ?? payload?.basisInfo?.reference_date ?? null,
    month: payload?.basisInfo?.month ?? null,
    seasonalTerm: toKoreanSeasonalTerm(payload?.basisInfo?.seasonalTerm ?? payload?.basisInfo?.seasonal_term ?? null),
  };

  const foods = Array.isArray(payload?.foods)
    ? payload.foods.map((food: any, index: number) => normalizeFood(food, index))
    : [];

  const hero = normalizeHero(payload?.hero ?? null, basisInfo.basis, foods);

  const chips = Array.isArray(payload?.chips) && payload.chips.length > 0
    ? payload.chips.map((chip: any) => ({
        seasonalFoodId: Number(chip?.seasonalFoodId ?? chip?.seasonal_food_id ?? chip?.id ?? 0),
        foodName: toKoreanFoodName(chip?.foodName ?? chip?.food_name ?? chip?.name ?? ''),
        isActive: Boolean(chip?.isActive ?? chip?.is_active ?? false),
      }))
    : foods.map((food: SeasonalHomeData['foods'][number]) => ({
        seasonalFoodId: food.seasonalFoodId,
        foodName: food.foodName,
        isActive: hero ? food.seasonalFoodId === hero.seasonalFoodId : false,
      }));

  return {
    basisInfo,
    hero,
    chips,
    foods,
  };
};

export const fetchHomeSeasonal = async (params?: {
  month?: number;
  seasonalFoodId?: number | null;
  basis?: 'MONTH' | 'TERM';
  date?: string | null;
}): Promise<SeasonalHomeData> => {
  const seasonalFoodId = params?.seasonalFoodId ?? null;
  const guestParams = await getGuestParams();
  const basis = params?.basis ?? 'MONTH';

  const requestParams = {
    basis,
    ...(params?.month ? { month: params.month } : {}),
    ...(params?.date ? { date: params.date } : {}),
    ...guestParams,
  };

  const res = seasonalFoodId
    ? await api.get(`/api/home/seasonal/${seasonalFoodId}`, {
        params: requestParams,
      })
    : await api.get('/api/home/seasonal', {
        params: requestParams,
      });

  return normalizeHomeSeasonalResponse(unwrap(res.data));
};
