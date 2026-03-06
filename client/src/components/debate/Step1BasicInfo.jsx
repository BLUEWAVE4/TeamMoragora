import { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";

export default function Step1BasicInfo({
  purpose,
  setPurpose,
  nextStep,
  prevStep
}) {

  const [error, setError] = useState("");

  const handleNext = () => {

    if (!purpose) {
      setError("목적을 선택해주세요");
      return;
    }

    setError("");
    nextStep();
  };

  return (

    <div className="flex flex-col gap-4 mt-6">

      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">
          논쟁 목적 선택
        </h3>

        {error && (
          <span className="text-red-400 text-sm animate-shake">
            {error}
          </span>
        )}
      </div>

      <Card
        variant={purpose === "battle" ? "clean" : "base"}
        onClick={() => {
          setPurpose("battle");
          setError("");
        }}
        className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
      >
        승부 — 논리로 승패를 가립니다
      </Card>

      <Card
        variant={purpose === "consensus" ? "clean" : "base"}
        onClick={() => {
          setPurpose("consensus");
          setError("");
        }}
        className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
      >
        합의 — 공통의 진실을 찾습니다
      </Card>

      <Card
        variant={purpose === "analysis" ? "clean" : "base"}
        onClick={() => {
          setPurpose("analysis");
          setError("");
        }}
        className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
      >
        분석 — 양측 논리를 정리합니다
      </Card>

      <div className="flex gap-3">

        <Button
          variant="accent"
          onClick={prevStep}
          className="w-full"
        >
          뒤로
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