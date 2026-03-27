import { useState, useEffect, useRef } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Card from "../common/Card";
import { HelpCircle } from "lucide-react";
import MoragoraModal from "../common/MoragoraModal";
import useModalState from "../../hooks/useModalState";

const PLACEHOLDER_TOPICS = [
  "노키즈존은 차별인가 권리인가?",
  "결혼 전 동거 필수로 해봐야 하나?",
  "코인 투자는 도박인가 재테크인가?",
  "자유의지는 존재하는가?",
  "물 많이 마시면 진짜 건강해지나?",
  "연인 핸드폰 몰래 보는 건 사랑인가 집착인가?",
  "층간소음은 아이가 있으면 이해해야 하나?",
  "신혼집은 누가 구해야 하나?",
  "명품백 사는 건 낭비인가 투자인가?",
  "거짓말이 누군가를 살린다면 도덕적인가?",
  "아침 공복에 커피 마시면 위에 안 좋은가?",
  "연인 몰래 이성과 단둘이 술 마시면 바람인가?",
  "카페에서 노트북 펴는 거 민폐인가?",
  "결혼식 축의금 얼마가 적당한가?",
  "직장인 N잡은 성실함인가 욕심인가?",
  "AI가 감정을 가지면 인격체로 봐야 하나?",
  "유통기한 지난 음식 먹어도 괜찮은가?",
  "헤어진 당일 새 사람 만나면 잘못인가?",
  "알바생한테 반말하는 손님 참아야 하나?",
  "명절에 처가·시가 번갈아 가야 하나?",
  "집 vs 차, 뭘 먼저 사야 하나?",
  "행복은 추구하는 것인가 발견하는 것인가?",
  "매일 만보 걷기가 운동 효과 있는가?",
  "대중교통 임산부석에 일반인이 앉아도 되나?",
  "결혼은 필수가 아니라 선택인가?",
  "친한 친구에게 돈 빌려주면 안 되나?",
  "정의로운 전쟁은 존재할 수 있는가?",
  "손 세정제가 비누보다 효과적인가?",
  "SNS에 타인 얼굴 동의 없이 올려도 되나?",
  "양가 상견례 비용은 누가 내야 하나?",
  "월세가 전세보다 합리적인가?",
  "죽음을 두려워하는 건 비합리적인가?",
  "밤에 먹으면 진짜 더 살찌는가?",
  "공공장소 통화는 민폐인가?",
  "결혼 안 하고 아이만 가져도 되나?",
  "완전한 평등은 가능한가, 바람직한가?",
  "냉수 샤워가 온수보다 건강에 좋은가?",
  "군대 다녀온 사람이 군대 얘기하면 참아야 하나?",
  "인간의 본성은 선한가 악한가?",
];

// 타이핑→대기→삭제→다음 주제 반복
function useTypewriter(texts, { typeSpeed = 60, deleteSpeed = 30, pauseMs = 1500, active = true }) {
  const [display, setDisplay] = useState("");
  const idxRef = useRef(Math.floor(Math.random() * texts.length));

  useEffect(() => {
    if (!active) return;
    let timer;
    let charPos = 0;
    let isDeleting = false;
    let textIdx = idxRef.current;
    const prefix = "예: ";

    const tick = () => {
      const fullText = prefix + texts[textIdx];

      if (!isDeleting) {
        charPos++;
        setDisplay(fullText.slice(0, charPos));
        if (charPos >= fullText.length) {
          isDeleting = true;
          timer = setTimeout(tick, pauseMs);
          return;
        }
        timer = setTimeout(tick, typeSpeed);
      } else {
        // prefix는 남기고 본문만 지움
        charPos--;
        setDisplay(fullText.slice(0, charPos));
        if (charPos <= prefix.length) {
          isDeleting = false;
          textIdx = (textIdx + 1) % texts.length;
          idxRef.current = textIdx;
          charPos = prefix.length;
          timer = setTimeout(tick, typeSpeed);
          return;
        }
        timer = setTimeout(tick, deleteSpeed);
      }
    };

    timer = setTimeout(tick, typeSpeed);
    return () => clearTimeout(timer);
  }, [texts, typeSpeed, deleteSpeed, pauseMs, active]);

  return display;
}

