// src/utils/dateTime.ts
type DateInput = string | number | Date | null | undefined;

const toDate = (value: DateInput): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

export const formatDate = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('ko-KR');
};

export const formatDateTime = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatMonthDay = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return '-';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}.${day}`;
};

export const formatTimeAgo = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return '-';
  const diff = Date.now() - date.getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;

  const now = new Date();
  const isSameYear = now.getFullYear() === date.getFullYear();
  if (isSameYear) {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const dateText = `${date.getDate()}`.padStart(2, '0');
  return `${year}.${month}.${dateText}`;
};

export const normalizeMs = (value: DateInput): number | null => {
  const date = toDate(value);
  return date ? date.getTime() : null;
};
