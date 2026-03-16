import React from 'react';

const StepWizard = ({ currentStep = 1 }) => {
  const steps = [1, 2, 3];

  return (
    <div className="w-full py-8">
      <div className="relative flex items-center justify-between max-w-md mx-auto">
        
        {/* 단계 사이의 연결선 (배경) */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gold/20 -translate-y-1/2 z-0" />
        
        {/* 활성화된 단계까지의 연결선 (진행바) */}
        <div 
          className="absolute top-1/2 left-0 h-[3px] bg-gold -translate-y-1/2 z-0 transition-all duration-700 ease-in-out" 
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {/* 단계별 라운드(원) */}
        {steps.map((step) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center font-serif font-bold text-lg
                  transition-all duration-500 border-2
                  ${isActive 
                    ? "bg-primary text-gold border-gold shadow-[0_0_20px_rgba(212,175,55,0.6)] scale-125" 
                    : isCompleted
                      ? "bg-gold text-primary border-primary"
                      : "bg-surface text-primary/40 border-gold/30"
                  }
                `}
              >
                {isCompleted ? "✓" : step}
              </div>
              
              {/* 단계별 라벨 (선택 사항) */}
              <span className={`
                absolute -bottom-8 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap
                ${isActive ? "text-primary opacity-100" : "text-primary/40"}
              `}>
                {step === 1 ? "주제 & 카테고리" : step === 2 ? "목적 & 렌즈" : "시간"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepWizard;