import { useState } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Input from "../common/Input";

export default function Step3CategoryTime({
  topic,
  proSide,
  conSide,
  purpose,
  lens,
  category,
  time,
  setTime,
  prevStep,
  handleSubmit
}) {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorTime, setErrorTime] = useState("");
  const [timerType, setTimerType] = useState("none");

  const timeOptions = [
    { value: "1", label: "1일" },
    { value: "3", label: "3일" },
    { value: "7", label: "7일" },
  ];

  // 선택한 날수 → 마감 예정 날짜 문자열
  const getDeadlinePreview = () => {
    if (!time) return null;
    const d = new Date();
    d.setDate(d.getDate() + parseInt(time));
    return d.toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStart = () => {
    if (timerType === "limit" && !time) {
      setErrorTime("투표 마감 시간을 선택해주세요.");
      return;
    }
    if (timerType === "none") {
      setTime("");
    }

    console.log("Step3 선택 시간:", time);
  console.log("timerType:", timerType);

    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 mt-6">

      {/* TITLE */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bold text-xl">시민 투표 설정</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          이 논쟁에 참여한 시민들이 의견을 남기고 투표할 수 있습니다. <br />
          투표 마감 시간을 설정하면 해당 시간이 지나면 시민 투표가 종료되고 결과가 집계됩니다. <br />
          <span className="text-gray-700 font-medium">
            AI 판결문은 시간 설정과 관계없이 언제든지 확인할 수 있습니다.
          </span>
        </p>
      </div>

      {/* OPTION CARDS */}
      <div className="flex flex-col gap-4">

        {/* 시간 미설정 */}
        <label
          onClick={() => {
            setTimerType("none");
            setTime("");
            setErrorTime("");
          }}
          className={`border rounded-xl p-4 cursor-pointer transition
            ${timerType === "none"
              ? "border-gold bg-[#FFF9E8]"
              : "border-gray-200 hover:border-gold/50"
            }`}
        >
          <div className="flex items-start gap-3">
            <input type="radio" checked={timerType === "none"} readOnly />
            <div>
              <div className="font-semibold">시간 미설정</div>
              <div className="text-sm text-gray-500 mt-1">
                시민 투표를 진행하지 않고 AI 판결문 만으로 점수를 도출합니다.
              </div>
            </div>
          </div>
        </label>

        {/* 시간 설정 */}
        <label
          onClick={() => { setTimerType("limit"); if (!time) setTime("1"); }}
          className={`border rounded-xl p-4 cursor-pointer transition
            ${timerType === "limit"
              ? "border-gold bg-[#FFF9E8]"
              : "border-gray-200 hover:border-gold/50"
            }`}
        >
          <div className="flex items-start gap-3">
            <input type="radio" checked={timerType === "limit"} readOnly />
            <div>
              <div className="font-semibold">시간 설정</div>
              <div className="text-sm text-gray-500 mt-1">
                설정된 시간 동안 시민 투표가 진행되며, 마감 후
                시민 투표 결과와 함께 AI 판결을 종합한 점수를 도출합니다.
              </div>
            </div>
          </div>
        </label>

      </div>

      {timerType === "limit" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <span className="font-semibold text-sm text-gray-800">시민 투표 마감 시간</span>
            {errorTime && <span className="text-xs text-red-500">{errorTime}</span>}
          </div>
          <div className="w-full">
            <Input
              value={time}
              onChange={(e) => { setTime(e.target.value); setErrorTime(""); }}
              options={timeOptions}
            />
          </div>
        </div>
      )}

      {/* BUTTON */}
      <div className="flex gap-3">
        <Button variant="accent" onClick={prevStep} className="w-full">이전</Button>
        <Button onClick={handleStart} className="w-full">논쟁 생성</Button>
      </div>

      {/* CONFIRM MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl bg-white"
            style={{ animation: 'modal-pop 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2a3f6a] px-5 py-3">
              <p className="text-[13px] font-extrabold text-[#D4AF37] tracking-[0.05em]">논쟁 생성 확인</p>
            </div>

            <div className="px-5 pt-4 pb-2 space-y-2.5 text-[13px]">
              <div><span className="font-bold text-primary/50">주제</span> <span className="text-primary">{topic}</span></div>
              <div className="pl-3"><span className="font-bold text-primary/50">본인 주장</span> <span className="text-primary">{proSide}</span></div>
              <div className="pl-3"><span className="font-bold text-primary/50">상대 주장</span> <span className="text-primary">{conSide}</span></div>
              <div><span className="font-bold text-primary/50">목적</span> <span className="text-primary">{purpose}</span></div>
              <div><span className="font-bold text-primary/50">기준</span> <span className="text-primary">{lens || '미선택'}</span></div>
              <div>
                <span className="font-bold text-primary/50">시민 투표</span>{' '}
                <span className="text-primary">
                  {timerType === "limit" ? (
                    <>
                      {time}일간 진행
                      {getDeadlinePreview() && (
                        <span className="text-primary/40 ml-1 text-[11px]">({getDeadlinePreview()} 마감)</span>
                      )}
                    </>
                  ) : "없음"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 px-5 pt-4 pb-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-extrabold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl font-extrabold text-[14px] bg-[#D4AF37] text-[#1B2A4A] border-2 border-[#D4AF37]/50 active:scale-95 transition-all"
              >
                논쟁 생성
              </button>
            </div>
          </div>
          <style>{`@keyframes modal-pop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
      )}

    </div>
  );
}