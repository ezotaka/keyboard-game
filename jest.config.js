module.exports = {
  preset: 'ts-jest',
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: [
        '<rootDir>/src/__tests__/**/*.simple.test.ts',
        '<rootDir>/src/demo/__tests__/*.simple.test.ts',
        '<rootDir>/src/domain/**/*.spec.ts'
      ],
      transform: {
        '^.+\\.ts$': 'ts-jest'
      },
      setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
      moduleFileExtensions: ['ts', 'js', 'json']
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src'],
      testMatch: [
        '<rootDir>/src/demo/__tests__/*.simple.test.ts',
        '<rootDir>/src/presentation/sounds/__tests__/SoundManager.test.ts'
      ],
      transform: {
        '^.+\\.ts$': 'ts-jest'
      },
      setupFilesAfterEnv: ['<rootDir>/src/test-setup-jsdom.ts'],
      moduleFileExtensions: ['ts', 'js', 'json']
    }
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.spec.ts',
    '!src/test-setup*.ts'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70
  //   }
  // }
};