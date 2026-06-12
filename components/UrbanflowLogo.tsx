type UrbanflowLogoProps = {
  className?: string;
  title?: string;
};

export default function UrbanflowLogo({ className = 'h-10 w-10', title = 'Team Urbanflow logo' }: UrbanflowLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="urbanflow-channel" x1="12" y1="10" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0EA5E9" />
          <stop offset="0.58" stopColor="#0891B2" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="urbanflow-water" x1="18" y1="18" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67E8F9" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="18" fill="#F8FAFC" />
      <path
        d="M18 13v24c0 13.3 9.4 21 21 21s21-7.7 21-21V13"
        fill="none"
        stroke="url(#urbanflow-channel)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27 18v19c0 6.8 4.9 10.5 12 10.5S51 43.8 51 37V18"
        fill="none"
        stroke="#E0F2FE"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M25 36c5.2-3.4 10.2-3.4 15 0s9.8 3.4 15 0"
        fill="none"
        stroke="url(#urbanflow-water)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="m39 24 4.2 4.2L52 19.5"
        fill="none"
        stroke="#16A34A"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 24h8M45 9h8M48 52h7" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
