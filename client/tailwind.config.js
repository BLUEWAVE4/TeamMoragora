// 어떤 CSS를 만들지 정의하는 파일
// content의 파일들 안을 뒤져서 class이름을 찾아서 스타일 적용

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        side: { a: '#3B82F6', b: '#EF4444' },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },

      keyframes: {
        slowZoom: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.15)" },
        },
      },
      animation: {
        slowZoom: "slowZoom 8s ease-out forwards",
      },

      boxShadow: {
        gold: "0 0 20px rgba(212,175,55,0.6)",
        goldSoft: "0 0 40px rgba(212,175,55,0.4)",
      },
    },
  },
  plugins: [],
}