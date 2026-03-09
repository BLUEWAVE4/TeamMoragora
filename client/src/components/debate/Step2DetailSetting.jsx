import { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";

export default function Step2DetailSetting({
  lens,
  setLens,
  nextStep,
  prevStep
}) {

  const [error, setError] = useState("");

  const handleNext = () => {

    if (!lens) {
      setError("렌즈를 선택해주세요.");
      return;
    }

    setError("");
    nextStep();
  };

  const handleSelect = (value) => {
    setLens(value);
    setError("");
  };

  return (
    <div className="flex flex-col gap-4 mt-6">

      {/* 제목 + 에러 */}
      <div className="flex justify-between items-center">

        <h3 className="font-bold text-lg">
          논쟁 렌즈 선택
        </h3>

        {error && (
          <span className="text-red-400 text-sm animate-shake">
            {error}
          </span>
        )}

      </div>

      {/* 카드 영역 */}
      <div className="grid grid-cols-2 gap-4">

        <Card
          variant={lens === "logic" ? "clean" : "base"}
          onClick={() => handleSelect("logic")}
          className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
        >
          논리
        </Card>

        <Card
          variant={lens === "emotion" ? "clean" : "base"}
          onClick={() => handleSelect("emotion")}
          className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
        >
          감정
        </Card>

        <Card
          variant={lens === "practical" ? "clean" : "base"}
          onClick={() => handleSelect("practical")}
          className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
        >
          현실
        </Card>

        <Card
          variant={lens === "ethics" ? "clean" : "base"}
          onClick={() => handleSelect("ethics")}
          className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
        >
          윤리
        </Card>

        <Card
          variant={lens === "general" ? "clean" : "base"}
          onClick={() => handleSelect("general")}
          className={`cursor-pointer ${error ? "animate-shake border-red-400" : ""}`}
        >
          일반
        </Card>

      </div>

      {/* 버튼 */}
      <div className="flex gap-3">

        <Button
          onClick={prevStep}
          variant="accent"
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