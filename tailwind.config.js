const colors = require('tailwindcss/colors')

module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      color: {
        postman: '#eb6839',
        prometheus: '#df4f2a',
        rose: colors.rose,
      }
    },
    gradientColorStops: theme => ({
      ...theme('colors'),
      'postman': '#212529',
      'prometheus': '#df4f2a',
    })
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
