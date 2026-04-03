import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [creating, setCreating] = useState(false);
    const [uploadMode, setUploadMode] = useState('file');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => { loadProjects(); }, []);

    const loadProjects = async () => {
        try {
            const data = await api.listProjects();
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const createProject = async (e) => {
        e.preventDefault();
        if (uploadMode === 'url' && !newUrl) return;
        if (uploadMode === 'file' && !selectedFile) return;
        setCreating(true);
        try {
            let result;
            if (uploadMode === 'file' && selectedFile) {
                result = await api.createProjectWithFile(selectedFile, newTitle || null);
            } else {
                result = await api.createProject(newUrl, newTitle || null);
            }
            navigate(`/editor/${result.project?.id || result.id}`);
        } catch (err) { alert('Xəta: ' + err.message); }
        setCreating(false);
    };

    const handleFileSelect = (file) => {
        if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
            setSelectedFile(file);
            setUploadMode('file');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const statusLabels = {
        uploaded: '📤 Yükləndi',
        transcribing: '📝 Transkripsiya',
        analyzing: '🤖 Analiz',
        clips_ready: '🎬 Hazır',
        rendering: '🔄 Render',
        done: '✅ Tamamlandı',
        failed: '❌ Xəta',
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} dəq əvvəl`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} saat əvvəl`;
        const days = Math.floor(hours / 24);
        return `${days} gün əvvəl`;
    };

    return (
        <div className="page-content">
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="dash-section-title" style={{ margin: 0 }}>Recent Projects</h2>
                <button className="btn-primary" onClick={() => setShowNew(!showNew)}>+ Yeni Layihə</button>
            </div>

            {/* New Project Panel */}
            {showNew && (
                <div className="new-project-panel">
                    <div className="upload-tabs">
                        <button className={`upload-tab ${uploadMode === 'file' ? 'active' : ''}`} onClick={() => setUploadMode('file')}>📤 Fayl Yüklə</button>
                        <button className={`upload-tab ${uploadMode === 'url' ? 'active' : ''}`} onClick={() => setUploadMode('url')}>🔗 URL</button>
                    </div>
                    <form onSubmit={createProject}>
                        <input type="text" placeholder="Layihə adı (istəyə bağlı)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="form-input" style={{ marginBottom: 12 }} />
                        {uploadMode === 'file' ? (
                            <div className={`upload-drop-zone ${dragOver ? 'dragover' : ''} ${selectedFile ? 'has-file' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}>
                                <input ref={fileInputRef} type="file" accept="video/*,audio/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
                                {selectedFile ? (
                                    <div className="selected-file">
                                        <span className="file-icon">🎬</span>
                                        <div className="file-info">
                                            <span className="file-name">{selectedFile.name}</span>
                                            <span className="file-size">{formatSize(selectedFile.size)}</span>
                                        </div>
                                        <button type="button" className="file-remove" onClick={e => { e.stopPropagation(); setSelectedFile(null); }}>✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="drop-icon">📤</div>
                                        <p className="drop-text">Video faylını bura sürükləyin</p>
                                        <p className="drop-hint">və ya klikləyib seçin (MP4, MOV, WebM, AVI)</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <input type="url" placeholder="https://example.com/video.mp4" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="form-input" style={{ marginBottom: 12 }} />
                        )}
                        <button type="submit" className="btn-primary btn-full" disabled={creating || (uploadMode === 'file' ? !selectedFile : !newUrl)}>
                            {creating ? '⏳ Yüklənir...' : '🚀 Layihəni Başla'}
                        </button>
                    </form>
                </div>
            )}

            {/* Projects Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Yüklənir...</p>
                </div>
            ) : projects.length === 0 ? (
                <div className="dash-empty">
                    <div className="empty-icon">📹</div>
                    <h3>Hələ layihəniz yoxdur</h3>
                    <p>İlk video layihənizi yaradın və AI ilə montaj edin</p>
                    <button className="btn-primary" onClick={() => setShowNew(true)}>+ Yeni Layihə Yarat</button>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map(p => (
                        <div key={p.id} className="project-card" onClick={() => navigate(`/editor/${p.id}`)}>
                            <div className="project-card-thumb">
                                <span className="thumb-label">Project {p.id}</span>
                            </div>
                            <div className="project-card-body">
                                <h3>{p.title}</h3>
                                <div className="meta">
                                    <span>{statusLabels[p.status] || p.status}</span>
                                    <span>•</span>
                                    <span>{timeAgo(p.updated_at || p.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
