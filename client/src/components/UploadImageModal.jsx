import { useState, useRef } from 'react';
import axios from 'axios';

export default function UploadImageModal({ folder, onUploaded, onClose }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setError('');

    // auto-fill name from filename if empty
    if (!name) {
      const baseName = selected.name.replace(/\.[^/.]+$/, '');
      setName(baseName);
    }

    // show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name.trim());
    formData.append('folder', folder);

    try {
      await axios.post('/api/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Upload Image</h3>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* File picker zone */}
          <div
            className="upload-zone"
            onClick={() => fileRef.current?.click()}
            style={{ marginBottom: 16 }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 160,
                  borderRadius: 6,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>🖼️</div>
                <p className="upload-zone-text">Click to select an image</p>
                <p className="upload-zone-hint">JPG, PNG, GIF, WebP — max 10MB</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="image-name">Image name</label>
            <input
              id="image-name"
              className="form-input"
              type="text"
              placeholder="e.g. Hero Banner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {uploading && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                height: 4,
                background: 'var(--bg-elevated)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 200ms',
                }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Uploading... {progress}%
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={uploading || !file || !name.trim()}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
