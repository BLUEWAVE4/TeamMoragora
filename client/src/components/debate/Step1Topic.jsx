import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";

export default function Step1Topic({

  topic,
  setTopic,
  category,
  setCategory,
  proSide,
  conSide,
  handleGenerateSides,
  nextStep,
  prevStep

}) {

  const [errorTopic, setErrorTopic] = useState("");
  const [errorCategory, setErrorCategory] = useState("");

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

    <div className="flex flex-col gap-4 mt-6">

      {/* TOPIC */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between">

          <h3 className="font-bold text-lg">
            논쟁 주제 입력
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

        <select
          value={category}
          onChange={(e)=>{
            setCategory(e.target.value);
            setErrorCategory("");
          }}
          className="px-4 py-3 rounded-xl border"
        >
            <option value="">선택</option>
            <option value="일상">일상</option>
            <option value="연애">연애</option>
            <option value="직장">직장</option>
            <option value="교육">교육</option>
            <option value="사회">사회</option>
            <option value="정치">정치</option>
            <option value="기술">기술</option>
            <option value="철학">철학</option>
            <option value="문화">문화</option>
            <option value="기타">기타</option>
        </select>

      </div>


      {/* AI SIDE GENERATE */}
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


      {/* BUTTON */}
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