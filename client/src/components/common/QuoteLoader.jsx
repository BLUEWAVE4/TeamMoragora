import { useState, useEffect, useRef } from 'react';

const QUOTES = [
  { text: '너 자신을 알라.', author: '소크라테스' },
  { text: '나는 생각한다, 고로 존재한다.', author: '데카르트' },
  { text: '지혜는 경험의 딸이다.', author: '레오나르도 다빈치' },
  { text: '삶이 있는 한 희망은 있다.', author: '키케로' },
  { text: '행복은 스스로 만족하는 사람의 것이다.', author: '아리스토텔레스' },
  { text: '의심은 지혜의 시작이다.', author: '데카르트' },
  { text: '만족할 줄 아는 자가 진정 부유하다.', author: '노자' },
  { text: '가장 큰 영광은 넘어지지 않는 것이 아니라, 넘어질 때마다 일어서는 것이다.', author: '공자' },
  { text: '변하지 않는 것은 변한다는 사실뿐이다.', author: '헤라클레이토스' },
  { text: '논쟁에서 진실이 태어난다.', author: '소크라테스' },
  { text: '정의란 각자에게 그의 몫을 주는 것이다.', author: '플라톤' },
  { text: '무지를 아는 것이 곧 앎의 시작이다.', author: '소크라테스' },
  { text: '인생은 짧고 예술은 길다.', author: '히포크라테스' },
  { text: '절제는 최고의 약이다.', author: '드라코' },
  { text: '좋은 시작은 반의 성공이다.', author: '아리스토텔레스' },
  { text: '진정한 용기는 두려움을 아는 것이다.', author: '플라톤' },
  { text: '습관이 제2의 천성이다.', author: '키케로' },
  { text: '천 리 길도 한 걸음부터 시작된다.', author: '노자' },
  { text: '분노는 어리석음으로 시작해 후회로 끝난다.', author: '피타고라스' },
  { text: '교육은 영혼의 불꽃이다.', author: '소크라테스' },
  { text: '덕은 중용에 있다.', author: '아리스토텔레스' },
  { text: '시간은 만물의 심판관이다.', author: '페리클레스' },
  { text: '가장 지혜로운 자가 가장 많이 묻는다.', author: '탈레스' },
  { text: '운명은 준비된 자에게 기회를 준다.', author: '세네카' },
  { text: '말은 은이요 침묵은 금이다.', author: '토마스 칼라일' },
  { text: '자유란 법이 허용하는 모든 것을 할 권리다.', author: '몽테스키외' },
  { text: '과거를 기억 못하는 자는 그것을 반복한다.', author: '산타야나' },
  { text: '위대함의 대가는 책임이다.', author: '윈스턴 처칠' },
  { text: '생각이 바뀌면 행동이 바뀌고, 행동이 바뀌면 운명이 바뀐다.', author: '윌리엄 제임스' },
  { text: '우리가 두려워할 것은 두려움 그 자체뿐이다.', author: '루스벨트' },
];

function getRandomIndex(exclude) {
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === exclude && QUOTES.length > 1);
  return idx;
}

export default function QuoteLoader() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const cycle = () => {
      // 1.6초 보여주고 → fade out
      timerRef.current = setTimeout(() => {
        setVisible(false);
        // 0.4초 후 다음 명언으로 교체 → fade in
        timerRef.current = setTimeout(() => {
          setIndex(prev => getRandomIndex(prev));
          setVisible(true);
          cycle();
        }, 400);
      }, 1600);
    };
    cycle();
    return () => clearTimeout(timerRef.current);
  }, []);

  const quote = QUOTES[index];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F1EC] px-8">
      <div
        className="text-center transition-all duration-400 ease-in-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <p className="text-[15px] font-bold text-[#1B2A4A]/60 leading-relaxed italic">
          "{quote.text}"
        </p>
        <p className="text-[12px] text-[#D4AF37] font-bold mt-2">
          — {quote.author}
        </p>
      </div>
    </div>
  );
}
