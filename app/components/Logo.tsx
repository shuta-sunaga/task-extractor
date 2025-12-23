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
        <linearGradient id="boomerangGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* 背景の円 */}
      <circle cx="24" cy="24" r="22" fill="url(#bgGradient)" />

      {/* ブーメラン本体 */}
      <g transform="translate(24, 24) rotate(-30)">
        <path
          d="M-14 0
             C-14 -6 -10 -10 -4 -12
             L4 -14
             C8 -14 10 -12 10 -8
             L8 -4
             C6 -2 4 0 4 0
             C4 0 6 2 8 4
             L10 8
             C10 12 8 14 4 14
             L-4 12
             C-10 10 -14 6 -14 0 Z"
          fill="url(#boomerangGradient)"
          stroke="#B45309"
          strokeWidth="1.5"
        />
        {/* ブーメランの模様 */}
        <path
          d="M-8 -2 C-6 -6 -2 -8 2 -8"
          stroke="#B45309"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M-8 2 C-6 6 -2 8 2 8"
          stroke="#B45309"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
      </g>

      {/* チェックマーク（タスク完了を表現） */}
      <path
        d="M20 26 L23 29 L29 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 動きの軌跡 */}
      <path
        d="M38 12 C42 14 44 18 44 22"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M40 8 C45 11 47 16 47 21"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}
