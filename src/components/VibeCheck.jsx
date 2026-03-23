import { useState, useCallback, useRef } from 'react';

const T = {
  bg: '#0a0a0a', surface: '#111111', elevated: '#1a1a1a',
  border: '#222222', borderLight: '#333333',
  red: '#8b0000', redLight: '#cc1a1a',
  purple: '#4b0082', purpleLight: '#9370db',
  text: '#e8e8e8', textMuted: '#888888', textDim: '#555555',
  white: '#ffffff', green: '#22c55e',
};
const FONT = `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif`;

function readExifData(buf) {
  const view = new DataView(buf); const meta = {};
  if (view.getUint16(0) !== 0xFFD8) return { format: 'Non-JPEG', fields: {} };
  let off = 2;
  while (off < view.byteLength - 1) {
    const marker = view.getUint16(off); off += 2;
    if (marker === 0xFFE1) {
      const len = view.getUint16(off); const start = off + 2;
      const hdr = String.fromCharCode(view.getUint8(start), view.getUint8(start+1), view.getUint8(start+2), view.getUint8(start+3));
      if (hdr === 'Exif') {
        meta.hasExif = true; meta.exifSize = len;
        try {
          const ts = start + 6; const le = view.getUint16(ts) === 0x4949;
          const ifdOff = view.getUint32(ts + 4, le); const ifdS = ts + ifdOff;
          const num = view.getUint16(ifdS, le);
          for (let i = 0; i < Math.min(num, 50); i++) {
            const eo = ifdS + 2 + i * 12; if (eo + 12 > view.byteLength) break;
            const tag = view.getUint16(eo, le);
            if (tag === 0x8825) meta.hasGPS = true;
            if (tag === 0x010F) meta.hasCameraMake = true;
            if (tag === 0x0110) meta.hasCameraModel = true;
            if (tag === 0x0132) meta.hasDateTime = true;
            if (tag === 0x0131) meta.hasSoftware = true;
          }
        } catch {}
      }
      off += len - 2;
    } else if ((marker & 0xFF00) === 0xFF00) { if (marker === 0xFFDA) break; off += view.getUint16(off); }
    else break;
  }
  return meta;
}

function stripMetadata(file) {
  return new Promise(resolve => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(blob => { URL.revokeObjectURL(url); resolve({ blob, width: img.naturalWidth, height: img.naturalHeight, cleanSize: blob.size }); },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.95);
    };
    img.src = url;
  });
}

