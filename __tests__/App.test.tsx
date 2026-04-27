/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
jest.mock('../src/navigation/MainNavigation', () => {
  const React = require('react');
  return function MockMainNavigation() {
    return React.createElement('MockMainNavigation');
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
