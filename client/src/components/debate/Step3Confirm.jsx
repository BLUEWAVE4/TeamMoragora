import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Modal from "../common/Modal";

export default function Step3Confirm({

  // mode,
  purpose,
  lens,
  topic,
  setTopic,
  category,
  setCategory,
  prevStep,
  handleSubmit

}) {

  const purposeMap = {
    battle: "승부",
    consensus: "합의",
    analysis: "분석"
  };

  const lensMap = {
    logic: "논리",
    emotion: "감정",
    practical: "현실",
    ethics: "윤리",
    general: "일반"
  };

  const categoryMap = {
    일상: "일상", 연애: "연애", 직장: "직장", 교육: "교육",
    사회: "사회", 정치: "정치", 기술: "기술", 철학: "철학",
    문화: "문화", 기타: "기타",
    // 하위호환 (기존 영문 데이터)
    daily: "일상", romance: "연애", work: "직장", education: "교육",
    society: "사회", politics: "정치", technology: "기술", philosophy: "철학",
    culture: "문화",
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [errorCategory, setErrorCategory] = useState("");
  const [errorTopic, setErrorTopic] = useState("");

  const handleStart = () => {

    let valid = true;

    if (!category) {
      setErrorCategory("카테고리를 선택해주세요.");
      valid = false;
    }

    if (!topic) {
      setErrorTopic("제목을 입력해주세요.");
      valid = false;
    }

    if (!valid) return;

    setIsModalOpen(true);
  };

  return (

    <div className="flex flex-col gap-5 mt-6">

      {/* CATEGORY */}
      <div className="flex flex-col gap-2 w-full">

        <div className="flex justify-between items-center px-2">

          <label className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] opacity-80">
            CATEGORY
          </label>

          {errorCategory && (
            <span className="text-xs text-red-500">
              {errorCategory}
            </span>
          )}

        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setErrorCategory("");
          }}
          className="w-full px-5 py-4 rounded-2xl border border-gold/20"
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


      {/* TITLE */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between items-center px-2">

          <span className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] opacity-80">
            DEBATE TITLE
          </span>

          {errorTopic && (
            <span className="text-xs text-red-500">
              {errorTopic}
            </span>
          )}

        </div>

        <Input
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setErrorTopic("");
          }}
          placeholder="논쟁 주제 입력"
        />

      </div>


      {/* BUTTON */}
      <div className="flex gap-3">

        <Button
          onClick={prevStep}
          variant="accent"
          className="w-full"
        >
          이전
        </Button>

        <Button
          onClick={handleStart}
          className="w-full"
        >
          시작
        </Button>

      </div>


      {/* MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="논쟁 생성 확인"
      >

        <div className="space-y-3 text-sm">

          <div>
            <span className="font-bold text-gold">목적</span> : {purposeMap[purpose] || purpose}
          </div>

          <div>
            <span className="font-bold text-gold">렌즈</span> : {lensMap[lens] || lens}
          </div>

          <div>
            <span className="font-bold text-gold">카테고리</span> : {categoryMap[category] || category}
          </div>

          <div>
            <span className="font-bold text-gold">제목</span> : {topic}
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">

          <Button
            variant="outline"
            onClick={() => setIsModalOpen(false)}
          >
            취소
          </Button>

          <Button
            variant="gold"
            onClick={handleSubmit}
          >
            논쟁 생성
          </Button>

        </div>

      </Modal>

    </div>

  );
}