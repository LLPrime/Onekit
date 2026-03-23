import { useState, useRef, useCallback, useEffect } from "react";

const DEFAULT_T = {
  bg: '#0a0a0a', surface: '#111111', elevated: '#1a1a1a',
  border: '#222222', borderLight: '#333333',
  red: '#8b0000', redLight: '#cc1a1a',
  purple: '#4b0082', purpleLight: '#9370db',
  text: '#e8e8e8', textMuted: '#888888', textDim: '#555555',
  white: '#ffffff', green: '#22c55e', yellow: '#eab308', orange: '#f97316',
  scrollTrack: '#0a0a0a', scrollThumb: '#222',
  selection: '#4b0082', selectionText: '#fff',
};
const VIEWS = { STRIP: "strip", GRID: "grid" };
const MAX_DURATION = 30;
const MAX_OUTPUT_W = 1920;
const LAYOUTS = { HORIZONTAL: "horizontal", VERTICAL: "vertical", GRID: "grid" };
const PDF_MODES = { LAYOUT: "layout", SHEET: "sheet" };

/* ── Icons ──────────────────────────────────────────────────────────────────── */
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

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function computeDiff(a, b) {
  const len = a.data.length;
  let t = 0;
  for (let i = 0; i < len; i += 64) {
    t += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i+1] - b.data[i+1]) + Math.abs(a.data[i+2] - b.data[i+2]);
  }
  return t / (Math.floor(len / 64) * 3);
}

