/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 500: "#ff6b35", 600: "#e5531f" } } } },
  plugins: [],
};
