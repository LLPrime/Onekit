import { useState, useRef, useCallback, useEffect } from "react";

const VIEWS = { STRIP: "strip", GRID: "grid" };
const MAX_DURATION = 30;

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

const IconStrip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
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

function downloadFrame(src, time, videoName) {
  const link = document.createElement("a");
  const baseName = videoName ? videoName.replace(/\.[^.]+$/, "") : "clip";
  link.href = src;
  link.download = `${baseName}_${formatTime(time).replace(/:/g, "-")}.webp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAllFrames(frames, videoName) {
  const baseName = videoName ? videoName.replace(/\.[^.]+$/, "") : "clip";
  frames.forEach((f, i) => {
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = f.src;
      link.download = `${baseName}_frame${String(i + 1).padStart(3, "0")}_${formatTime(f.time).replace(/:/g, "-")}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, i * 150);
  });
}

function stitchFrames(frames, selectedIndexes, videoName) {
  const toStitch = selectedIndexes.length > 0
    ? frames.filter((_, i) => selectedIndexes.includes(i))
    : frames;
  if (toStitch.length === 0) return;
  const tempCanvas = document.createElement("canvas");
  const firstImg = new Image();
  firstImg.onload = () => {
    const w = firstImg.width;
    const h = firstImg.height;
    const cols = Math.min(toStitch.length, 4);
    const rows = Math.ceil(toStitch.length / cols);
    tempCanvas.width = w * cols;
    tempCanvas.height = h * rows;
    const ctx = tempCanvas.getContext("2d");
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    let loaded = 0;
    toStitch.forEach((f, i) => {
      const img = new Image();
      img.onload = () => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.drawImage(img, col * w, row * h, w, h);
        loaded++;
        if (loaded === toStitch.length) {
          const link = document.createElement("a");
          const baseName = videoName ? videoName.replace(/\.[^.]+$/, "") : "clip";
          link.href = tempCanvas.toDataURL("image/png");
          link.download = `${baseName}_stitch_${toStitch.length}frames.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };
      img.src = f.src;
    });
  };
  firstImg.src = toStitch[0].src;
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
  const [favorites, setFavorites] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (videoSrc) URL.revokeObjectURL(videoSrc); };
  }, [videoSrc]);

  const toggleFavorite = (index) => {
    setFavorites((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("video/")) return;
    setError("");
    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > MAX_DURATION) {
        URL.revokeObjectURL(url);
        setError(`Clip must be ${MAX_DURATION}s or less. This clip is ${Math.ceil(tempVideo.duration)}s.`);
        return;
      }
      setVideoSrc(url);
      setVideoName(file.name);
      setFrames([]);
      setSelectedFrame(null);
      setFavorites([]);
      setProgress(0);
      setError("");
    };
    tempVideo.src = url;
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer?.files?.[0]);
  }, [handleFile]);

  const resetTool = useCallback(() => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null);
    setVideoName("");
    setFrames([]);
    setSelectedFrame(null);
    setFavorites([]);
    setProgress(0);
    setError("");
  }, [videoSrc]);

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
    setFavorites([]);
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
      setError("Failed to process video. Try a shorter clip or different settings.");
    } finally {
      video.removeEventListener("timeupdate", updateProgress);
      setTimeout(() => setProcessing(false), 400);
    }
  }, [method, interval, sensitivity, quality]);

  const handleVideoLoaded = () => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration);
  };

  const st = {
    controlsBar: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", padding: "16px 0", borderTop: "1px solid #222222", borderBottom: "1px solid #222222", marginBottom: 16 },
    controlGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 10, color: "#888888", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 },
    select: { background: "#1a1a1a", border: "1px solid #222222", borderRadius: 6, color: "#e8e8e8", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" },
    slider: { WebkitAppearance: "none", width: 100, height: 4, borderRadius: 2, background: "#222222", cursor: "pointer" },
    processBtn: { background: "#4b0082", color: "#ffffff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginLeft: "auto" },
    exportBtn: { background: "#8b0000", color: "#ffffff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
    stitchBtn: { background: "#4b0082", color: "#ffffff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
    resetBtn: { background: "none", border: "1px solid #333333", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", color: "#888888", cursor: "pointer" },
    viewToggle: { display: "flex", gap: 4, background: "#1a1a1a", borderRadius: 8, padding: 4 },
    progressBar: { width: "100%", height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden", marginBottom: 16 },
    dropzone: { border: "2px dashed #333333", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: "#111111" },
    stripContainer: { display: "flex", gap: 12, overflowX: "auto", padding: "12px 0", WebkitOverflowScrolling: "touch" },
    gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, padding: "12px 0" },
    frameCard: (isSelected, isFav) => ({ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: isSelected ? "2px solid #9370db" : isFav ? "2px solid #8b0000" : "2px solid transparent", flexShrink: 0, background: "#1a1a1a" }),
    dlBtn: { position: "absolute", top: 6, right: 6, background: "rgba(10,10,15,0.85)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "#9370db", display: "flex", alignItems: "center", justifyContent: "center" },
    favBtn: (active) => ({ position: "absolute", top: 6, left: 6, background: "rgba(10,10,15,0.85)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: active ? "#8b0000" : "#555555", fontSize: 14 }),
    lightbox: { position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 },
    errorMsg: { background: "#1a1a1a", border: "1px solid #8b0000", borderRadius: 8, padding: "12px 16px", color: "#cc1a1a", fontSize: 13, marginBottom: 16 },
    info: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "12px 0", fontSize: 12, color: "#888888" },
  };

  return (
    <div>
      {error && <div style={st.errorMsg}>{error}</div>}

      {!videoSrc ? (
        <div style={st.dropzone} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleDrop(e); }} onClick={() => fileInputRef.current?.click()}>
          <div style={{ color: "#9370db", marginBottom: 16 }}><IconUpload /></div>
          <p style={{ fontSize: 14, color: "#888888", margin: "0 0 4px" }}>Drop a video clip or <span style={{ color: "#9370db", textDecoration: "underline" }}>browse</span></p>
          <p style={{ fontSize: 11, color: "#555555", margin: 0 }}>Max {MAX_DURATION} seconds</p>
          <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      ) : (
        <>
          <video ref={videoRef} src={videoSrc} onLoadedMetadata={handleVideoLoaded} style={{ display: "none" }} muted playsInline preload="auto" />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div style={st.info}>
            <span><strong style={{ color: "#e8e8e8" }}>{videoName}</strong></span>
            <span>{videoDuration ? `${videoDuration.toFixed(1)}s` : ""}</span>
            <span>{frames.length > 0 ? `${frames.length} frames` : ""}</span>
            {favorites.length > 0 && <span style={{ color: "#8b0000" }}>{favorites.length} selected</span>}
            <button style={st.resetBtn} onClick={resetTool}>New Clip</button>
          </div>

          <div style={st.controlsBar}>
            <div style={st.controlGroup}>
              <span style={st.label}>Method</span>
              <select style={st.select} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="interval">Time Interval</option>
                <option value="scene">Scene Detect</option>
              </select>
            </div>
            {method === "interval" ? (
              <div style={st.controlGroup}>
                <span style={st.label}>Every {interval}s</span>
                <input type="range" min={0.25} max={5} step={0.25} value={interval} onChange={(e) => setInterval_(parseFloat(e.target.value))} style={st.slider} />
              </div>
            ) : (
              <div style={st.controlGroup}>
                <span style={st.label}>Sensitivity {sensitivity}</span>
                <input type="range" min={5} max={60} step={1} value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} style={st.slider} />
              </div>
            )}
            <div style={st.controlGroup}>
              <span style={st.label}>View</span>
              <div style={st.viewToggle}>
                <button style={{ background: view === VIEWS.STRIP ? "rgba(147,112,219,0.15)" : "transparent", color: view === VIEWS.STRIP ? "#9370db" : "#555555", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px" }} onClick={() => setView(VIEWS.STRIP)}><IconStrip /></button>
                <button style={{ background: view === VIEWS.GRID ? "rgba(147,112,219,0.15)" : "transparent", color: view === VIEWS.GRID ? "#9370db" : "#555555", border: "none", borderRadius: 6, cursor: "pointer", padding: "6px" }} onClick={() => setView(VIEWS.GRID)}><IconGrid /></button>
              </div>
            </div>
            <button style={st.processBtn} onClick={processVideo} disabled={processing}>{processing ? "Breaking..." : "Break Clip"}</button>
          </div>

          {processing && (
            <div style={st.progressBar}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#4b0082", transition: "width 0.3s" }} />
            </div>
          )}

          {frames.length > 0 && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <button style={st.exportBtn} onClick={() => downloadAllFrames(frames, videoName)}>Download All ({frames.length})</button>
                <button style={st.stitchBtn} onClick={() => stitchFrames(frames, favorites, videoName)}>
                  {favorites.length > 0 ? `Stitch Selected (${favorites.length})` : `Stitch All (${frames.length})`}
                </button>
              </div>
              <div style={view === VIEWS.STRIP ? st.stripContainer : st.gridContainer}>
                {frames.map((f, i) => (
                  <div key={i} style={st.frameCard(selectedFrame === i, favorites.includes(i))} onClick={() => setSelectedFrame(i)}>
                    <img src={f.src} alt={`Frame ${formatTime(f.time)}`} style={{ display: "block", width: view === VIEWS.STRIP ? 240 : "100%", height: "auto" }} />
                    <span style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(10,10,15,0.85)", color: "#9370db", fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>{formatTime(f.time)}</span>
                    <button style={st.dlBtn} onClick={(e) => { e.stopPropagation(); downloadFrame(f.src, f.time, videoName); }} title="Download"><IconDownload /></button>
                    <button style={st.favBtn(favorites.includes(i))} onClick={(e) => { e.stopPropagation(); toggleFavorite(i); }} title="Select for stitch">{favorites.includes(i) ? "★" : "☆"}</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {frames.length === 0 && !processing && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#555555" }}>
              <p style={{ margin: 0 }}>Configure settings and hit Break Clip</p>
            </div>
          )}
        </>
      )}

      {selectedFrame !== null && frames[selectedFrame] && (
        <div style={st.lightbox} onClick={() => setSelectedFrame(null)}>
          <img src={frames[selectedFrame].src} alt="Expanded" style={{ maxWidth: "90%", maxHeight: "70vh", borderRadius: 8, border: "1px solid #222222" }} onClick={(e) => e.stopPropagation()} />
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
            <span style={{ background: "rgba(10,10,15,0.9)", color: "#9370db", fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 6 }}>{formatTime(frames[selectedFrame].time)}</span>
            <button style={{ ...st.exportBtn, padding: "6px 16px" }} onClick={(e) => { e.stopPropagation(); downloadFrame(frames[selectedFrame].src, frames[selectedFrame].time, videoName); }}>Download</button>
            <button style={{ ...st.stitchBtn, padding: "6px 16px" }} onClick={(e) => { e.stopPropagation(); toggleFavorite(selectedFrame); }}>
              {favorites.includes(selectedFrame) ? "★ Selected" : "☆ Select"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