function formatTime(sec) {
  if (isNaN(sec)) return "0:00.0";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2,"0")}.${ms}`;
}

function safeName(videoName) {
  return videoName ? videoName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") : "clip";
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Frame Extraction ───────────────────────────────────────────────────────── */
function extractFramesInterval(video, canvas, ctx, intervalSec, quality) {
  return new Promise((resolve) => {
    const frames = [];
    const dur = video.duration;
    let cur = 0;
    const onSeeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ time: cur, src: canvas.toDataURL("image/webp", quality) });
      cur += intervalSec;
      if (cur <= dur) { video.currentTime = cur; }
      else { video.onseeked = null; resolve(frames); }
    };
    video.onseeked = onSeeked;
    video.currentTime = 0;
  });
}

function extractFramesSceneDetect(video, canvas, ctx, threshold, quality) {
  return new Promise((resolve) => {
    const frames = [];
    const dur = video.duration;
    const step = 0.15;
    let cur = 0, prev = null;
    const onSeeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (!prev) { frames.push({ time: cur, src: canvas.toDataURL("image/webp", quality) }); prev = d; }
      else { const diff = computeDiff(prev, d); if (diff > threshold) { frames.push({ time: cur, src: canvas.toDataURL("image/webp", quality) }); prev = d; } }
      cur += step;
      if (cur <= dur) { video.currentTime = cur; }
      else {
        video.currentTime = dur - 0.01;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const lt = parseFloat(dur.toFixed(2));
          if (!frames.find(f => Math.abs(f.time - lt) < 0.2)) frames.push({ time: lt, src: canvas.toDataURL("image/webp", quality) });
          video.onseeked = null;
          resolve(frames);
        };
      }
    };
    video.onseeked = onSeeked;
    video.currentTime = 0;
  });
}

/* ── Stitch Engine ──────────────────────────────────────────────────────────── */
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildStitchCanvas(framesToUse, layout) {
  if (framesToUse.length === 0) return null;
  const imgs = await Promise.all(framesToUse.map(f => loadImg(f.src)));
  const w = imgs[0].width;
  const h = imgs[0].height;
  let cols, rows;

  if (layout === LAYOUTS.HORIZONTAL) { cols = imgs.length; rows = 1; }
  else if (layout === LAYOUTS.VERTICAL) { cols = 1; rows = imgs.length; }
  else { cols = Math.min(imgs.length, 4); rows = Math.ceil(imgs.length / cols); }

  let canvasW = w * cols;
  let canvasH = h * rows;

  if (canvasW > MAX_OUTPUT_W) {
    const scale = MAX_OUTPUT_W / canvasW;
    canvasW = MAX_OUTPUT_W;
    canvasH = Math.floor(canvasH * scale);
  }

  const c = document.createElement("canvas");
  c.width = canvasW;
  c.height = canvasH;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const cellW = canvasW / cols;
  const cellH = canvasH / rows;

  imgs.forEach((img, i) => {
    const col = layout === LAYOUTS.VERTICAL ? 0 : i % cols;
    const row = layout === LAYOUTS.HORIZONTAL ? 0 : Math.floor(i / cols);
    ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH);
  });

  return c;
}

/* ── PDF Generator ──────────────────────────────────────────────────────────── */
async function buildPdf(framesToUse, layout, pdfMode, videoName) {
  if (framesToUse.length === 0) return;

  if (pdfMode === PDF_MODES.SHEET) {
    let html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + safeName(videoName) + " - ClipBreaker</title>";
    html += "<style>@media print{.pb{page-break-after:always}}.pg{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:95vh;padding:20px;box-sizing:border-box}img{max-width:100%;max-height:80vh;object-fit:contain}.ts{font-family:monospace;font-size:14px;color:#333;margin-top:12px}@media print{body{margin:0}}</style>";
    html += "</head><body>";
    framesToUse.forEach((f, i) => {
      html += "<div class='pg" + (i < framesToUse.length - 1 ? " pb" : "") + "'>";
      html += "<img src='" + f.src + "'/>";
      html += "<div class='ts'>Frame " + (i + 1) + " — " + formatTime(f.time) + "</div></div>";
    });
    html += "<script>setTimeout(function(){window.print()},500)<\/script></body></html>";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const stitchCanvas = await buildStitchCanvas(framesToUse, layout);
    if (!stitchCanvas) return;
    const dataUrl = stitchCanvas.toDataURL("image/png");
    let html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + safeName(videoName) + " - ClipBreaker Stitch</title>";
    html += "<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:95vw;max-height:95vh;object-fit:contain}@media print{body{margin:0}}</style>";
    html += "</head><body><img src='" + dataUrl + "'/>";
    html += "<script>setTimeout(function(){window.print()},500)<\/script></body></html>";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

/* ── Export Handler ──────────────────────────────────────────────────────────── */
async function doExport(frames, favorites, videoName, layout, format, pdfMode, quality) {
  const toUse = favorites.length > 0 ? frames.filter((_, i) => favorites.includes(i)) : frames;
  if (toUse.length === 0) return;
  const base = safeName(videoName);
  const count = toUse.length;

  if (format === "pdf") {
    await buildPdf(toUse, layout, pdfMode, videoName);
    return;
  }

  const canvas = await buildStitchCanvas(toUse, layout);
  if (!canvas) return;
  const mimeMap = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
  const mime = mimeMap[format] || "image/png";
  const q = format === "png" ? undefined : quality;
  triggerDownload(canvas.toDataURL(mime, q), base + "_stitch_" + layout + "_" + count + "frames." + format);
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function ClipBreaker({ theme }) {
  const T = theme || DEFAULT_T;
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [frames, setFrames] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [view, setView] = useState(VIEWS.STRIP);
  const [method, setMethod] = useState("interval");
  const [interval, setInterval_] = useState(1);
  const [sensitivity, setSensitivity] = useState(25);
  const [extractQuality, setExtractQuality] = useState(0.8);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [error, setError] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [exportLayout, setExportLayout] = useState(LAYOUTS.GRID);
  const [exportFormat, setExportFormat] = useState("png");
  const [exportQuality, setExportQuality] = useState(0.8);
  const [pdfMode, setPdfMode] = useState(PDF_MODES.SHEET);
  const [exporting, setExporting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { return () => { if (videoSrc) URL.revokeObjectURL(videoSrc); }; }, [videoSrc]);

  const toggleFav = (i) => setFavorites(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("video/")) return;
    setError("");
    const url = URL.createObjectURL(file);
    const tmp = document.createElement("video");
    tmp.preload = "metadata";
    tmp.onloadedmetadata = () => {
      if (tmp.duration > MAX_DURATION) { URL.revokeObjectURL(url); setError("Clip must be " + MAX_DURATION + "s or less. This one is " + Math.ceil(tmp.duration) + "s."); return; }
      setVideoSrc(url); setVideoName(file.name); setFrames([]); setSelectedFrame(null); setFavorites([]); setProgress(0); setError(""); setShowExport(false);
    };
    tmp.src = url;
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); handleFile(e.dataTransfer?.files?.[0]); }, [handleFile]);

  const resetTool = useCallback(() => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null); setVideoName(""); setFrames([]); setSelectedFrame(null); setFavorites([]); setProgress(0); setError(""); setShowExport(false);
  }, [videoSrc]);

  const processVideo = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    if (video.readyState < 2) await new Promise(r => { video.onloadedmetadata = r; });
    const maxW = 640, scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    setProcessing(true); setProgress(0); setFrames([]); setSelectedFrame(null); setFavorites([]); setShowExport(false);
    const up = () => setProgress(Math.min(100, Math.round((video.currentTime / video.duration) * 100)));
    video.addEventListener("timeupdate", up);
    try {
      const result = method === "interval"
        ? await extractFramesInterval(video, canvas, ctx, interval, extractQuality)
        : await extractFramesSceneDetect(video, canvas, ctx, sensitivity, extractQuality);
      setFrames(result); setProgress(100);
    } catch (err) { console.error(err); setError("Failed to process. Try a shorter clip."); }
    finally { video.removeEventListener("timeupdate", up); setTimeout(() => setProcessing(false), 400); }
  }, [method, interval, sensitivity, extractQuality]);

  const handleVideoLoaded = () => { if (videoRef.current) setVideoDuration(videoRef.current.duration); };

  const handleExport = async () => {
    setExporting(true);
    try { await doExport(frames, favorites, videoName, exportLayout, exportFormat, pdfMode, exportQuality); }
    catch (err) { console.error(err); setError("Export failed. Try fewer frames or a different format."); }
    setExporting(false);
  };

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  const st = {
    controlsBar: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", padding: "16px 0", borderTop: "1px solid #222222", borderBottom: "1px solid #222222", marginBottom: 16 },
    cg: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 10, color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 },
    select: { background: T.elevated, border: "1px solid #222222", borderRadius: 6, color: T.text, padding: "8px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" },
    slider: { WebkitAppearance: "none", width: 100, height: 4, borderRadius: 2, background: T.border, cursor: "pointer" },
    processBtn: { background: T.purple, color: T.white, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginLeft: "auto" },
    exportBtn: { background: T.red, color: T.white, border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
    stitchBtn: { background: T.purple, color: T.white, border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
    resetBtn: { background: "none", border: "1px solid #333333", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", color: T.textMuted, cursor: "pointer" },
    viewToggle: { display: "flex", gap: 4, background: T.elevated, borderRadius: 8, padding: 4 },
    progressBar: { width: "100%", height: 3, background: T.elevated, borderRadius: 2, overflow: "hidden", marginBottom: 16 },
    dropzone: { border: "2px dashed #333333", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: T.surface },
    stripContainer: { display: "flex", gap: 12, overflowX: "auto", padding: "12px 0", WebkitOverflowScrolling: "touch" },
    gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, padding: "12px 0" },
    frameCard: (sel, fav) => ({ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: sel ? "2px solid #9370db" : fav ? "2px solid #8b0000" : "2px solid transparent", flexShrink: 0, background: T.elevated }),
    dlBtn: { position: "absolute", top: 6, right: 6, background: "rgba(10,10,15,0.85)", border: "none", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: T.purpleLight, display: "flex", alignItems: "center", justifyContent: "center" },
    favBtn: (on) => ({ position: "absolute", top: 6, left: 6, background: "rgba(10,10,15,0.85)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: on ? T.red : T.textDim, fontSize: 14 }),
    lightbox: { position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 },
    errorMsg: { background: T.elevated, border: "1px solid #8b0000", borderRadius: 8, padding: "12px 16px", color: T.redLight, fontSize: 13, marginBottom: 16 },
    info: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "12px 0", fontSize: 12, color: T.textMuted },
    exportPanel: { background: T.surface, border: "1px solid #222222", borderRadius: 12, padding: 20, marginBottom: 16 },
    epRow: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginBottom: 12 },
  };

  const vBtn = (a) => ({ background: a ? "rgba(147,112,219,0.15)" : "transparent", color: a ? T.purpleLight : T.textDim, border: "none", borderRadius: 6, cursor: "pointer", padding: "6px" });

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div>
      {error && <div style={st.errorMsg}>{error}</div>}

      {!videoSrc ? (
        <div style={st.dropzone} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleDrop(e); }} onClick={() => fileInputRef.current?.click()}>
          <div style={{ color: T.purpleLight, marginBottom: 16 }}><IconUpload /></div>
          <p style={{ fontSize: 14, color: T.textMuted, margin: "0 0 4px" }}>Drop a video clip or <span style={{ color: T.purpleLight, textDecoration: "underline" }}>browse</span></p>
          <p style={{ fontSize: 11, color: T.textDim, margin: 0 }}>Max {MAX_DURATION} seconds</p>
          <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      ) : (
        <>
          <video ref={videoRef} src={videoSrc} onLoadedMetadata={handleVideoLoaded} style={{ display: "none" }} muted playsInline preload="auto" />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div style={st.info}>
            <span><strong style={{ color: T.text }}>{videoName}</strong></span>
            <span>{videoDuration ? videoDuration.toFixed(1) + "s" : ""}</span>
            <span>{frames.length > 0 ? frames.length + " frames" : ""}</span>
            {favorites.length > 0 && <span style={{ color: T.red }}>{favorites.length} selected</span>}
            <button style={st.resetBtn} onClick={resetTool}>New Clip</button>
          </div>

          <div style={st.controlsBar}>
            <div style={st.cg}>
              <span style={st.label}>Method</span>
              <select style={st.select} value={method} onChange={e => setMethod(e.target.value)}>
                <option value="interval">Time Interval</option>
                <option value="scene">Scene Detect</option>
              </select>
            </div>
            {method === "interval" ? (
              <div style={st.cg}><span style={st.label}>Every {interval}s</span><input type="range" min={0.25} max={5} step={0.25} value={interval} onChange={e => setInterval_(parseFloat(e.target.value))} style={st.slider} /></div>
            ) : (
              <div style={st.cg}><span style={st.label}>Sensitivity {sensitivity}</span><input type="range" min={5} max={60} step={1} value={sensitivity} onChange={e => setSensitivity(parseInt(e.target.value))} style={st.slider} /></div>
            )}
            <div style={st.cg}>
              <span style={st.label}>View</span>
              <div style={st.viewToggle}>
                <button style={vBtn(view === VIEWS.STRIP)} onClick={() => setView(VIEWS.STRIP)}><IconStrip /></button>
                <button style={vBtn(view === VIEWS.GRID)} onClick={() => setView(VIEWS.GRID)}><IconGrid /></button>
              </div>
            </div>
            <button style={st.processBtn} onClick={processVideo} disabled={processing}>{processing ? "Breaking..." : "Break Clip"}</button>
          </div>

          {processing && <div style={st.progressBar}><div style={{ width: progress + "%", height: "100%", background: T.purple, transition: "width 0.3s" }} /></div>}

          {frames.length > 0 && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <button style={st.exportBtn} onClick={() => {
                  const base = safeName(videoName);
                  frames.forEach((f, i) => { setTimeout(() => triggerDownload(f.src, base + "_frame" + String(i+1).padStart(3,"0") + ".webp"), i * 150); });
                }}>Download All ({frames.length})</button>
                <button style={st.stitchBtn} onClick={() => setShowExport(!showExport)}>{showExport ? "Close Export" : "Stitch & Export"}</button>
              </div>

              {showExport && (
                <div style={st.exportPanel}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>
                    Export {favorites.length > 0 ? "(" + favorites.length + " selected)" : "(all " + frames.length + " frames)"}
                  </div>
                  <div style={st.epRow}>
                    <div style={st.cg}>
                      <span style={st.label}>Layout</span>
                      <select style={st.select} value={exportLayout} onChange={e => setExportLayout(e.target.value)}>
                        <option value="grid">Grid</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </div>
                    <div style={st.cg}>
                      <span style={st.label}>Format</span>
                      <select style={st.select} value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                        <option value="png">PNG (lossless)</option>
                        <option value="jpeg">JPEG (compressed)</option>
                        <option value="webp">WebP (small file)</option>
                        <option value="pdf">PDF (printable)</option>
                      </select>
                    </div>
                    {exportFormat === "pdf" && (
                      <div style={st.cg}>
                        <span style={st.label}>PDF Mode</span>
                        <select style={st.select} value={pdfMode} onChange={e => setPdfMode(e.target.value)}>
                          <option value="sheet">One frame per page</option>
                          <option value="layout">Stitched layout</option>
                        </select>
                      </div>
                    )}
                    {exportFormat !== "png" && exportFormat !== "pdf" && (
                      <div style={st.cg}>
                        <span style={st.label}>Quality {Math.round(exportQuality * 100)}%</span>
                        <input type="range" min={0.1} max={1} step={0.1} value={exportQuality} onChange={e => setExportQuality(parseFloat(e.target.value))} style={st.slider} />
                      </div>
                    )}
                  </div>
                  <button style={{ ...st.exportBtn, padding: "12px 24px", fontSize: 13 }} onClick={handleExport} disabled={exporting}>
                    {exporting ? "Exporting..." : "Export " + exportFormat.toUpperCase()}
                  </button>
                </div>
              )}

              <div style={view === VIEWS.STRIP ? st.stripContainer : st.gridContainer}>
                {frames.map((f, i) => (
                  <div key={i} style={st.frameCard(selectedFrame === i, favorites.includes(i))} onClick={() => setSelectedFrame(i)}>
                    <img src={f.src} alt={"Frame " + formatTime(f.time)} style={{ display: "block", width: view === VIEWS.STRIP ? 240 : "100%", height: "auto" }} />
                    <span style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(10,10,15,0.85)", color: T.purpleLight, fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>{formatTime(f.time)}</span>
                    <button style={st.dlBtn} onClick={e => { e.stopPropagation(); triggerDownload(f.src, safeName(videoName) + "_" + formatTime(f.time).replace(/:/g,"-") + ".webp"); }} title="Download"><IconDownload /></button>
                    <button style={st.favBtn(favorites.includes(i))} onClick={e => { e.stopPropagation(); toggleFav(i); }} title="Select">{favorites.includes(i) ? "\u2605" : "\u2606"}</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {frames.length === 0 && !processing && <div style={{ textAlign: "center", padding: "48px 20px", color: T.textDim }}><p style={{ margin: 0 }}>Configure settings and hit Break Clip</p></div>}
        </>
      )}

      {selectedFrame !== null && frames[selectedFrame] && (
        <div style={st.lightbox} onClick={() => setSelectedFrame(null)}>
          <img src={frames[selectedFrame].src} alt="Expanded" style={{ maxWidth: "90%", maxHeight: "65vh", borderRadius: 8, border: "1px solid #222222" }} onClick={e => e.stopPropagation()} />
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ background: "rgba(10,10,15,0.9)", color: T.purpleLight, fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 6 }}>{formatTime(frames[selectedFrame].time)}</span>
            <button style={{ ...st.exportBtn, padding: "6px 16px" }} onClick={e => { e.stopPropagation(); triggerDownload(frames[selectedFrame].src, safeName(videoName) + "_" + formatTime(frames[selectedFrame].time).replace(/:/g,"-") + ".webp"); }}>Download</button>
            <button style={{ ...st.stitchBtn, padding: "6px 16px" }} onClick={e => { e.stopPropagation(); toggleFav(selectedFrame); }}>{favorites.includes(selectedFrame) ? "\u2605 Selected" : "\u2606 Select"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
