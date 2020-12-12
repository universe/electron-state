module.exports =  {
  parser:  '@typescript-eslint/parser',  // Specifies the ESLint parser
  extends:  [
    'standard',
    'standard-preact',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions:  {
    ecmaVersion:  2018,  // Allows for the parsing of modern ECMAScript features
    sourceType:  'module',  // Allows for the use of imports
    ecmaFeatures:  {
      jsx:  true,  // Allows for the parsing of JSX
    },
  },
  rules:  {
    'semi': ['error', 'always'],
    'jsx-quotes': ['error', 'prefer-double'],
    'max-len': ['error', { 'code': 180, 'tabWidth': 2 }],
    'no-multiple-empty-lines': ['error', { 'max': 1 }],
    'no-var': ['error'],
    'space-before-function-paren': ['error', 'never'],
    'no-return-assign': 'off',
    'no-unused-expressions': 'off',
    'brace-style': ['error', 'stroustrup', { "allowSingleLine": true }],
    'comma-dangle': ['error', 'always-multiline'],
    "array-bracket-spacing": ["error", "always", {
      "singleValue": false,
      "objectsInArrays": false,
      "arraysInArrays": false,
    }],
    'object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': ['error', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_' } ],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/ban-types': ['error', { 'types': { 'Function': false }}]
  },
};
