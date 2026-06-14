export type HomeContentFeedAuthor = {
  username: string;
  nickName?: string | null;
  profileImageUrl?: string | null;
};

export type HomeContentFeedStats = {
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  likedByMe?: boolean;
};

export type HomeContentFeedImageAsset = {
  id: string;
  imageUrl: string;
  aspectRatio: number;
};

type HomeContentFeedBase = {
  feedKey: string;
  contentType: 'VIDEO' | 'IMAGE';
  isMock?: boolean;
  title: string;
  storeName: string;
  address: string;
  createdLabel: string;
  createdAt?: string | null;
  author: HomeContentFeedAuthor;
  stats: HomeContentFeedStats;
};

export type HomeContentFeedVideoItem = HomeContentFeedBase & {
  contentType: 'VIDEO';
  videoFeedId?: number;
  storeId: number;
  placeId?: string | null;
  fileName?: string | null;
  thumbnail?: string | null;
  durationLabel: string;
  posterUrl: string;
  aspectRatio: number;
};

export type HomeContentFeedImageItem = HomeContentFeedBase & {
  contentType: 'IMAGE';
  imageFeedId?: number;
  feedId: number;
  imageCount?: number;
  images: HomeContentFeedImageAsset[];
};

export type HomeContentFeedItem =
  | HomeContentFeedVideoItem
  | HomeContentFeedImageItem;

export const MOCK_HOME_CONTENT_FEED: HomeContentFeedItem[] = [
  {
    feedKey: 'video:mock-1001',
    contentType: 'VIDEO',
    isMock: true,
    storeId: 1001,
    placeId: 'mock-place-1001',
    title: '광화문에서 지금 가장 먼저 열어볼 장어덮밥 영상',
    storeName: '양산도 광화문점',
    address: '서울시 종로구',
    createdLabel: '방금 전',
    createdAt: new Date().toISOString(),
    durationLabel: '0:21',
    posterUrl: 'https://picsum.photos/id/292/1080/1920',
    aspectRatio: 9 / 16,
    author: {
      username: 'plate_minji',
      nickName: '민지',
      profileImageUrl:
        'https://api.dicebear.com/8.x/identicon/png?seed=plate_minji&size=64',
    },
    stats: {
      likeCount: 128,
      commentCount: 14,
      likedByMe: false,
    },
  },
  {
    feedKey: 'image:mock-2001',
    contentType: 'IMAGE',
    isMock: true,
    feedId: 2001,
    title: '성수에서 저장해두고 싶은 디저트 이미지 기록',
    storeName: '모스 베이크하우스',
    address: '서울시 성동구',
    createdLabel: '12분 전',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    author: {
      username: 'soo_archive',
      nickName: '수아',
      profileImageUrl:
        'https://api.dicebear.com/8.x/identicon/png?seed=soo_archive&size=64',
    },
    stats: {
      likeCount: 84,
      commentCount: 6,
      likedByMe: true,
    },
    imageCount: 3,
    images: [
      {
        id: 'image-2001-1',
        imageUrl: 'https://picsum.photos/id/225/1200/1500',
        aspectRatio: 0.8,
      },
      {
        id: 'image-2001-2',
        imageUrl: 'https://picsum.photos/id/292/800/900',
        aspectRatio: 0.88,
      },
      {
        id: 'image-2001-3',
        imageUrl: 'https://picsum.photos/id/433/800/900',
        aspectRatio: 0.88,
      },
    ],
  },
  {
    feedKey: 'video:mock-1002',
    contentType: 'VIDEO',
    isMock: true,
    storeId: 1002,
    placeId: 'mock-place-1002',
    title: '퇴근길에 보기 좋은 종로 신상 포차 영상',
    storeName: '청계포차',
    address: '서울시 중구',
    createdLabel: '28분 전',
    createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    durationLabel: '0:17',
    posterUrl: 'https://picsum.photos/id/431/1080/1600',
    aspectRatio: 4 / 5,
    author: {
      username: 'nightplate',
      nickName: '야식러버',
      profileImageUrl:
        'https://api.dicebear.com/8.x/identicon/png?seed=nightplate&size=64',
    },
    stats: {
      likeCount: 59,
      commentCount: 9,
      likedByMe: false,
    },
  },
  {
    feedKey: 'image:mock-2002',
    contentType: 'IMAGE',
    isMock: true,
    feedId: 2002,
    title: '한남에서 저장한 플레이트 샷 모음',
    storeName: '스튜디오 브런치',
    address: '서울시 용산구',
    createdLabel: '1시간 전',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    author: {
      username: 'eun_daily',
      nickName: '은채',
      profileImageUrl:
        'https://api.dicebear.com/8.x/identicon/png?seed=eun_daily&size=64',
    },
    stats: {
      likeCount: 112,
      commentCount: 11,
      likedByMe: false,
    },
    imageCount: 1,
    images: [
      {
        id: 'image-2002-1',
        imageUrl: 'https://picsum.photos/id/1080/1200/1450',
        aspectRatio: 0.82,
      },
    ],
  },
  {
    feedKey: 'video:mock-1003',
    contentType: 'VIDEO',
    isMock: true,
    storeId: 1003,
    placeId: 'mock-place-1003',
    title: '연남에서 새로 올라온 바 테이블 영상',
    storeName: '바 레이어',
    address: '서울시 마포구',
    createdLabel: '2시간 전',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    durationLabel: '0:24',
    posterUrl: 'https://picsum.photos/id/823/1080/1700',
    aspectRatio: 0.67,
    author: {
      username: 'mario_food',
      nickName: '마리오',
      profileImageUrl:
        'https://api.dicebear.com/8.x/identicon/png?seed=mario_food&size=64',
    },
    stats: {
      likeCount: 33,
      commentCount: 4,
      likedByMe: false,
    },
  },
  {
    feedKey: 'image:mock-2003',
    contentType: 'IMAGE',
    isMock: true,
    feedId: 2003,
    title: '압구정에서 발견한 조용한 런치 기록',
    storeName: '살롱 밀',
    address: '서울시 강남구',
    createdLabel: '오늘 오전',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    author: {
      username: 'plate_ji',
      nickName: '지현',
      profileImageUrl:
        'https://api.dicebear.com/8.x/identicon/png?seed=plate_ji&size=64',
    },
    stats: {
      likeCount: 48,
      commentCount: 3,
      likedByMe: false,
    },
    imageCount: 2,
    images: [
      {
        id: 'image-2003-1',
        imageUrl: 'https://picsum.photos/id/1060/1200/1500',
        aspectRatio: 0.8,
      },
      {
        id: 'image-2003-2',
        imageUrl: 'https://picsum.photos/id/102/800/950',
        aspectRatio: 0.84,
      },
    ],
  },
];
