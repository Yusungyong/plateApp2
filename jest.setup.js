jest.mock('react-native-config', () => ({}));
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'test-device-id'),
  getModel: jest.fn(async () => 'iPhone'),
  getSystemVersion: jest.fn(async () => '18.0'),
  getVersion: jest.fn(async () => '1.0.0'),
}));
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(async () => undefined),
  getGenericPassword: jest.fn(async () => null),
  resetGenericPassword: jest.fn(async () => undefined),
}));
jest.mock('./src/notifications/fcm', () => ({
  initFcmMessaging: jest.fn(() => () => undefined),
  syncFcmTokenWithServer: jest.fn(async () => undefined),
}));
