import { viteSingleFile } from "vite-plugin-singlefile";

// vite.config.js
export default {
  root: "src",
  plugins: [viteSingleFile()],
  build: {
    watch: true,
    outDir: "../dist",
  },
};
