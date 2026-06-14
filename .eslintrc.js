module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['jest.setup.js', '__tests__/**/*.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
    },
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      },
    ],
  },
};
