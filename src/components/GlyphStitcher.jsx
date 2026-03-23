import { useState, useRef, useCallback } from 'react';

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
const FONT = `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif`;
const MONO = `'JetBrains Mono', 'Fira Code', monospace`;

const LAYOUTS = { VERTICAL: 'vertical', HORIZONTAL: 'horizontal', GRID: 'grid' };
const FORMATS = ['png', 'jpg', 'webp'];
const GRID_OPTIONS = ['2x2', '3x3', '4x4'];

export default function GlyphStitcher({ theme }) {
  const T = theme || DEFAULT_T;
  const [images, setImages] = useState([]);
  const [layout, setLayout] = useState(LAYOUTS.VERTICAL);
  const [gap, setGap] = useState(8);
  const [bgColor, setBgColor] = useState(T.bg);
  const [bgTransparent, setBgTransparent] = useState(false);
  const [format, setFormat] = useState('png');
  const [gridCols, setGridCols] = useState('2x2');
  const [quality, setQuality] = useState(0.92);
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputDims, setOutputDims] = useState(null);
  const [stitching, setStitching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const processFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    Promise.all(valid.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => resolve({ id: Date.now() + Math.random(), src: e.target.result, name: file.name, width: img.naturalWidth, height: img.naturalHeight });
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }))).then(loaded => { setImages(prev => [...prev, ...loaded]); setOutputUrl(null); });
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }, [processFiles]);
  const removeImage = (id) => { setImages(prev => prev.filter(img => img.id !== id)); setOutputUrl(null); };
  const moveImage = (from, dir) => {
    const to = from + dir;
    if (to < 0 || to >= images.length) return;
    const n = [...images]; [n[from], n[to]] = [n[to], n[from]]; setImages(n); setOutputUrl(null);
  };
  const clearAll = () => { setImages([]); setOutputUrl(null); setOutputDims(null); };

  const stitch = useCallback(() => {
    if (images.length < 2) return;
    setStitching(true); setOutputUrl(null);
    requestAnimationFrame(() => {
      const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
      const imgEls = []; let loaded = 0;
      images.forEach((img, i) => {
        const el = new Image();
        el.onload = () => { imgEls[i] = el; loaded++; if (loaded === images.length) draw(canvas, ctx, imgEls); };
        el.src = img.src;
      });
    });
  }, [images, layout, gap, bgColor, bgTransparent, format, quality, gridCols]);

  const draw = (canvas, ctx, els) => {
    const g = gap;
    if (layout === LAYOUTS.VERTICAL) {
      const maxW = Math.max(...els.map(e => e.naturalWidth));
      const totalH = els.reduce((s, e) => { const sc = maxW / e.naturalWidth; return s + e.naturalHeight * sc; }, 0) + g * (els.length - 1);
      canvas.width = maxW; canvas.height = totalH;
      if (!bgTransparent) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      let y = 0;
      els.forEach(e => { const sc = maxW / e.naturalWidth; const h = e.naturalHeight * sc; ctx.drawImage(e, 0, y, maxW, h); y += h + g; });
    } else if (layout === LAYOUTS.HORIZONTAL) {
      const maxH = Math.max(...els.map(e => e.naturalHeight));
      const totalW = els.reduce((s, e) => { const sc = maxH / e.naturalHeight; return s + e.naturalWidth * sc; }, 0) + g * (els.length - 1);
      canvas.width = totalW; canvas.height = maxH;
      if (!bgTransparent) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      let x = 0;
      els.forEach(e => { const sc = maxH / e.naturalHeight; const w = e.naturalWidth * sc; ctx.drawImage(e, x, 0, w, maxH); x += w + g; });
    } else {
      const cols = parseInt(gridCols[0]); const rows = Math.ceil(els.length / cols);
      const cellW = Math.max(...els.map(e => e.naturalWidth)); const cellH = Math.max(...els.map(e => e.naturalHeight));
      canvas.width = cols * cellW + (cols - 1) * g; canvas.height = rows * cellH + (rows - 1) * g;
      if (!bgTransparent) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      els.forEach((e, i) => {
        const col = i % cols; const row = Math.floor(i / cols);
        const x = col * (cellW + g); const y = row * (cellH + g);
        const sc = Math.min(cellW / e.naturalWidth, cellH / e.naturalHeight);
        const dw = e.naturalWidth * sc; const dh = e.naturalHeight * sc;
        ctx.drawImage(e, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
      });
    }
    const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const url = canvas.toDataURL(mime, format === 'png' ? undefined : quality);
    setOutputUrl(url); setOutputDims({ w: canvas.width, h: canvas.height }); setStitching(false);
  };

  const download = () => {
    if (!outputUrl) return;
    const a = document.createElement('a'); a.href = outputUrl;
    a.download = `glyph-stitch-${Date.now()}.${format === 'jpg' ? 'jpeg' : format}`; a.click();
  };

  const st = {
    dropzone: { border: `2px dashed ${dragging ? T.purple : T.borderLight}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(75,0,130,0.05)' : 'transparent', transition: 'all 0.2s' },
    label: { fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    select: { background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, padding: '7px 10px', fontSize: 12, fontFamily: FONT, cursor: 'pointer', outline: 'none' },
    slider: { WebkitAppearance: 'none', appearance: 'none', width: 100, height: 4, borderRadius: 2, background: T.border, outline: 'none', cursor: 'pointer' },
    btn: (c = T.purple) => ({ padding: '10px 20px', background: c, color: T.white, border: 'none', borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
    btnSm: (c = T.purple) => ({ padding: '6px 14px', background: c, color: T.white, border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }),
    layoutBtn: (active) => ({ width: 32, height: 28, borderRadius: 6, border: `1px solid ${active ? T.purple : T.border}`, background: active ? 'rgba(75,0,130,0.2)' : 'transparent', color: active ? T.purpleLight : T.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    thumb: (isDrag) => ({ position: 'relative', width: 100, height: 80, borderRadius: 8, overflow: 'hidden', border: `2px solid ${T.border}`, opacity: isDrag ? 0.4 : 1, cursor: 'grab' }),
  };

  return (
    <div>
      {/* Dropzone */}
      <div style={st.dropzone} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
        <p style={{ fontSize: 14, color: T.textMuted, marginTop: 8 }}>Drop images or <span style={{ color: T.purpleLight, textDecoration: 'underline' }}>browse</span></p>
        <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>PNG · JPG · WebP · SVG — drag to reorder after upload</p>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => { processFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>{images.length} image{images.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={st.btnSm(T.elevated)} onClick={() => fileInputRef.current?.click()}>+ Add</button>
              <button style={{ ...st.btnSm(T.elevated), color: T.red, border: `1px solid ${T.red}44`, background: 'transparent' }} onClick={clearAll}>Clear</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {images.map((img, i) => (
              <div key={img.id} style={st.thumb(dragIdx === i)} draggable onDragStart={() => setDragIdx(i)} onDragEnd={() => setDragIdx(null)}
                onDragOver={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) { const n = [...images]; const [m] = n.splice(dragIdx, 1); n.splice(i, 0, m); setImages(n); setDragIdx(i); setOutputUrl(null); } }}>
                <img src={img.src} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, color: T.white, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>{i + 1}</div>
                <button onClick={() => removeImage(img.id)} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'rgba(139,0,0,0.8)', border: 'none', color: T.white, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Controls */}
      {images.length >= 2 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', padding: '16px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
          <div>
            <span style={st.label}>Layout</span>
            <div style={{ display: 'flex', gap: 3, background: T.surface, borderRadius: 8, padding: 3 }}>
              {Object.entries(LAYOUTS).map(([k, v]) => (
                <button key={k} style={st.layoutBtn(layout === v)} onClick={() => { setLayout(v); setOutputUrl(null); }}>{k[0]}</button>
              ))}
            </div>
          </div>
          {layout === LAYOUTS.GRID && (
            <div><span style={st.label}>Grid</span><select style={st.select} value={gridCols} onChange={e => { setGridCols(e.target.value); setOutputUrl(null); }}>{GRID_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          )}
          <div><span style={st.label}>Gap {gap}px</span><input type="range" min={0} max={50} value={gap} onChange={e => { setGap(parseInt(e.target.value)); setOutputUrl(null); }} style={st.slider} /></div>
          <div>
            <span style={st.label}>Background</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setOutputUrl(null); }} disabled={bgTransparent} style={{ width: 32, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, cursor: 'pointer' }} />
              <label style={{ fontSize: 11, color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={bgTransparent} onChange={e => { setBgTransparent(e.target.checked); setOutputUrl(null); }} /> Transparent</label>
            </div>
          </div>
          <div><span style={st.label}>Format</span><select style={st.select} value={format} onChange={e => { setFormat(e.target.value); setOutputUrl(null); }}>{FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}</select></div>
          {format !== 'png' && <div><span style={st.label}>Quality {Math.round(quality * 100)}%</span><input type="range" min={0.3} max={1} step={0.05} value={quality} onChange={e => { setQuality(parseFloat(e.target.value)); setOutputUrl(null); }} style={st.slider} /></div>}
          <button style={{ ...st.btn(T.purple), marginLeft: 'auto', opacity: stitching ? 0.5 : 1 }} onClick={stitch} disabled={stitching}>{stitching ? 'Stitching...' : 'Stitch'}</button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Output */}
      {outputUrl && (
        <div style={{ padding: 20, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginTop: 16 }}>
          <img src={outputUrl} alt="Stitched" style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, border: `1px solid ${T.border}`, display: 'block', margin: '0 auto' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            <button onClick={download} style={{ ...st.btn(T.purple), display: 'inline-flex', alignItems: 'center', gap: 6 }}>⬇ Download .{format}</button>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.textMuted }}>
              <span>{outputDims?.w} × {outputDims?.h}</span>
              <span>{images.length} images</span>
              <span>{layout}{layout === 'grid' ? ` (${gridCols})` : ''}</span>
            </div>
          </div>
        </div>
      )}

      {images.length === 1 && <div style={{ textAlign: 'center', padding: '32px 0', color: T.textDim, fontSize: 13 }}>Add at least one more image to stitch.</div>}
    </div>
  );
}
