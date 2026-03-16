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
        alert(err.message || '논쟁 정보를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchDebate()
  }, [debateId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isInvalid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const side = debate.creator_id === user?.id ? 'A' : 'B'
      await submitArgument(debateId, { content, side })
      navigate(`/debate/${debateId}/judging`)
    } catch (err) {
      alert(err.message || '제출에 실패했습니다.')
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-medium">논쟁 데이터 분석 중...</div>
    </div>
  )

  const sideLabel = debate?.creator_id === user?.id ? 'A측' : 'B측'
  const nickname = user?.user_metadata?.nickname || ''

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-10">

      {/* 상단 논쟁 정보 카드 */}
      <div className="w-[92%] max-w-md bg-gradient-to-br from-[#1a2744] to-[#2d3a5d] text-white px-7 py-8 rounded-[24px] shadow-2xl mt-8 mb-[-24px] z-10 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-white/60 border border-white/10"><Target size={12} /> {toKor(debate?.purpose)}</span>
          <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-white/60 border border-white/10"><Scale size={12} /> {toKor(debate?.lens)}</span>
          <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-white/60 border border-white/10"><Tag size={12} /> {toKor(debate?.category)}</span>
        </div>

        <h1 className="text-[18px] font-black leading-[1.5] tracking-tight">
          "{debate?.topic || debate?.title || '주제를 불러오는 중...'}"
        </h1>

        {/* A측/B측 입장 표시 */}
        {(debate?.pro_side || debate?.con_side) && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-black text-emerald-400 shrink-0">A측</span>
              <span className="text-[12px] text-emerald-300/80 font-medium">{debate.pro_side || '미정'}</span>
            </div>
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-black text-red-400 shrink-0">B측</span>
              <span className="text-[12px] text-red-300/80 font-medium">{debate.con_side || '미정'}</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col p-6 pt-12 gap-5">

        {/* 진영 안내 */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <p className="text-gray-600 text-[13px] font-bold">
              {nickname ? `${nickname}의 주장` : '당신의 주장'}
            </p>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${sideLabel === 'A측' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
              {sideLabel}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">50자 이상</span>
        </div>

        {/* 텍스트 입력 영역 */}
        <div className="bg-white rounded-[20px] shadow-lg shadow-black/[0.04] border border-gray-100 flex flex-col overflow-hidden focus-within:ring-4 focus-within:ring-[#1a2744]/5 focus-within:border-[#1a2744]/20 transition-all duration-300">
          <textarea
            className="w-full h-64 p-5 focus:outline-none resize-none text-[15px] leading-[1.7] text-gray-800 placeholder:text-gray-300"
            placeholder="상대방을 설득할 수 있는 강력한 근거를 제시해주세요.&#10;논리적인 흐름이 판결에 큰 영향을 미칩니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHAR}
          />

          {/* 하단 카운터 바 */}
          <div className="px-5 py-3 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${content.length < MIN_CHAR ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
              <span className={`text-[11px] font-bold ${content.length < MIN_CHAR ? 'text-amber-600' : 'text-green-600'}`}>
                {content.length < MIN_CHAR
                  ? `${MIN_CHAR - content.length}자 더 필요`
                  : '제출 준비 완료'}
              </span>
            </div>
            <div className="text-[12px] tabular-nums">
              <span className={`font-black ${content.length < MIN_CHAR ? 'text-gray-400' : 'text-[#1a2744]'}`}>
                {content.length.toLocaleString()}
              </span>
              <span className="text-gray-300 font-medium"> / {MAX_CHAR.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isInvalid || isSubmitting}
          className={`w-full h-[56px] rounded-[18px] font-black text-[16px] transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
            isInvalid || isSubmitting
              ? 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
              : 'bg-[#1a2744] text-white shadow-[#1a2744]/20 hover:bg-[#151f36] transform active:scale-[0.97] cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>제출 중...</span>
            </>
          ) : '주장 제출하기'}
        </button>

        <p className="text-center text-gray-300 text-[11px] font-medium leading-relaxed px-4">
          제출된 주장은 수정할 수 없으며,<br/>AI 판사 3인의 분석을 통해 실시간 판결이 시작됩니다.
        </p>
      </form>
    </div>
  )
}
