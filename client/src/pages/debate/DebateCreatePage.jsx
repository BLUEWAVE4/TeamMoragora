// 담당: 서우주 (프론트A) - 32h // 
// 3단계 위자드 UI: 목적 → 렌즈 → 주제

// import { useState } from "react";
// import { createDebate } from "../../services/api";

// import ModeSelector from "../../components/ui/ModeSelector";
// import Button from "../../components/common/Button";
// import Card from "../../components/common/Card";
// import Input from "../../components/common/Input";
// import StepWizard from "../../components/common/StepWizard";

// export default function DebateCreatePage() {

//   const [topic, setTopic] = useState("");
//   const [description, setDescription] = useState("");
//   const [category, setCategory] = useState("");
//   const [purpose, setPurpose] = useState("");
//   const [lens, setLens] = useState("");

//   const [step, setStep] = useState(1);

//   const nextStep = () => setStep((prev) => prev + 1);
//   const prevStep = () => setStep((prev) => prev - 1);

//   const handleSubmit = async () => {
//     try {
//       const data = {
//         topic,
//         description,
//         category,
//         purpose,
//         lens,
//       };

//       const result = await createDebate(data);

//       console.log("논쟁 생성:", result);

//       alert("논쟁이 생성되었습니다!");

//     } catch (error) {
//       console.error(error);
//       alert("생성 실패");
//     }
//   };

//   return (
//     <div className="min-h-screen flex justify-center items-center px-4 bg-[#FAFAF5]">

//       <div className="w-full max-w-md">

//         <h2 className="text-2xl font-bold mb-6 text-center">
//           논쟁 방 만들기
//         </h2>

//         <ModeSelector />

//         <StepWizard currentStep={step} total={3} />

//         {/* ---------------- STEP 1 ---------------- */}

//         {step === 1 && (
//           <div className="flex flex-col gap-4 mt-6">

//             <h3 className="font-bold">논쟁 목적 선택</h3>

//             <Card onClick={() => setPurpose("battle")}>
//               승부 — 논리로 승패를 가립니다
//             </Card>

//             <Card onClick={() => setPurpose("consensus")}>
//               합의 — 공통의 진실을 찾습니다
//             </Card>

//             <Card onClick={() => setPurpose("analysis")}>
//               분석 — 양측 논리를 정리합니다
//             </Card>

//             <Button
//               onClick={nextStep}
//               disabled={!purpose}
//             >
//               다음
//             </Button>

//           </div>
//         )}

//         {/* ---------------- STEP 2 ---------------- */}

//         {step === 2 && (
//           <div className="flex flex-col gap-4 mt-6">

//             <h3 className="font-bold">논쟁 렌즈 선택</h3>
//               <div className="grid grid-cols-2 gap-4">
//                 <Card onClick={() => setLens("logic")}>Logic</Card>
//                 <Card onClick={() => setLens("emotion")}>Emotion</Card>
//                 <Card onClick={() => setLens("practical")}>Practical</Card>
//                 <Card onClick={() => setLens("ethics")}>Ethics</Card>
//                 <Card onClick={() => setLens("general")}>General</Card>
//               </div>
//             <div className="flex gap-3">

//               <Button
//                 onClick={prevStep}
//                 variant="accent"
//                 className="w-full"
//               >
//                 이전
//               </Button>

//               <Button
//                 onClick={nextStep}
//                 disabled={!lens}
//                 variant="primary"
//                 className="w-full"
//               >
//                 다음
//               </Button>

//             </div>

//           </div>
//         )}

//         {/* ---------------- STEP 3 ---------------- */}

//         {step === 3 && (
//           <div className="flex flex-col gap-4 mt-6">

//             {/* 카테고리 하드코딩 */}
//             <div className="flex flex-col gap-2 w-full">

//               <label className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] ml-2 opacity-80">
//                 CATEGORY
//               </label>

//               <div className="relative group">

//                 <select
//                   value={category}
//                   onChange={(e) => setCategory(e.target.value)}
//                   className="
//                   w-full px-5 py-4 rounded-2xl
//                   font-serif text-primary
//                   border border-gold/20
//                   bg-gradient-to-br from-surface to-surface-alt
//                   shadow-inner outline-none
//                   transition-all duration-300
//                   focus:border-gold focus:ring-4 focus:ring-gold/10
//                   hover:border-gold/40
//                   appearance-none
//                   "
//                 >
//                   <option value="">카테고리 선택</option>
//                   <option value="society">사회</option>
//                   <option value="technology">기술</option>
//                   <option value="politics">정치</option>
//                   <option value="philosophy">철학</option>
//                 </select>

//                 <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gold text-sm">
//                   ▼
//                 </div>

//                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gold transition-all duration-700 group-focus-within:w-[90%] opacity-40" />

//               </div>
//             </div>

//             {/* 제목 */}
//             <Input
//               label="DEBATE TITLE"
//               placeholder="논쟁 주제를 입력하세요"
//               value={topic}
//               onChange={(e) => setTopic(e.target.value)}
//             />

//             {/* 설명 */}
//             <Input
//               label="DESCRIPTION"
//               placeholder="논쟁에 대한 설명을 입력하세요"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               multiline={true}
//               rows={6}
//             />

