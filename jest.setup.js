require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-config', () => ({}));
jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const MockIcon = (props) => React.createElement('MockIcon', props);
  MockIcon.loadFont = jest.fn(async () => undefined);
  return {
    __esModule: true,
    default: MockIcon,
  };
});
jest.mock('react-native-vector-icons/FontAwesome', () => {
  const React = require('react');
  const MockIcon = (props) => React.createElement('MockIcon', props);
  MockIcon.loadFont = jest.fn(async () => undefined);
  return {
    __esModule: true,
    default: MockIcon,
  };
});
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
