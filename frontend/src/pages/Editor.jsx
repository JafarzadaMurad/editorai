import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Timeline from '../components/Timeline';
import ChatPanel from '../components/ChatPanel';

export default function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(60);
  const videoRef = useRef(null);
  const brollVideoRef = useRef(null);

  // Load project
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

  // Sync video time with timeline
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 60);
    }
  };

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Build B-roll time ranges from clips
  const brollRanges = useMemo(() => {
    if (!project?.clips?.length) return [];
    const ranges = [];
    project.clips.forEach(clip => {
      if (clip.broll_items?.length > 0) {
        clip.broll_items.forEach((broll, bi) => {
          ranges.push({
            start: (clip.trim_start || 0) + bi * 5,
            end: (clip.trim_start || 0) + (bi + 1) * 5,
            src: broll.src,
            type: broll.type || 'video',
            thumbnail: broll.thumbnail,
            keyword: broll.keyword,
          });
        });
      }
    });
    return ranges;
  }, [project?.clips]);

  // Find active B-roll for current time
  const activeBroll = useMemo(() => {
    return brollRanges.find(r => currentTime >= r.start && currentTime < r.end) || null;
  }, [brollRanges, currentTime]);

  // Sync broll video play/pause with main video
  useEffect(() => {
    if (brollVideoRef.current) {
      if (isPlaying && activeBroll?.type === 'video') {
        brollVideoRef.current.play().catch(() => { });
      } else {
        brollVideoRef.current.pause();
      }
    }
  }, [isPlaying, activeBroll]);

  // Build timeline segments from project data
  const buildSegments = () => {
    const segments = [];

    // Main video segment
    if (project?.source_url) {
      segments.push({
        type: 'video',
        start: 0,
        end: duration,
        label: project.title || 'Main Video',
      });
    }

    // Clips as video segments (if split)
    if (project?.clips?.length > 0) {
      const clipSegments = project.clips.map(clip => ({
        type: 'video',
        start: clip.trim_start || 0,
        end: clip.trim_end || 10,
        label: `#${clip.order} ${clip.title}`,
      }));

      // B-roll segments
      project.clips.forEach(clip => {
        if (clip.broll_items?.length > 0) {
          clip.broll_items.forEach((broll, bi) => {
            segments.push({
              type: 'broll',
              start: (clip.trim_start || 0) + bi * 5,
              end: (clip.trim_start || 0) + (bi + 1) * 5,
              label: broll.keyword || 'B-Roll',
            });
          });
        }
      });

      // Sound effects
      project.clips.forEach(clip => {
        if (clip.sound_effects?.length > 0) {
          clip.sound_effects.forEach(sfx => {
            segments.push({
              type: 'audio',
              start: clip.trim_start || 0,
              end: (clip.trim_start || 0) + (sfx.duration || 3),
              label: sfx.name || 'SFX',
            });
          });
        }
      });

      return [...clipSegments, ...segments];
    }

    return segments;
  };

  const handleProjectUpdate = (updatedProject, result) => {
    setProject(updatedProject);
  };

  // Error state
  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <h2>❌ {loadError}</h2>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      {/* LEFT: Video + Timeline */}
      <div className="editor-main">
        {/* Video Preview */}
        <div className="video-preview">
          {project?.source_url ? (
            <>
              <video
                ref={videoRef}
                src={project.source_url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleVideoLoaded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ opacity: activeBroll ? 0.3 : 1, transition: 'opacity 0.4s ease' }}
              />
              {/* B-Roll Overlay */}
              {activeBroll && (
                <div className="broll-overlay">
                  {activeBroll.type === 'video' ? (
                    <video
                      ref={brollVideoRef}
                      src={activeBroll.src}
                      muted
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : (
                    <img src={activeBroll.src} alt="B-Roll" />
                  )}
                  <div className="broll-badge">🎞️ B-Roll: {activeBroll.keyword}</div>
                </div>
              )}
            </>
          ) : (
            <div className="video-preview-empty">
              <span>🎬</span>
              <p>Video yüklənir...</p>
            </div>
          )}
        </div>

        {/* Video Toolbar */}
        <div className="video-toolbar">
          <button className="toolbar-btn play-btn" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <div className="toolbar-sep"></div>
          <button className="toolbar-btn" title="Kəs">✂️</button>
          <button className="toolbar-btn" title="Geri al">↩</button>
          <button className="toolbar-btn" title="İrəli">↪</button>
          <div className="toolbar-sep"></div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project?.title}</span>
          {project && (
            <span className={`status-badge ${project.status}`} style={{ marginLeft: 'auto' }}>
              {project.status === 'uploaded' ? '📤 Yükləndi' :
                project.status === 'clips_ready' ? '🎬 Hazır' :
                  project.status === 'done' ? '✅ Tamamlandı' :
                    project.status}
            </span>
          )}
        </div>

        {/* Timeline */}
        <Timeline
          segments={buildSegments()}
          duration={duration}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      </div>

      {/* RIGHT: AI Chat */}
      <ChatPanel
        project={project}
        onProjectUpdate={handleProjectUpdate}
      />
    </div>
  );
}
