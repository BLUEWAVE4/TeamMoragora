// 담당: 서우주 (프론트A) - 32h // 
// 3단계 위자드 UI: 목적 → 렌즈 → 주제

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDebate } from "../../services/api";
import { trackEvent } from "../../services/analytics";

import ModeSelector from "../../components/ui/ModeSelector";
import StepWizard from "../../components/common/StepWizard";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";

import Step1BasicInfo from "../../components/debate/Step1BasicInfo";
import Step2DetailSetting from "../../components/debate/Step2DetailSetting";
import Step3Confirm from "../../components/debate/Step3Confirm";

export default function CreateDebatePage() {

  const [mode, setMode] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);

  const [step, setStep] = useState(1);

  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lens, setLens] = useState("");

  const navigate = useNavigate();

  const nextStep = () => setStep(prev => prev + 1);

  const resetForm = () => {
    setTopic("");
    setCategory("");
    setPurpose("");
    setLens("");
  };

  const prevStep = () => {

    if (step === 1) {
      setShowBackModal(true);
      return;
    }

    if (step === 3) {
      setTopic("");
      setCategory("");
    }

    if (step === 2) {
      setPurpose("");
      setLens("");
    }

    setStep(prev => prev - 1);
  };

  const handleModeStart = (selectedMode) => {
    setMode(selectedMode);
    setGameStarted(true);
  };

  const handleSubmit = async () => {

  try {

    const data = {
      topic,
      category,
      purpose,
      lens,
      mode
    };

    const result = await createDebate(data);
    trackEvent('debate_create', { category, purpose, lens, mode });

    console.log("createDebate result:", result);

    const debateId = result?.debate_id || result?.id;
    const inviteCode = result?.invite_code || result?.inviteCode;

    if (!inviteCode) {
      console.error("inviteCode 없음", result);
      alert("초대 코드 생성 실패");
      return;
    }

    // alert("논쟁 생성 완료");
    console.log("inviteCode:", inviteCode);

    // InvitePage 이동
    navigate(`/invite/${inviteCode}`);

    resetForm();
    setStep(1);
    setGameStarted(false);
    setMode(null);

  } catch (err) {

    console.error(err);
    alert("생성 실패");

  }

};

  return (

    <div className="min-h-screen flex justify-center items-center px-4 bg-[#FAFAF5]">

      <div className="w-full max-w-md">

        <h2 className="text-2xl font-bold mb-6 text-center">
          논쟁 생성하기
        </h2>

        {!gameStarted && (
          <ModeSelector onStart={handleModeStart}/>
        )}

        {gameStarted && mode === "battle" && (
          <>
            <StepWizard currentStep={step} total={3}/>

            {step === 1 && (
              <Step1BasicInfo
                purpose={purpose}
                setPurpose={setPurpose}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {step === 2 && (
              <Step2DetailSetting
                lens={lens}
                setLens={setLens}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {step === 3 && (
              <Step3Confirm
                mode={mode}
                purpose={purpose}
                lens={lens}
                topic={topic}
                setTopic={setTopic}
                category={category}
                setCategory={setCategory}
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
        title="게임 모드를 다시 선택하시겠습니까?"
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

              resetForm();

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