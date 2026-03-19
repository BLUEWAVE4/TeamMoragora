// // // // 담당: 서우주 (프론트A) - 32h
// // // // 3단계 위자드 UI: 목적 → 렌즈 → 주제

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createDebate, generateDebateSides } from "../../services/api";

const DRAFT_KEY = 'debate_create_draft';

import ModeSelector from "../../components/ui/ModeSelector";
import StepWizard from "../../components/common/StepWizard";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";

import Step1Topic from "../../components/debate/Step1Topic";
import Step2PurposeLens from "../../components/debate/Step2PurposeLens";
import Step3CategoryTime from "../../components/debate/Step3CategoryTime";

export default function DebateCreatePage() {

  const navigate = useNavigate();

  const [mode, setMode] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [step, setStep] = useState(1);

  const [topic,    setTopic]    = useState("");
  const [proSide,  setProSide]  = useState("");
  const [conSide,  setConSide]  = useState("");
  const [purpose,  setPurpose]  = useState("");
  const [lens,     setLens]     = useState("");
  const [category, setCategory] = useState("");
  const [time,     setTime]     = useState("");

  const [showBackModal, setShowBackModal] = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);

  // ⭐ topic별 AI 결과 저장 (purpose, lens 포함)
  const [aiResults, setAiResults] = useState({});

  // ===== 임시저장 복원 =====
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (!draft) return;
      if (draft.topic)    setTopic(draft.topic);
      if (draft.proSide)  setProSide(draft.proSide);
      if (draft.conSide)  setConSide(draft.conSide);
      if (draft.purpose)  setPurpose(draft.purpose);
      if (draft.lens)     setLens(draft.lens);
      if (draft.category) setCategory(draft.category);
      if (draft.time)     setTime(draft.time);
      if (draft.mode && draft.step >= 1)     { setMode(draft.mode); setGameStarted(true); }
      if (draft.step)     setStep(draft.step);
      if (draft.aiResults) setAiResults(draft.aiResults);
    } catch { /* ignore */ }
  }, []);

  // ===== 임시저장 =====
  const saveDraft = useCallback(() => {
    if (!gameStarted) return;
    const draft = {
      topic, proSide, conSide, purpose, lens,
      category, time, mode, step, aiResults,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [topic, proSide, conSide, purpose, lens, category, time, mode, step, gameStarted, aiResults]);

  useEffect(() => { saveDraft(); }, [saveDraft]);
  const nextStep = () => {
    if (topic) {
      setAiResults(prev => ({
        ...prev,
        [topic]: {
          ...prev[topic],           // ← 기존 aiPurpose, aiLens 보존
          pro: proSide,
          con: conSide,
          category,
        },
      }));
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (step === 1) { setShowBackModal(true); return; }
    setStep(prev => prev - 1);
  };

  const resetDebateState = () => {
    setTopic(""); setProSide(""); setConSide("");
    setPurpose(""); setLens(""); setCategory(""); setTime("");
    setAiResults({});
    setStep(1);
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleModeStart = (selectedMode) => {
    setMode(selectedMode);
    setGameStarted(true);
  };

  const handleGenerateSides = async () => {
    if (!topic.trim()) { alert("주제를 입력하세요"); return null; }

    // 이미 생성된 topic이면 재사용
    if (aiResults[topic]) {
      const saved = aiResults[topic];
      setProSide(saved.pro);
      setConSide(saved.con);
      if (saved.category) setCategory(saved.category);
      if (saved.aiPurpose) setPurpose(saved.aiPurpose);  // 캐시 복원 시 초기 purpose 세팅
      if (saved.aiLens)    setLens(saved.aiLens);
      return saved;
    }

    try {
      setAiLoading(true);
      const result = await generateDebateSides({ topic });

      if (result.unavailable) {
        alert("해당 주제는 자동완성이 어려워 직접 수정을 부탁드립니다.");
        return null;
      }

      const newResult = {
  pro:       result.pro,
  con:       result.con,
  category:  result.category,
  aiPurpose: result.purpose,   // ← AI 추천 전용 키
  aiLens:    result.lens,      // ← AI 추천 전용 키
};

setProSide(result.pro);
setConSide(result.con);
if (result.category) setCategory(result.category);
if (result.purpose)  setPurpose(result.purpose);
if (result.lens)     setLens(result.lens);

setAiResults(prev => ({ ...prev, [topic]: newResult }));
      return newResult;

    } catch (err) {
      console.error(err);
      alert("AI 생성 실패");
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const data = {
        topic,
        pro_side: proSide,
        con_side: conSide,
        category,
        purpose,
        lens,
        time,
        mode,
        deadline: time
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + parseInt(time));
              return d.toISOString();
            })()
          : null,
      };

      const result = await createDebate(data);
      localStorage.removeItem(DRAFT_KEY);

      const inviteCode = result?.invite_code;
      sessionStorage.setItem(`debate_invite_${inviteCode}`, JSON.stringify(result));
      navigate(`/invite/${inviteCode}`);

    } catch (err) {
      console.error(err);
      alert("생성 실패");
    }
  };

  return (
    <div className="min-h-screen flex justify-center px-4 pt-6 pb-28 bg-[#FAFAF5]">
      <div className="w-full max-w-md">

        <h2 className="text-2xl font-bold mb-4 text-center">논쟁 생성하기</h2>

        {!gameStarted && <ModeSelector onStart={handleModeStart} />}

        {gameStarted && mode === "battle" && (
          <>
            <StepWizard currentStep={step} total={3} />

            {step === 1 && (
              <Step1Topic
                topic={topic}        setTopic={setTopic}
                category={category}  setCategory={setCategory}
                proSide={proSide}    setProSide={setProSide}
                conSide={conSide}    setConSide={setConSide}
                aiLoading={aiLoading}
                aiResults={aiResults}
                handleGenerateSides={handleGenerateSides}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {step === 2 && (
              <Step2PurposeLens
                purpose={purpose}  setPurpose={setPurpose}
                lens={lens}        setLens={setLens}
                // AI 추천값 전달
                aiSuggestedPurpose={aiResults[topic]?.aiPurpose || null}
                aiSuggestedLens={aiResults[topic]?.aiLens || null}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {step === 3 && (
              <Step3CategoryTime
                topic={topic}      proSide={proSide}  conSide={conSide}
                purpose={purpose}  lens={lens}        category={category}
                time={time}        setTime={setTime}
                prevStep={prevStep}
                handleSubmit={handleSubmit}
              />
            )}
          </>
        )}

      </div>

      <Modal
        isOpen={showBackModal}
        onClose={() => setShowBackModal(false)}
        title="모드를 다시 선택하시겠습니까?"
      >
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={() => setShowBackModal(false)}>아니오</Button>
          <Button onClick={() => {
            resetDebateState();
            setGameStarted(false);
            setMode(null);
            setShowBackModal(false);
          }}>예</Button>
        </div>
      </Modal>
    </div>
  );
}