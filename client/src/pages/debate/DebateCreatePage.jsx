// 담당: 서우주 (프론트A) - 32h // 
// 3단계 위자드 UI: 목적 → 렌즈 → 주제

import { useState } from "react";
import { createDebate } from "../../services/api";

import ModeSelector from "../../components/ui/ModeSelector";
import StepWizard from "../../components/common/StepWizard";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";

import Step1BasicInfo from "../../components/debate/Step1BasicInfo";
import Step2DetailSetting from "../../components/debate/Step2DetailSetting";
import Step3Confirm from "../../components/debate/Step3Confirm";

export default function DebateCreatePage() {

  const [mode, setMode] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);

  const [step, setStep] = useState(1);

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lens, setLens] = useState("");

  const nextStep = () => setStep(prev => prev + 1);

  // 🔹 모든 입력값 초기화
  const resetForm = () => {
    setTopic("");
    setDescription("");
    setCategory("");
    setPurpose("");
    setLens("");
  };

  const prevStep = () => {

    if (step === 1) {
      setShowBackModal(true);
      return;
    }

    // Step3 → Step2
    if (step === 3) {
      setTopic("");
      setDescription("");
      setCategory("");
      setLens("");
    }

    // Step2 → Step1
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
        description,
        category,
        purpose,
        lens,
        mode
      };

      await createDebate(data);

      alert("논쟁 생성 완료");

      // 🔹 Step1,2,3 입력 데이터 초기화
      resetForm();

      // 🔹 위자드 초기 상태로 복귀
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
                description={description}
                setDescription={setDescription}
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

              // 🔹 Step1에서 게임모드로 돌아갈 때 데이터 초기화
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