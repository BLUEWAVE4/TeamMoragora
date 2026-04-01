export default {
  plugins: {
    '@csstools/postcss-color-mix-function': {},
    'postcss-preset-env': {
      features: {
        'color-mix': true,
        'oklab-function': true,
        'color-function': true,
      },
      browsers: ['Chrome >= 70', 'Samsung >= 13', 'Safari >= 13', 'Firefox >= 80', 'Android >= 70'],
    },
  },
};
