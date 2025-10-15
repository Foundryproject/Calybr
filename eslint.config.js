const expo = require('eslint-config-expo');

module.exports = [
  ...expo,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      'build/**',
    ],
  },
];

