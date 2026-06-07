module.exports = {
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {},
  plugins: {},
  rules: {
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    'no-console': 'off',
    'semi': ['error', 'always']
  },
  linterOptions: {
    reportUnusedDisableDirectives: true
  }
}
