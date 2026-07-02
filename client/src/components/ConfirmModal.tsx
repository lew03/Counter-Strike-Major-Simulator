export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export default function ConfirmModal({
  options,
  onCancel,
}: {
  options: ConfirmOptions;
  onCancel: () => void;
}) {
  const { title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, onConfirm } = options;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="panel modal-panel confirm-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-title">{title}</h2>
        <p className="hint confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="secondary-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={danger ? "danger-btn" : "primary-btn"} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
