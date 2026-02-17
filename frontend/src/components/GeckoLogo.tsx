export function GeckoLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4c-2 0-3.5 1-4.5 2.5C10.5 8 10 10 10 12c0 1.5.3 3 1 4l-3 4c-.5.7-.5 1.5 0 2l1 1c.5.5 1.3.5 1.8 0l2.5-3c.8.4 1.7.6 2.7.6s1.9-.2 2.7-.6l2.5 3c.5.5 1.3.5 1.8 0l1-1c.5-.5.5-1.3 0-2l-3-4c.7-1 1-2.5 1-4 0-2-.5-4-1.5-5.5C18.5 5 17 4 16 4z" fill="currentColor"/>
      <ellipse cx="16" cy="9" rx="4.5" ry="4" fill="currentColor" opacity="0.8"/>
      <circle cx="13.8" cy="8" r="1.3" fill="hsl(var(--background))"/>
      <circle cx="18.2" cy="8" r="1.3" fill="hsl(var(--background))"/>
      <circle cx="14.2" cy="7.6" r="0.4" fill="white"/>
      <circle cx="18.6" cy="7.6" r="0.4" fill="white"/>
      <path d="M16 20c0 2-1 4-2.5 5.5s-1.5 3 0 3.5c1 .3 2-.5 2.5-1.5.8-1.5 1-3 .5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
