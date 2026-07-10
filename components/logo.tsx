// Ferrum mark — a bold geometric "F" whose top bar is tipped in PR-gold, echoing
// a loaded barbell. Monochrome body uses currentColor so it inherits text color;
// the gold accent is fixed. Drop it inside the existing bordered logo squares.

export function LogoMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="none">
      {/* body of the F — inherits currentColor */}
      <g fill="currentColor">
        <rect x="30" y="16" width="14" height="68" rx="5" /> {/* stem */}
        <rect x="30" y="16" width="46" height="14" rx="5" /> {/* top bar */}
        <rect x="30" y="43" width="36" height="13" rx="5" /> {/* middle bar */}
      </g>
      {/* gold plate at the end of the top bar */}
      <rect x="62" y="16" width="14" height="14" rx="5" fill="#E6B450" />
    </svg>
  );
}
