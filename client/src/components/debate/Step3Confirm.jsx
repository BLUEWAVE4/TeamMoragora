import Input from "../common/Input";
import Button from "../common/Button";

export default function Step3Confirm({

  topic,
  setTopic,
  description,
  setDescription,
  category,
  setCategory,
  prevStep,
  handleSubmit

}) {

  return (
    <div className="flex flex-col gap-4 mt-6">

         <div className="flex flex-col gap-2 w-full">

               <label className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] ml-2 opacity-80">
                 CATEGORY
               </label>

               <div className="relative group">

                 <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="
                  w-full px-5 py-4 rounded-2xl
                  font-serif text-primary
                  border border-gold/20
                  bg-gradient-to-br from-surface to-surface-alt
                  shadow-inner outline-none
                  transition-all duration-300
                  focus:border-gold focus:ring-4 focus:ring-gold/10
                  hover:border-gold/40
                  appearance-none
                  "
                >
                  <option value="">카테고리 선택</option>
                  <option value="society">사회</option>
                  <option value="technology">기술</option>
                  <option value="politics">정치</option>
                  <option value="philosophy">철학</option>
                </select>

                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gold text-sm">
                  ▼
                </div>

                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gold transition-all duration-700 group-focus-within:w-[90%] opacity-40" />

              </div>
            </div>

      <Input
        label="DEBATE TITLE"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="논쟁 주제 입력"
      />

      <Input
        label="DESCRIPTION"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        rows={6}
      />

      <div className="flex gap-3">

        <Button
          onClick={prevStep}
          variant="accent"
          className="w-full"
        >
          이전
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!topic || !category}
          className="w-full"
        >
          시작
        </Button>

      </div>

    </div>
  );
}