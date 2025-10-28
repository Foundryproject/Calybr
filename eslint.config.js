const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends("eslint-config-expo"),
  {
    ignores: ["node_modules/**", ".expo/**", "android/**", "ios/**", "dist/**", "build/**", "eslint.config.js"],
  },
];
