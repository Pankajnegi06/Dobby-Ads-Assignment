import { useState } from 'react';
import axios from 'axios';

export default function CreateFolderModal({ parentFolder, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setSubmitting(true);
    try {
      await axios.post('/api/folders', {
        name: name.trim(),
        parent: parentFolder || null,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder');
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">New Folder</h3>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="folder-name">Folder name</label>
            <input
              id="folder-name"
              className="form-input"
              type="text"
              placeholder="e.g. Project Assets"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
