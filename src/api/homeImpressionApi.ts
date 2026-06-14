import api from './axiosInstance';
import { getGuestParams } from './guestParams';
import { getDeviceInfo } from '../auth/deviceInfo';

export type HomeImpressionContentType = 'VIDEO' | 'IMAGE';

export type HomeImpressionItem = {
  contentType: HomeImpressionContentType;
  storeId?: number;
  feedNo?: number;
  positionNo?: number | null;
  clientImpressedAt: string;
};

export type HomeImpressionPayload = {
  surface: string;
  requestId?: string | null;
  isGuest: boolean;
  guestId?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  items: HomeImpressionItem[];
};

export type HomeImpressionResponse = {
  savedCount: number;
  duplicateCount: number;
  suppressUntil?: string | null;
};

export async function sendHomeImpressions(
  items: HomeImpressionItem[],
  options?: {
    surface?: string;
    requestId?: string | null;
    sessionId?: string | null;
    isAuthenticated?: boolean;
  },
) {
  if (items.length === 0) {
    return null;
  }

  const guestParams = options?.isAuthenticated ? {} : await getGuestParams();
  const deviceInfo = await getDeviceInfo();
  const payload: HomeImpressionPayload = {
    surface: options?.surface ?? 'home',
    requestId: options?.requestId ?? null,
    isGuest: Boolean((guestParams as any).isGuest),
    guestId: (guestParams as any).guestId ?? null,
    sessionId: options?.sessionId ?? null,
    deviceId: deviceInfo.deviceId,
    items,
  };

  const res = await api.post('/api/home/impressions', payload);
  return (res.data?.data ?? res.data) as HomeImpressionResponse;
}