function formatBytes(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB'; }

export default function VibeCheck() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFiles = useCallback(async (fl) => {
    const imgs = Array.from(fl).filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return; setProcessing(true);
    const processed = await Promise.all(imgs.map(async file => {
      const buf = await file.arrayBuffer(); const meta = readExifData(buf);
      return { id: Date.now() + Math.random(), name: file.name, originalSize: file.size, type: file.type, preview: URL.createObjectURL(file), metadata: meta, originalFile: file, cleaned: null, status: 'scanned' };
    }));
    setFiles(prev => [...prev, ...processed]); setProcessing(false);
  }, []);

  const cleanFile = async (id) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'cleaning' } : f));
    const file = files.find(f => f.id === id); if (!file) return;
    const result = await stripMetadata(file.originalFile);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, cleaned: result, status: 'cleaned' } : f));
  };

  const cleanAll = async () => {
    setProcessing(true);
    for (const file of files) {
      if (file.status !== 'cleaned') {
        const result = await stripMetadata(file.originalFile);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, cleaned: result, status: 'cleaned' } : f));
      }
    }
    setProcessing(false);
  };

  const downloadFile = (file) => {
    if (!file.cleaned) return;
    const url = URL.createObjectURL(file.cleaned.blob); const a = document.createElement('a'); a.href = url;
    a.download = `clean_${file.name.replace(/\.[^.]+$/, '')}.${file.type === 'image/png' ? 'png' : 'jpg'}`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadAll = () => files.filter(f => f.cleaned).forEach(f => downloadFile(f));
  const removeFile = (id) => { setFiles(prev => { const f = prev.find(x => x.id === id); if (f) URL.revokeObjectURL(f.preview); return prev.filter(x => x.id !== id); }); };
  const clearAll = () => { files.forEach(f => URL.revokeObjectURL(f.preview)); setFiles([]); };

  const risky = files.filter(f => f.metadata.hasExif || f.metadata.hasGPS).length;
  const cleaned = files.filter(f => f.status === 'cleaned').length;
  const metaTags = (m) => {
    const tags = [];
    if (m.hasGPS) tags.push({ label: 'GPS', danger: true });
    if (m.hasExif) tags.push({ label: 'EXIF', danger: true });
    if (m.hasCameraMake) tags.push({ label: 'Camera', danger: false });
    if (m.hasDateTime) tags.push({ label: 'Date/Time', danger: false });
    if (m.hasSoftware) tags.push({ label: 'Software', danger: false });
    if (!tags.length) tags.push({ label: 'Clean', danger: false, safe: true });
    return tags;
  };

  const st = {
    btn: (c = T.purple) => ({ padding: '10px 20px', background: c, color: T.white, border: 'none', borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }),
    btnSm: (c = T.purple) => ({ padding: '6px 14px', background: c, color: T.white, border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }),
    tag: (danger, safe) => ({ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: safe ? 'rgba(34,197,94,0.1)' : danger ? 'rgba(204,26,26,0.12)' : 'rgba(147,112,219,0.1)', color: safe ? T.green : danger ? T.redLight : T.purpleLight, border: `1px solid ${safe ? 'rgba(34,197,94,0.2)' : danger ? 'rgba(204,26,26,0.2)' : 'rgba(147,112,219,0.2)'}` }),
    dropzone: { border: `2px dashed ${dragging ? T.purple : T.borderLight}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(75,0,130,0.05)' : 'transparent' },
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        Strip EXIF, GPS, and camera metadata before sharing.
        <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', color: T.green, border: '1px solid rgba(34,197,94,0.2)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>100% Client-Side</span>
      </div>

      {/* Dropzone */}
      <div style={st.dropzone} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }} onClick={() => fileInputRef.current?.click()}>
        <p style={{ fontSize: 14, color: T.textMuted }}>Drop images or <span style={{ color: T.purpleLight, textDecoration: 'underline' }}>browse</span></p>
        <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>JPG · PNG — we'll scan for hidden metadata</p>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => { processFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}`, marginBottom: 12, fontSize: 11, color: T.textMuted }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>Files: <strong style={{ color: T.text }}>{files.length}</strong></span>
            {risky > 0 && <span>Risky: <strong style={{ color: T.redLight }}>{risky}</strong></span>}
            <span>Cleaned: <strong style={{ color: T.green }}>{cleaned}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={st.btn(T.purple)} onClick={cleanAll} disabled={processing}>{processing ? 'Processing...' : 'Strip All'}</button>
            {cleaned > 0 && <button style={{ ...st.btnSm(T.elevated), border: `1px solid ${T.border}`, color: T.textMuted }} onClick={downloadAll}>⬇ Download All</button>}
            <button style={{ ...st.btnSm('transparent'), border: `1px solid ${T.redLight}44`, color: T.redLight }} onClick={clearAll}>Clear</button>
          </div>
        </div>
      )}

      {/* File cards */}
      {files.map(file => {
        const tags = metaTags(file.metadata);
        return (
          <div key={file.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 8, alignItems: 'center' }}>
            <img src={file.preview} alt={file.name} style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', border: `1px solid ${T.border}`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
                {formatBytes(file.originalSize)}{file.cleaned && <span> → {formatBytes(file.cleaned.cleanSize)} ({Math.round((1 - file.cleaned.cleanSize / file.originalSize) * 100)}% smaller)</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {file.status === 'cleaned' ? <span style={st.tag(false, true)}>✓ Metadata Stripped</span> : tags.map((tag, i) => <span key={i} style={st.tag(tag.danger, tag.safe)}>{tag.danger ? '⚠ ' : tag.safe ? '✓ ' : ''}{tag.label}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
              {file.status === 'cleaned' ? (
                <button style={st.btnSm(T.elevated)} onClick={() => downloadFile(file)}>⬇ Save</button>
              ) : (
                <button style={st.btnSm(T.purple)} onClick={() => cleanFile(file.id)} disabled={file.status === 'cleaning'}>{file.status === 'cleaning' ? 'Stripping...' : 'Strip'}</button>
              )}
              <button onClick={() => removeFile(file.id)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>×</button>
            </div>
          </div>
        );
      })}

      {!files.length && !processing && <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>Drop images to scan for hidden metadata. GPS, camera info, timestamps — gone in one click.</div>}
    </div>
  );
}
