import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24 text-sm text-gray-700 leading-relaxed">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-[#2D3350] font-bold text-sm mb-4 hover:opacity-70 transition-opacity"
      >
        ← 뒤로가기
      </button>
      <h1 className="text-xl font-black text-[#2D3350] mb-6">개인정보처리방침</h1>
      <p className="text-xs text-gray-400 mb-6">시행일: 2026년 3월 11일</p>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">1. 수집하는 개인정보 항목</h2>
        <p className="mb-2">모라고라(이하 "서비스")는 다음과 같은 개인정보를 수집합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>소셜 로그인 시</strong>: 이메일, 닉네임, 프로필 이미지 (소셜 로그인 제공자로부터 수신)</li>
          <li><strong>서비스 이용 시 자동 수집</strong>: 접속 페이지, 접속 시간, 브라우저 정보, 세션 식별자 (익명)</li>
          <li><strong>논쟁 참여 시</strong>: 사용자가 입력한 논쟁 주제 및 주장 내용</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">2. 개인정보의 수집 및 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스 제공 및 운영 (논쟁 판결, 랭킹, 투표 기능)</li>
          <li>서비스 품질 개선을 위한 통계 분석 (익명화된 접속 데이터)</li>
          <li>부정 이용 방지 및 서비스 안정성 확보</li>
          <li>사용자 문의 대응 및 공지사항 전달</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">3. 개인정보의 보유 및 이용 기간</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>회원 정보</strong>: 회원 탈퇴 시 즉시 파기</li>
          <li><strong>접속 로그</strong>: 수집일로부터 1년 후 자동 파기</li>
          <li><strong>논쟁 콘텐츠</strong>: 서비스 운영 기간 동안 보유 (공개 피드에 게시된 경우)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">4. 개인정보의 제3자 제공</h2>
        <p>서비스는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우 예외로 합니다.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>사용자가 사전에 동의한 경우</li>
          <li>법령에 의한 요청이 있는 경우</li>
          <li>AI 판결 처리를 위해 논쟁 내용을 AI 서비스(OpenAI, Google, Anthropic)에 전송 (개인 식별 정보 제외)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">5. 자동 수집 정보 (통계 분석)</h2>
        <p className="mb-2">서비스는 서비스 품질 개선을 위해 다음 정보를 자동으로 수집합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>접속한 페이지 경로 및 시간</li>
          <li>브라우저 유형 및 운영체제</li>
          <li>유입 경로 (referrer)</li>
          <li>익명 세션 식별자 (개인을 특정할 수 없음)</li>
        </ul>
        <p className="mt-2 text-xs text-gray-400">해당 정보는 개인을 식별할 수 없는 익명 통계 데이터로, 서비스 개선 목적으로만 활용됩니다.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">6. 이용자의 권리</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>언제든지 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.</li>
          <li>수집된 개인정보의 열람, 정정, 삭제를 요청할 수 있습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">7. 개인정보 보호책임자</h2>
        <p>문의: 서비스 내 피드백 기능 또는 마이페이지를 이용해 주세요.</p>
      </section>

      <section>
        <h2 className="font-bold text-[#2D3350] mb-2">8. 방침 변경</h2>
        <p>본 방침은 2026년 3월 11일부터 시행됩니다. 변경 시 서비스 내 공지를 통해 안내합니다.</p>
      </section>
    </div>
  );
}
