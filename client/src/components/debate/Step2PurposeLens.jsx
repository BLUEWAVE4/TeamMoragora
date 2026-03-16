import { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import { HelpCircle } from "lucide-react";

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

  const [showPurposeHelp, setShowPurposeHelp] = useState(false);
  const [showLensHelp, setShowLensHelp] = useState(false);

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

          <div className="flex items-center gap-2">

            <h3 className="font-bold text-lg">
              목적 선택
            </h3>

            <button
              onClick={() => setShowPurposeHelp(true)}
              className="text-primary/40 hover:text-primary transition-colors"
            >
              <HelpCircle size={18}/>
            </button>

          </div>

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

          <div className="flex items-center gap-2">

            <h3 className="font-bold text-lg">
              렌즈 선택
            </h3>

            <button
              onClick={() => setShowLensHelp(true)}
              className="text-primary/40 hover:text-primary transition-colors"
            >
              <HelpCircle size={18}/>
            </button>

          </div>

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


      {/* PURPOSE HELP MODAL */}
      {showPurposeHelp && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">

            <h3 className="text-lg font-bold font-serif mb-4">
              목적 선택이란?
            </h3>

            <p className="text-sm text-primary/80 leading-relaxed">
              토론의 진행 방향을 결정하는 단계입니다.
              <br/><br/>
              • <b>승부</b> : 논리 대결을 통해 승자를 가립니다. 
              <br/> 
              • <b>합의</b> : 서로 의견을 조율해 공통 결론을 찾습니다.  
              <br/>
              • <b>분석</b> : 논쟁 구조와 논리를 분석하며 이해합니다.
            </p>

            <button
              onClick={()=>setShowPurposeHelp(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-serif hover:opacity-90"
            >
              확인
            </button>

          </div>

        </div>

      )}


      {/* LENS HELP MODAL */}
      {showLensHelp && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">

            <h3 className="text-lg font-bold font-serif mb-4">
              렌즈 선택이란?
            </h3>

            <p className="text-sm text-primary/80 leading-relaxed">
              토론을 바라보는 **관점(프레임)**을 의미합니다.
              <br/><br/>
              같은 주제라도 선택한 렌즈에 따라
              판단 기준과 논거가 달라질 수 있습니다.
            </p>

            <button
              onClick={()=>setShowLensHelp(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-serif hover:opacity-90"
            >
              확인
            </button>

          </div>

        </div>

      )}

    </div>

  );

}