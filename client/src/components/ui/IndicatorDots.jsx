import React from "react";

function IndicatorDots() {
  return (
    <div className="flex justify-center gap-2 mt-5">
      <div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div>
      <div className="w-2 h-2 bg-[#D4AF37]/40 rounded-full"></div>
      <div className="w-2 h-2 bg-[#D4AF37]/40 rounded-full"></div>
    </div>
  );
}

export default IndicatorDots;