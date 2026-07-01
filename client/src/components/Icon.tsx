// A small inline-SVG icon set used across the app in place of emoji. Every icon draws with
// `currentColor` so it inherits the text colour of its context, and shares a 24x24 viewBox with
// round line caps for a consistent modern look. Add new glyphs to ICONS below.

export type IconName =
  | "home"
  | "settings"
  | "volume"
  | "volumeMuted"
  | "trophy"
  | "infinity"
  | "play"
  | "refresh"
  | "swap"
  | "hammer"
  | "trash"
  | "chevronLeft"
  | "chevronRight"
  | "check"
  | "x"
  | "star"
  | "flame"
  | "snowflake"
  | "minus"
  | "target"
  | "crosshair"
  | "shield"
  | "eye"
  | "brain"
  | "clipboard"
  | "bomb"
  | "users"
  | "globe"
  | "flag"
  | "alert"
  | "dollar"
  | "arrowUp"
  | "spark";

const ICONS: Record<IconName, JSX.Element> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9v6h3.5L13 20V4L7.5 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6a8 8 0 0 1 0 12" />
    </>
  ),
  volumeMuted: (
    <>
      <path d="M4 9v6h3.5L13 20V4L7.5 9H4Z" />
      <path d="m17 9 4 6M21 9l-4 6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a4 4 0 0 0 4 4M17 6h3v1a4 4 0 0 1-4 4" />
      <path d="M12 14v3M9 21h6M10 17.5h4l.5 3.5h-5l.5-3.5Z" />
    </>
  ),
  infinity: (
    <path d="M6.5 9a3 3 0 1 0 0 6c1.6 0 2.7-1.2 3.8-2.4l3.4-3.2C15 8 16.1 7 17.5 7a3 3 0 1 1 0 6c-1.6 0-2.7-1.2-3.8-2.4L10.3 7.4C9.2 6.2 8.1 5 6.5 5" />
  ),
  play: <path d="M7 4.5v15l13-7.5-13-7.5Z" />,
  refresh: (
    <>
      <path d="M20 8a8 8 0 0 0-14.5-2M4 12a8 8 0 0 0 14.5 2" />
      <path d="M20 3.5V8h-4.5M4 20.5V16h4.5" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13M14 5l3 3-3 3" />
      <path d="M20 16H7M10 13l-3 3 3 3" />
    </>
  ),
  hammer: (
    <>
      <path d="M14 6.5 17.5 3 21 6.5 17.5 10 14 6.5Z" />
      <path d="m15.5 8-8 8M9.5 10 4 15.5 8.5 20 14 14.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16M9 6.5V4h6v2.5M6 6.5 6.8 20h10.4L18 6.5" />
      <path d="M10 10v6M14 10v6" />
    </>
  ),
  chevronLeft: <path d="M15 5 8 12l7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  check: <path d="M4 12.5 9 17.5 20 6.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  star: (
    <path
      d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.2l1-5.9L3.5 9.2l5.9-.8L12 3Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  flame: (
    <path d="M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c1.5 0 2-1 2-1 .8 1.4 1.5 2.6 1.5 4.5a4.5 4.5 0 0 1-9 0C7.5 12 10 9 9.5 6 11 6.5 11.5 5 12 3Z" />
  ),
  snowflake: (
    <path d="M12 3v18M4.2 7.5 19.8 16.5M19.8 7.5 4.2 16.5M12 6l-2.2-2M12 6l2.2-2M12 18l-2.2 2M12 18l2.2 2" />
  ),
  minus: <path d="M6 12h12" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    </>
  ),
  shield: <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  brain: (
    <path d="M9 4a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 5 11a2.5 2.5 0 0 0 1.5 4.5A2.5 2.5 0 0 0 9 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm6 0a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19 11a2.5 2.5 0 0 1-1.5 4.5A2.5 2.5 0 0 1 15 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
  ),
  clipboard: (
    <>
      <path d="M9 4h6v2.5H9V4Z" />
      <path d="M8 5.2H5.5V20h13V5.2H16M8.5 11h7M8.5 15h5" />
    </>
  ),
  bomb: (
    <>
      <circle cx="10" cy="14" r="6" />
      <path d="M15 9l2.5-2.5M17 5.5 19 4M19.5 7l1.5-1M18 8.5l2 .5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.6M17 20a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
    </>
  ),
  flag: <path d="M6 21V4M6 4h11l-2 3.5L17 11H6" />,
  alert: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  dollar: (
    <>
      <path d="M12 2.5v19" />
      <path d="M16 6.5c-1-1.3-2.4-2-4-2-2.2 0-4 1.2-4 3.2 0 4.6 8 2.6 8 7.4 0 2-1.8 3.4-4 3.4-1.8 0-3.3-.8-4.2-2.1" />
    </>
  ),
  arrowUp: <path d="M12 20V5M6 11l6-6 6 6" />,
  spark: (
    <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z" fill="currentColor" stroke="none" />
  ),
};

// Player role → icon, shared by the draft cards, live match and recap views.
export const ROLE_ICON: Record<string, IconName> = {
  entry: "target",
  awp: "crosshair",
  support: "shield",
  lurker: "eye",
  igl: "brain",
  coach: "clipboard",
};

export default function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
