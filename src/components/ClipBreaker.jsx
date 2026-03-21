import { useState, useRef, useCallback, useEffect } from "react";

const VIEWS = { STRIP: "strip", VERTICAL: "vertical", GRID: "grid" };

// FIXED: Icons with actual SVG paths
const IconFilm = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>
);

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

const IconStrip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
);

const IconVertical = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M21 9H3"/></svg>
);

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
);

function computeDiff(a, b) {
  const len = a.data.length;
  let totalDiff = 0;
  for (let i = 0; i < len; i += 64) {
    totalDiff += Math.abs(a.data[i] - b.data[i]);
    totalDiff += Math.abs(a.data[i + 1] - b.data[i + 1]);
    totalDiff += Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return totalDiff / (Math.floor(len / 64) * 3);
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00.0";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

function extractFramesInterval(video, canvas, ctx, intervalSec, quality) {
  return new Promise((resolve) => {
    const frames = [];
    const duration = video.duration;
    let currentTime = 0;
    const handleSeeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ time: currentTime, src: canvas.toDataURL("image/webp", quality) });
      currentTime += intervalSec;
      if (currentTime <= duration) {
        video.currentTime = currentTime;
      } else {
        video.onseeked = null;
        resolve(frames);
      }
    };
    video.onseeked = handleSeeked;
    video.currentTime = 0;
  });
}

function extractFramesSceneDetect(video, canvas, ctx, threshold, quality) {
  return new Promise((resolve) => {
    const frames = [];
    const duration = video.duration;
    const step = 0.15;
    let currentTime = 0;
    let prevData = null;
    const handleSeeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (!prevData) {
        frames.push({ time: currentTime, src: canvas.toDataURL("image/webp", quality) });
        prevData = imgData;
      } else {
        const diff = computeDiff(prevData, imgData);
        if (diff > threshold) {
          frames.push({ time: currentTime, src: canvas.toDataURL("image/webp", quality) });
          prevData = imgData;
        }
      }
      currentTime += step;
      if (currentTime <= duration) {
        video.currentTime = currentTime;
      } else {
        video.currentTime = duration - 0.01;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const lastTime = parseFloat(duration.toFixed(2));
          if (!frames.find((f) => Math.abs(f.time - lastTime) < 0.2)) {
            frames.push({ time: lastTime, src: canvas.toDataURL("image/webp", quality) });
          }
          video.onseeked = null;
          resolve(frames);
        };
      }
    };
    video.onseeked = handleSeeked;
    video.currentTime = 0;
  });
}

