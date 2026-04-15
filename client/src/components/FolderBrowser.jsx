import { useState } from 'react';

// format bytes to human readable
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
}

export default function FolderBrowser({
  folders,
  images,
  folderSizes,
  loading,
  currentFolder,
  onOpenFolder,
  onDeleteFolder,
  onDeleteImage,
}) {
  const [previewImage, setPreviewImage] = useState(null);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  const hasFolders = folders.length > 0;
  const hasImages = images.length > 0;

  if (!hasFolders && !hasImages) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📁</div>
        <p className="empty-state-text">
          {currentFolder ? 'This folder is empty' : 'No files yet'}
        </p>
        <p className="empty-state-hint">
          {currentFolder
            ? 'Upload images or create subfolders to get started'
            : 'Create a folder to start organizing your files'}
        </p>
      </div>
    );
  }

  return (
    <>
      {hasFolders && (
        <div style={{ marginBottom: hasImages ? 32 : 0 }}>
          <p className="section-label">Folders</p>
          <div className="file-grid">
            {folders.map((folder) => (
              <div
                key={folder._id}
                className="folder-card"
                onClick={() => onOpenFolder(folder._id)}
              >
                <div className="folder-card-header">
                  <span className="folder-icon">📁</span>
                  <div className="folder-card-actions">
                    <button
                      className="btn-icon"
                      title="Delete folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder._id);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="folder-card-name">{folder.name}</p>
                <p className="folder-card-size">
                  {folderSizes[folder._id] !== undefined
                    ? formatSize(folderSizes[folder._id])
                    : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasImages && (
        <div>
          <p className="section-label">Images</p>
          <div className="file-grid">
            {images.map((image) => (
              <div
                key={image._id}
                className="image-card"
                onClick={() => setPreviewImage(image)}
              >
                <img
                  className="image-card-preview"
                  src={`/uploads/${image.filename}`}
                  alt={image.name}
                  loading="lazy"
                />
                <div className="image-card-info">
                  <p className="image-card-name">{image.name}</p>
                  <p className="image-card-size">{formatSize(image.size)}</p>
                </div>
                <div className="image-card-actions">
                  <button
                    className="btn-icon"
                    title="Delete image"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage(image._id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewImage && (
        <div className="preview-overlay" onClick={() => setPreviewImage(null)}>
          <button
            className="btn-icon preview-close"
            onClick={() => setPreviewImage(null)}
            style={{ color: '#fff' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            className="preview-image"
            src={`/uploads/${previewImage.filename}`}
            alt={previewImage.name}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
