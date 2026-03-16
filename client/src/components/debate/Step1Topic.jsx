import { useState, useEffect } from "react";
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
  aiResults,
}) {

  const [error, setError] = useState({ topic: "", category: "" });
  const [editingSide, setEditingSide] = useState(null);
  const [tempText, setTempText] = useState("");
  const [showTopicInput, setShowTopicInput] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const categories = [
    "일상","연애","직장","교육","사회",
    "정치","기술","철학","문화","기타",
  ];

  /* ⭐ Step2 → Step1 돌아올 때만 AI 화면 유지 */
  useEffect(() => {

    if (topic && aiResults[topic] && proSide && conSide) {
      setShowTopicInput(false);
    }

  }, [topic, aiResults, proSide, conSide]);

  const handleNext = () => {

    if (editingSide) {
      alert("수정을 완료해주세요.");
      return;
    }

    if (!topic.trim()) {
      setError(prev => ({ ...prev, topic: "논쟁 주제를 입력해주세요." }));
      return;
    }

    if (!category || category.trim() === "") {
      setError(prev => ({ ...prev, category: "카테고리를 선택해주세요." }));
      return;
    }

    if (showTopicInput || !aiResults[topic]) {
      alert("AI 논쟁을 먼저 생성해주세요.");
      return;
    }

    nextStep();
  };

  const handleAIGenerate = async () => {

    if (!topic.trim()) {
      setError(prev => ({ ...prev, topic: "논쟁 주제를 먼저 입력해주세요." }));
      return;
    }

    const result = await handleGenerateSides();

    if (!result) return;

    setProSide(result.pro);
    setConSide(result.con);

    if (result?.category) {
      setCategory(result.category);
    }

    setShowTopicInput(false);
  };

  const resetTopic = () => {

    setShowTopicInput(true);

    setTopic("");
    setProSide("");
    setConSide("");
    setCategory("");
    setEditingSide(null);
  };

  const startEdit = (side) => {

    if (side === "pro") setTempText(proSide);
    else setTempText(conSide);

    setEditingSide(side);
  };

  const confirmEdit = () => {

    if (editingSide === "pro") {
      setProSide(tempText);
    } else {
      setConSide(tempText);
    }

    setEditingSide(null);
  };

  const cancelEdit = () => {
    setEditingSide(null);
  };

  return (

    <div className="flex flex-col gap-6 mt-6">

      {/* TOPIC INPUT */}
      {showTopicInput && (

        <>
          <div className="flex flex-col gap-2">

            <div className="flex justify-between">

              <h3 className="font-bold text-lg">
                논쟁 주제
              </h3>

              {error.topic && (
                <span className="text-xs text-red-500">
                  {error.topic}
                </span>
              )}

            </div>

            <Input
              value={topic}
              onChange={(e) => {

                const newTopic = e.target.value;

                setTopic(newTopic);
                setError(prev => ({ ...prev, topic: "" }));

                // 항상 입력 화면 유지
                setShowTopicInput(true);

              }}
              placeholder="예: AI가 인간 일자리를 대체해야 하는가?"
            />

          </div>

          <div className="flex items-center justify-center gap-2">

            <Button
              variant="outline"
              onClick={handleAIGenerate}
              disabled={aiLoading}
            >
              {aiLoading ? "AI 생성중..." : "AI 논쟁 생성"}
            </Button>

            <button
              onClick={() => setShowHelpModal(true)}
              className="text-primary/40 hover:text-primary transition-colors"
            >
              <HelpCircle size={20}/>
            </button>

          </div>

        </>
      )}

      {/* AI RESULT */}
      {!showTopicInput && (

        <>

          <div className="flex flex-col gap-1">

            <span className="text-xs text-primary/50">
              논쟁 주제
            </span>

            <h2 className="text-xl font-bold text-primary">
              {topic}
            </h2>

          </div>

          <div className="flex flex-col gap-4">

            <h3 className="font-serif font-bold text-primary text-lg tracking-tight">
              AI 논쟁 초안
            </h3>

            <div className="flex flex-col gap-5">

              {proSide && (
                <Card variant="base" title="찬성 측 주장">
                  <p className="text-primary/90 leading-relaxed">
                    {proSide}
                  </p>
                </Card>
              )}

              {conSide && (
                <Card variant="base" title="반대 측 주장">
                  <p className="text-primary/90 leading-relaxed">
                    {conSide}
                  </p>
                </Card>
              )}

            </div>

          </div>

          <div className="flex flex-col gap-2">

            <h3 className="font-bold text-lg">
              카테고리
            </h3>

            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories}
            />

          </div>

          <Button
            variant="outline"
            onClick={resetTopic}
          >
            주제 다시 입력하기
          </Button>

        </>
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
          onClick={handleNext}
          className="w-full"
        >
          다음
        </Button>

      </div>

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface-alt rounded-2xl p-8 max-w-md shadow-xl">

            <h3 className="text-lg font-bold font-serif mb-4">
              AI 논쟁 생성 기능
            </h3>

            <p className="text-sm text-primary/80 leading-relaxed">
              AI가 입력한 논쟁 주제를 기반으로
              <b> 찬성 / 반대 주장</b>과 <b>카테고리</b>를
              자동으로 생성합니다.
            </p>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full py-2 rounded-xl bg-gold text-white"
            >
              확인
            </button>

          </div>
        </div>
      )}

    </div>
  );
}