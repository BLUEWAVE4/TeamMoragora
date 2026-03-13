import { useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import Card from "../common/Card";
import { HelpCircle } from "lucide-react";

export default function Step1Topic({
  topic,
  setTopic,
  category,
  setCategory,
  proSide,
  setProSide,
  conSide,
  setConSide,
  handleGenerateSides,
  nextStep,
  prevStep,
  aiLoading,
}) {

  const [errorTopic, setErrorTopic] = useState("");
  const [errorCategory, setErrorCategory] = useState("");

  const [editingPro, setEditingPro] = useState(false);
  const [editingCon, setEditingCon] = useState(false);

  const [proTemp, setProTemp] = useState("");
  const [conTemp, setConTemp] = useState("");

  const [showHelpModal, setShowHelpModal] = useState(false);

  const categories = [
    "일상", "연애", "직장", "교육", "사회",
    "정치", "기술", "철학", "문화", "기타",
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

  const startEdit = (side) => {

    if (side === "pro") {
      setProTemp(proSide);
      setEditingPro(true);
    } else {
      setConTemp(conSide);
      setEditingCon(true);
    }

  };

  const confirmEdit = (side) => {

    if (side === "pro") {
      setProSide(proTemp);
      setEditingPro(false);
    } else {
      setConSide(conTemp);
      setEditingCon(false);
    }

  };

  const cancelEdit = (side) => {

    if (side === "pro") {
      setEditingPro(false);
    } else {
      setEditingCon(false);
    }

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
          onChange={(e) => {
            setTopic(e.target.value);
            setErrorTopic("");
          }}
          placeholder="예: AI가 인간 일자리를 대체할 것인가?"
        />

      </div>


      {/* AI GENERATE */}
      <div className="flex items-center gap-2">

        <Button
          variant="outline"
          onClick={handleGenerateSides}
          disabled={aiLoading}
        >
          {aiLoading ? "AI 생성중..." : "AI 논쟁 생성"}
        </Button>

        {/* help icon */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="text-primary/40 hover:text-primary transition-colors"
        >
          <HelpCircle size={20} />
        </button>

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

        <Input
          value={category}
          onChange={(e) => {
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
            AI 논쟁 초안
          </h3>

          <div className="flex flex-col gap-5">

            {/* PRO */}
            {proSide && (
              <Card variant="base" title="찬성 측 주장">

                {editingPro ? (

                  <div className="flex flex-col gap-3">

                    <Input
                      value={proTemp}
                      onChange={(e) => setProTemp(e.target.value)}
                      multiline
                      rows={5}
                      placeholder="찬성 측 입장을 수정해주세요."
                    />

                    <div className="flex gap-2">

                      <Button
                        className="w-full text-sm py-2"
                        onClick={() => confirmEdit("pro")}
                      >
                        확인
                      </Button>

                      <Button
                        variant="accent"
                        className="w-full text-sm py-2"
                        onClick={() => cancelEdit("pro")}
                      >
                        취소
                      </Button>

                    </div>

                  </div>

                ) : (

                  <div className="flex flex-col gap-3">

                    <p className="text-primary/90 leading-relaxed">
                      {proSide}
                    </p>

                    <button
                      onClick={() => startEdit("pro")}
                      className="self-end text-xs text-primary/40 font-serif hover:text-primary/70 transition-colors underline underline-offset-2"
                    >
                      수정하기
                    </button>

                  </div>

                )}

              </Card>
            )}

            {/* CON */}
            {conSide && (
              <Card variant="base" title="반대 측 주장">

                {editingCon ? (

                  <div className="flex flex-col gap-3">

                    <Input
                      value={conTemp}
                      onChange={(e) => setConTemp(e.target.value)}
                      multiline
                      rows={5}
                      placeholder="반대 측 입장을 수정해주세요."
                    />

                    <div className="flex gap-2">

                      <Button
                        className="w-full text-sm py-2"
                        onClick={() => confirmEdit("con")}
                      >
                        확인
                      </Button>

                      <Button
                        variant="accent"
                        className="w-full text-sm py-2"
                        onClick={() => cancelEdit("con")}
                      >
                        취소
                      </Button>

                    </div>

                  </div>

                ) : (

                  <div className="flex flex-col gap-3">

                    <p className="text-primary/90 leading-relaxed">
                      {conSide}
                    </p>

                    <button
                      onClick={() => startEdit("con")}
                      className="self-end text-xs text-primary/40 font-serif hover:text-primary/70 transition-colors underline underline-offset-2"
                    >
                      수정하기
                    </button>

                  </div>

                )}

              </Card>
            )}

          </div>

        </div>

      )}

      {/* NAV BUTTONS */}
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

      {/* HELP MODAL */}
      {showHelpModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">

            <h3 className="text-lg font-bold font-serif mb-4">
              AI 논쟁 생성 기능
            </h3>

            <p className="text-sm text-primary/80 leading-relaxed">
              AI가 입력한 논쟁 주제를 기반으로 <b>찬성 / 반대 측 주장</b>
              과 <b>카테고리</b>을 자동으로 생성합니다.
              <br /><br />
              생성된 내용은 초안이며 자유롭게 수정하여
              토론 주제를 발전시킬 수 있습니다.
            </p>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white font-serif hover:opacity-90"
            >
              확인
            </button>

          </div>

        </div>

      )}

    </div>
  );

}