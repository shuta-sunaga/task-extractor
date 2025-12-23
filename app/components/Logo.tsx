export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="mailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="handGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FECACA" />
          <stop offset="100%" stopColor="#FCA5A5" />
        </linearGradient>
      </defs>

      {/* 背景の円 */}
      <circle cx="24" cy="24" r="22" fill="url(#bgGradient)" />

      {/* ブーメラン型メール */}
      <g transform="translate(8, 10) rotate(-15, 16, 12)">
        {/* ブーメラン本体 */}
        <path
          d="M4 12 C4 8 8 4 14 4 L28 4 C30 4 30 6 28 8 L18 14 L28 20 C30 22 30 24 28 24 L14 24 C8 24 4 20 4 16 Z"
          fill="url(#mailGradient)"
          stroke="#B45309"
          strokeWidth="1"
        />
        {/* メールの封筒線 */}
        <path
          d="M6 8 L16 14 L26 8"
          stroke="#B45309"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* キャッチする手 */}
      <g transform="translate(22, 22)">
        {/* 手のひら */}
        <ellipse cx="8" cy="10" rx="9" ry="8" fill="url(#handGradient)" stroke="#DC2626" strokeWidth="0.8" />
        {/* 指 */}
        <path
          d="M2 6 C0 4 0 2 2 1 M6 3 C5 1 6 -1 8 0 M12 3 C13 1 15 0 16 2 M16 8 C18 7 20 8 19 10"
          stroke="#DC2626"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* 動きの線 */}
      <path
        d="M8 28 C6 30 5 32 6 34"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M12 30 C11 32 11 34 12 35"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* キラキラ */}
      <circle cx="40" cy="10" r="1.5" fill="white" opacity="0.8" />
      <circle cx="6" cy="38" r="1" fill="white" opacity="0.6" />
    </svg>
  )
}
