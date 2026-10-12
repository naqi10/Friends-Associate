/** Thin line icons from the black & white design. Decorative: always paired with visible text or an aria-label. */
type IconProps = { className?: string; size?: number };

function Svg({ size = 32, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

const CATEGORY_PATHS: Record<string, React.ReactNode> = {
  residential: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  commercial: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
    </>
  ),
  industrial: (
    <>
      <path d="M3 21V10l6 4V10l6 4V4h6v17z" />
      <path d="M7 18h2M12 18h2M17 18h2" />
    </>
  ),
  hospitality: (
    <>
      <path d="M3 20h18" />
      <path d="M5 20V8h14v12" />
      <path d="M9 4h6v4H9z" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  healthcare: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  educational: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c3 2 9 2 12 0v-5" />
    </>
  ),
  recreational: (
    <>
      <path d="M12 3l6 9h-4l4 6H6l4-6H6z" />
      <path d="M12 18v3" />
    </>
  ),
  consultancy: (
    <>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </>
  ),
};

export function CategoryIcon({ category, ...props }: IconProps & { category: string }) {
  return <Svg {...props}>{CATEGORY_PATHS[category] ?? CATEGORY_PATHS.consultancy}</Svg>;
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <Svg size={18} {...props}>
      <path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 20z" />
      <path d="M9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1.2-1.2 2 1-.4 1.6c-3.8.4-8.4-4.2-8-8l1.6-.4 1 2z" />
    </Svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <path d="M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" />
    </Svg>
  );
}

export function YouTubeIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9l5 3-5 3z" />
    </Svg>
  );
}
