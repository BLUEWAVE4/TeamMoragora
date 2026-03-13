// // 담당: 서우주 (프론트A) - 32h // 
// // 3단계 위자드 UI: 목적 → 렌즈 → 주제

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDebate, generateDebateSides } from "../../services/api";

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

  const [topic, setTopic] = useState("");

  const [proSide, setProSide] = useState("");
  const [conSide, setConSide] = useState("");

  const [purpose, setPurpose] = useState("");
  const [lens, setLens] = useState("");

  const [category, setCategory] = useState("");
  const [time, setTime] = useState("");

  const [showBackModal, setShowBackModal] = useState(false);

  const nextStep = () => setStep(prev => prev + 1);

  const prevStep = () => {

    if (step === 1) {
      setShowBackModal(true);
      return;
    }

    setStep(prev => prev - 1);

  };

  const handleModeStart = (selectedMode) => {
    setMode(selectedMode);
    setGameStarted(true);
  };

  // 🔥 AI 찬반 생성
  const handleGenerateSides = async () => {

    if (!topic) {
      alert("주제를 입력하세요");
      return;
    }

    try {

      const result = await generateDebateSides({ topic });

      setProSide(result.pro);
      setConSide(result.con);

      alert("AI 찬반 생성 완료");

    } catch (err) {

      console.error(err);
      alert("AI 생성 실패");

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
        mode
      };

      const result = await createDebate(data);

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

        <h2 className="text-2xl font-bold mb-4 text-center">
          논쟁 생성하기
        </h2>

        {!gameStarted && (
          <ModeSelector onStart={handleModeStart}/>
        )}

        {gameStarted && mode === "battle" && (
          <>
            <StepWizard currentStep={step} total={3}/>

            {step === 1 && (
              <Step1Topic
                topic={topic}
                setTopic={setTopic}
                proSide={proSide}
                conSide={conSide}
                handleGenerateSides={handleGenerateSides}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {step === 2 && (
              <Step2PurposeLens
                purpose={purpose}
                setPurpose={setPurpose}
                lens={lens}
                setLens={setLens}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {step === 3 && (
              <Step3CategoryTime
                category={category}
                setCategory={setCategory}
                time={time}
                setTime={setTime}
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

          <Button
            variant="outline"
            onClick={() => setShowBackModal(false)}
          >
            아니오
          </Button>

          <Button
            onClick={() => {
              setGameStarted(false);
              setMode(null);
              setStep(1);
              setShowBackModal(false);
            }}
          >
            예
          </Button>

        </div>

      </Modal>

    </div>
  );
}