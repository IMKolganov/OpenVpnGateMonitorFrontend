import { FaServer } from "react-icons/fa";
import "../../css/Settings.css";

export type AddableServerRow = {
  id: number;
  name: string;
  currentGroupName: string | null;
};

type Props = {
  isOpen: boolean;
  groupName: string;
  servers: AddableServerRow[];
  busy?: boolean;
  onClose: () => void;
  onAdd: (serverId: number) => void;
};

export function AddServersToGroupModal({
  isOpen,
  groupName,
  servers,
  busy = false,
  onClose,
  onAdd,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="settings-card__h3-with-icon">
            <FaServer className="icon" aria-hidden />
            <span>Add servers to {groupName}</span>
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="add-servers-modal-body">
          {servers.length === 0 ? (
            <p className="settings-item-description">All servers are already in this group.</p>
          ) : (
            <ul className="add-servers-modal-list">
              {servers.map((row) => (
                <li key={row.id} className="add-servers-modal-row">
                  <div className="add-servers-modal-meta">
                    <strong>{row.name}</strong>
                    <span>{row.currentGroupName ? `In ${row.currentGroupName}` : "Ungrouped"}</span>
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => onAdd(row.id)}
                  >
                    {row.currentGroupName ? "Move" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
