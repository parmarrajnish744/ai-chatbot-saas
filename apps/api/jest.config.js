require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
