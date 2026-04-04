import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  TwickStudio,
  DEFAULT_STUDIO_CONFIG,
  TimelineProvider,
  LivePlayerProvider,
  INITIAL_TIMELINE_DATA,
  generateId,
} from '@twick/studio';
import '@twick/studio/dist/studio.css';
import ChatPanel from '../components/ChatPanel';

export default function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [twickKey, setTwickKey] = useState(0);

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (err) {
      setLoadError('Layihə tapılmadı');
    }
  };

  // Convert project data to Twick ProjectJSON format
  const buildTwickProject = useCallback(() => {
    if (!project) return { ...INITIAL_TIMELINE_DATA, version: 0 };

    const tracks = [];
    const videoUrl = project.source_url?.startsWith('/')
      ? `${window.location.protocol}//${window.location.host}${project.source_url}`
      : project.source_url;

    // Main video track
    if (videoUrl) {
      tracks.push({
        id: generateId(),
        name: 'Video',
        type: 'video',
        elements: [{
          id: generateId(),
          type: 'video',
          name: project.title || 'Main Video',
          url: videoUrl,
          startTime: 0,
          endTime: project.duration || 37,
          duration: project.duration || 37,
          volume: 1,
          position: { x: 0, y: 0 },
          size: { width: 1080, height: 1920 },
          objectFit: 'contain',
          trim: { startTime: 0, endTime: project.duration || 37 },
        }],
      });
    }

    // B-Roll track
    if (project.clips?.length > 0) {
      const brollElements = [];
      project.clips.forEach(clip => {
        if (clip.broll_items?.length > 0) {
          clip.broll_items.forEach((broll, bi) => {
            const start = (clip.trim_start || 0) + bi * 5;
            brollElements.push({
              id: generateId(),
              type: broll.type === 'image' ? 'image' : 'video',
              name: `B-Roll: ${broll.keyword || 'footage'}`,
              url: broll.src,
              startTime: start,
              endTime: start + 5,
              duration: 5,
              volume: 0,
              position: { x: 0, y: 0 },
              size: { width: 1080, height: 1920 },
              objectFit: 'cover',
            });
          });
        }
      });
      if (brollElements.length > 0) {
        tracks.push({
          id: generateId(),
          name: 'B-Roll',
          type: 'video',
          elements: brollElements,
        });
      }
    }

    return {
      version: 0,
      videoProps: { width: 1080, height: 1920 },
      tracks,
    };
  }, [project, projectId]);

  const handleProjectUpdate = useCallback((updatedProject) => {
    setProject(updatedProject);
    setTwickKey(k => k + 1);
  }, []);

  const studioConfig = {
    ...DEFAULT_STUDIO_CONFIG,
    videoProps: { width: 1080, height: 1920 },
    loadProject: async () => buildTwickProject(),
    saveProject: async (projectData, fileName) => {
      console.log('Project saved:', projectData);
      return { status: true, message: 'Saved' };
    },
    hiddenTools: ['record'],
  };

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <h2>❌ {loadError}</h2>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
        <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Yüklənir...</span>
      </div>
    );
  }

  const initialData = buildTwickProject();

  return (
    <div className="editor-layout">
      {/* LEFT: Twick Studio Editor */}
      <div className="editor-main twick-wrapper">
        <TimelineProvider initialData={initialData}>
          <LivePlayerProvider>
            <TwickStudio key={twickKey} studioConfig={studioConfig} />
          </LivePlayerProvider>
        </TimelineProvider>
      </div>

      {/* RIGHT: AI Chat */}
      <ChatPanel
        project={project}
        onProjectUpdate={handleProjectUpdate}
      />
    </div>
  );
}
