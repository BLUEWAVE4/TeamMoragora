// import { useState } from "react";
// import Card from "../common/Card";
// import Button from "../common/Button";

// export default function Step2DetailSetting({
//   lens,
//   setLens,
//   nextStep,
//   prevStep
// }) {

//   const [error, setError] = useState("");

//   const handleNext = () => {

//     if (!lens) {
//       setError("렌즈를 선택해주세요.");
//       return;
//     }

//     setError("");
//     nextStep();
//   };

//   const handleSelect = (value) => {
//     setLens(value);
//     setError("");
//   };

//   return (
//     <div className="flex flex-col gap-4 mt-6">

//       {/* 제목 + 에러 */}
//       <div className="flex justify-between items-center">

//         <h3 className="font-bold text-lg">
//           논쟁 렌즈 선택
//         </h3>

//         {error && (
//           <span className="text-red-400 text-sm animate-shake">
//             {error}
//           </span>
//         )}

//       </div>

//       {/* 카드 영역 */}
//       <div className="grid grid-cols-2 gap-4">

//         <Card
//           variant={lens === "논리" ? "clean" : "base"}
//           onClick={() => handleSelect("논리")}
//           className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//         >
//           논리
//         </Card>

//         <Card
//           variant={lens === "감정" ? "clean" : "base"}
//           onClick={() => handleSelect("감정")}
//           className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//         >
//           감정
//         </Card>

//         <Card
//           variant={lens === "현실" ? "clean" : "base"}
//           onClick={() => handleSelect("현실")}
//           className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//         >
//           현실
//         </Card>

//         <Card
//           variant={lens === "윤리" ? "clean" : "base"}
//           onClick={() => handleSelect("윤리")}
//           className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//         >
//           윤리
//         </Card>

//         <Card
//           variant={lens === "일반" ? "clean" : "base"}
//           onClick={() => handleSelect("일반")}
//           className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
//         >
//           일반
//         </Card>

//       </div>

//       {/* 버튼 */}
//       <div className="flex gap-3">

//         <Button
//           onClick={prevStep}
//           variant="accent"
//           className="w-full"
//         >
//           이전
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

import Card from "../common/Card";
import Button from "../common/Button";

export default function Step2PurposeLens({

  purpose,
  setPurpose,
  lens,
  setLens,
  nextStep,
  prevStep

}) {

  return (

    <div className="flex flex-col gap-4 mt-6">

      <h3 className="font-bold text-lg">목적 선택</h3>

      <Card onClick={()=>setPurpose("승부")} variant={purpose==="승부"?"clean":"base"}>
        승부
      </Card>

      <Card onClick={()=>setPurpose("합의")} variant={purpose==="합의"?"clean":"base"}>
        합의
      </Card>

      <Card onClick={()=>setPurpose("분석")} variant={purpose==="분석"?"clean":"base"}>
        분석
      </Card>

      <h3 className="font-bold text-lg mt-4">렌즈 선택</h3>

      <Card onClick={()=>setLens("논리")} variant={lens==="논리"?"clean":"base"}>논리</Card>
      <Card onClick={()=>setLens("감정")} variant={lens==="감정"?"clean":"base"}>감정</Card>
      <Card onClick={()=>setLens("현실")} variant={lens==="현실"?"clean":"base"}>현실</Card>
      <Card onClick={()=>setLens("윤리")} variant={lens==="윤리"?"clean":"base"}>윤리</Card>

      <div className="flex gap-3">

        <Button
          variant="accent"
          onClick={prevStep}
          className="w-full"
        >
          이전
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