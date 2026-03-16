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

  const handleStart = () => {

    if (timerType === "limit" && !time) {
      setErrorTime("투표 마감 시간을 선택해주세요.");
      return;
    }

    if (timerType === "none") {
      setTime("");
    }

    setIsModalOpen(true);
  };

  return (

    <div className="flex flex-col gap-8 mt-6">

      {/* TITLE */}
      <div className="flex flex-col gap-3">

        <h3 className="font-bold text-xl">
          시민 투표 설정
        </h3>

        <p className="text-sm text-gray-500 leading-relaxed">
          이 논쟁에 참여한 시민들이 의견을 남기고 투표할 수 있습니다. <br/>
          투표 마감 시간을 설정하면 해당 시간이 지나면 시민 투표가 종료되고 결과가 집계됩니다. <br/>
          <span className="text-gray-700 font-medium">
            AI 판결문은 시간 설정과 관계없이 언제든지 확인할 수 있습니다.
          </span>
        </p>

      </div>


      {/* OPTION CARDS */}
      <div className="flex flex-col gap-4">

        {/* 제한 없음 */}
        <label
          onClick={()=>{
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

            <input
              type="radio"
              checked={timerType === "none"}
              readOnly
            />

            <div>

              <div className="font-semibold">
                시간 미설정
              </div>

              <div className="text-sm text-gray-500 mt-1">
                시민 투표를 진행하지 않고 AI 판결문 만으로 점수를 도출합니다.
              </div>

            </div>

          </div>

        </label>


        {/* 시간 설정 */}
        <label
          onClick={()=>setTimerType("limit")}
          className={`border rounded-xl p-4 cursor-pointer transition
          ${timerType === "limit"
            ? "border-gold bg-[#FFF9E8]"
            : "border-gray-200 hover:border-gold/50"
          }`}
        >

          <div className="flex items-start gap-3">

            <input
              type="radio"
              checked={timerType === "limit"}
              readOnly
            />

            <div>

              <div className="font-semibold">
                시간 설정
              </div>

              <div className="text-sm text-gray-500 mt-1">
                설정된 시간 동안 시민 투표가 진행되며, 마감 후
                시민 투표 결과와 함께 AI 판결을 종합한 점수를 도출합니다.
              </div>

            </div>

          </div>

        </label>

      </div>


{/* TIME SELECT */}
{timerType === "limit" && (

  <div className="flex flex-col gap-4 border border-gold/30 rounded-xl p-5 bg-[#FFFCF3]">

    {/* header */}
    <div className="flex justify-between items-start">

      <div className="flex flex-col">

        <span className="font-semibold text-sm text-gray-800">
          시민 투표 마감 시간
        </span>

      </div>

      {errorTime && (
        <span className="text-xs text-red-500">
          {errorTime}
        </span>
      )}

    </div>


    {/* select */}
    <div className="flex items-center gap-3">

      <div className="w-full">

        <Input
          value={time}
          onChange={(e)=>{
            setTime(e.target.value);
            setErrorTime("");
          }}
          options={timeOptions}
        />

      </div>

    </div>


    {/* hint */}
    <div className="text-xs text-gray-500 leading-relaxed border-t pt-3">

      시민들은 설정된 시간 동안 자유롭게 의견을 남기고 투표할 수 있습니다.  
      시간이 종료되면 시민 투표 결과와 함께 AI 판결문을 확인할 수 있습니다.

    </div>

  </div>

)}


      {/* BUTTON */}
      <div className="flex gap-3">

        <Button
          variant="accent"
          onClick={prevStep}
          className="w-full"
        >
          이전
        </Button>

        <Button
          onClick={handleStart}
          className="w-full"
        >
          논쟁 생성
        </Button>

      </div>


      {/* CONFIRM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={()=>setIsModalOpen(false)}
        title="논쟁 생성 확인"
      >

        <div className="space-y-4 text-sm">

          <div>
            <span className="font-bold text-gold">주제</span>
            {" : "}
            {topic}
          </div>

          <div>
            <span className="font-bold text-gold">찬성 입장</span>
            {" : "}
            {proSide}
          </div>

          <div>
            <span className="font-bold text-gold">반대 입장</span>
            {" : "}
            {conSide}
          </div>

          <div>
            <span className="font-bold text-gold">목적</span>
            {" : "}
            {purpose}
          </div>

          <div>
            <span className="font-bold text-gold">렌즈</span>
            {" : "}
            {lens}
          </div>

          <div>
            <span className="font-bold text-gold">카테고리</span>
            {" : "}
            {category}
          </div>

          <div>
            <span className="font-bold text-gold">시민 투표</span>
            {" : "}
            {timerType === "limit" ? `${time}일` : "시간 제한 없음"}
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">

          <Button
            variant="outline"
            onClick={()=>setIsModalOpen(false)}
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