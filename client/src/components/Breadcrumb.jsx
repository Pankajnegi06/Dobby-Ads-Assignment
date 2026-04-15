export default function Breadcrumb({ items, onNavigate, onNavigateRoot }) {
  return (
    <nav className="breadcrumb">
      <button
        className={`breadcrumb-item ${items.length === 0 ? 'current' : ''}`}
        onClick={onNavigateRoot}
      >
        All Files
      </button>

      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="breadcrumb-sep">/</span>
            <button
              className={`breadcrumb-item ${isLast ? 'current' : ''}`}
              onClick={() => !isLast && onNavigate(item._id)}
            >
              {item.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
