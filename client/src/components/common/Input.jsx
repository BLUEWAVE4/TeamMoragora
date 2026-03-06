import React from 'react';

const Input = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = "text", 
  multiline = false, // 다중 행 여부 추가
  rows = 6,          // 기본 높이 설정
  className = "" 
}) => {
  // 공통 스타일
  const sharedClasses = "w-full px-5 py-4 rounded-2xl font-serif text-primary border border-gold/20 shadow-inner outline-none transition-all duration-300 placeholder:text-primary/30 focus:border-gold focus:ring-4 focus:ring-gold/10 hover:border-gold/40";
  
  // 제목용 vs 내용용 배경 그라데이션 차이
  const variantClasses = multiline 
    ? "bg-gradient-to-b from-surface-alt to-surface resize-none" // 내용은 위에서 아래로 흐르는 차분한 느낌
    : "bg-gradient-to-br from-surface to-surface-alt";           // 제목은 대각선으로 역동적인 느낌

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && (
        <label className="text-primary font-serif font-bold text-[11px] uppercase tracking-[0.2em] ml-2 opacity-80">
          {label}
        </label>
      )}
      
      <div className="relative group">
        {multiline ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            maxLength={500}
            className={`${sharedClasses} ${variantClasses}`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`${sharedClasses} ${variantClasses}`}
          />
        )}
        
        {/* 장식 요소: 입력 중일 때 테두리에 흐르는 황금빛 선 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gold transition-all duration-700 group-focus-within:w-[90%] opacity-40" />
      </div>
      
      {/* 글자수 제한 표시 (내용 입력 시에만 노출) */}
      {multiline && (
        <p className="text-[10px] text-right text-primary/40 font-serif mt-1 tracking-widest">
          {value?.length || 0} / 500 CHARACTERS
        </p>
      )}
    </div>
  );
};

export default Input;