export default function ClipBreaker() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [frames, setFrames] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [view, setView] = useState(VIEWS.STRIP);
  const [method, setMethod] = useState("interval");
  const [interval, setInterval_] = useState(1);
  const [sensitivity, setSensitivity] = useState(25);
  const [quality, setQuality] = useState(0.8);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (videoSrc) URL.revokeObjectURL(videoSrc); };
  }, [videoSrc]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    setFrames([]);
    setSelectedFrame(null);
    setProgress(0);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
    setDragging(false);
  }, [handleFile]);

  const processVideo = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < 2) {
      await new Promise((resolve) => { video.onloadedmetadata = resolve; });
    }
    const maxW = 640;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    setProcessing(true);
    setProgress(0);
    setFrames([]);
    setSelectedFrame(null);
    const updateProgress = () => {
      setProgress(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
    };
    video.addEventListener("timeupdate", updateProgress);
    try {
      let result;
      if (method === "interval") {
        result = await extractFramesInterval(video, canvas, ctx, interval, quality);
      } else {
        result = await extractFramesSceneDetect(video, canvas, ctx, sensitivity, quality);
      }
      setFrames(result);
      setProgress(100);
    } catch (err) {
      console.error("Frame extraction failed:", err);
      alert("Failed to process video. Try a shorter clip.");
    } finally {
      video.removeEventListener("timeupdate", updateProgress);
      setTimeout(() => setProcessing(false), 400);
    }
  }, [method, interval, sensitivity, quality]);

  const handleVideoLoaded = () => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration);
  };

  const styles = {
    root: { minHeight: "100vh", background: "#0a0a0f", color: "#e8e6e1", fontFamily: "'JetBrains Mono', monospace" },
    container: { maxWidth: 960, margin: "0 auto", padding: "32px 20px" },
    header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
    title: { fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #e8e6e1 0%, #a0d2db 50%, #5eead4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 },
    badge: { fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(94,234,212,0.1)", color: "#5eead4", border: "1px solid rgba(94,234,212,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 },
    dropzone: { border: "2px dashed #2a2a3a", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.01)" },
    controlsBar: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", padding: "20px 0", borderTop: "1px solid #1a1a2a", borderBottom: "1px solid #1a1a2a", marginBottom: 20 },
    controlGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 10, color: "#5a5a6a", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 },
    select: { background: "#12121e", border: "1px solid #2a2a3a", borderRadius: 6, color: "#e8e6e1", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" },
    slider: { WebkitAppearance: "none", width: 120, height: 4, borderRadius: 2, background: "#2a2a3a", cursor: "pointer" },
    processBtn: { background: "linear-gradient(135deg, #5eead4, #2dd4bf)", color: "#0a0a0f", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", marginLeft: "auto" },
    viewToggle: { display: "flex", gap: 4, background: "#12121e", borderRadius: 8, padding: 4 },
    progressBar: { width: "100%", height: 3, background: "#1a1a2a", borderRadius: 2, overflow: "hidden", marginBottom: 20 },
    stripContainer: { display: "flex", gap: 12, overflowX: "auto", padding: "12px 0" },
    gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, padding: "12px 0" },
    frameCard: (isSelected) => ({ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: isSelected ? "2px solid #5eead4" : "2px solid transparent", flexShrink: 0, background: "#12121e" }),
    lightbox: { position: "fixed", inset: 0, zIndex: 100, background: "rgba(5,5,10,0.95)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 },
  };

  return (
     </div>
        </div>
        {!videoSrc ? (
          <div style={styles.dropzone} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); handleDrop(e); }} onClick={() => fileInputRef.current?.click()}>
            <div style={{ color: "#5eead4", marginBottom: 16 }}><IconUpload /></div>
            <p style={{ fontSize: 14, color: "#6a6a7a" }}>Drop a clip or <span style={{ color: "#5eead4", textDecoration: "underline" }}>browse</span></p>
            <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
        ) : (
          <>
            <video ref={videoRef} src={videoSrc} onLoadedMetadata={handleVideoLoaded} style={{ display: "none" }} muted playsInline preload="auto" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={styles.controlsBar}>
              <div style={styles.controlGroup}>
                <span style={styles.label}>Method</span>
                <select style={styles.select} value={method} onChange={(e) => setMethod(e.target.value)}><option value="interval">Time Interval</option><option value="scene">Scene Detect</option></select>
              </div>
              {method === "interval" ? (
                <div style={styles.controlGroup}><span style={styles.label}>Every {interval}s</span><input type="range" min={0.25} max={5} step={0.25} value={interval} onChange={(e) => setInterval_(parseFloat(e.target.value))} style={styles.slider} /></div>
              ) : (
                <div style={styles.controlGroup}><span style={styles.label}>Sensitivity {sensitivity}</span><input type="range" min={5} max={60} step={1} value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} style={styles.slider} /></div>
              )}
              <div style={styles.controlGroup}>
                <span style={styles.label}>View</span>
                <div style={styles.viewToggle}>
                  <button style={{ background: view === VIEWS.STRIP ? "rgba(94,234,212,0.15)" : "transparent", color: view === VIEWS.STRIP ? "#5eead4" : "#5a5a6a", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px" }} onClick={() => setView(VIEWS.STRIP)}><IconStrip /></button>
                  <button style={{ background: view === VIEWS.VERTICAL ? "rgba(94,234,212,0.15)" : "transparent", color: view === VIEWS.VERTICAL ? "#5eead4" : "#5a5a6a", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px" }} onClick={() => setView(VIEWS.VERTICAL)}><IconVertical /></button>
                  <button style={{ background: view === VIEWS.GRID ? "rgba(94,234,212,0.15)" : "transparent", color: view === VIEWS.GRID ? "#5eead4" : "#5a5a6a", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px" }} onClick={() => setView(VIEWS.GRID)}><IconGrid /></button>
                </div>
              </div>
              <button style={styles.processBtn} onClick={processVideo} disabled={processing}>{processing ? "Breaking..." : "Break Clip"}</button>
            </div>
            {processing && (<div style={styles.progressBar}><div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #5eead4, #2dd4bf)" }} /></div>)}
            {frames.length > 0 && (
              <div style={view === VIEWS.STRIP ? styles.stripContainer : styles.gridContainer}>
                {frames.map((f, i) => (
                  <div key={i} style={styles.frameCard(selectedFrame === i)} onClick={() => setSelectedFrame(i)}>
                    <img src={f.src} alt={`Frame at ${formatTime(f.time)}`} style={{ display: "block", width: view === VIEWS.STRIP ? 280 : "100%", height: "auto" }} />
                    <span style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(10,10,15,0.85)", color: "#5eead4", fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>{formatTime(f.time)}</span>
                  </div>
                ))}
              </div>
            )}
            {frames.length === 0 && !processing && (<div style={{ textAlign: "center", padding: "60px 20px", color: "#3a3a4a" }}><p>Configure and hit Break Clip</p></div>)}
          </>
        )}
      </div>
      {selectedFrame !== null && frames[selectedFrame] && (
        <div style={styles.lightbox} onClick={() => setSelectedFrame(null)}>
          <img src={frames[selectedFrame].src} alt="Expanded frame" style={{ maxWidth: "90%", maxHeight: "85vh", borderRadius: 8, border: "1px solid #2a2a3a" }} onClick={(e) => e.stopPropagation()} />
          <span style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "rgba(10,10,15,0.9)", color: "#5eead4", fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 6 }}>{formatTime(frames[selectedFrame].time)}</span>
        </div>
      )}
    </div>
  );
}
