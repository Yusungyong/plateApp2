import { getTokens } from '../auth/tokenStorage';
import { getOrCreateGuestId } from '../auth/guestIdStorage';

export const getGuestParams = async () => {
  const tokens = await getTokens();
  if (tokens?.accessToken) return {};
  return {
    isGuest: true,
    guestId: await getOrCreateGuestId(),
  };
};
