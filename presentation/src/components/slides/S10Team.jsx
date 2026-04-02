import Slide from '../Slide'
import '../../styles/slide10.css'
import imgKimSG from '../../assets/images/team-kimsg.webp'
import imgSeoWJ from '../../assets/images/team-seowj.webp'
import imgChaeYJ from '../../assets/images/team-chaeyj.webp'
import imgKimJM from '../../assets/images/team-kimjm.webp'

const members = [
  {
    name: '김선관',
    role: '백엔드 A',
    color: '#10A37F',
    img: imgKimSG,
    tasks: [
      'API 서버 · DB 연동 · PWA 구현',
      'Socket.IO 실시간 통신',
      'AI 3사 병렬 판결',
      '콘텐츠 필터링 시스템',
      '관리자 대시보드',
    ],
    techs: ['Express.js', 'Socket.IO', 'Supabase', 'AI API'],
  },
  {
    name: '서우주',
    role: '프론트엔드 A',
    color: '#6366F1',
    img: imgSeoWJ,
    tasks: [
      '논쟁 3단계 생성 위자드',
      '판결문 상세 · 점수 시각화',
      '실시간 논쟁모드 채팅 UI',
      '페이지 전환 애니메이션',
      '공통 레이아웃 · 네비게이션',
    ],
    techs: ['React 19', 'Vite', 'Tailwind', 'Framer Motion', 'Router'],
  },
  {
    name: '채유진',
    role: '프론트엔드 B',
    color: '#EC4899',
    img: imgChaeYJ,
    tasks: [
      '소셜 로그인 연동',
      '주장 입력 UI',
      '초대 · 공유 기능',
      '실시간 로비 UI',
      '크로스브라우저 QA',
    ],
    techs: ['React 19', 'Vite', 'Tailwind', 'Axios', 'Supabase Auth'],
  },
  {
    name: '김준민',
    role: '프론트엔드 C',
    color: '#F59E0B',
    img: imgKimJM,
    tasks: [
      '홈 피드 · 페이지네이션',
      '시민 투표 UI',
      '마이페이지 · 전적 통계',
      '랭킹 · 알림 시스템',
      '아바타 커스터마이징',
    ],
    techs: ['React 19', 'Vite', 'Tailwind', 'Axios', 'DiceBear'],
  },
]

export default function S10Team({ active }) {
  return (
    <Slide id="s10" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">12</span>
          <span className="header-title">팀 소개</span>
        </div>

        <div className="s10-grid">
          {members.map((m, i) => (
            <div className="s10-col" key={m.name} style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
              {/* 이름/역할 카드 위 */}
              <div className="s10-name-area">
                <h3 className="s10-name">{m.name} <span className="s10-name-sep">-</span> <span className="s10-role" style={{ color: m.color }}>{m.role}</span></h3>
              </div>

              <div className="s10-card">
              {/* 이미지 영역 */}
              <div className="s10-img-area">
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

              {/* 하단 정보 */}
              <div className="s10-info">

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
            </div>
          ))}
        </div>

      </div>
    </Slide>
  )
}
