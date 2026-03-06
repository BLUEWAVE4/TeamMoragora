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
        alert(err.message || '논쟁 정보를 불러올 수 없습니다.')
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
      alert('주장이 제출되었습니다!')
      navigate(`/debate/${debateId}/judging`)
    } catch (err) {
      alert(err.message || '제출에 실패했습니다.')
    }
  }

  if (loading) return <div className="p-10 text-center text-gray-400">로딩 중...</div>

  const sideLabel = debate?.creator_id === user?.id ? 'A측' : 'B측'

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center">

      {/* 상단 논쟁 정보 카드 */}
      <div className="w-[90%] max-w-md bg-[#1a2744] text-white px-7 py-8 rounded-[16px] shadow-lg mb-[-20px] z-10">
        <div className="flex gap-2 mb-3">
          <span className="bg-white/10 px-3 py-1.5 rounded-full text-[12px] font-medium backdrop-blur-sm">
            🎯 {debate?.goal}
          </span>
          <span className="bg-white/10 px-3 py-1.5 rounded-full text-[12px] font-medium backdrop-blur-sm">
            🔍 {debate?.lens}
          </span>
        </div>
        <h1 className="text-lg font-bold leading-tight">
          "{debate?.title || '논쟁 주제를 불러오는 중...'}"
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col p-6 pt-10 gap-5">

        {/* 진영 안내 */}
        <p className="text-gray-500 text-[14px] font-medium">
          당신의 주장을 입력하세요{' '}
          <span className="text-[#1a2744] font-bold">({sideLabel})</span>
        </p>

        {/* 텍스트 입력 영역 */}
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-[#1a2744]/5 transition-all">
          <textarea
            className="w-full h-64 p-5 focus:outline-none resize-none text-[15px] leading-relaxed placeholder-gray-300"
            placeholder="이 논쟁에 대한 당신의 주장을 논리적으로 펼쳐주세요. (50자 이상)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHAR}
          />

          {/* 글자수 카운터 */}
          <div className="px-5 py-3 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
            <span className="text-[11px] text-gray-400 font-medium">
              {content.length < MIN_CHAR
                ? `최소 ${MIN_CHAR - content.length}자 더 필요`
                : '제출 준비 완료 ✓'}
            </span>
            <div className="text-sm">
              <span className={`font-bold ${content.length < MIN_CHAR ? 'text-red-400' : 'text-[#1a2744]'}`}>
                {content.length.toLocaleString()}
              </span>
              <span className="text-gray-300 text-xs font-light"> / {MAX_CHAR.toLocaleString()}자</span>
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isInvalid}
          className={`w-full h-[56px] rounded-[20px] font-bold text-[16px] transition-all ${
            isInvalid
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#1a2744] text-white shadow-xl shadow-[#1a2744]/20 active:scale-[0.97] hover:bg-[#151f36]'
          }`}
        >
          주장 제출하기
        </button>
      </form>
    </div>
  )
}
