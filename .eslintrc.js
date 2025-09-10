module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es6: true,
    browser: true
  },
  rules: {
    'no-unused-vars': 'error',
    'no-console': 'off'
  },
  overrides: [
    {
      files: ['src/types/**/*.d.ts'],
      rules: {
        'no-unused-vars': 'off'
      }
    }
  ]
};