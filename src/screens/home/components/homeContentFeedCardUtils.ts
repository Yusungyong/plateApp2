import { buildProfileUri } from '../../../utils/profileImage';
import type {
  HomeContentFeedAuthor,
  HomeContentFeedItem,
} from '../mockContentFeedData';

export const getHomeContentFeedAuthorLabel = (
  author: HomeContentFeedAuthor | HomeContentFeedItem['author'],
) => {
  const nickname = author.nickName?.trim() ?? '';
  const username = author.username.trim();
  if (nickname && nickname !== username) {
    return `${nickname} · @${username}`;
  }
  if (nickname) {
    return nickname;
  }
  return `@${username}`;
};

export const getHomeContentFeedAuthorProfile = (
  author: HomeContentFeedAuthor | HomeContentFeedItem['author'],
) => buildProfileUri(author.username, author.profileImageUrl ?? null);
