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
      }
    },
  },
  plugins: [],
};
