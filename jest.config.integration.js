// Jest配置 - 集成测试版本
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'node',
  
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
  ],

  collectCoverage: false,
  
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js',
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.integration.setup.js'],
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
}

module.exports = createJestConfig(customJestConfig)
