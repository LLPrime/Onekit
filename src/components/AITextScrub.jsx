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
const MONO = `'JetBrains Mono', 'Fira Code', monospace`;

const PATTERNS = [
  { id: 'api_key', label: 'API Keys', color: '#cc1a1a', patterns: [/sk-[a-zA-Z0-9]{20,}/g, /sk-proj-[a-zA-Z0-9_-]{40,}/g, /sk-ant-[a-zA-Z0-9_-]{40,}/g, /AIza[0-9A-Za-z_-]{35}/g, /ghp_[a-zA-Z0-9]{36}/g, /gho_[a-zA-Z0-9]{36}/g, /glpat-[a-zA-Z0-9_-]{20,}/g, /xox[bpoas]-[a-zA-Z0-9-]{10,}/g, /AKIA[0-9A-Z]{16}/g, /Bearer\s+[a-zA-Z0-9_\-.]{20,}/g, /api[_-]?key["\s:=]+["']?[a-zA-Z0-9_\-.]{16,}["']?/gi, /secret["\s:=]+["']?[a-zA-Z0-9_\-.]{16,}["']?/gi] },
  { id: 'email', label: 'Emails', color: '#5eaedd', patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g] },
  { id: 'phone', label: 'Phone Numbers', color: '#9370db', patterns: [/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, /\+\d{1,3}[-.\s]?\d{4,14}/g] },
  { id: 'ssn', label: 'SSN', color: '#cc1a1a', patterns: [/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g] },
  { id: 'credit_card', label: 'Credit Cards', color: '#cc1a1a', patterns: [/\b(?:\d{4}[-\s]?){3}\d{4}\b/g] },
  { id: 'ip', label: 'IP Addresses', color: '#eab308', patterns: [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g] },
  { id: 'address', label: 'Addresses', color: '#eab308', patterns: [/\b\d{1,5}\s+[A-Za-z0-9\s.,]{5,}\b(?:St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pl|Cir|Pkwy|Hwy)\b\.?/gi] },
  { id: 'password', label: 'Passwords', color: '#cc1a1a', patterns: [/password["\s:=]+["']?[^\s"']{4,}["']?/gi, /passwd["\s:=]+["']?[^\s"']{4,}["']?/gi, /pwd["\s:=]+["']?[^\s"']{4,}["']?/gi] },
];

function findMatches(text, enabled) {
  const matches = [];
  for (const cat of PATTERNS.filter(p => enabled.includes(p.id))) {
    for (const regex of cat.patterns) {
      const re = new RegExp(regex.source, regex.flags); let m;
      while ((m = re.exec(text)) !== null) {
        if (!matches.some(x => m.index < x.end && m.index + m[0].length > x.start))
          matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], category: cat.id, label: cat.label, color: cat.color });
      }
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

function redactText(text, matches, mode) {
  if (!matches.length) return text;
  let result = '', last = 0;
  for (const m of matches) {
    result += text.slice(last, m.start);
    if (mode === 'asterisk') result += '\u2022'.repeat(m.text.length);
    else if (mode === 'label') result += `[${m.label.toUpperCase()} REDACTED]`;
    last = m.end;
  }
  return result + text.slice(last);
}

export default function AITextScrub() {
  const [input, setInput] = useState('');
  const [enabled, setEnabled] = useState(PATTERNS.map(p => p.id));
  const [mode, setMode] = useState('label');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const matches = findMatches(input, enabled);
  const scrubbed = redactText(input, matches, mode);

  const toggle = (id) => setEnabled(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const copy = useCallback(() => { navigator.clipboard.writeText(scrubbed).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }, [scrubbed]);

  const loadExample = () => setInput(`Hey team, here's the update from today's standup.\n\nMy API key is sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234.\nPlease don't share it with anyone outside the team.\n\nContact me at jonathan.smith@company.com or call (555) 867-5309.\nMy home address is 1425 Maple Drive, Austin TX 78701.\n\nThe database password is: Str0ngP@ss!2026\n\nOur AWS key is AKIAIOSFODNN7EXAMPLE and the\nserver IP is 192.168.1.105.\n\nAlso, the corporate card ending in 4532-8821-0093-7744\nneeds to be updated.\n\nSSN for the new hire paperwork: 123-45-6789\n\n— Sent from my iPhone`);

  const renderHighlighted = () => {
    if (!input || !matches.length) return input || '';
    const parts = []; let last = 0;
    for (const m of matches) {
      if (m.start > last) parts.push(<span key={`t-${last}`}>{input.slice(last, m.start)}</span>);
      parts.push(<span key={`m-${m.start}`} style={{ background: `${m.color}22`, border: `1px solid ${m.color}44`, borderRadius: 3, padding: '0 3px', color: m.color, fontWeight: 600 }} title={`${m.label}: ${m.text}`}>{m.text}</span>);
      last = m.end;
    }
    if (last < input.length) parts.push(<span key={`t-${last}`}>{input.slice(last)}</span>);
    return parts;
  };

  const st = {
    label: { fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    btn: (c = T.purple) => ({ padding: '10px 20px', background: c, color: T.white, border: 'none', borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }),
    btnSm: (c = T.purple) => ({ padding: '6px 14px', background: c, color: T.white, border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }),
    catToggle: (active, color) => ({ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', border: `1px solid ${active ? color + '55' : T.border}`, background: active ? color + '15' : 'transparent', color: active ? color : T.textDim }),
    modeBtn: (active) => ({ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', border: `1px solid ${active ? T.purple : T.border}`, background: active ? 'rgba(75,0,130,0.15)' : 'transparent', color: active ? T.purpleLight : T.textDim }),
    textarea: { width: '100%', minHeight: 200, padding: 16, borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontFamily: MONO, lineHeight: 1.6, resize: 'vertical', outline: 'none' },
    previewBox: { width: '100%', minHeight: 160, padding: 16, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: MONO, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: 400 },
    tab: (active) => ({ padding: '6px 14px', borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', border: `1px solid ${T.border}`, borderBottom: 'none', background: active ? T.surface : 'transparent', color: active ? T.text : T.textDim }),
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        Redact sensitive data before pasting into AI models.
        <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', color: T.green, border: '1px solid rgba(34,197,94,0.2)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>100% Client-Side</span>
      </div>

      {/* Category toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
        {PATTERNS.map(p => <button key={p.id} style={st.catToggle(enabled.includes(p.id), p.color)} onClick={() => toggle(p.id)}>{enabled.includes(p.id) ? '✓ ' : ''}{p.label}</button>)}
      </div>

      {/* Redact mode */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Redact Style</span>
        {[{ id: 'label', name: '[LABEL REDACTED]' }, { id: 'asterisk', name: '•••••••' }, { id: 'remove', name: 'Remove entirely' }].map(m =>
          <button key={m.id} style={st.modeBtn(mode === m.id)} onClick={() => setMode(m.id)}>{m.name}</button>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={st.label}>Input</span>
        <button onClick={loadExample} style={{ fontSize: 11, color: T.purpleLight, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', fontWeight: 600 }}>Load example</button>
      </div>
      <textarea style={st.textarea} value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your text here..." />

      {/* Stats */}
      {input && (
        <div style={{ display: 'flex', gap: 16, padding: '10px 0', fontSize: 11, color: T.textMuted }}>
          <span>Detections: <strong style={{ color: matches.length > 0 ? T.redLight : T.text }}>{matches.length}</strong></span>
          {matches.length > 0 && <span>Types: <strong style={{ color: T.text }}>{[...new Set(matches.map(m => m.label))].join(', ')}</strong></span>}
        </div>
      )}

      {/* Preview / Output */}
      {input && (
        <>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button style={st.tab(showPreview)} onClick={() => setShowPreview(true)}>Detected</button>
            <button style={st.tab(!showPreview)} onClick={() => setShowPreview(false)}>Scrubbed Output</button>
          </div>
          <div style={{ ...st.previewBox, color: showPreview ? T.text : T.green }}>{showPreview ? renderHighlighted() : scrubbed}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={st.btn(T.purple)} onClick={copy}>{copied ? '✓ Copied!' : 'Copy Scrubbed Text'}</button>
            <button style={{ ...st.btnSm(T.elevated), border: `1px solid ${T.border}`, color: T.textMuted }} onClick={() => { setInput(scrubbed); setShowPreview(false); }}>Apply Redactions</button>
            <button style={{ ...st.btnSm(T.elevated), border: `1px solid ${T.border}`, color: T.textMuted }} onClick={() => { setInput(''); setShowPreview(true); }}>Clear</button>
          </div>
        </>
      )}

      {!input && <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 13 }}>Paste text above to scan. Or <button onClick={loadExample} style={{ color: T.purpleLight, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', fontWeight: 600, fontSize: 13 }}>load an example</button>.</div>}
    </div>
  );
}
