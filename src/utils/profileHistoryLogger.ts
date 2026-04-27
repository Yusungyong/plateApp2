import { recordProfileHistory, ProfileHistoryPayload } from '../api/historyApi';

export const logProfileHistory = async (
  username: string,
  payload: ProfileHistoryPayload,
) => {
  try {
    await recordProfileHistory(username, payload);
  } catch (error) {
    }
};
