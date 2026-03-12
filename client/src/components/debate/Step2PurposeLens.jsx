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