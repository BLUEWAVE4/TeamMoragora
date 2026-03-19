import { useState, useEffect } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Card from "../common/Card";
import { HelpCircle } from "lucide-react";

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
    if (editingSide) { alert("수정을 완료해주세요."); return; }

    // ── 초안 표시 상태 → 카테고리 확인 후 Step2 이동 ──
    if (showDraft) {
      if (!category || category.trim() === "") {
        setError(prev => ({ ...prev, category: "카테고리를 선택해주세요." }));
        return;
      }
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

      {/* ── 주제 입력 화면 ── */}
      {!showDraft && (
        <div className="flex flex-col gap-2">

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">AI 논쟁 주제 생성</h3>
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
            placeholder="예: AI가 인간 일자리를 대체해야 하는가?"
          />

          {error.topic && <span className="text-xs text-red-500">{error.topic}</span>}

        </div>
      )}

      {/* ── AI 초안 결과 화면 ── */}
      {showDraft && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-primary/50">논쟁 주제</span>
            <h2 className="text-xl font-bold text-primary">{topic}</h2>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-serif font-bold text-primary text-lg tracking-tight">AI 논쟁 초안</h3>
            <h5 className="font-serif font-bold text-primary text-m tracking-tight">생성된 A측/B측 입장은 자유롭게 수정 가능합니다.</h5>
            <div className="flex flex-col gap-5">

              {/* A측 */}
              {proSide && (
                <Card variant="base" title="A측(본인) 주장">
                  {editingSide === "pro" ? (
                    <>
                      <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} className="w-full border rounded-lg p-3 text-sm" rows={4} />
                      <div className="flex gap-2 mt-3 justify-end">
                        <Button variant="outline" onClick={cancelEdit}>취소</Button>
                        <Button onClick={confirmEdit}>저장</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-primary/90 leading-relaxed">{proSide}</p>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" onClick={() => startEdit("pro")}>수정</Button>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* B측 */}
              {conSide && (
                <Card variant="base" title="B측(상대방) 주장">
                  {editingSide === "con" ? (
                    <>
                      <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} className="w-full border rounded-lg p-3 text-sm" rows={4} />
                      <div className="flex gap-2 mt-3 justify-end">
                        <Button variant="outline" onClick={cancelEdit}>취소</Button>
                        <Button onClick={confirmEdit}>저장</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-primary/90 leading-relaxed">{conSide}</p>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" onClick={() => startEdit("con")}>수정</Button>
                      </div>
                    </>
                  )}
                </Card>
              )}

            </div>
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <h3 className="font-bold text-lg">카테고리</h3>
              {error.category && <span className="text-xs text-red-500">{error.category}</span>}
            </div>
            <Input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setError(prev => ({ ...prev, category: "" }));
              }}
              options={categories}
            />
          </div>

          <Button variant="outline" onClick={resetTopic}>주제 다시 입력하기</Button>
        </>
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
            <h3 className="text-lg font-bold font-serif mb-4">AI 논쟁 주제 생성?</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
              주제를 입력하고 <b>다음</b> 버튼을 누르면 AI가 자동으로<br /><br />
              • <b>찬성 / 반대 주장</b><br />
              • <b>카테고리</b><br />
              • <b>목적</b><br />
              • <b>렌즈</b><br /><br />
              의 초안을 생성합니다. 생성된 내용은 자유롭게 변경할 수 있습니다.
            </p>
            <button onClick={() => setShowHelpModal(false)} className="mt-6 w-full py-2 rounded-xl bg-gold text-white">확인</button>
          </div>
        </div>
      )}

    </div>
  );
}