export interface PatternSummary {
  id: string;
  name: string;
  bars: number;
  detail: string;
  inUse: boolean;
}

export function PatternList({ items, emptyHint, onNew, onOpen, onDuplicate, onDelete }: {
  items: PatternSummary[];
  emptyHint: string;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="pattern-list">
      {items.length === 0 && <p className="empty-hint">{emptyHint}</p>}
      {items.map((p) => (
        <div key={p.id} className="pattern-card">
          <button className="pattern-main" onClick={() => onOpen(p.id)}>
            <span className="pattern-name">{p.name}</span>
            <span className="pattern-detail">
              {p.bars} bar{p.bars > 1 ? 's' : ''} · {p.detail}
            </span>
          </button>
          <div className="pattern-actions">
            <button className="btn icon" title="Duplicate" onClick={() => onDuplicate(p.id)}>⧉</button>
            <button
              className="btn icon danger"
              title="Delete"
              onClick={() => {
                if (
                  !p.inUse ||
                  window.confirm(`"${p.name}" is used in the song. Deleting it also removes it from the arrangement. Delete?`)
                ) {
                  onDelete(p.id);
                }
              }}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
      <button className="btn primary wide" onClick={onNew}>+ New pattern</button>
    </div>
  );
}
