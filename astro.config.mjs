// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://sm1rks.github.io',
  base: '/coc-meta-tracker',
  vite: {
    plugins: [tailwindcss()],
  },
});
