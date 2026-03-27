export default {
  plugins: {
    'postcss-preset-env': {
      features: {
        'color-mix': true,
      },
      browsers: ['Chrome >= 80', 'Samsung >= 15', 'Safari >= 14', 'Firefox >= 90'],
    },
  },
};
