/**
 * Tailwind CSS v4 系では、PostCSS プラグインとして `tailwindcss` を直接指定せず
 * `@tailwindcss/postcss` を使うのが推奨です。
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {}
  }
};

export default config;

