export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 pb-24 text-sm text-gray-700 leading-relaxed">
      <h1 className="text-xl font-black text-[#2D3350] mb-6">서비스 이용약관</h1>
      <p className="text-xs text-gray-400 mb-6">시행일: 2026년 3월 11일</p>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제1조 (목적)</h2>
        <p>본 약관은 모라고라(이하 "서비스")가 제공하는 AI 기반 논쟁 판결 플랫폼의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무를 규정함을 목적으로 합니다.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제2조 (정의)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>"서비스"</strong>란 모라고라가 제공하는 웹 기반 논쟁 판결 플랫폼을 말합니다.</li>
          <li><strong>"이용자"</strong>란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.</li>
          <li><strong>"논쟁"</strong>이란 이용자가 생성한 토론 주제 및 양측의 주장을 말합니다.</li>
          <li><strong>"AI 판결"</strong>이란 복수의 AI 모델이 논쟁을 분석하여 제공하는 판단 결과를 말합니다.</li>
          <li><strong>"시민 투표"</strong>란 다른 이용자들이 논쟁에 대해 투표하는 행위를 말합니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제3조 (약관의 효력)</h2>
        <p>본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제4조 (회원가입 및 계정)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스는 소셜 로그인(카카오, 구글)을 통해 가입할 수 있습니다.</li>
          <li>이용자는 정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안 됩니다.</li>
          <li>계정의 관리 책임은 이용자에게 있으며, 제3자에게 이용을 허락해서는 안 됩니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제5조 (서비스의 내용)</h2>
        <p className="mb-2">서비스는 다음과 같은 기능을 제공합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>논쟁 주제 생성 및 주장 작성</li>
          <li>GPT, Gemini, Claude 등 복수 AI 모델에 의한 독립적 판결</li>
          <li>시민 투표를 통한 여론 반영</li>
          <li>랭킹 및 티어 시스템</li>
          <li>판결 결과 피드 및 공유</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제6조 (AI 판결의 성격)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI 판결은 인공지능의 분석에 기반한 참고용 의견이며, 법적 효력이 없습니다.</li>
          <li>AI 판결 결과에 대해 서비스는 정확성이나 공정성을 보장하지 않습니다.</li>
          <li>이용자는 AI 판결 결과를 재판, 중재 등 법적 절차의 근거로 사용할 수 없습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제7조 (이용자의 의무)</h2>
        <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>타인을 비방, 모욕하거나 명예를 훼손하는 내용 작성</li>
          <li>욕설, 혐오 표현, 차별적 발언 등 부적절한 콘텐츠 게시</li>
          <li>개인정보, 연락처 등 민감한 정보를 논쟁에 포함</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>자동화된 수단을 이용한 대량 논쟁 생성 또는 투표 조작</li>
          <li>기타 법령 또는 본 약관에 위반되는 행위</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제8조 (콘텐츠 필터링)</h2>
        <p>서비스는 부적절한 콘텐츠를 방지하기 위해 자동 필터링 시스템을 운영합니다. 필터링에 의해 차단된 콘텐츠에 대해 서비스는 별도의 통지 의무를 지지 않습니다.</p>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제9조 (콘텐츠의 권리)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>이용자가 작성한 논쟁 및 주장의 저작권은 이용자에게 있습니다.</li>
          <li>이용자는 서비스에 콘텐츠를 게시함으로써 서비스 내 표시, AI 분석, 공유 기능에 대한 이용 허락을 부여합니다.</li>
          <li>서비스는 이용자의 콘텐츠를 서비스 운영 및 개선 목적으로 활용할 수 있습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제10조 (서비스의 변경 및 중단)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스는 운영상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</li>
          <li>무료로 제공되는 서비스의 변경 또는 중단에 대해 별도의 보상을 하지 않습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제11조 (면책)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스는 천재지변, 기술적 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          <li>이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 서비스는 개입하지 않으며 책임을 지지 않습니다.</li>
          <li>이용자가 게시한 콘텐츠로 인해 발생하는 문제에 대해 서비스는 책임을 지지 않습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-[#2D3350] mb-2">제12조 (회원 탈퇴)</h2>
        <p>이용자는 언제든지 서비스 내에서 탈퇴를 요청할 수 있으며, 탈퇴 시 개인정보는 개인정보처리방침에 따라 처리됩니다.</p>
      </section>

      <section>
        <h2 className="font-bold text-[#2D3350] mb-2">제13조 (준거법 및 관할)</h2>
        <p>본 약관의 해석 및 적용에 관하여는 대한민국 법령을 적용하며, 서비스 이용과 관련한 분쟁은 민사소송법에 따른 관할 법원에서 해결합니다.</p>
      </section>
    </div>
  );
}
