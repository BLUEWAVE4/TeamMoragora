import React from "react";

const Card = ({
  children,
  title,
  subtitle,
  variant = "base",
  className = "",
  ...props   // ⭐ 추가
}) => {

  const baseStyles =
    "overflow-hidden rounded-2xl border border-gold/10 transition-all duration-500 shadow-md hover:shadow-2xl hover:-translate-y-2 group";

  const variants = {
    base: "bg-gradient-to-br from-surface to-surface-alt text-primary border-primary/10 hover:border-gold/30",
    noble: "bg-gradient-to-bl from-primary via-primary/95 to-gold/90 text-gold-light border-gold shadow-lg hover:shadow-gold/20",
    clean: "bg-gradient-to-tr from-surface-alt to-gold-light text-primary border-gold-light shadow-md",
    judge: "bg-gradient-to-r from-accent to-warning/90 text-white shadow-sm border-transparent"
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}   // ⭐ 추가 (onClick 전달)
    >
      <div className="p-9 relative">

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-white/10 via-transparent to-transparent transition-opacity duration-700" />

        {subtitle && (
          <p className="relative z-10 text-[11px] uppercase tracking-[0.4em] mb-2 opacity-70 font-serif font-bold">
            {subtitle}
          </p>
        )}

        {title && (
          <h3 className="relative z-10 text-2xl font-bold font-serif mb-5 tracking-tight border-b border-current/10 pb-3">
            {title}
          </h3>
        )}

        <div className="relative z-10 text-sm leading-relaxed opacity-90 font-sans">
          {children}
        </div>

      </div>
    </div>
  );
};

export default Card;