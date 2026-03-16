// // // 담당: 서우주 (프론트A) - 32h
// // // 3단계 위자드 UI: 목적 → 렌즈 → 주제

// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { createDebate, generateDebateSides } from "../../services/api";

// import ModeSelector from "../../components/ui/ModeSelector";
// import StepWizard from "../../components/common/StepWizard";
// import Modal from "../../components/common/Modal";
// import Button from "../../components/common/Button";

// import Step1Topic from "../../components/debate/Step1Topic";
// import Step2PurposeLens from "../../components/debate/Step2PurposeLens";
// import Step3CategoryTime from "../../components/debate/Step3CategoryTime";

// export default function DebateCreatePage() {

//   const navigate = useNavigate();

//   const [mode, setMode] = useState(null);
//   const [gameStarted, setGameStarted] = useState(false);

//   const [step, setStep] = useState(1);

//   const [topic, setTopic] = useState("");

//   const [proSide, setProSide] = useState("");
//   const [conSide, setConSide] = useState("");

//   const [purpose, setPurpose] = useState("");
//   const [lens, setLens] = useState("");

//   const [category, setCategory] = useState("");
//   const [time, setTime] = useState("");

//   const [showBackModal, setShowBackModal] = useState(false);
//   const [aiLoading, setAiLoading] = useState(false);

//   // ⭐ topic별 AI 결과 저장
//   const [aiResults, setAiResults] = useState({});

//   const nextStep = () => {

//     // ⭐ 현재 수정된 내용 저장 (핵심 수정)
//     if (topic) {

//       setAiResults(prev => ({
//         ...prev,
//         [topic]: {
//           pro: proSide,
//           con: conSide,
//           category: category
//         }
//       }));

//     }

//     setStep((prev) => prev + 1);
//   };

//   const prevStep = () => {

//     if (step === 1) {
//       setShowBackModal(true);
//       return;
//     }

//     setStep((prev) => prev - 1);
//   };

//   const resetDebateState = () => {

//     setTopic("");
//     setProSide("");
//     setConSide("");
//     setPurpose("");
//     setLens("");
//     setCategory("");
//     setTime("");
//     setAiResults({});
//     setStep(1);
//   };

//   const handleModeStart = (selectedMode) => {
//     setMode(selectedMode);
//     setGameStarted(true);
//   };

//   const handleGenerateSides = async () => {

//     if (!topic.trim()) {
//       alert("주제를 입력하세요");
//       return null;
//     }

//     // ⭐ 이미 생성된 topic이면 재사용
//     if (aiResults[topic]) {

//       const saved = aiResults[topic];

//       setProSide(saved.pro);
//       setConSide(saved.con);

//       if (saved.category) {
//         setCategory(saved.category);
//       }

//       return saved;
//     }

//     try {

//       setAiLoading(true);

//       const result = await generateDebateSides({ topic });

//       if (result.unavailable) {
//         alert("해당 주제는 자동완성이 어려워 직접 수정을 부탁드립니다.");
//         return null;
//       }

//       const newResult = {
//         pro: result.pro,
//         con: result.con,
//         category: result.category
//       };

//       setProSide(result.pro);
//       setConSide(result.con);

//       if (result.category) {
//         setCategory(result.category);
//       }

//       // ⭐ topic 기준 저장
//       setAiResults(prev => ({
//         ...prev,
//         [topic]: newResult
//       }));

//       return newResult;

//     } catch (err) {

//       console.error(err);
//       alert("AI 생성 실패");
//       return null;

//     } finally {

//       setAiLoading(false);

//     }
//   };

//   const handleSubmit = async () => {

//     try {

//       const data = {
//         topic,
//         pro_side: proSide,
//         con_side: conSide,
//         category,
//         purpose,
//         lens,
//         time,
//         mode
//       };

//       const result = await createDebate(data);

//       const inviteCode = result?.invite_code;

//       sessionStorage.setItem(
//         `debate_invite_${inviteCode}`,
//         JSON.stringify(result)
//       );

//       navigate(`/invite/${inviteCode}`);

//     } catch (err) {

//       console.error(err);
//       alert("생성 실패");

//     }
//   };

//   return (

//     <div className="min-h-screen flex justify-center px-4 pt-6 pb-28 bg-[#FAFAF5]">

//       <div className="w-full max-w-md">

//         <h2 className="text-2xl font-bold mb-4 text-center">
//           논쟁 생성하기
//         </h2>

//         {!gameStarted && (
//           <ModeSelector onStart={handleModeStart} />
//         )}

