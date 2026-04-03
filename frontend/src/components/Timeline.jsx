import { useRef, useEffect } from 'react';

export default function Timeline({ segments = [], duration = 60, currentTime = 0, zoom = 1, onSeek }) {
    const bodyRef = useRef(null);
    const pixelsPerSecond = 8 * zoom;
    const totalWidth = Math.max(duration * pixelsPerSecond, 600);

    // Generate time ticks
    const tickInterval = zoom >= 2 ? 5 : zoom >= 1 ? 10 : 30;
    const ticks = [];
    for (let t = 0; t <= duration; t += tickInterval) {
        ticks.push(t);
    }

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Group segments by track type
    const videoSegments = segments.filter(s => s.type === 'video');
    const brollSegments = segments.filter(s => s.type === 'broll');
    const audioSegments = segments.filter(s => s.type === 'audio');
    const subtitleSegments = segments.filter(s => s.type === 'subtitle');

    const handleTrackClick = (e, trackEl) => {
        if (!onSeek) return;
        const rect = trackEl.getBoundingClientRect();
        const x = e.clientX - rect.left + (bodyRef.current?.scrollLeft || 0) - 100; // offset for label
        const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
        onSeek(time);
    };

    const renderSegments = (segs, type) => segs.map((seg, i) => (
        <div
            key={`${type}-${i}`}
            className={`timeline-segment ${type}`}
            style={{
                left: seg.start * pixelsPerSecond,
                width: Math.max((seg.end - seg.start) * pixelsPerSecond, 20),
            }}
            title={seg.label || `${formatTime(seg.start)} → ${formatTime(seg.end)}`}
        >
            {seg.label || `${formatTime(seg.start)}`}
        </div>
    ));

    return (
        <div className="timeline-panel">
            <div className="timeline-header">
                <span>🎬 Timeline</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {segments.length} element • {formatTime(duration)}
                </span>
                <div className="zoom-controls">
                    <button className="zoom-btn" title="Zoom out">−</button>
                    <button className="zoom-btn" title="Zoom in">+</button>
                </div>
            </div>

            <div className="timeline-body" ref={bodyRef}>
                {/* Time ruler */}
                <div className="time-ruler" style={{ width: totalWidth + 100 }}>
                    {ticks.map(t => (
                        <div key={t} className="time-tick" style={{ left: t * pixelsPerSecond + 100 }}>
                            {formatTime(t)}
                        </div>
                    ))}
                </div>

                {/* Tracks */}
                <div className="timeline-tracks" style={{ width: totalWidth + 100 }}>
                    {/* Main video track */}
                    <div className="timeline-track">
                        <div className="track-label">🎬 Video</div>
                        <div className="track-content" onClick={e => handleTrackClick(e, e.currentTarget)}>
                            {renderSegments(videoSegments, 'video')}
                        </div>
                    </div>

                    {/* B-roll track */}
                    <div className="timeline-track">
                        <div className="track-label">🎞️ B-Roll</div>
                        <div className="track-content">
                            {renderSegments(brollSegments, 'broll')}
                        </div>
                    </div>

                    {/* Audio/SFX track */}
                    <div className="timeline-track">
                        <div className="track-label">🔊 Audio</div>
                        <div className="track-content">
                            {renderSegments(audioSegments, 'audio')}
                        </div>
                    </div>

                    {/* Subtitle track */}
                    <div className="timeline-track">
                        <div className="track-label">📝 Altyazı</div>
                        <div className="track-content">
                            {renderSegments(subtitleSegments, 'subtitle')}
                        </div>
                    </div>

                    {/* Playhead */}
                    <div className="playhead" style={{ left: currentTime * pixelsPerSecond + 100 }}></div>
                </div>
            </div>
        </div>
    );
}
