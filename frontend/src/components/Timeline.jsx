import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Pro Timeline component with drag, resize, split, snap, zoom
 * Segments come from parent (Editor.jsx)
 * onSegmentChange(id, updates) — when user drags/resizes
 * onSegmentSelect(segment) — when user clicks segment
 * onSplit(segmentId, time) — when user splits at playhead
 * onSegmentDelete(segmentId) — when user deletes
 */
export default function Timeline({
    segments = [],
    duration = 60,
    currentTime = 0,
    onSeek,
    onSegmentChange,
    onSegmentSelect,
    onSplit,
    onSegmentDelete,
    selectedSegmentId = null,
}) {
    const [zoom, setZoom] = useState(1);
    const [dragState, setDragState] = useState(null); // { segId, mode: 'move'|'resize-left'|'resize-right', startX, origStart, origEnd }
    const bodyRef = useRef(null);
    const trackRef = useRef(null);

    const LABEL_WIDTH = 90;
    const pixelsPerSecond = 12 * zoom;
    const totalWidth = Math.max(duration * pixelsPerSecond, 600);
    const SNAP_THRESHOLD = 0.5; // seconds
    const MIN_DURATION = 0.5; // minimum segment duration in seconds

    // ─── Track config ──────────────────────
    const trackDefs = [
        { key: 'video', icon: '🎬', label: 'Video', color: 'var(--accent)' },
        { key: 'broll', icon: '🎞️', label: 'B-Roll', color: '#8b5cf6' },
        { key: 'audio', icon: '🔊', label: 'Audio', color: '#f59e0b' },
        { key: 'subtitle', icon: '📝', label: 'Altyazı', color: '#10b981' },
    ];

    // ─── Helpers ──────────────────────
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 100);
        return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const xToTime = useCallback((clientX) => {
        if (!trackRef.current) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        const scrollLeft = bodyRef.current?.scrollLeft || 0;
        const x = clientX - rect.left + scrollLeft;
        return Math.max(0, Math.min(duration, x / pixelsPerSecond));
    }, [duration, pixelsPerSecond]);

    // ─── Snap to edges of other segments ──────────────────────
    const snapTime = useCallback((time, excludeId) => {
        const edges = [];
        segments.forEach(seg => {
            if (seg.id === excludeId) return;
            edges.push(seg.start, seg.end);
        });
        edges.push(0, duration); // snap to start/end of timeline

        for (const edge of edges) {
            if (Math.abs(time - edge) < SNAP_THRESHOLD) {
                return edge;
            }
        }
        return time;
    }, [segments, duration]);

    // ─── Tick marks ──────────────────────
    const tickInterval = zoom >= 3 ? 2 : zoom >= 2 ? 5 : zoom >= 1 ? 10 : 30;
    const ticks = [];
    for (let t = 0; t <= duration; t += tickInterval) ticks.push(t);

    // ─── Mouse handlers for drag/resize ──────────────────────
    const handleSegmentMouseDown = (e, seg, mode) => {
        e.stopPropagation();
        e.preventDefault();
        if (onSegmentSelect) onSegmentSelect(seg);

        setDragState({
            segId: seg.id,
            mode,
            startX: e.clientX,
            origStart: seg.start,
            origEnd: seg.end,
        });
    };

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e) => {
            const deltaPx = e.clientX - dragState.startX;
            const deltaTime = deltaPx / pixelsPerSecond;
            const seg = segments.find(s => s.id === dragState.segId);
            if (!seg || !onSegmentChange) return;

            let newStart = seg.start;
            let newEnd = seg.end;

            if (dragState.mode === 'move') {
                const segDuration = dragState.origEnd - dragState.origStart;
                newStart = Math.max(0, dragState.origStart + deltaTime);
                newEnd = newStart + segDuration;
                if (newEnd > duration) {
                    newEnd = duration;
                    newStart = newEnd - segDuration;
                }
                newStart = snapTime(newStart, dragState.segId);
                newEnd = newStart + segDuration;
            } else if (dragState.mode === 'resize-left') {
                newStart = Math.max(0, dragState.origStart + deltaTime);
                newStart = snapTime(newStart, dragState.segId);
                if (newStart >= dragState.origEnd - MIN_DURATION) {
                    newStart = dragState.origEnd - MIN_DURATION;
                }
                newEnd = dragState.origEnd;
            } else if (dragState.mode === 'resize-right') {
                newEnd = Math.min(duration, dragState.origEnd + deltaTime);
                newEnd = snapTime(newEnd, dragState.segId);
                if (newEnd <= dragState.origStart + MIN_DURATION) {
                    newEnd = dragState.origStart + MIN_DURATION;
                }
                newStart = dragState.origStart;
            }

            onSegmentChange(dragState.segId, { start: newStart, end: newEnd });
        };

        const handleMouseUp = () => {
            setDragState(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, pixelsPerSecond, duration, segments, onSegmentChange, snapTime]);

    // ─── Playhead drag ──────────────────────
    const [draggingPlayhead, setDraggingPlayhead] = useState(false);

    const handlePlayheadMouseDown = (e) => {
        e.stopPropagation();
        setDraggingPlayhead(true);
    };

    useEffect(() => {
        if (!draggingPlayhead) return;
        const handleMove = (e) => {
            const t = xToTime(e.clientX);
            if (onSeek) onSeek(t);
        };
        const handleUp = () => setDraggingPlayhead(false);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [draggingPlayhead, xToTime, onSeek]);

    // ─── Click on empty track area → seek ──────────────────────
    const handleTrackClick = (e) => {
        if (dragState) return;
        const t = xToTime(e.clientX);
        if (onSeek) onSeek(t);
    };

    // ─── Render segment ──────────────────────
    const renderSegment = (seg, trackColor) => {
        const isSelected = seg.id === selectedSegmentId;
        const left = seg.start * pixelsPerSecond;
        const width = Math.max((seg.end - seg.start) * pixelsPerSecond, 20);
        const isDragging = dragState?.segId === seg.id;

        return (
            <div
                key={seg.id}
                className={`tl-segment ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                    left,
                    width,
                    '--seg-color': trackColor,
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, seg, 'move')}
                onDoubleClick={() => onSegmentSelect?.(seg)}
                title={`${seg.label}\n${formatTime(seg.start)} → ${formatTime(seg.end)}`}
            >
                {/* Left resize handle */}
                <div
                    className="tl-resize-handle left"
                    onMouseDown={(e) => handleSegmentMouseDown(e, seg, 'resize-left')}
                />

                {/* Segment content */}
                <div className="tl-segment-label">{seg.label}</div>

                {/* Right resize handle */}
                <div
                    className="tl-resize-handle right"
                    onMouseDown={(e) => handleSegmentMouseDown(e, seg, 'resize-right')}
                />
            </div>
        );
    };

    // ─── Group segments by track ──────────────────────
    const groupedSegments = {};
    trackDefs.forEach(t => { groupedSegments[t.key] = []; });
    segments.forEach(seg => {
        if (groupedSegments[seg.type]) groupedSegments[seg.type].push(seg);
    });

    return (
        <div className="tl-panel">
            {/* Timeline toolbar */}
            <div className="tl-toolbar">
                <div className="tl-toolbar-left">
                    <span className="tl-info">
                        {segments.length} element • {formatTime(duration)}
                    </span>
                </div>
                <div className="tl-toolbar-right">
                    <button
                        className="tl-tool-btn"
                        title="Zoom out"
                        onClick={() => setZoom(z => Math.max(0.25, z / 1.5))}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <input
                        type="range"
                        className="tl-zoom-slider"
                        min="0.25"
                        max="5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        title={`Zoom: ${Math.round(zoom * 100)}%`}
                    />
                    <button
                        className="tl-tool-btn"
                        title="Zoom in"
                        onClick={() => setZoom(z => Math.min(5, z * 1.5))}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                </div>
            </div>

            {/* Timeline body */}
            <div className="tl-body" ref={bodyRef}>
                {/* Time ruler */}
                <div className="tl-ruler" style={{ width: totalWidth, marginLeft: LABEL_WIDTH }}>
                    {ticks.map(t => (
                        <div key={t} className="tl-tick" style={{ left: t * pixelsPerSecond }}>
                            <span>{formatTime(t).replace(/\.\d+/, '')}</span>
                        </div>
                    ))}
                </div>

                {/* Tracks */}
                <div className="tl-tracks" ref={trackRef}>
                    {trackDefs.map(track => (
                        <div key={track.key} className="tl-track">
                            <div className="tl-track-label">
                                <span className="tl-track-icon">{track.icon}</span>
                                <span>{track.label}</span>
                            </div>
                            <div
                                className="tl-track-content"
                                style={{ width: totalWidth }}
                                onClick={handleTrackClick}
                            >
                                {groupedSegments[track.key].map(seg => renderSegment(seg, track.color))}
                            </div>
                        </div>
                    ))}

                    {/* Playhead */}
                    <div
                        className={`tl-playhead ${draggingPlayhead ? 'dragging' : ''}`}
                        style={{ left: currentTime * pixelsPerSecond + LABEL_WIDTH }}
                        onMouseDown={handlePlayheadMouseDown}
                    >
                        <div className="tl-playhead-handle" />
                        <div className="tl-playhead-line" />
                    </div>
                </div>
            </div>
        </div>
    );
}
