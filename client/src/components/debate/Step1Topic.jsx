import Input from "../common/Input";
import Button from "../common/Button";

export default function Step1Topic({

  topic,
  setTopic,
  proSide,
  conSide,
  handleGenerateSides,
  nextStep,
  prevStep

}) {

  return (

    <div className="flex flex-col gap-4 mt-6">

      <h3 className="font-bold text-lg">
        논쟁 주제 입력
      </h3>

      <Input
        value={topic}
        onChange={(e)=>setTopic(e.target.value)}
        placeholder="예: AI가 인간 일자리를 대체할 것인가?"
      />

      <Button
        variant="outline"
        onClick={handleGenerateSides}
      >
        AI 찬반 생성
      </Button>

      {proSide && (
        <div className="bg-green-50 p-3 rounded-xl text-sm">
          <b>찬성</b> : {proSide}
        </div>
      )}

      {conSide && (
        <div className="bg-red-50 p-3 rounded-xl text-sm">
          <b>반대</b> : {conSide}
        </div>
      )}

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