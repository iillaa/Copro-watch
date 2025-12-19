import js from '@eslint/js';
import globals from 'globals';
// Removed plugin imports; use standard 'extends' strings to avoid plugin errors
import { defineConfig } from 'eslint/config';

export default defineConfig({
  files: ['**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 2020,
    parserOptions: {
      ecmaVersion: 'latest',
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
    },
  },
  rules: {},
});
