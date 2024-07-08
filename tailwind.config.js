/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        secondary: 'var(--secondary-color)',
        primaryDark: 'var(--primary-dark)',
        blue: 'var(--light-blue)',
        purple: 'var(--light-purple)',
        darkBlue: 'var(--dark-blue)',
        darkPurple: 'var(--dark-purple)'
      },
      width: {
        '2/3': '66%',
        '3/4': '75%'
      },
      textShadow: {
        'default': '0 2px 4px rgba(0, 0, 0, 0.10)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.15)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.20)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.25)',
        '2xl': '0 25px 50px rgba(0, 0, 0, 0.30)',
        'none': 'none',
      }
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.10)',
        },
        '.text-shadow-md': {
          textShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
        },
        '.text-shadow-lg': {
          textShadow: '0 10px 15px rgba(0, 0, 0, 0.20)',
        },
        '.text-shadow-xl': {
          textShadow: '0 20px 25px rgba(0, 0, 0, 0.25)',
        },
        '.text-shadow-2xl': {
          textShadow: '0 25px 50px rgba(0, 0, 0, 0.30)',
        },
        '.text-shadow-none': {
          textShadow: 'none',
        },
      };

      addUtilities(newUtilities, ['responsive', 'hover']);
    }
  ],
};
