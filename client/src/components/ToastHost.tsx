import { useEffect, useState } from "react";
import { subscribeToasts, dismissToast, type ToastItem } from "../toast";
import Icon, { type IconName } from "./Icon";

const KIND_ICON: Record<ToastItem["kind"], IconName> = {
  info: "spark",
  success: "check",
  error: "alert",
};

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((t) => (
        <button key={t.id} className={`toast toast-${t.kind} pop-in`} onClick={() => dismissToast(t.id)}>
          <Icon name={KIND_ICON[t.kind]} size={16} strokeWidth={2.2} />
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}
