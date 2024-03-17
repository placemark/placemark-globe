import { viteSingleFile } from "vite-plugin-singlefile";
// vite.config.js
export default {
  // config options
  root: "src",
  build: {
    watch: true,
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: "src/main.ts",
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
  },
};
