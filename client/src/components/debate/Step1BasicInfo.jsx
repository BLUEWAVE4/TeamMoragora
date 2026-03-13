// import { useState } from "react";
// import Card from "../common/Card";
// import Button from "../common/Button";

// export default function Step1BasicInfo({
//   purpose,
//   setPurpose,
//   nextStep,
//   prevStep
// }) {

//   const [error, setError] = useState("");

//   const handleNext = () => {

//     if (!purpose) {
//       setError("목적을 선택해주세요");
//       return;
//     }

//     setError("");
//     nextStep();
//   };

//   return (

//     <div className="flex flex-col gap-4 mt-6">

//       <div className="flex justify-between items-center">
//         <h3 className="font-bold text-lg">
//           논쟁 목적 선택
//         </h3>

//         {error && (
//           <span className="text-red-400 text-sm animate-shake">
//             {error}
//           </span>
//         )}
//       </div>

//       <Card
//         variant={purpose === "승부" ? "clean" : "base"}
//         onClick={() => {
//           setPurpose("승부");
//           setError("");
//         }}
//         className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//       >
//         승부 — 논리로 승패를 가립니다
//       </Card>

//       <Card
//         variant={purpose === "합의" ? "clean" : "base"}
//         onClick={() => {
//           setPurpose("합의");
//           setError("");
//         }}
//         className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//       >
//         합의 — 공통의 진실을 찾습니다
//       </Card>

//       <Card
//         variant={purpose === "분석" ? "clean" : "base"}
//         onClick={() => {
//           setPurpose("분석");
//           setError("");
//         }}
//         className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//       >
//         분석 — 양측 논리를 정리합니다
//       </Card>

//       <div className="flex gap-3">

//         <Button
//           variant="accent"
//           onClick={prevStep}
//           className="w-full"
//         >
//           뒤로
//         </Button>

//         <Button
//           onClick={handleNext}
//           className="w-full"
//         >
//           다음
//         </Button>

//       </div>

//     </div>
//   );
// }

import Input from "../common/Input";
import Button from "../common/Button";

export default function Step1Topic({

  topic1,
  topic2,
  setTopic1,
  setTopic2,
  handleAIAnalyze,
  nextStep,
  prevStep

}) {

  return (

    <div className="flex flex-col gap-4 mt-6">

      <h3 className="font-bold text-lg">
        논쟁 주제 입력
      </h3>

      <Input
        value={topic1}
        onChange={(e)=>setTopic1(e.target.value)}
        placeholder="찬성 입장"
      />

      <Input
        value={topic2}
        onChange={(e)=>setTopic2(e.target.value)}
        placeholder="반대 입장"
      />

      <Button
        variant="outline"
        onClick={handleAIAnalyze}
      >
        AI 분석
      </Button>

      <div className="flex gap-3">

        <Button
          variant="accent"
          onClick={prevStep}
          className="w-full"
        >
          뒤로
        </Button>

        <Button
          onClick={nextStep}
          className="w-full"
        >
          다음
        </Button>

      </div>

    </div>

  );

}