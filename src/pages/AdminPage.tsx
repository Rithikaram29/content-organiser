import { useState } from "react";
import { supabase } from "../data/supabaseClient";

export function AdminPage() {
  const [keepDays, setKeepDays] = useState(120);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function runCleanup() {
    setLoading(true);
    setResult("Running cleanup...");
    const { data, error } = await supabase.rpc("cleanup_old_content", { keep_days: keepDays });
    setLoading(false);
    if (error) {
      setResult(`Error: ${error.message}`);
      return;
    }
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className="admin-container">
      <div className="page-header">
        <h1 className="page-title">Admin Settings</h1>
        <p className="page-subtitle">System administration and maintenance</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Database Cleanup</h3>
        </div>
        <div className="card-body">
          <div className="admin-warning">
            <svg className="admin-warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="admin-warning-text">
              This action will permanently delete content items older than the specified number of days.
              Associated assets and comments will be deleted as well (cascade). Drive files remain untouched.
            </p>
          </div>

          <div className="admin-form">
            <div className="form-group">
              <label htmlFor="keepDays">Keep content newer than (days)</label>
              <input
                id="keepDays"
                type="number"
                value={keepDays}
                onChange={(e) => setKeepDays(Number(e.target.value))}
                min={30}
                max={365}
              />
            </div>
            <button onClick={runCleanup} disabled={loading} className="btn-danger">
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: 16, height: 16 }}></span>
                  Running...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Run Cleanup
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="admin-result">
              <div className="admin-result-label">Result:</div>
              <pre>{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
