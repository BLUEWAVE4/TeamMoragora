import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'

export default function NicknamePage() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')

  const isInvalid = nickname.trim().length < 2 || !gender || age.length !== 2

  const handleAgeChange = (e) => {
    const value = e.target.value
    const onlyNumber = value.replace(/[^0-9]/g, '')
    if (onlyNumber.length <= 2) {
      setAge(onlyNumber)
    }
  }

  const adjustAge = (amount) => {
    const currentAge = parseInt(age) || 0
    const newAge = Math.min(Math.max(currentAge + amount, 0), 99)
    setAge(newAge === 0 ? '' : newAge.toString())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isInvalid) return

    const { error } = await updateProfile({ nickname, gender, age })
    if (error) {
      alert('프로필 설정에 실패했습니다.')
      return
    }
    alert(`${nickname}님, 프로필 설정이 완료되었습니다!`)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pt-10 px-8 pb-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900">프로필 설정</h2>
          <p className="text-gray-500 mt-2 text-sm">정확한 판결을 위해 정보를 입력해주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 닉네임 */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">닉네임</label>
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#1a2744]/10 transition-all">
              <input
                type="text"
                className="w-full p-4 focus:outline-none text-[15px] placeholder-gray-300"
                placeholder="2~10자 이내"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>

          {/* 성별 */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">성별</label>
            <div className="flex gap-3">
              {['남성', '여성'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={`flex-1 py-4 rounded-[18px] font-bold text-[15px] transition-all cursor-pointer ${
                    gender === item
                      ? 'bg-[#1a2744] text-white shadow-md scale-[1.02]'
                      : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 나이 */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">나이</label>
            <div className="relative flex items-center bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#1a2744]/10 transition-all">
              <input
                type="text"
                inputMode="numeric"
                className="w-full p-4 focus:outline-none text-[15px] placeholder-gray-300"
                placeholder="숫자 2자리 (예: 25)"
                value={age}
                onChange={handleAgeChange}
              />
              <div className="flex flex-col border-l border-gray-50 bg-gray-50/20">
                <button
                  type="button"
                  onClick={() => adjustAge(1)}
                  className="px-4 py-2 hover:bg-gray-100 active:bg-gray-200 text-[10px] text-gray-400 border-b border-gray-50 transition-colors cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => adjustAge(-1)}
                  className="px-4 py-2 hover:bg-gray-100 active:bg-gray-200 text-[10px] text-gray-400 transition-colors cursor-pointer"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isInvalid}
              className={`w-full h-[58px] rounded-[18px] font-bold text-[17px] transition-all shadow-lg ${
                isInvalid
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#1a2744] text-white cursor-pointer active:scale-[0.97] hover:bg-[#151f36]'
              }`}
            >
              설정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}