module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: 'google',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    semi: ['error', 'always'],
    'require-jsdoc': 1,
    'no-var': 2,
    'prefer-const': 2,
    'linebreak-style': 0,
    'no-mixed-requires': 2,
    'no-undef': 'error',
  },
};
