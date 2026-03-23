import { useState, useEffect } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Card from "../common/Card";
import { HelpCircle } from "lucide-react";
import MoragoraModal from "../common/MoragoraModal";

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
  const [editingSide, setEditingSide] = useState(null);
  const [tempText, setTempText] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', description: '', type: 'info' });
  const showModal = (title, description, type = 'info') => setModalState({ isOpen: true, title, description, type });
  const closeModal = () => setModalState({ isOpen: false, title: '', description: '', type: 'info' });

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

        <Input
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setError(prev => ({ ...prev, topic: "" }));
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
          placeholder="예: AI가 인간 일자리를 대체해야 하는가?"
        />
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
                <p
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => { if (el) { if (!el.textContent) el.textContent = tempText; el.focus(); } }}
                  onBlur={(e) => setTempText(e.currentTarget.textContent)}
                  onInput={(e) => setTempText(e.currentTarget.textContent)}
                  className="text-primary/90 leading-relaxed text-[20px] outline-none dark-gold"
                >{tempText}</p>
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
                <p
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => { if (el) { if (!el.textContent) el.textContent = tempText; el.focus(); } }}
                  onBlur={(e) => setTempText(e.currentTarget.textContent)}
                  onInput={(e) => setTempText(e.currentTarget.textContent)}
                  className="text-primary/90 leading-relaxed text-[20px] outline-none dark-gold"
                >{tempText}</p>
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