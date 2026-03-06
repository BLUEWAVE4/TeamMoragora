import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Modal from "../common/Modal";

export default function Step3Confirm({

  mode,
  lens,
  topic,
  setTopic,
  description,
  setDescription,
  category,
  setCategory,
  prevStep,
  handleSubmit

}) {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [errorCategory, setErrorCategory] = useState("");
  const [errorTopic, setErrorTopic] = useState("");
  const [errorDescription, setErrorDescription] = useState("");

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

    if (!description) {
      setErrorDescription("내용을 입력해주세요.");
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

        <div className="relative">

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setErrorCategory("");
            }}
            className={`
            w-full px-5 py-4 rounded-2xl
            font-serif text-primary
            border
            ${errorCategory ? "border-red-400 animate-pulse" : "border-gold/20"}
            bg-gradient-to-br from-surface to-surface-alt
            shadow-inner outline-none
            transition-all duration-300
            focus:border-gold focus:ring-4 focus:ring-gold/10
            hover:border-gold/40
            appearance-none
            `}
          >

            <option value="">선택</option>
            <option value="society">사회</option>
            <option value="technology">기술</option>
            <option value="politics">정치</option>
            <option value="philosophy">철학</option>

          </select>

          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gold text-sm">
            ▼
          </div>

        </div>

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


      {/* DESCRIPTION */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between items-center px-2">

          <span className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] opacity-80">
            DESCRIPTION
          </span>

          {errorDescription && (
            <span className="text-xs text-red-500">
              {errorDescription}
            </span>
          )}

        </div>

        <Input
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrorDescription("");
          }}
          multiline
          rows={6}
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
            <span className="font-bold text-gold">목적</span> : {mode}
          </div>

          <div>
            <span className="font-bold text-gold">렌즈</span> : {lens}
          </div>

          <div>
            <span className="font-bold text-gold">카테고리</span> : {category}
          </div>

          <div>
            <span className="font-bold text-gold">제목</span> : {topic}
          </div>

          <div>
            <span className="font-bold text-gold">설명</span>
            <p className="mt-1 text-gold-light/80">
              {description}
            </p>
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