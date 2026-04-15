import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Breadcrumb from '../components/Breadcrumb';
import FolderBrowser from '../components/FolderBrowser';
import CreateFolderModal from '../components/CreateFolderModal';
import UploadImageModal from '../components/UploadImageModal';

export default function Dashboard() {
  const { user } = useAuth();
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [folderSizes, setFolderSizes] = useState({});
  const [loading, setLoading] = useState(false);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadImage, setShowUploadImage] = useState(false);

  // fetch folders and images for the current directory
  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const parentQuery = currentFolder || '';
      const [foldersRes, imagesRes] = await Promise.all([
        axios.get(`/api/folders?parent=${parentQuery}`),
        currentFolder ? axios.get(`/api/images?folder=${currentFolder}`) : Promise.resolve({ data: [] }),
      ]);
      setFolders(foldersRes.data);
      setImages(imagesRes.data);

      // fetch sizes for each folder
      const sizes = {};
      await Promise.all(
        foldersRes.data.map(async (f) => {
          try {
            const sizeRes = await axios.get(`/api/folders/${f._id}/size`);
            sizes[f._id] = sizeRes.data.size;
          } catch {
            sizes[f._id] = 0;
          }
        })
      );
      setFolderSizes(sizes);
    } catch (err) {
      console.error('Failed to load contents:', err);
    }
    setLoading(false);
  }, [currentFolder]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // fetch breadcrumb when navigating into a folder
  useEffect(() => {
    async function loadBreadcrumb() {
      if (!currentFolder) {
        setBreadcrumb([]);
        return;
      }
      try {
        const res = await axios.get(`/api/folders/${currentFolder}/path`);
        setBreadcrumb(res.data);
      } catch {
        setBreadcrumb([]);
      }
    }
    loadBreadcrumb();
  }, [currentFolder]);

  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
  };

  const navigateToRoot = () => {
    setCurrentFolder(null);
  };

  const handleFolderCreated = () => {
    setShowCreateFolder(false);
    fetchContents();
  };

  const handleImageUploaded = () => {
    setShowUploadImage(false);
    fetchContents();
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder and all its contents?')) return;
    try {
      await axios.delete(`/api/folders/${folderId}`);
      fetchContents();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await axios.delete(`/api/images/${imageId}`);
      fetchContents();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="dashboard">
      <Sidebar user={user} onNavigateRoot={navigateToRoot} isRoot={!currentFolder} />
      <main className="main-content">
        <Breadcrumb
          items={breadcrumb}
          onNavigate={navigateToFolder}
          onNavigateRoot={navigateToRoot}
        />

        <div className="action-bar">
          <div className="action-bar-left">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {currentFolder ? breadcrumb[breadcrumb.length - 1]?.name || 'Folder' : 'All Files'}
            </h2>
          </div>
          <div className="action-bar-right">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateFolder(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Folder
            </button>
            {currentFolder && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowUploadImage(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>
            )}
          </div>
        </div>

        <FolderBrowser
          folders={folders}
          images={images}
          folderSizes={folderSizes}
          loading={loading}
          currentFolder={currentFolder}
          onOpenFolder={navigateToFolder}
          onDeleteFolder={handleDeleteFolder}
          onDeleteImage={handleDeleteImage}
        />
      </main>

      {showCreateFolder && (
        <CreateFolderModal
          parentFolder={currentFolder}
          onCreated={handleFolderCreated}
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {showUploadImage && currentFolder && (
        <UploadImageModal
          folder={currentFolder}
          onUploaded={handleImageUploaded}
          onClose={() => setShowUploadImage(false)}
        />
      )}
    </div>
  );
}
