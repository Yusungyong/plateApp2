// src/screens/videoFeeds/utils/suggestionUtils.ts

export const stripHtml = (value: string): string => {
  return value.replace(/<[^>]*>/g, '');
};

export const extractFriendKeyword = (value: string): string => {
  const parts = value.split(',');
  const last = parts[parts.length - 1] ?? '';
  return last.replace('@', '').trim();
};

export const parseFriends = (value: string): string[] => {
  return value
    .split(',')
    .map((item) => item.replace('@', '').trim())
    .filter(Boolean);
};

export const mergeFriendValue = (current: string, username: string): string => {
  const parts = current.split(',').map((item) => item.trim()).filter(Boolean);
  const nextParts = parts.slice(0, -1);
  const nextValue = `@${username}`;
  const merged = nextParts.length > 0 ? `${nextParts.join(', ')}, ${nextValue}` : nextValue;
  return `${merged}, `;
};
