import { useState } from "react";
import Button from "../common/Button";
import { HelpCircle, Check } from "lucide-react";

export default function Step2PurposeLens({
  purpose, setPurpose,
  lens, setLens,
  aiSuggestedPurpose,
  aiSuggestedLens,
  nextStep, prevStep,
}) {

  const [errorPurpose, setErrorPurpose] = useState("");
  const [errorLens,    setErrorLens]    = useState("");
  const [showPurposeHelp, setShowPurposeHelp] = useState(false);
  const [showLensHelp,    setShowLensHelp]    = useState(false);

  // 목적: 설명이 있어서 리스트형이 적합
  const purposeOptions = [
    {
      key: "승부",
      desc: "논리 대결로 승자를 가립니다",
    },
    {
      key: "합의",
      desc: "의견을 조율해 공통 결론을 찾습니다",
    },
    {
      key: "분석",
      desc: "논쟁 구조와 논리를 분석합니다",
    },
  ];

  // 렌즈: 짧은 레이블 → 칩 형태
  const lensOptions = [
    { key: "논리", },
    { key: "감정", },
    { key: "현실", },
    { key: "윤리", },
    { key: "일반", },
  ];

  const lensDesc = {
    논리: "논리적 타당성과 근거 중심으로 판단합니다.",
    감정: "감정과 공감 중심으로 판단합니다.",
    현실: "현실적인 결과와 상황을 중심으로 판단합니다.",
    윤리: "도덕성과 윤리적 기준으로 판단합니다.",
    일반: "특정 기준 없이 균형 잡힌 시각으로 판단합니다.",
  };

  const handleNext = () => {
    let valid = true;
    if (!purpose) { setErrorPurpose("목적을 선택해주세요."); valid = false; }
    if (!lens)    { setErrorLens("렌즈를 선택해주세요.");    valid = false; }
    if (!valid) return;
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
          {purposeOptions.map(({ key, emoji, desc }) => {
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

                {/* 체크 */}
                <div className={`
                  w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center
                  border-2 transition-all duration-200
                  ${active ? "bg-gold border-gold" : "border-gray-200"}
                `}>
                  {active && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* ── 렌즈 선택 (칩형) ── */}
      <div className="flex flex-col gap-3">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">렌즈 선택</h3>
            <button
              onClick={() => setShowLensHelp(true)}
              className="text-primary/30 hover:text-primary/60 transition-colors"
            >
              <HelpCircle size={16} />
            </button>
          </div>
          {errorLens && (
            <span className="text-xs text-red-500">{errorLens}</span>
          )}
        </div>

        {/* 칩 목록 */}
        <div className="flex flex-wrap gap-2">
          {lensOptions.map(({ key, emoji }) => {
            const active = lens === key;
            const isAI   = aiSuggestedLens === key;

            return (
              <button
                key={key}
                onClick={() => { setLens(key); setErrorLens(""); }}
                className={`
                  relative flex items-center gap-1.5 px-4 py-2.5 rounded-full
                  border-2 font-bold text-[14px] transition-all duration-200 active:scale-95
                  ${active
                    ? "border-gold bg-gold/10 text-primary shadow-sm"
                    : "border-gray-100 bg-white text-primary/50 hover:border-gray-200 hover:text-primary/70"
                  }
                `}
              >
                <span className={`text-base transition-all duration-200 ${active ? "" : "opacity-50"}`}>
                  {emoji}
                </span>
                {key}

                {/* AI 추천 점 표시 */}
                {isAI && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gold border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* 선택된 렌즈 설명 */}
        {lens && (
          <div className="px-4 py-3 bg-primary/[0.03] border border-primary/8 rounded-xl">
            <p className="text-xs text-primary/60 leading-relaxed">
              <b className="text-primary/80">{lens} 렌즈</b> — {lensDesc[lens]}
            </p>
          </div>
        )}

      </div>

      {/* ── 하단 버튼 ── */}
      <div className="flex gap-3">
        <Button variant="accent" onClick={prevStep} className="w-full">이전</Button>
        <Button onClick={handleNext} className="w-full">다음</Button>
      </div>

      {/* PURPOSE HELP MODAL */}
      {showPurposeHelp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">
            <h3 className="text-lg font-bold font-serif mb-4">목적 선택이란?</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
              토론의 진행 방향을 결정하는 단계입니다.<br /><br />
              • <b>승부</b>: 논리 대결을 통해 승자를 가립니다.<br />
              • <b>합의</b>: 서로 의견을 조율해 공통 결론을 찾습니다.<br />
              • <b>분석</b>: 논쟁 구조와 논리를 분석하며 이해합니다.
            </p>
            <button
              onClick={() => setShowPurposeHelp(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-serif hover:opacity-90"
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
            <h3 className="text-lg font-bold font-serif mb-4">렌즈 선택이란?</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
              토론을 바라보는 관점(프레임)을 의미합니다.<br /><br />
              같은 주제라도 선택한 렌즈에 따라<br />
              판단 기준과 논거가 달라질 수 있습니다.
            </p>
            <button
              onClick={() => setShowLensHelp(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-serif hover:opacity-90"
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}