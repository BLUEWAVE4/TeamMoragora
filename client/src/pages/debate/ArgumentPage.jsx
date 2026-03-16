import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, submitArgument } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { Target, Tag, Scale } from 'lucide-react';

const labelMap = {
  battle: '승부', consensus: '합의', analysis: '분석',
  logic: '논리', emotion: '감정', practical: '현실', ethics: '윤리', general: '일반',
  society: '사회', technology: '기술', politics: '정치', philosophy: '철학',
  daily: '일상', culture: '문화', sports: '스포츠', entertainment: '연예',
}
const toKor = (v) => labelMap[v] || v

export default function ArgumentPage() {
  const { debateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const MIN_CHAR = 50
  const MAX_CHAR = 2000
  const isInvalid = content.length < MIN_CHAR || content.length > MAX_CHAR

  useEffect(() => {
    const fetchDebate = async () => {
      try {
        const data = await getDebate(debateId)
        setDebate(data)
      } catch (err) {
        console.error("데이터 로드 에러:", err)
        alert(err.message || '논쟁 정보를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchDebate()
  }, [debateId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!debate || isInvalid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const side = isCreator ? 'A' : 'B'
      await submitArgument(debateId, { content, side })
      navigate(`/debate/${debateId}/judging`)
    } catch (err) {
      alert(err.message || '제출에 실패했습니다.')
      setIsSubmitting(false)
    }
  }

  // 로딩 중이거나 데이터가 아직 없을 때의 처리
  if (loading || !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-medium">논쟁 데이터 분석 중...</div>
    </div>
  )

  const isCreator = user && debate && user.id === debate.creator_id;
  const sideLabel = isCreator ? 'A측' : 'B측';

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-10">

      {/* 1. 상단 논쟁 정보 카드 */}
      <div className="w-[92%] max-w-md bg-gradient-to-br from-[#1B2A4A] to-[#2d3a5d] text-white px-6 py-7 rounded-[24px] shadow-2xl mt-8 mb-[-28px] z-10 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl" />

        {/* 태그 뱃지 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/25 px-3 py-1 rounded-full text-[11px] font-bold text-[#D4AF37]">
            <Target size={11} /> {toKor(debate?.purpose)}
          </span>
          <span className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/25 px-3 py-1 rounded-full text-[11px] font-bold text-[#D4AF37]">
            <Scale size={11} /> {toKor(debate?.lens)}
          </span>
          <span className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/25 px-3 py-1 rounded-full text-[11px] font-bold text-[#D4AF37]">
            <Tag size={11} /> {toKor(debate?.category)}
          </span>
        </div>

        {/* 주제 */}
        <h1 className="text-[18px] font-black leading-[1.45] tracking-tight italic mb-5">
          "{debate?.topic || debate?.title || '주제를 불러오는 중...'}"
        </h1>

        {/* A측/B측 입장 */}
        {(debate?.pro_side || debate?.con_side) && (
          <div className="flex items-stretch gap-2">
            <div className={`flex-1 rounded-2xl px-3 py-2.5 border text-center ${
              isCreator ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1 text-emerald-400/70">A측</p>
              <p className={`text-[12px] font-bold leading-tight ${isCreator ? 'text-emerald-300' : 'text-white/35'}`}>
                {debate.pro_side || '미정'}
              </p>
              {isCreator && <p className="text-[9px] text-emerald-400/50 font-bold mt-1">내 입장</p>}
            </div>

            <div className="flex items-center justify-center px-1">
              <span className="text-[#D4AF37]/40 text-[11px] font-black">VS</span>
            </div>

            <div className={`flex-1 rounded-2xl px-3 py-2.5 border text-center ${
              !isCreator ? 'bg-red-500/15 border-red-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1 text-red-400/70">B측</p>
              <p className={`text-[12px] font-bold leading-tight ${!isCreator ? 'text-red-300' : 'text-white/35'}`}>
                {debate.con_side || '미정'}
              </p>
              {!isCreator && <p className="text-[9px] text-red-400/50 font-bold mt-1">내 입장</p>}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col p-6 pt-14 gap-5">

        {/* 진영 안내 */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isCreator ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <p className="text-gray-500 text-[13px] font-bold">
              나의 주장
              <span className={`ml-1.5 font-black ${isCreator ? 'text-emerald-600' : 'text-red-500'}`}>
                ({sideLabel}{user?.user_metadata?.nickname ? ` · ${user.user_metadata.nickname}` : ''})
              </span>
            </p>
          </div>
        </div>

        {/* 텍스트 입력 영역 */}
        <div className={`bg-white rounded-[20px] border-2 transition-all duration-300 overflow-hidden shadow-sm ${
          content.trim().length > 0
            ? isCreator ? 'border-emerald-200' : 'border-red-200'
            : 'border-gray-100 focus-within:border-[#D4AF37]/40'
        }`}>
          <textarea
            className="w-full h-72 px-6 pt-5 pb-3 focus:outline-none resize-none text-[16px] leading-[1.6] text-gray-800 placeholder:text-gray-200 bg-transparent"
            placeholder="상대방을 설득할 수 있는 강력한 근거를 제시해주세요. 논리적인 흐름이 판결에 큰 영향을 미칩니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHAR}
          />

          {/* 하단 카운터 바 */}
          <div className="px-6 py-3.5 border-t border-gray-50 flex justify-between items-center bg-gray-50/60">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                content.length < MIN_CHAR ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
              }`} />
              <span className={`text-[11px] font-bold ${
                content.length < MIN_CHAR ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {content.length < MIN_CHAR
                  ? `${MIN_CHAR - content.length}자 더 필요`
                  : '제출 준비 완료 ✓'}
              </span>
            </div>
            <div className="text-[13px] tabular-nums">
              <span className={`font-black ${content.length < MIN_CHAR ? 'text-gray-300' : 'text-[#1B2A4A]'}`}>
                {content.length.toLocaleString()}
              </span>
              <span className="text-gray-200 font-medium"> / {MAX_CHAR.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isInvalid || isSubmitting}
          className={`w-full h-[60px] rounded-[20px] font-black text-[16px] transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${
            isInvalid || isSubmitting
              ? 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
              : 'bg-[#1B2A4A] text-[#D4AF37] shadow-[#1B2A4A]/20 hover:bg-[#151f36] transform active:scale-[0.97] cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
              <span>제출 중...</span>
            </>
          ) : (
            <>
              <span>주장 제출하기</span>
              {!isInvalid && <span className="text-[#D4AF37]/60 text-[14px]">→</span>}
            </>
          )}
        </button>

        <p className="text-center text-gray-300 text-[11px] font-medium leading-relaxed px-4">
          제출된 주장은 수정할 수 없으며,<br/>AI 판사 3인의 분석을 통해 실시간 판결이 시작됩니다.
        </p>
      </form>
    </div>
  )
}
