import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide10.css'
import imgKimSG from '../../assets/images/team-kimsg.webp'
import imgSeoWJ from '../../assets/images/team-seowj.webp'
import imgChaeYJ from '../../assets/images/team-chaeyj.webp'
import imgKimJM from '../../assets/images/team-kimjm.webp'

const members = [
  {
    name: '김선관',
    role: 'Backend A',
    color: '#10A37F',
    img: imgKimSG,
    tasks: [
      'Express.js 서버 · Supabase 연동 · PWA',
      'Socket.IO 실시간 (3v3 로비 · Chat)',
      'AI 3사 병렬 판결 (Promise.allSettled)',
      '3단계 콘텐츠 방어 시스템',
      '운영 대시보드(관리자) · GitHub Actions Cron',
    ],
    techs: ['Express.js', 'Socket.IO', 'Supabase', 'AI API'],
  },
  {
    name: '서우주',
    role: 'Frontend A',
    color: '#6366F1',
    img: imgSeoWJ,
    tasks: [
      '논쟁 생성 위자드 (3단계 UI)',
      '판결문 상세 — 3사 AI 탭 + 점수 시각화(Chart.js)',
      '실시간 채팅방 UI (시민·참여자 UI 분리)',
      'Framer Motion 페이지 전환 애니메이션',
      '공통 레이아웃 · TabBar · Header',
    ],
    techs: ['React 19', 'Vite', 'Tailwind', 'Framer Motion', 'Router'],
  },
  {
    name: '채유진',
    role: 'Frontend B',
    color: '#EC4899',
    img: imgChaeYJ,
    tasks: [
      '로그인 OAuth 연동',
      '주장 입력 UI (2라운드 · 글자수 카운터)',
      '초대 공유 UI (외부 서비스 카카오 연결)',
      '실시간 로비 (아바타 · 진영 · 준비)',
      '모바일 크로스브라우저 QA (삼성 · 카카오 인앱)',
    ],
    techs: ['React 19', 'Vite', 'Tailwind', 'Axios', 'Supabase Auth'],
  },
  {
    name: '김준민',
    role: 'Frontend C',
    color: '#F59E0B',
    img: imgKimJM,
    tasks: [
      '홈 피드 (카드 리스트 · 배치 API · 페이지네이션)',
      '시민 투표 바텀시트 UI (터치 드래그 제스처)',
      '마이페이지 (전적 통계 · 티어 · XP · CountUp)',
      '랭킹 페이지 (무한스크롤 · 순위 강조) · 알림 시스템',
      'DiceBear 아바타 커스터마이저 구현',
    ],
    techs: ['React 19', 'Vite', 'Tailwind', 'Axios', 'DiceBear'],
  },
]

export default function S10Team({ active }) {
  return (
    <Slide id="s10" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">08</span>
          <span className="header-title">팀 소개</span>
        </div>

        <div className="s10-grid">
          {members.map((m, i) => (
            <div className="s10-card" key={m.name} style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
              {/* 이미지 영역 */}
              <div className="s10-img-area">
                <div className="s10-img-inner">
                  {m.img ? (
                    <img src={m.img} alt={m.name} />
                  ) : (
                    <svg className="s10-placeholder-svg" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="120" height="160" fill="rgba(201,168,76,0.04)" />
                      <circle cx="60" cy="52" r="22" fill="rgba(160,152,136,0.25)" />
                      <ellipse cx="60" cy="120" rx="34" ry="28" fill="rgba(160,152,136,0.2)" />
                    </svg>
                  )}
                </div>
              </div>

              {/* 하단 정보 */}
              <div className="s10-info">
                <h3 className="s10-name">{m.name}</h3>
                <span className="s10-role" style={{ color: m.color }}>{m.role}</span>

                <ul className="s10-tasks">
                  {m.tasks.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>

                <div className="s10-techs">
                  {m.techs.map(t => (
                    <span className="s10-tech" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Footer />
      </div>
    </Slide>
  )
}
