import React from "react";

const Input = ({
  label,
  placeholder,
  value,
  onChange,
  onKeyDown,
  type = "text",
  multiline = false,
  rows = 6,
  options = null,
  className = ""
}) => {

  const sharedClasses =
    "w-full px-5 py-4 rounded-2xl font-sans text-primary border border-gold/20 shadow-inner outline-none transition-all duration-300 placeholder:text-primary/30 focus:border-gold focus:ring-4 focus:ring-gold/10 hover:border-gold/40";

  const variantClasses = multiline
    ? "bg-gradient-to-b from-surface-alt to-surface resize-none"
    : "bg-gradient-to-br from-surface to-surface-alt";

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>

      {label && (
        <label className="text-primary font-sans font-bold text-[11px] uppercase tracking-[0.2em] ml-2 opacity-80">
          {label}
        </label>
      )}

      <div className="relative group">

        {/* TEXTAREA */}
        {multiline && (
          <textarea
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={rows}
            maxLength={500}
            className={`${sharedClasses} ${variantClasses}`}
          />
        )}

        {/* SELECT */}
        {!multiline && options && (
          <>
            <select
              value={value}
              onChange={onChange}
              className={`${sharedClasses} ${variantClasses} appearance-none cursor-pointer`}
            >
              <option value="" className="bg-surface text-primary">
                선택
              </option>

              {options.map((opt) => (
                <option
                  key={opt.value || opt}
                  value={opt.value || opt}
                  className="bg-surface text-primary font-sans"
                >
                  {opt.label || opt}
                </option>
              ))}
            </select>

            {/* custom arrow */}
            <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-gold text-xs">
              ▼
            </div>
          </>
        )}

        {/* INPUT */}
        {!multiline && !options && (
          <input
            type={type}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            enterKeyHint="next"
            className={`${sharedClasses} ${variantClasses}`}
          />
        )}

        {/* gold underline animation */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gold transition-all duration-700 group-focus-within:w-[90%] opacity-40" />

      </div>

      {multiline && (
        <p className="text-[10px] text-right text-primary/40 font-sans mt-1 tracking-widest">
          {value?.length || 0} / 500 CHARACTERS
        </p>
      )}

    </div>
  );
};

export default Input;