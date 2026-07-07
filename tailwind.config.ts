import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1116",
        panel: "#151A21",
        line: "#232A34",
        signal: "#5EEAD4",
        signal2: "#7C9CFF",
        warn: "#F5A524",
        danger: "#F16063",
        muted: "#7A8699"
      },
      fontFamily: {
        display: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