//             {/* 버튼 */}
//             <div className="flex gap-3">

//               <Button
//                 onClick={prevStep}
//                 variant="accent"
//                 className="w-full"
//               >
//                 이전
//               </Button>

//               <Button
//                 onClick={handleSubmit}
//                 disabled={!topic || !category}
//                 variant="primary"
//                 className="w-full"
//               >
//                 시작
//               </Button>

//             </div>

//           </div>
//         )}
//       </div>

//     </div>
//   );
// }

import { useState } from "react";
import { createDebate } from "../../services/api";

import ModeSelector from "../../components/ui/ModeSelector";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import StepWizard from "../../components/common/StepWizard";

export default function DebateCreatePage() {

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

      if (!category || !topic || !description) {
        alert("카테고리 / 제목 / 내용을 모두 입력해주세요");
        return;
      }

      const data = {
        topic,
        description,
        category,
        purpose,
        lens,
      };

      console.log("최종 생성 데이터", data);

      const result = await createDebate(data);

      console.log("논쟁 생성:", result);

      alert("논쟁이 생성되었습니다!");

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

        {/* STEP 1 */}

        {step === 1 && (
          <div className="flex flex-col gap-4 mt-6">

            <h3 className="font-bold">논쟁 목적 선택</h3>

            <Card
              onClick={() => {
                setPurpose("battle");
                console.log("선택된 purpose:", "battle");
              }}
              className={purpose === "battle" ? "border-2 border-gold" : ""}
            >
              승부 — 논리로 승패를 가립니다
            </Card>

            <Card
              onClick={() => {
                setPurpose("consensus");
                console.log("선택된 purpose:", "consensus");
              }}
              className={purpose === "consensus" ? "border-2 border-gold" : ""}
            >
              합의 — 공통의 진실을 찾습니다
            </Card>

            <Card
              onClick={() => {
                setPurpose("analysis");
                console.log("선택된 purpose:", "analysis");
              }}
              className={purpose === "analysis" ? "border-2 border-gold" : ""}
            >
              분석 — 양측 논리를 정리합니다
            </Card>

            <Button
              onClick={nextStep}
              disabled={!purpose}
            >
              다음
            </Button>

          </div>
        )}

        {/* STEP 2 */}

        {step === 2 && (
          <div className="flex flex-col gap-4 mt-6">

            <h3 className="font-bold">논쟁 렌즈 선택</h3>

            <div className="grid grid-cols-2 gap-4">

              <Card
                onClick={() => {
                  setLens("logic");
                  console.log("선택된 lens:", "logic");
                }}
                className={lens === "logic" ? "border-2 border-gold" : ""}
              >
                Logic
              </Card>

              <Card
                onClick={() => {
                  setLens("emotion");
                  console.log("선택된 lens:", "emotion");
                }}
                className={lens === "emotion" ? "border-2 border-gold" : ""}
              >
                Emotion
              </Card>

              <Card
                onClick={() => {
                  setLens("practical");
                  console.log("선택된 lens:", "practical");
                }}
                className={lens === "practical" ? "border-2 border-gold" : ""}
              >
                Practical
              </Card>

              <Card
                onClick={() => {
                  setLens("ethics");
                  console.log("선택된 lens:", "ethics");
                }}
                className={lens === "ethics" ? "border-2 border-gold" : ""}
              >
                Ethics
              </Card>

              <Card
                onClick={() => {
                  setLens("general");
                  console.log("선택된 lens:", "general");
                }}
                className={lens === "general" ? "border-2 border-gold" : ""}
              >
                General
              </Card>

            </div>

            <div className="flex gap-3">

              <Button
                onClick={prevStep}
                variant="accent"
                className="w-full"
              >
                이전
              </Button>

              <Button
                onClick={nextStep}
                disabled={!lens}
                variant="primary"
                className="w-full"
              >
                다음
              </Button>

            </div>

          </div>
        )}

        {/* STEP 3 */}

        {step === 3 && (
          <div className="flex flex-col gap-4 mt-6">

            {/* CATEGORY */}

            <div className="flex flex-col gap-2">

              <label className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] ml-2 opacity-80">
                CATEGORY
              </label>

              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  console.log("선택된 category:", e.target.value);
                }}
                className="w-full px-5 py-4 rounded-2xl border border-gold/20 shadow-inner"
              >
                <option value="">카테고리 선택</option>
                <option value="society">사회</option>
                <option value="technology">기술</option>
                <option value="politics">정치</option>
                <option value="philosophy">철학</option>
              </select>

            </div>

            {/* TITLE */}

            <Input
              label="DEBATE TITLE"
              placeholder="논쟁 주제를 입력하세요"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                console.log("topic:", e.target.value);
              }}
            />

            {/* DESCRIPTION */}

            <Input
              label="DESCRIPTION"
              placeholder="논쟁에 대한 설명을 입력하세요"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                console.log("description:", e.target.value);
              }}
              multiline
              rows={6}
            />

            <div className="flex gap-3">

              <Button
                onClick={prevStep}
                variant="accent"
                className="w-full"
              >
                이전
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!category || !topic || !description}
                variant="primary"
                className="w-full"
              >
                시작
              </Button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}