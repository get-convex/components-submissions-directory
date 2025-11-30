const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["GT America", ...fontFamily.sans],
        "gt-america": ["GT America", ...fontFamily.sans],
        headline: ["Publico Headline", "Georgia", "serif"],
        body: ["Publico Text", "Georgia", "serif"],
        serif: ["Publico Headline", "Georgia", "serif"],
      },
      fontWeight: {
        light: "300",
        normal: "400",
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        // Primary UI colors
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
        },
        secondary: {
          DEFAULT: "#6B7280",
          hover: "#4B5563",
        },
        accent: {
          DEFAULT: "#8b7355",
          hover: "#7a6347",
        },
        // Background colors - warm cream theme
        "bg-primary": "#F7EEDB",
        "bg-card": "#F0E6D3",
        "bg-card-hover": "#E1DAC9",
        "bg-hover": "#E8DCCA",
        // Text colors
        "text-primary": "#1a1a1a",
        "text-secondary": "#6b6b6b",
        // Border color
        border: {
          DEFAULT: "#DDD4C4",
        },
        // Button colors - warm orange
        button: {
          DEFAULT: "#DF5D34",
          hover: "#C8512D",
        },
        // Start building button - dark charcoal
        "button-dark": {
          DEFAULT: "#292929",
          hover: "#4F4F52",
        },
        // Utility colors
        light: "#FAF5EA",
        dark: "#171717",
      },
      fontSize: {
        title: "1.25rem",
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
    },
  },
};