//         {gameStarted && mode === "battle" && (
//           <>
//             <StepWizard currentStep={step} total={3} />

//             {step === 1 && (
//               <Step1Topic
//                 topic={topic}
//                 setTopic={setTopic}
//                 category={category}
//                 setCategory={setCategory}
//                 proSide={proSide}
//                 setProSide={setProSide}
//                 conSide={conSide}
//                 setConSide={setConSide}
//                 aiLoading={aiLoading}
//                 aiResults={aiResults}
//                 handleGenerateSides={handleGenerateSides}
//                 nextStep={nextStep}
//                 prevStep={prevStep}
//               />
//             )}

//             {step === 2 && (
//               <Step2PurposeLens
//                 purpose={purpose}
//                 setPurpose={setPurpose}
//                 lens={lens}
//                 setLens={setLens}
//                 nextStep={nextStep}
//                 prevStep={prevStep}
//               />
//             )}

//             {step === 3 && (
//               <Step3CategoryTime
//                 topic={topic}
//                 proSide={proSide}
//                 conSide={conSide}
//                 purpose={purpose}
//                 lens={lens}
//                 category={category}
//                 time={time}
//                 setTime={setTime}
//                 prevStep={prevStep}
//                 handleSubmit={handleSubmit}
//               />
//             )}
//           </>
//         )}

//       </div>

//       <Modal
//         isOpen={showBackModal}
//         onClose={() => setShowBackModal(false)}
//         title="모드를 다시 선택하시겠습니까?"
//       >

//         <div className="flex gap-3 justify-end mt-6">

//           <Button
//             variant="outline"
//             onClick={() => setShowBackModal(false)}
//           >
//             아니오
//           </Button>

//           <Button
//             onClick={() => {

//               resetDebateState();
//               setGameStarted(false);
//               setMode(null);
//               setShowBackModal(false);

//             }}
//           >
//             예
//           </Button>

//         </div>

//       </Modal>

//     </div>
//   );
// }

// // 담당: 서우주 (프론트A) - 32h
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
  const [aiLoading, setAiLoading] = useState(false);

  const [aiResults, setAiResults] = useState({});

  const nextStep = () => {
    if (topic) {
      setAiResults(prev => ({
        ...prev,
        [topic]: { pro: proSide, con: conSide, category }
      }));
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (step === 1) {
      setShowBackModal(true);
      return;
    }
    setStep((prev) => prev - 1);
  };

  const resetDebateState = () => {
    setTopic("");
    setProSide("");
    setConSide("");
    setPurpose("");
    setLens("");
    setCategory("");
    setTime("");
    setAiResults({});
    setStep(1);
  };

  const handleModeStart = (selectedMode) => {
    setMode(selectedMode);
    setGameStarted(true);
  };

  const handleGenerateSides = async () => {
    if (!topic.trim()) {
      alert("주제를 입력하세요");
      return null;
    }

    if (aiResults[topic]) {
      const saved = aiResults[topic];
      setProSide(saved.pro);
      setConSide(saved.con);
      if (saved.category) setCategory(saved.category);
      return saved;
    }

    try {
      setAiLoading(true);
      const result = await generateDebateSides({ topic });

      if (result.unavailable) {
        alert("해당 주제는 자동완성이 어려워 직접 수정을 부탁드립니다.");
        return null;
      }

      const newResult = { pro: result.pro, con: result.con, category: result.category };
      setProSide(result.pro);
      setConSide(result.con);
      if (result.category) setCategory(result.category);

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
        time,          // "1" | "3" | "7" | ""
        mode,
        // ⭐ 프론트에서 마감 시각 계산 후 함께 전달 (백엔드가 created_at을 안 주는 경우 대비)
        deadline: time
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + parseInt(time));
              return d.toISOString();
            })()
          : null,
      };

      const result = await createDebate(data);
      const inviteCode = result?.invite_code;

      sessionStorage.setItem(
        `debate_invite_${inviteCode}`,
        JSON.stringify(result)
      );

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

        {!gameStarted && (
          <ModeSelector onStart={handleModeStart} />
        )}

        {gameStarted && mode === "battle" && (
          <>
            <StepWizard currentStep={step} total={3} />

            {step === 1 && (
              <Step1Topic
                topic={topic}
                setTopic={setTopic}
                category={category}
                setCategory={setCategory}
                proSide={proSide}
                setProSide={setProSide}
                conSide={conSide}
                setConSide={setConSide}
                aiLoading={aiLoading}
                aiResults={aiResults}
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
                topic={topic}
                proSide={proSide}
                conSide={conSide}
                purpose={purpose}
                lens={lens}
                category={category}
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