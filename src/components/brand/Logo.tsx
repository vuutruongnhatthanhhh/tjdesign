interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="tj-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#tj-grad)" />
      <path
        d="M48 16 A14 14 0 0 1 58 29"
        stroke="#fbbf24"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <circle cx="48" cy="14" r="4" fill="#fbbf24" stroke="white" strokeWidth="1.5" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="27"
        letterSpacing="-1"
        fill="#ffffff"
      >
        TJ
      </text>
    </svg>
  );
}

export default function Logo({ size = 36, className, withWordmark = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-white">
          TJ<span className="text-sky-400">Design</span>
        </span>
      )}
    </div>
  );
}
