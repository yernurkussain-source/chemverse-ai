// Төменгі навигация иконкалары (prototype.html-дегі tabbar-дан)
type IconProps = { size?: number; className?: string };

export function HomeIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path d="M3 8l6-5 6 5v7H3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function BookIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path d="M3 4h5a2 2 0 012 2v9a2 2 0 00-2-2H3zM15 4h-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ScanIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className={className}>
      <path d="M3 7V4h3M16 4h3v3M19 15v3h-3M6 18H3v-3M6 11h10" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function AtomIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="9" cy="9" rx="7.5" ry="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function UserIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 16c1-3 3.5-4 6-4s5 1 6 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
