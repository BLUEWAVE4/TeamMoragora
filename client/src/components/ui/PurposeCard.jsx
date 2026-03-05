import React from "react";

function PurposeCard({ icon, title, description, highlight }) {
  return (
    <div
      className={`group flex items-center gap-3 p-4 rounded-xl border cursor-pointer 
      transition-all duration-300
      ${highlight ? "border-[#D4AF37]" : "border-gray-200"}
      bg-white/95
      hover:bg-[#F5F0E8]
      hover:border-[#D4AF37]
      hover:shadow-xl hover:-translate-y-1`}
    >
      <div className="text-xl transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold text-[#1B2A4A] tracking-wide group-hover:tracking-wider">
          {title}
        </h3>
        <p className="text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default PurposeCard;