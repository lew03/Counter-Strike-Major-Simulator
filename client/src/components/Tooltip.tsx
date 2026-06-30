import { useState, type ReactNode } from "react";

export default function Tooltip({
  content,
  children,
  placement = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  // "top" (default) opens upward — fine for most uses, but clips if the host sits near the
  // top of a scrolling ancestor (the popup gets cut off by that ancestor's overflow). Use
  // "bottom" there instead so the popup opens downward into the visible scroll area.
  placement?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="tooltip-host"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open && <span className={`tooltip-popup tooltip-popup-${placement}`}>{content}</span>}
    </span>
  );
}
