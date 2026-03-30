import { useState, useEffect } from "react";
import Button from "../common/Button";
import { HelpCircle, Check } from "lucide-react";
import { getGuideStep } from "../common/OnboardingModal";

export default function Step2PurposeLens({
  purpose, setPurpose,
  lens, setLens,
  aiSuggestedPurpose,
  aiSuggestedLens,
  nextStep, prevStep,
  isLastStep = false,
}) {

  const [errorPurpose, setErrorPurpose] = useState("");
  const [errorLens,    setErrorLens]    = useState("");
  const [showPurposeHelp, setShowPurposeHelp] = useState(false);
  const [showLensHelp,    setShowLensHelp]    = useState(false);
  const [showLensModal,   setShowLensModal]   = useState(false);

  // 목적: 설명이 있어서 리스트형이 적합
  const purposeOptions = [
    {
      key: "승부",
      desc: "논리 대결로 승자를 가립니다",
      result: "승패 처리",
    },
    {
      key: "합의",
      desc: "의견을 조율해 공통 결론을 찾습니다",
      result: "합의 도출",
    },
    {
      key: "분석",
      desc: "논쟁 구조와 논리를 분석합니다",
      result: "분석 결과",
    },
  ];

  // 기준 선택: 미선택(기본) / 선택
  const [lensMode, setLensMode] = useState(lens ? 'custom' : 'none');

  const lensOptions = [
    { key: "도덕", desc: "행위의 옳고 그름, 의무와 책임, 공정성과 정의의 관점에서 판단합니다." },
    { key: "법률", desc: "현행법 기준의 합법성, 헌법적 가치(기본권·평등권), 절차적 정당성을 기준으로 판단합니다." },
    { key: "실용", desc: "비용 대비 효과, 현실적 실현 가능성, 장기적 지속 가능성을 중심으로 판단합니다." },
    { key: "사회", desc: "공동체에 미치는 영향, 집단 간 형평성, 해당 사회의 문화적 맥락을 고려하여 판단합니다." },
    { key: "사실", desc: "데이터와 연구 근거, 주장과 결과 간 인과관계, 해당 분야 전문가 합의를 기반으로 판단합니다." },
    { key: "권리", desc: "개인의 자율성과 선택권, 소수자·취약계층의 권리 보호, 프라이버시 침해 여부를 중심으로 판단합니다." },
    { key: "공익", desc: "사회 전체의 이익, 민주적 가치(다수결·대표성·투명성), 국제적 맥락에서의 국익을 기준으로 판단합니다." },
  ];

  const handleNext = () => {
    let valid = true;
    if (!purpose) { setErrorPurpose("목적을 선택해주세요."); valid = false; }
    if (!valid) return;
    // 미선택이면 일반으로 설정
    if (lensMode === 'none') {
      setLens('일반');
    }
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 mt-6">

      {/* ── 목적 선택 (리스트형 라디오) ── */}
      <div className="flex flex-col gap-3">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">목적 선택</h3>
            <button
              onClick={() => setShowPurposeHelp(true)}
              className="text-primary/30 hover:text-primary/60 transition-colors"
            >
              <HelpCircle size={16} />
            </button>
          </div>
          {errorPurpose && (
            <span className="text-xs text-red-500">{errorPurpose}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {purposeOptions.map(({ key, emoji, desc, result }) => {
            const active = purpose === key;
            const isAI   = aiSuggestedPurpose === key;

            return (
              <button
                key={key}
                onClick={() => { setPurpose(key); setErrorPurpose(""); }}
                className={`
                  w-full flex items-center gap-4 px-4 py-4 rounded-2xl
                  border-2 text-left transition-all duration-200 active:scale-[0.98]
                  ${active
                    ? "border-gold bg-gold/8 shadow-sm"
                    : "border-gray-100 bg-white hover:border-gray-200"
                  }
                `}
              >
                {/* 이모지 */}
                <span className={`text-2xl flex-shrink-0 transition-all duration-200 ${active ? "scale-110" : "opacity-60"}`}>
                  {emoji}
                </span>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-[15px] ${active ? "text-primary" : "text-primary/70"}`}>
                      {key}
                    </span>
                    {/* AI 추천 뱃지 */}
                    {isAI && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold leading-none">
                        AI 추천
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${active ? "text-primary/60" : "text-primary/35"}`}>
                    {desc}
                  </p>
                </div>

                {/* 결과 텍스트 + 체크 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] font-bold ${active ? 'text-gold' : 'text-primary/25'}`}>{key === '승부' ? result : result}</span>
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center
                    border-2 transition-all duration-200
                    ${active ? "bg-gold border-gold" : "border-gray-200"}
                  `}>
                    {active && <Check size={11} strokeWidth={3} className="text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* ── 기준 선택 (라디오: 미선택/선택) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">기준 선택</h3>
          <button
            onClick={() => setShowLensHelp(true)}
            className="text-primary/30 hover:text-primary/60 transition-colors"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 미선택 (기본값) */}
          <button
            onClick={() => { setLensMode('none'); setLens(''); setErrorLens(''); }}
            className={`flex flex-col items-center justify-center px-3 py-4 rounded-2xl border-2 text-center transition-all duration-200 active:scale-[0.98] ${
              lensMode === 'none' ? 'border-gold bg-gold/8 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <span className={`font-bold text-[15px] ${lensMode === 'none' ? 'text-primary' : 'text-primary/70'}`}>미선택</span>
          </button>

          {/* 선택 */}
          <button
            onClick={() => { setLensMode('custom'); if (!lens) setLens(lensOptions[0].key); setErrorLens(''); setShowLensModal(true); }}
            className={`flex flex-col items-center justify-center px-3 py-4 rounded-2xl border-2 text-center transition-all duration-200 active:scale-[0.98] ${
              lensMode === 'custom' ? 'border-gold bg-gold/8 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`font-bold text-[15px] ${lensMode === 'custom' ? 'text-primary' : 'text-primary/70'}`}>선택</span>
              {lensMode === 'custom' && lens && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold">{lens}</span>
              )}
            </div>
          </button>
        </div>

        {/* 기준 선택 모달 */}
        {lensMode === 'custom' && showLensModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" onClick={() => setShowLensModal(false)}>
            <div className="w-full max-w-sm bg-surface-alt rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2a3f6a] px-5 py-3">
                <p className="text-[13px] font-extrabold text-[#D4AF37] tracking-[0.05em]">기준 선택</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {lensOptions.map(({ key, desc }) => {
                  const active = lens === key;
                  const isAI = aiSuggestedLens === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setLens(key); setErrorLens(''); setShowLensModal(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                        active ? 'border-gold bg-gold/8' : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-[15px] ${active ? 'text-primary' : 'text-primary/70'}`}>{key}</span>
                          {isAI && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold leading-none">AI 추천</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${active ? 'text-primary/60' : 'text-primary/35'}`}>{desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                        active ? 'bg-gold border-gold' : 'border-gray-200'
                      }`}>
                        {active && <Check size={11} strokeWidth={3} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 버튼 ── */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Button variant="accent" onClick={prevStep} className="w-full">이전</Button>
        </div>
        <div className="relative flex-1">
          {getGuideStep() && (
            <>
              <div className="absolute -inset-0.5 rounded-xl border-2 border-[#D4AF37] pointer-events-none" style={{ animation: 'guide-glow 2s ease-in-out infinite' }} />
              <div className="absolute -inset-1.5 rounded-xl border border-[#D4AF37]/40 pointer-events-none" style={{ animation: 'guide-glow 2s ease-in-out infinite 0.3s' }} />
              <style>{`@keyframes guide-glow{0%,100%{opacity:0.3;transform:scale(1);}50%{opacity:0.9;transform:scale(1.03);}}`}</style>
            </>
          )}
          <Button onClick={handleNext} className="w-full" autoFocus>
            {isLastStep ? "방 생성 및 입장" : "다음"}
          </Button>
        </div>
      </div>

      {/* PURPOSE HELP MODAL */}
      {showPurposeHelp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">
            <h3 className="text-lg font-bold font-sans mb-4">목적 선택이란?</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
              토론의 진행 방향을 결정하는 단계입니다.<br /><br />
              • <b>승부</b>: 논리 대결을 통해 승자를 가립니다.<br />
              • <b>합의</b>: 서로 의견을 조율해 공통 결론을 찾습니다.<br />
              • <b>분석</b>: 논쟁 구조와 논리를 분석하며 이해합니다.
            </p>
            <button
              onClick={() => setShowPurposeHelp(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-sans hover:opacity-90"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* LENS HELP MODAL */}
      {showLensHelp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">
            <h3 className="text-lg font-bold font-sans mb-4">기준 선택이란?</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
              토론을 바라보는 관점(프레임)을 의미합니다.<br /><br />
              같은 주제라도 선택한 기준에 따라<br />
              판단 기준과 논거가 달라질 수 있습니다.
            </p>
            <button
              onClick={() => setShowLensHelp(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-sans hover:opacity-90"
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}