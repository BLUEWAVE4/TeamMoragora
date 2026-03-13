import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Card from "../common/Card";

export default function Step1Topic({

  topic,
  setTopic,
  category,
  setCategory,
  proSide,
  conSide,
  handleGenerateSides,
  nextStep,
  prevStep,
  aiLoading,

}) {

  const [errorTopic, setErrorTopic] = useState("");
  const [errorCategory, setErrorCategory] = useState("");

  const categories = [
    "일상",
    "연애",
    "직장",
    "교육",
    "사회",
    "정치",
    "기술",
    "철학",
    "문화",
    "기타"
  ];

  const handleNext = () => {

    let valid = true;

    if (!topic.trim()) {
      setErrorTopic("논쟁 주제를 입력해주세요.");
      valid = false;
    }

    if (!category) {
      setErrorCategory("카테고리를 선택해주세요.");
      valid = false;
    }

    if (!valid) return;

    nextStep();
  };

  return (

    <div className="flex flex-col gap-6 mt-6">

      {/* TOPIC */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between">

          <h3 className="font-bold text-lg">
            논쟁 주제
          </h3>

          {errorTopic && (
            <span className="text-xs text-red-500">
              {errorTopic}
            </span>
          )}

        </div>

        <Input
          value={topic}
          onChange={(e)=>{
            setTopic(e.target.value);
            setErrorTopic("");
          }}
          placeholder="예: AI가 인간 일자리를 대체할 것인가?"
        />

      </div>


      {/* AI SIDE GENERATE */}
      <Button
        variant="outline"
        onClick={handleGenerateSides}
        disabled={aiLoading}
      >
        {aiLoading ? "AI 생성중..." : "AI 논쟁 생성 도우미"}
      </Button>


      {/* CATEGORY */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between">

          <h3 className="font-bold text-lg">
            카테고리
          </h3>

          {errorCategory && (
            <span className="text-xs text-red-500">
              {errorCategory}
            </span>
          )}

        </div>

        <Input
          value={category}
          onChange={(e)=>{
            setCategory(e.target.value);
            setErrorCategory("");
          }}
          options={categories}
        />

      </div>


      {/* AI GENERATED SIDES */}
      {(proSide || conSide) && (

        <div className="flex flex-col gap-4 mt-4">

          <h3 className="font-serif font-bold text-primary text-lg tracking-tight">
            AI 찬/반 생성
          </h3>
          
          <p className="text-xs text-primary/50 font-serif">
          AI가 생성한 초안입니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* PRO SIDE */}
            {proSide && (

              <Card
                variant="base"
                title="찬성"
              >
                <p className="text-primary/90 leading-relaxed">
                  {proSide}
                </p>
              </Card>

            )}


            {/* CON SIDE */}
            {conSide && (

              <Card
                variant="base"
                title="반대"
              >
                <p className="text-primary/90 leading-relaxed">
                  {conSide}
                </p>
              </Card>

            )}

          </div>

        </div>

      )}


      {/* BUTTON */}
      <div className="flex gap-3 mt-2">

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