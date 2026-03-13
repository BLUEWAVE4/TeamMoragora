import { useState } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";

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

  const handleStart = () => {

    if (!time) {
      setErrorTime("토론 시간을 선택해주세요.");
      return;
    }

    setIsModalOpen(true);

  };

  return (

    <div className="flex flex-col gap-5 mt-6">

      {/* TIME */}
      <div className="flex flex-col gap-2">

        <div className="flex justify-between">

          <h3 className="font-bold text-lg">
            투표 마감 시간
          </h3>

          {errorTime && (
            <span className="text-xs text-red-500">
              {errorTime}
            </span>
          )}

        </div>

        <select
          value={time}
          onChange={(e)=>{
            setTime(e.target.value);
            setErrorTime("");
          }}
          className="px-4 py-3 rounded-xl border"
        >
          <option value="">선택</option>
          <option value="3">3분</option>
          <option value="5">5분</option>
          <option value="10">10분</option>
        </select>

      </div>


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
            <span className="font-bold text-gold">
              주제
            </span>
            {" : "}
            {topic}
          </div>

          <div>
            <span className="font-bold text-gold">
              찬성 입장
            </span>
            {" : "}
            {proSide}
          </div>

          <div>
            <span className="font-bold text-gold">
              반대 입장
            </span>
            {" : "}
            {conSide}
          </div>

          <div>
            <span className="font-bold text-gold">
              목적
            </span>
            {" : "}
            {purpose}
          </div>

          <div>
            <span className="font-bold text-gold">
              렌즈
            </span>
            {" : "}
            {lens}
          </div>

          <div>
            <span className="font-bold text-gold">
              카테고리
            </span>
            {" : "}
            {category}
          </div>

          <div>
            <span className="font-bold text-gold">
              투표 마감 시간
            </span>
            {" : "}
            {time}분
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