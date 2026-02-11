import { defineConfig } from '@caido-community/dev';
import vue from '@vitejs/plugin-vue';
import tailwindcss from "tailwindcss";
// @ts-expect-error no declared types at this time
import tailwindPrimeui from "tailwindcss-primeui";
import tailwindCaido from "@caido/tailwindcss";
import path from "path";
import prefixwrap from "postcss-prefixwrap";

const id = "ebka-ai-assistant";
export default defineConfig({
  id,
  name: "Ebka AI Assistant",
  description: "Integrates with Claude AI to provide AI-powered security testing capabilities",
  version: "1.0.1",
  author: {
    name: "Slonser",
    email: "slonser@neplox.security",
  },
  plugins: [
    {
      kind: "backend",
      id: "ebka-backend",
      root: "packages/backend",
    },
    {
      kind: 'frontend',
      id: "ebka-frontend",
      root: 'packages/frontend',
      backend: {
        id: "ebka-backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: [
              '@caido/frontend-sdk', 
              "@codemirror/state", 
              "@codemirror/view", 
              "@codemirror/autocomplete", 
              "@codemirror/commands", 
              "@codemirror/lint", 
              "@codemirror/search", 
              "@codemirror/language", 
              "@lezer/common", 
              "@lezer/highlight", 
              "@lezer/lr"
            ]
          }
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        css: {
          postcss: {
            plugins: [
              // This plugin wraps the root element in a unique ID
              // This is necessary to prevent styling conflicts between plugins
              prefixwrap(`#plugin--${id}`),

              tailwindcss({
                corePlugins: {
                  preflight: false,
                },
                content: [
                  './packages/frontend/src/**/*.{vue,ts}',
                  './node_modules/@caido/primevue/dist/primevue.mjs'
                ],
                // Check the [data-mode="dark"] attribute on the <html> element to determine the mode
                // This attribute is set in the Caido core application
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [

                  // This plugin injects the necessary Tailwind classes for PrimeVue components
                  tailwindPrimeui,

                  // This plugin injects the necessary Tailwind classes for the Caido theme
                  tailwindCaido,
                ],
              })
            ]
          }
        }
      }
    }
  ]
});