export default function Step1Topic({
  topic, setTopic,
  category, setCategory,
  proSide, setProSide,
  conSide, setConSide,
  handleGenerateSides,
  nextStep, prevStep,
  aiLoading, aiResults,
}) {

  const [error, setError] = useState({ topic: "", category: "" });
  const [isFocused, setIsFocused] = useState(false);
  const typewriterText = useTypewriter(PLACEHOLDER_TOPICS, { active: !topic && !isFocused });
  const [editingSide, setEditingSide] = useState(null);
  const [tempText, setTempText] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { modalState, showModal, closeModal } = useModalState();

  const hasDraft = !!(topic && aiResults[topic] && proSide && conSide);
  const [showDraft, setShowDraft] = useState(hasDraft);

  const categories = [
    "일상","연애","직장","교육","사회",
    "정치","기술","철학","문화","기타",
  ];
  

  useEffect(() => {
    if (hasDraft) setShowDraft(true);
  }, [hasDraft]);

  const handleNext = async () => {
    if (editingSide) { showModal('수정을 완료해주세요', '현재 편집 중인 항목을 저장한 후\n다음 단계로 진행할 수 있습니다.'); return; }

    // ── 초안 표시 상태 → Step2 이동 ──
    if (showDraft) {
      nextStep();
      return;
    }

    // ── 주제 입력 상태 → AI 생성 ──
    if (!topic.trim()) {
      setError(prev => ({ ...prev, topic: "논쟁 주제를 입력해주세요." }));
      return;
    }

    const result = await handleGenerateSides();
    if (!result) return;

    // 부모에서 이미 state를 세팅하므로 여기선 화면 전환만
    setShowDraft(true);
  };

  const resetTopic = () => {
    setShowDraft(false);
    setTopic(""); setProSide(""); setConSide(""); setCategory("");
    setEditingSide(null);
    setError({ topic: "", category: "" });
  };

  const startEdit  = (side) => { setTempText(side === "pro" ? proSide : conSide); setEditingSide(side); };
  const confirmEdit = () => { if (editingSide === "pro") setProSide(tempText); else setConSide(tempText); setEditingSide(null); };
  const cancelEdit  = () => setEditingSide(null);

  return (
    <div className="flex flex-col gap-6 mt-6">

      {/* ── 주제 입력 (항상 표시) ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">주제</h3>
          <button
            onClick={() => setShowHelpModal(true)}
            className="text-primary/30 hover:text-primary/60 transition-colors"
          >
            <HelpCircle size={17} />
          </button>
        </div>

        <div className="relative">
          <Input
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setError(prev => ({ ...prev, topic: "" }));
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=""
          />
          {/* 타이프라이터 플레이스홀더 오버레이 */}
          {!topic && !isFocused && (
            <div className="absolute inset-0 flex items-center px-5 pointer-events-none">
              <span className="text-primary/50 font-semibold whitespace-nowrap">
                {typewriterText}
                <span className="inline-block w-[2px] h-[1em] bg-primary/40 ml-[1px] align-middle animate-blink" />
              </span>
            </div>
          )}
        </div>
        {error.topic && <span className="text-xs text-red-500">{error.topic}</span>}
      </div>

      {/* ── AI 초안 결과 (주제 입력 아래에 쌓임) ── */}
      {showDraft && (
        <div className="flex flex-col gap-4">
          {/* 본인 주장 라벨 + 수정/완료 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary/50">본인 주장(A측)</span>
            {proSide && (
              <button
                onClick={() => editingSide === "pro" ? confirmEdit() : startEdit("pro")}
                className="text-[12px] font-bold text-primary/40 active:opacity-60 transition-opacity"
              >
                {editingSide === "pro" ? "완료" : "수정"}
              </button>
            )}
          </div>

          {/* A측 카드 */}
          {proSide && (
            <Card variant="base">
              {editingSide === "pro" ? (
                <textarea
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  autoFocus
                  rows={2}
                  className="w-full text-primary/90 leading-relaxed text-[20px] outline-none bg-transparent resize-none dark-gold"
                />
              ) : (
                <p className="text-primary/90 leading-relaxed text-[20px]">{proSide}</p>
              )}
            </Card>
          )}

          {/* 상대방 주장 라벨 + 수정/완료 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary/50">상대방 주장(B측)</span>
            {conSide && (
              <button
                onClick={() => editingSide === "con" ? confirmEdit() : startEdit("con")}
                className="text-[12px] font-bold text-primary/40 active:opacity-60 transition-opacity"
              >
                {editingSide === "con" ? "완료" : "수정"}
              </button>
            )}
          </div>

          {/* B측 카드 */}
          {conSide && (
            <Card variant="base">
              {editingSide === "con" ? (
                <textarea
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  autoFocus
                  rows={2}
                  className="w-full text-primary/90 leading-relaxed text-[20px] outline-none bg-transparent resize-none dark-gold"
                />
              ) : (
                <p className="text-primary/90 leading-relaxed text-[20px]">{conSide}</p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── 하단 버튼 ── */}
      <div className="flex gap-3">
        <Button variant="accent" onClick={prevStep} className="w-full" disabled={aiLoading}>뒤로</Button>
        <Button onClick={handleNext} className="w-full" disabled={aiLoading}>
          {aiLoading ? "AI 생성 중..." : "다음"}
        </Button>
      </div>

      {/* 도움말 모달 */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">
            <h3 className="text-lg font-bold font-sans mb-4">AI 논쟁 주제 생성?</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
              주제를 입력하고 <b>다음</b> 버튼을 누르면 AI가 자동으로<br /><br />
              • <b>찬성 / 반대 주장</b><br />
              • <b>카테고리</b><br />
              • <b>목적</b><br />
              • <b>기준</b><br /><br />
              의 초안을 생성합니다. 생성된 내용은 자유롭게 변경할 수 있습니다.
            </p>
            <button onClick={() => setShowHelpModal(false)} className="mt-6 w-full py-2 rounded-xl bg-gold text-white">확인</button>
          </div>
        </div>
      )}

      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
      />

    </div>
  );
}