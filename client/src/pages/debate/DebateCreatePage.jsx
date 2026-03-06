// 담당: 서우주 (프론트A) - 32h // 
// 3단계 위자드 UI: 목적 → 렌즈 → 주제

import { useState } from "react";
import { createDebate } from "../../services/api";

import ModeSelector from "../../components/ui/ModeSelector";
import StepWizard from "../../components/common/StepWizard";

import Step1BasicInfo from "../../components/debate/Step1BasicInfo";
import Step2DetailSetting from "../../components/debate/Step2DetailSetting";
import Step3Confirm from "../../components/debate/Step3Confirm";

export default function CreateDebatePage() {

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lens, setLens] = useState("");

  const [step, setStep] = useState(1);

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    try {

      const data = {
        topic,
        description,
        category,
        purpose,
        lens,
      };

      const result = await createDebate(data);

      console.log("논쟁 생성:", result);

      alert("논쟁 생성 완료");

    } catch (error) {
      console.error(error);
      alert("생성 실패");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center px-4 bg-[#FAFAF5]">

      <div className="w-full max-w-md">

        <h2 className="text-2xl font-bold mb-6 text-center">
          논쟁 방 만들기
        </h2>

        <ModeSelector />

        <StepWizard currentStep={step} total={3} />

        {step === 1 && (
          <Step1BasicInfo
            purpose={purpose}
            setPurpose={setPurpose}
            nextStep={nextStep}
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

      </div>
    </div>
  );
}