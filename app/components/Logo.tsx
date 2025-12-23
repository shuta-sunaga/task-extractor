export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 背景の円 */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="mittGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
      </defs>

      {/* メインの円 */}
      <circle cx="24" cy="24" r="22" fill="url(#bgGradient)" />

      {/* キャッチャーミット */}
      <path
        d="M16 18 C12 18 10 22 10 26 C10 32 14 36 20 36 L28 36 C32 36 36 32 36 26 L36 22 C36 18 34 16 30 16 L26 16 C24 16 22 18 22 20 L22 24"
        fill="url(#mittGradient)"
        stroke="#92400E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ミットの指部分 */}
      <path
        d="M14 20 C12 20 11 22 12 24"
        stroke="#92400E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* チェックマーク */}
      <path
        d="M18 26 L22 30 L30 20"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* キラキラ（控えめ） */}
      <circle cx="38" cy="12" r="1.5" fill="white" opacity="0.8" />
      <circle cx="10" cy="14" r="1" fill="white" opacity="0.6" />
    </svg>
  )
}
