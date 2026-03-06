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
      setError("렌즈를 선택해주세요");
      return;
    }

    setError("");
    nextStep();
  };

  return (

    <div className="flex flex-col gap-4 mt-6">

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

      <div className="grid grid-cols-2 gap-4">

        {[
          { key: "logic", label: "논리" },
          { key: "emotion", label: "감정" },
          { key: "practical", label: "현실" },
          { key: "ethics", label: "윤리" },
          { key: "general", label: "일반" }
        ].map((item) => (

          <Card
            key={item.key}
            variant={lens === item.key ? "clean" : "base"}
            onClick={() => {
              setLens(item.key);
              setError("");
            }}
            className={`cursor-pointer transition ${error ? "animate-shake border-red-400" : ""}`}
          >
            {item.label}
          </Card>

        ))}

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
          onClick={handleNext}
          className="w-full"
        >
          다음
        </Button>

      </div>

    </div>
  );
}