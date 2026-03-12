// import { useState } from "react";
// import Card from "../common/Card";
// import Button from "../common/Button";

// export default function Step2PurposeLens({

//   purpose,
//   setPurpose,
//   lens,
//   setLens,
//   nextStep,
//   prevStep

// }) {

//   const [errorPurpose, setErrorPurpose] = useState("");
//   const [errorLens, setErrorLens] = useState("");

//   const handleNext = () => {

//     let valid = true;

//     if (!purpose) {
//       setErrorPurpose("목적을 선택해주세요.");
//       valid = false;
//     }

//     if (!lens) {
//       setErrorLens("렌즈를 선택해주세요.");
//       valid = false;
//     }

//     if (!valid) return;

//     nextStep();
//   };

//   return (

//     <div className="flex flex-col gap-4 mt-6">

//       {/* PURPOSE */}
//       <div className="flex flex-col gap-2">

//         <div className="flex justify-between">

//           <h3 className="font-bold text-lg">
//             목적 선택
//           </h3>

//           {errorPurpose && (
//             <span className="text-xs text-red-500">
//               {errorPurpose}
//             </span>
//           )}

//         </div>

//         <Card
//           onClick={()=>{
//             setPurpose("승부");
//             setErrorPurpose("");
//           }}
//           variant={purpose==="승부"?"clean":"base"}
//         >
//           승부
//         </Card>

//         <Card
//           onClick={()=>{
//             setPurpose("합의");
//             setErrorPurpose("");
//           }}
//           variant={purpose==="합의"?"clean":"base"}
//         >
//           합의
//         </Card>

//         <Card
//           onClick={()=>{
//             setPurpose("분석");
//             setErrorPurpose("");
//           }}
//           variant={purpose==="분석"?"clean":"base"}
//         >
//           분석
//         </Card>

//       </div>


//       {/* LENS */}
//       <div className="flex flex-col gap-2 mt-4">

//         <div className="flex justify-between">

//           <h3 className="font-bold text-lg">
//             렌즈 선택
//           </h3>

//           {errorLens && (
//             <span className="text-xs text-red-500">
//               {errorLens}
//             </span>
//           )}

//         </div>

//         <Card
//           onClick={()=>{
//             setLens("논리");
//             setErrorLens("");
//           }}
//           variant={lens==="논리"?"clean":"base"}
//         >
//           논리
//         </Card>

//         <Card
//           onClick={()=>{
//             setLens("감정");
//             setErrorLens("");
//           }}
//           variant={lens==="감정"?"clean":"base"}
//         >
//           감정
//         </Card>

//         <Card
//           onClick={()=>{
//             setLens("현실");
//             setErrorLens("");
//           }}
//           variant={lens==="현실"?"clean":"base"}
//         >
//           현실
//         </Card>

//         <Card
//           onClick={()=>{
//             setLens("윤리");
//             setErrorLens("");
//           }}
//           variant={lens==="윤리"?"clean":"base"}
//         >
//           윤리
//         </Card>

//         <Card
//           onClick={()=>{
//             setLens("일반");
//             setErrorLens("");
//           }}
//           variant={lens==="일반"?"clean":"base"}
//         >
//           일반
//         </Card>

//       </div>


//       {/* BUTTON */}
//       <div className="flex gap-3">

//         <Button
//           variant="accent"
//           onClick={prevStep}
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

import { useState } from "react";
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

  const [errorPurpose, setErrorPurpose] = useState("");
  const [errorLens, setErrorLens] = useState("");

  const handleNext = () => {

    let valid = true;

    if (!purpose) {
      setErrorPurpose("목적을 선택해주세요.");
      valid = false;
    }

    if (!lens) {
      setErrorLens("렌즈를 선택해주세요.");
      valid = false;
    }

    if (!valid) return;

    nextStep();
  };

  return (

    <div className="flex flex-col gap-4 mt-6">

      {/* PURPOSE */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between">

          <h3 className="font-bold text-lg">
            목적 선택
          </h3>

          {errorPurpose && (
            <span className="text-xs text-red-500">
              {errorPurpose}
            </span>
          )}

        </div>

        <div className="grid grid-cols-3 gap-3">

          <Card
            onClick={()=>{
              setPurpose("승부");
              setErrorPurpose("");
            }}
            variant={purpose==="승부"?"clean":"base"}
          >
            승부
          </Card>

          <Card
            onClick={()=>{
              setPurpose("합의");
              setErrorPurpose("");
            }}
            variant={purpose==="합의"?"clean":"base"}
          >
            합의
          </Card>

          <Card
            onClick={()=>{
              setPurpose("분석");
              setErrorPurpose("");
            }}
            variant={purpose==="분석"?"clean":"base"}
          >
            분석
          </Card>

        </div>

      </div>


      {/* LENS */}
      <div className="flex flex-col gap-2 mt-4">

        <div className="flex justify-between">

          <h3 className="font-bold text-lg">
            렌즈 선택
          </h3>

          {errorLens && (
            <span className="text-xs text-red-500">
              {errorLens}
            </span>
          )}

        </div>

        <div className="grid grid-cols-3 gap-3">

          <Card
            onClick={()=>{
              setLens("논리");
              setErrorLens("");
            }}
            variant={lens==="논리"?"clean":"base"}
          >
            논리
          </Card>

          <Card
            onClick={()=>{
              setLens("감정");
              setErrorLens("");
            }}
            variant={lens==="감정"?"clean":"base"}
          >
            감정
          </Card>

          <Card
            onClick={()=>{
              setLens("현실");
              setErrorLens("");
            }}
            variant={lens==="현실"?"clean":"base"}
          >
            현실
          </Card>

          <Card
            onClick={()=>{
              setLens("윤리");
              setErrorLens("");
            }}
            variant={lens==="윤리"?"clean":"base"}
          >
            윤리
          </Card>

          <Card
            onClick={()=>{
              setLens("일반");
              setErrorLens("");
            }}
            variant={lens==="일반"?"clean":"base"}
          >
            일반
          </Card>

        </div>

      </div>


      {/* BUTTON */}
      <div className="flex gap-3">

        <Button
          variant="accent"
          onClick={prevStep}
          className="w-full"
        >
          이전
        </Button>

        <Button
          onClick={handleNext}
          className="w-full"
        >
          다음
        </Button>

      </div>

    </div>

  );

}