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

  const purposeDesc = {
    승부: "서로의 논리를 겨루어 승자를 가리는 토론 방식입니다.",
    합의: "양측이 의견을 조율해 공통된 결론을 찾는 토론 방식입니다.",
    분석: "논쟁의 구조와 논리를 분석하며 이해하는 토론 방식입니다."
  };

  const lensDesc = {
    논리: "논리적 타당성과 근거 중심으로 판단합니다.",
    감정: "감정과 공감 중심으로 판단합니다.",
    현실: "현실적인 결과와 상황을 중심으로 판단합니다.",
    윤리: "도덕성과 윤리적 기준으로 판단합니다.",
    일반: "특정 기준 없이 균형 잡힌 시각으로 판단합니다."
  };

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

        <div className="grid grid-cols-2 gap-3">

          {Object.entries(purposeDesc).map(([key, desc]) => {

            const active = purpose === key;

            return (
              <Card
                key={key}
                onClick={()=>{
                  setPurpose(key);
                  setErrorPurpose("");
                }}
                variant={active ? "clean" : "base"}
              >

                <div className="relative h-16 w-full">

                  {/* TITLE */}
                  <span
                    className={`
                      absolute font-semibold
                      transition-all duration-500
                      ${active
                        ? "top-1 left-2 text-sm"
                        : "top-1/2 left-1/2 text-m -translate-x-1/2 -translate-y-1/2"
                      }
                    `}
                  >
                    {key}
                  </span>

                  {/* DESCRIPTION */}
                  <p
                    className={`
                      absolute left-2 right-2
                      text-[10px] text-gray-500 leading-tight
                      transition-all duration-800
                      ${active
                        ? "top-8 opacity-100"
                        : "top-10 opacity-0"
                      }
                    `}
                  >
                    {desc}
                  </p>

                </div>

              </Card>
            );

          })}

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

        <div className="grid grid-cols-2 gap-3">

          {Object.entries(lensDesc).map(([key, desc]) => {

            const active = lens === key;

            return (
              <Card
                key={key}
                onClick={()=>{
                  setLens(key);
                  setErrorLens("");
                }}
                variant={active ? "clean" : "base"}
              >

                <div className="relative h-16 w-full">

                  {/* TITLE */}
                  <span
                    className={`
                      absolute font-semibold
                      transition-all duration-500
                      ${active
                        ? "top-1 left-2 text-sm"
                        : "top-1/2 left-1/2 text-m -translate-x-1/2 -translate-y-1/2"
                      }
                    `}
                  >
                    {key}
                  </span>

                  {/* DESCRIPTION */}
                  <p
                    className={`
                      absolute left-2 right-2
                      text-[10px] text-gray-500 leading-tight
                      transition-all duration-500
                      ${active
                        ? "top-8 opacity-100"
                        : "top-10 opacity-0"
                      }
                    `}
                  >
                    {desc}
                  </p>

                </div>

              </Card>
            );

          })}

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
