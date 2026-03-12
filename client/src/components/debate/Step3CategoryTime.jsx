import Button from "../common/Button";

export default function Step3CategoryTime({

  category,
  setCategory,
  time,
  setTime,
  prevStep,
  handleSubmit

}) {

  return (

    <div className="flex flex-col gap-5 mt-6">

      <h3 className="font-bold text-lg">카테고리</h3>

      <select
        value={category}
        onChange={(e)=>setCategory(e.target.value)}
        className="px-4 py-3 rounded-xl border"
      >
        <option value="">선택</option>
        <option value="사회">사회</option>
        <option value="기술">기술</option>
        <option value="정치">정치</option>
        <option value="철학">철학</option>
        <option value="일상">일상</option>
      </select>

      <h3 className="font-bold text-lg">토론 시간</h3>

      <select
        value={time}
        onChange={(e)=>setTime(e.target.value)}
        className="px-4 py-3 rounded-xl border"
      >
        <option value="">선택</option>
        <option value="3">3분</option>
        <option value="5">5분</option>
        <option value="10">10분</option>
      </select>

      <div className="flex gap-3">

        <Button
          variant="accent"
          onClick={prevStep}
          className="w-full"
        >
          이전
        </Button>

        <Button
          onClick={handleSubmit}
          className="w-full"
        >
          논쟁 생성
        </Button>

      </div>

    </div>

  );

}