import Card from "../common/Card";
import Button from "../common/Button";

export default function Step2DetailSetting({
  lens,
  setLens,
  nextStep,
  prevStep
}) {

  return (
    <div className="flex flex-col gap-4 mt-6">

      <h3 className="font-bold">논쟁 렌즈 선택</h3>

      <div className="grid grid-cols-2 gap-4">

        <Card
          onClick={() => setLens("logic")}
          className={lens === "logic" ? "border-2 border-gold" : ""}
        >
          Logic
        </Card>

        <Card
          onClick={() => setLens("emotion")}
          className={lens === "emotion" ? "border-2 border-gold" : ""}
        >
          Emotion
        </Card>

        <Card
          onClick={() => setLens("practical")}
          className={lens === "practical" ? "border-2 border-gold" : ""}
        >
          Practical
        </Card>

        <Card
          onClick={() => setLens("ethics")}
          className={lens === "ethics" ? "border-2 border-gold" : ""}
        >
          Ethics
        </Card>

        <Card
          onClick={() => setLens("general")}
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
          className="w-full"
        >
          다음
        </Button>

      </div>

    </div>
  );
}