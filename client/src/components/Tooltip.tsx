import { useState, type ReactNode } from "react";

export default function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
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
      {open && <span className="tooltip-popup">{content}</span>}
    </span>
  );
}
