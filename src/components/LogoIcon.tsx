import React from "react";

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className = "h-6 w-6", ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      {...props}
    >
      {/* Outer Squircle Container */}
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="128"
        fill="#04060d"
        stroke="#1e3a8a"
        strokeWidth="28"
        strokeLinejoin="round"
      />
      {/* Inner Glowing Highlight */}
      <rect
        x="38"
        y="38"
        width="436"
        height="436"
        rx="114"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="6"
        strokeOpacity="0.8"
      />
      {/* LIFE OS Bold Typography */}
      <text
        x="256"
        y="235"
        fontFamily="'Inter', 'Arial Rounded MT Bold', 'Outfit', 'Segoe UI', system-ui, sans-serif"
        fontWeight="900"
        fontSize="145"
        fill="#3b82f6"
        textAnchor="middle"
        letterSpacing="-2"
      >
        LIFE
      </text>
      <text
        x="256"
        y="370"
        fontFamily="'Inter', 'Arial Rounded MT Bold', 'Outfit', 'Segoe UI', system-ui, sans-serif"
        fontWeight="900"
        fontSize="145"
        fill="#3b82f6"
        textAnchor="middle"
        letterSpacing="-2"
      >
        OS
      </text>
    </svg>
  );
};
