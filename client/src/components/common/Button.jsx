import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  // 베이스 스타일
  const baseStyles = "relative px-8 py-3 font-sans font-bold rounded-xl uppercase transition-all duration-300 border-2 rounded-sm shadow-md active:transform active:scale-95";

  // 아고라 테마별 변형 스타일
  const variants = {
    primary: "bg-primary text-gold-light hover:bg-gold hover:text-primary hover:shadow-[0_0_15px_rgba(212,175,55,0.5)]",
    outline: "bg-surface text-primary border-primary hover:bg-primary hover:text-surface-alt",
    accent: "bg-accent text-white border-transparent hover:brightness-110 shadow-lg shadow-accent/20",
    gold: "bg-gold text-primary border-primary hover:bg-gold-light"
  };

  return (
    <button 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      
      <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-gradient-to-tr from-white to-transparent transition-opacity" />
    </button>
  );
};


export default Button;