import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, submitArgument } from '../../services/api'
import { useAuth } from '../../store/AuthContext'

export default function ArgumentPage() {
  const { debateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  const MIN_CHAR = 50
  const MAX_CHAR = 2000
  const isInvalid = content.length < MIN_CHAR || content.length > MAX_CHAR

  useEffect(() => {
    const fetchDebate = async () => {
      try {
        const data = await getDebate(debateId)
        setDebate(data)
      } catch (err) {
        alert('논쟁 정보를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchDebate()
  }, [debateId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isInvalid) return

    try {
      const side = debate.creator_id === user?.id ? 'A' : 'B'
      await submitArgument(debateId, { content, side })
      navigate(`/debate/${debateId}/judging`)
    } catch (err) {
      alert(err.message || '제출에 실패했습니다.')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-medium">논쟁 데이터 분석 중...</div>
    </div>
  )

  const sideLabel = debate?.creator_id === user?.id ? '찬성' : '반대'

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-10">
      
      {/* 1. 상단 논쟁 정보 카드: CreateDebatePage에서 선택한 값 출력 */}
      <div className="w-[92%] max-w-md bg-gradient-to-br from-[#1a2744] to-[#2d3a5d] text-white px-7 py-9 rounded-[24px] shadow-2xl mt-8 mb-[-24px] z-10 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
        
        <div className="flex flex-wrap gap-2 mb-4">
          {/* 목적(Purpose) 출력 */}
          <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-md">
            🎯 {debate?.purpose || ''}
          </span>
          {/* 렌즈(Lens) 출력 */}
          <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-md">
            🔍 {debate?.lens || ''}
          </span>
        </div>

        {/* 주제(Topic) 출력: CreateDebatePage의 topic 필드와 매칭 */}
        <h1 className="text-[19px] font-black leading-[1.4] tracking-tight italic">
          "{debate?.topic || debate?.title || '주제를 불러오는 중...'}"
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col p-6 pt-12 gap-6">

        {/* 진영 안내 */}
        <div className="flex justify-between items-end px-1">
          <p className="text-gray-500 text-[13px] font-bold">
            당신의 논리적인 주장 <span className="text-[#1a2744] text-sm">({sideLabel})</span>
          </p>
          <span className="text-[11px] text-gray-400 italic font-medium">공백 포함 50자 이상</span>
        </div>

        {/* 텍스트 입력 영역 */}
        <div className="bg-white rounded-[24px] shadow-xl shadow-black/[0.03] border border-gray-100 flex flex-col overflow-hidden focus-within:ring-4 focus-within:ring-[#1a2744]/5 focus-within:border-[#1a2744]/20 transition-all duration-300">
          <textarea
            className="w-full h-72 p-6 focus:outline-none resize-none text-[16px] leading-[1.6] text-gray-800 placeholder:text-gray-200"
            placeholder="상대방을 설득할 수 있는 강력한 근거를 제시해주세요. 논리적인 흐름이 판결에 큰 영향을 미칩니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHAR}
          />

          {/* 하단 카운터 바 */}
          <div className="px-6 py-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${content.length < MIN_CHAR ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
              <span className={`text-[11px] font-bold ${content.length < MIN_CHAR ? 'text-amber-600' : 'text-green-600'}`}>
                {content.length < MIN_CHAR
                  ? `${MIN_CHAR - content.length}자 더 필요`
                  : '제출 준비 완료'}
              </span>
            </div>
            <div className="text-[13px] tabular-nums">
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
          disabled={isInvalid}
          className={`w-full h-[64px] rounded-[24px] font-black text-[17px] transition-all duration-300 shadow-xl ${
            isInvalid
              ? 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
              : 'bg-[#1a2744] text-white shadow-[#1a2744]/20 hover:bg-[#151f36] transform active:scale-[0.97] cursor-pointer '
          }`}
        >
          주장 제출하기
        </button>
        
        <p className="text-center text-gray-300 text-[11px] font-medium leading-relaxed px-4">
          제출된 주장은 수정할 수 없으며,<br/>AI 판사 3인의 분석을 통해 실시간 판결이 시작됩니다.
        </p>
      </form>
    </div>
  )
}
