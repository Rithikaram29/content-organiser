import { useParams, Link } from "react-router-dom";

export function ItemDetailPage() {
  const { id } = useParams();

  return (
    <div className="item-detail-container">
      <div className="item-detail-header">
        <Link to="/backlog" className="item-detail-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Backlog
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="item-detail-placeholder">
            <svg className="item-detail-placeholder-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h3 className="item-detail-placeholder-title">Content Item Details</h3>
            <p className="item-detail-placeholder-text">
              Item ID: <code>{id}</code>
            </p>
            <p className="item-detail-placeholder-hint">
              This page will display the full details of the content item including title, description, platform, stage, scheduled date, and associated assets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
