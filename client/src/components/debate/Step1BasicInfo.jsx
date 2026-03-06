import Card from "../common/Card";
import Button from "../common/Button";

export default function Step1BasicInfo({ purpose, setPurpose, nextStep }) {

  return (
    <div className="flex flex-col gap-4 mt-6">

      <h3 className="font-bold">논쟁 목적 선택</h3>

      <Card
        onClick={() => setPurpose("battle")}
        className={purpose === "battle" ? "border-2 border-gold" : ""}
      >
        승부 — 논리로 승패를 가립니다
      </Card>

      <Card
        onClick={() => setPurpose("consensus")}
        className={purpose === "consensus" ? "border-2 border-gold" : ""}
      >
        합의 — 공통의 진실을 찾습니다
      </Card>

      <Card
        onClick={() => setPurpose("analysis")}
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
  );
}