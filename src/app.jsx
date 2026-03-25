import ClipBreaker from './components/ClipBreaker';
import GlyphStitcher from './components/GlyphStitcher';
import AITextScrub from './components/AITextScrub';
import VibeCheck from './components/VibeCheck';
import LLMSTxtGenerator from './components/LLMSTxtGenerator';
import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   ONEKIT — Every tool. One place.
   SVRD Holdings — v2.0
   
   20 Tools | Multi-Window | Lume Toggle | Device Toggle | QR Send
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── LUME THEME SYSTEM ──────────────────────────────────────────────────────
const LUME_THEMES = {
  'true-noir': {
    name: 'True Noir', icon: '🌑',
    bg: '#0a0a0a', surface: '#111111', elevated: '#1a1a1a',
    border: '#222222', borderLight: '#333333',
    red: '#8b0000', redLight: '#cc1a1a',
    purple: '#4b0082', purpleLight: '#9370db',
    text: '#e8e8e8', textMuted: '#888888', textDim: '#555555',
    white: '#ffffff', green: '#22c55e', yellow: '#eab308', orange: '#f97316',
    scrollTrack: '#0a0a0a', scrollThumb: '#222',
    selection: '#4b0082', selectionText: '#fff',
  },
  'paper-white': {
    name: 'Paper White', icon: '☀️',
    bg: '#f5f3ef', surface: '#ffffff', elevated: '#f0ede8',
    border: '#ddd8d0', borderLight: '#c8c2b8',
    red: '#8b0000', redLight: '#cc1a1a',
    purple: '#4b0082', purpleLight: '#6a3d9a',
    text: '#1a1a1a', textMuted: '#666666', textDim: '#999999',
    white: '#ffffff', green: '#16a34a', yellow: '#ca8a04', orange: '#ea580c',
    scrollTrack: '#f5f3ef', scrollThumb: '#ccc',
    selection: '#4b0082', selectionText: '#fff',
  },
  'concrete-gray': {
    name: 'Concrete', icon: '🌫️',
    bg: '#e4e2de', surface: '#d8d5d0', elevated: '#cecbc5',
    border: '#b8b4ad', borderLight: '#a8a49d',
    red: '#8b0000', redLight: '#cc1a1a',
    purple: '#4b0082', purpleLight: '#6a3d9a',
    text: '#1e1e1e', textMuted: '#555555', textDim: '#888888',
    white: '#ffffff', green: '#16a34a', yellow: '#ca8a04', orange: '#ea580c',
    scrollTrack: '#e4e2de', scrollThumb: '#aaa',
    selection: '#4b0082', selectionText: '#fff',
  },
};

const LumeContext = createContext();
function useLume() { return useContext(LumeContext); }
function getLumeFromStorage() { try { return localStorage.getItem('onekit-lume') || 'true-noir'; } catch { return 'true-noir'; } }
function getDeviceModeFromStorage() { try { return localStorage.getItem('onekit-device-mode') || 'auto'; } catch { return 'auto'; } }
function makeT(themeId) { return LUME_THEMES[themeId] || LUME_THEMES['true-noir']; }

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

// ─── TOOL REGISTRY ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'media', label: 'Media Tools', icon: '🎬' },
  { id: 'calculators', label: 'Calculators', icon: '🧮' },
  { id: 'converters', label: 'Converters', icon: '🔄' },
  { id: 'generators', label: 'Generators', icon: '⚡' },
  { id: 'text', label: 'Text Tools', icon: '📝' },
  { id: 'dev', label: 'Dev Tools', icon: '🛠️' },
];

const TOOLS = [
  { id: 'calculator', name: 'Calculator', cat: 'calculators', desc: 'Basic & scientific calculator', guide: 'A free online calculator for basic and scientific operations. Tap numbers and operators to build expressions, then hit equals. Supports percentage, sign flip, and backspace. Perfect for quick math without opening a separate app. Runs entirely in your browser — nothing is stored or sent anywhere.' },
  { id: 'percentage', name: 'Percentage Calculator', cat: 'calculators', desc: 'Find percentages instantly', guide: 'Three modes in one tool: find what X% of Y is, figure out what percentage X is of Y, or calculate the percentage change between two numbers. Enter your values and get results instantly. Ideal for discounts, markups, grade calculations, and financial estimates.' },
  { id: 'tip', name: 'Tip Calculator', cat: 'calculators', desc: 'Split bills & calculate tips', guide: 'Enter your bill total, choose a tip percentage (or type a custom one), and set the number of people splitting. Instantly see the tip amount, total bill, and per-person cost. Quick-select buttons for common tip rates: 10%, 15%, 18%, 20%, 25%.' },
  { id: 'bmi', name: 'BMI Calculator', cat: 'calculators', desc: 'Body mass index calculator', guide: 'Calculate your Body Mass Index in imperial (feet/inches/lbs) or metric (cm/kg). Enter your height and weight to see your BMI score with a color-coded category: Underweight, Normal, Overweight, or Obese. For informational purposes — consult a healthcare professional for medical advice.' },
  { id: 'unit-converter', name: 'Unit Converter', cat: 'converters', desc: 'Weight, length, temp, volume', guide: 'Convert between units across four categories: Length (meters, miles, feet, inches, etc.), Weight (kg, lbs, oz, tons), Temperature (Celsius, Fahrenheit, Kelvin), and Volume (liters, gallons, cups, fluid ounces). Select your category, pick your from/to units, and type a value. Conversion happens in real-time.' },
  { id: 'color-converter', name: 'Color Converter', cat: 'converters', desc: 'HEX, RGB, HSL converter', guide: 'Pick a color with the visual color picker or type a HEX code to instantly see its RGB and HSL equivalents. Each value has a copy button for quick use in CSS, design tools, or code. A live preview swatch shows the selected color.' },
  { id: 'base64', name: 'Base64 Encode/Decode', cat: 'converters', desc: 'Encode & decode Base64 strings', guide: 'Switch between Encode and Decode mode. Paste plain text to encode it to Base64, or paste a Base64 string to decode it back to readable text. Useful for embedding data in URLs, working with APIs, handling email attachments, or debugging encoded payloads.' },
  { id: 'password-gen', name: 'Password Generator', cat: 'generators', desc: 'Secure random passwords', guide: 'Generate cryptographically secure random passwords using your browser\'s native crypto API. Adjust the length slider (4-64 characters) and toggle character sets: uppercase, lowercase, numbers, and symbols. A strength meter shows your password\'s security rating. One-click copy to clipboard. No passwords are stored or transmitted — generation happens 100% locally.' },
  { id: 'lorem', name: 'Lorem Ipsum', cat: 'generators', desc: 'Placeholder text generator', guide: 'Generate placeholder text in three modes: paragraphs, sentences, or individual words. Set the count you need and copy the output with one click. Essential for mockups, wireframes, content layout testing, and design prototyping.' },
  { id: 'uuid', name: 'UUID Generator', cat: 'generators', desc: 'Generate unique UUIDs', guide: 'Generate RFC 4122 compliant UUIDs (v4) using your browser\'s native crypto API. Set the count (1-50) and generate a batch instantly. Copy individual UUIDs or all at once. Useful for database IDs, API keys, test data, and any system requiring globally unique identifiers.' },
  { id: 'word-counter', name: 'Word Counter', cat: 'text', desc: 'Count words, chars, sentences', guide: 'Paste or type any text to get instant counts: words, characters (with and without spaces), sentences, paragraphs, and estimated reading time. Perfect for writers checking article length, students hitting word count requirements, or SEO professionals optimizing content.' },
  { id: 'case-converter', name: 'Case Converter', cat: 'text', desc: 'UPPER, lower, Title, camelCase', guide: 'Transform text between seven case formats: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, and kebab-case. Paste your text, pick a format, and copy the result. Essential for developers formatting variable names, writers fixing capitalization, and content creators standardizing text.' },
  { id: 'json-formatter', name: 'JSON Formatter', cat: 'dev', desc: 'Format & validate JSON', guide: 'Paste raw or minified JSON to format it with proper indentation, or take formatted JSON and minify it to a single line. Validates your JSON and shows error messages with details if the syntax is invalid. Copy the result with one click. A must-have for API development, debugging responses, and working with config files.' },
  { id: 'regex', name: 'Regex Tester', cat: 'dev', desc: 'Test regular expressions live', guide: 'Enter a regular expression pattern and flags, then type or paste a test string. Matches highlight in real-time with their index positions and capture groups. Supports all JavaScript regex flags (g, i, m, s, u). Invaluable for building, testing, and debugging regular expressions for form validation, data parsing, and text processing.' },
  { id: 'hash-gen', name: 'Hash Generator', cat: 'dev', desc: 'SHA-1, SHA-256, SHA-384, SHA-512', guide: 'Type or paste any text to generate cryptographic hashes using SHA-1, SHA-256, SHA-384, and SHA-512 algorithms via the Web Crypto API. Each hash has a dedicated copy button. Useful for verifying file integrity, generating checksums, and working with security protocols. All hashing runs locally in your browser.' },
  { id: 'clipbreaker', name: 'ClipBreaker', cat: 'media', desc: 'Extract frames from video', guide: 'Drop a video file (up to 30 seconds) and ClipBreaker extracts individual frames as images. Choose between strip view and grid view. Adjust sensitivity to control how many frames are captured. Select individual frames or mark favorites, then export as individual images or a stitched contact sheet. All processing happens client-side — your video never leaves your device.' },
  { id: 'glyph-stitcher', name: 'Glyph Stitcher', cat: 'media', desc: 'Combine images into one', guide: 'The inverse of ClipBreaker. Drop multiple images and stitch them into a single output in three layout modes: Vertical stack, Horizontal row, or Grid (2x2, 3x3, 4x4). Drag thumbnails to reorder, adjust gap spacing, set background color or transparency, and choose output format (PNG, JPG, WebP) with quality control. Download the result instantly. 100% client-side — images never upload anywhere.' },
  { id: 'ai-text-scrub', name: 'AI-Text Scrub', cat: 'dev', desc: 'Redact PII & sensitive data', guide: 'Paste text you\'re about to send to an AI model and AI-Text Scrub automatically detects and highlights sensitive data: API keys (OpenAI, Anthropic, GitHub, AWS, Slack), emails, phone numbers, SSNs, credit card numbers, IP addresses, street addresses, and passwords. Choose your redaction style: labeled placeholders, asterisks, or full removal. Copy the clean text and paste it safely. Toggle individual detection categories on or off. Privacy-first — everything runs in your browser.' },
  { id: 'vibe-check', name: 'Vibe-Check', cat: 'media', desc: 'Strip EXIF/GPS from images', guide: 'Drop images and Vibe-Check scans for hidden metadata: GPS coordinates, camera make/model, timestamps, and software tags. See exactly what\'s embedded in your photos before sharing. Strip all metadata with one click — the tool redraws the image on a clean canvas, producing a pixel-identical copy with zero metadata. Download cleaned images individually or in bulk. Your photos never leave your browser.' },
  { id: 'llms-txt', name: 'LLMS.txt Generator', cat: 'dev', desc: 'Create AI-agent manifests', guide: 'Build an llms.txt file for your website — the 2026 standard for making your site readable by AI agents (similar to how robots.txt works for search crawlers). Fill in your site name, URL, and description, then add content sections: About, Documentation, API details, Contact, Pricing, Terms, and custom sections. Preview the output, copy to clipboard, or download as a file. Load an example to see the format in action.' },
];

// ─── SHARED STYLES (theme-aware) ────────────────────────────────────────────
function makeStyles(T) {
  return {
    input: { width: '100%', padding: '10px 14px', background: T.elevated, border: '1px solid '+T.border, borderRadius: 8, color: T.text, fontFamily: FONT, fontSize: 14, outline: 'none', transition: 'border-color 0.2s' },
    inputMono: { width: '100%', padding: '10px 14px', background: T.elevated, border: '1px solid '+T.border, borderRadius: 8, color: T.green, fontFamily: MONO, fontSize: 13, outline: 'none', transition: 'border-color 0.2s' },
    textarea: { width: '100%', padding: '12px 14px', background: T.elevated, border: '1px solid '+T.border, borderRadius: 8, color: T.text, fontFamily: FONT, fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 120, transition: 'border-color 0.2s' },
    textareaMono: { width: '100%', padding: '12px 14px', background: T.elevated, border: '1px solid '+T.border, borderRadius: 8, color: T.green, fontFamily: MONO, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 120, transition: 'border-color 0.2s' },
    btn: (color) => ({ padding: '10px 20px', background: color || T.purple, color: '#ffffff', border: 'none', borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8 }),
    btnSmall: (color) => ({ padding: '6px 14px', background: color || T.purple, color: '#ffffff', border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }),
    label: { fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
    result: { padding: '16px', background: T.surface, border: '1px solid '+T.border, borderRadius: 8, fontFamily: MONO, fontSize: 16, color: T.purpleLight, textAlign: 'center' },
    card: { background: T.surface, border: '1px solid '+T.border, borderRadius: 12, padding: 20, marginBottom: 16 },
  };
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const { T } = useLume();
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <button onClick={copy} style={{ padding: '6px 14px', background: copied ? T.green : T.purple, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{copied ? 'Copied!' : 'Copy'}</button>;
}

function AdSlot({ variant = 'banner' }) {
  const { T } = useLume();
  const heights = { banner: 90, sidebar: 250, leaderboard: 90, inline: 60 };
  return (
    <div style={{ minHeight: heights[variant] || 90, background: T.surface, border: '1px dashed '+T.borderLight, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: 11, margin: '20px 0' }}>
      Ad Space — {variant}
    </div>
  );
}

function PlaybookBanner() {
  const { T } = useLume();
  return (
    <a href="https://michaeljrelius.gumroad.com/l/lflaex" target="_blank" rel="noopener noreferrer" style={{ display: 'block', margin: '20px 0', padding: '16px 20px', background: 'linear-gradient(135deg, '+T.red+', '+T.purple+')', borderRadius: 12, textDecoration: 'none', color: '#fff', fontFamily: FONT, transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, marginBottom: 4 }}>From the creator of onekit</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>The Three Lane Playbook Lite. </div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>Strategy + Execution in one system. Free sample inside</div>
      <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 24, opacity: 0.3 }}>→</div>
    </a>
  );
}

// ─── QR CODE (compact canvas-based) ─────────────────────────────────────────
function QRCode({ data, size = 140 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    const c = canvasRef.current, ctx = c.getContext('2d');
    // Generate QR modules
    const mods = makeQRModules(data);
    const n = mods.length, cell = size / n;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (mods[r][col]) ctx.fillRect(col * cell, r * cell, cell + 0.5, cell + 0.5);
  }, [data, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 8, background: '#fff' }} />;
}

function makeQRModules(text) {
  const data = new TextEncoder().encode(text), len = data.length;
  const caps = [17, 32, 53, 78, 106, 134];
  let ver = 1;
  for (let i = 0; i < caps.length; i++) { if (len <= caps[i]) { ver = i + 1; break; } if (i === caps.length - 1) ver = i + 1; }
  const n = 17 + ver * 4;
  const g = Array.from({ length: n }, () => Array(n).fill(0));
  const res = Array.from({ length: n }, () => Array(n).fill(false));
  const pf = (r, c) => { for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) { const rr = r+dr, cc = c+dc; if (rr<0||rr>=n||cc<0||cc>=n) continue; res[rr][cc]=true; if (dr===-1||dr===7||dc===-1||dc===7) g[rr][cc]=0; else if (dr===0||dr===6||dc===0||dc===6) g[rr][cc]=1; else if (dr>=2&&dr<=4&&dc>=2&&dc<=4) g[rr][cc]=1; else g[rr][cc]=0; } };
  pf(0,0); pf(0,n-7); pf(n-7,0);
  for (let i=8;i<n-8;i++) { if(!res[6][i]){g[6][i]=i%2===0?1:0;res[6][i]=true;} if(!res[i][6]){g[i][6]=i%2===0?1:0;res[i][6]=true;} }
  g[n-8][8]=1; res[n-8][8]=true;
  for (let i=0;i<9;i++) { if(i<n){res[8][i]=true;res[i][8]=true;} if(n-1-i>=0&&n-1-i<n){res[8][n-1-i]=true;res[n-1-i][8]=true;} }
  if (ver >= 2) { const ap = [6, n-7]; for (const r of ap) for (const c of ap) { if (res[r]&&res[r][c]) continue; for (let dr=-2;dr<=2;dr++) for (let dc=-2;dc<=2;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n){res[rr][cc]=true;if(Math.abs(dr)===2||Math.abs(dc)===2||(dr===0&&dc===0))g[rr][cc]=1;else g[rr][cc]=0;}} } }
  const bits = [];
  bits.push(0,1,0,0);
  for (let i=7;i>=0;i--) bits.push((len>>i)&1);
  for (const b of data) for (let i=7;i>=0;i--) bits.push((b>>i)&1);
  for (let i=0;i<4&&bits.length<caps[ver-1]*8;i++) bits.push(0);
  while (bits.length%8!==0) bits.push(0);
  const pb=[0xEC,0x11]; let pi=0;
  while(bits.length<caps[ver-1]*8){const p=pb[pi%2];for(let i=7;i>=0;i--)bits.push((p>>i)&1);pi++;}
  let bi=0;
  for (let col=n-1;col>=0;col-=2) { if(col===6)col=5; for(let row=0;row<n;row++) for(let c=0;c<2;c++){const cc=col-c;const isUp=Math.floor((n-1-col)/2)%2===0;const rr=isUp?n-1-row:row;if(cc>=0&&cc<n&&rr>=0&&rr<n&&!res[rr][cc]){g[rr][cc]=bi<bits.length?bits[bi]:0;bi++;}} }
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if(!res[r][c]&&(r+c)%2===0) g[r][c]^=1;
  const fb=[1,1,1,0,1,1,1,1,1,0,0,0,1,0,0];
  const fp1=[[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
  const fp2=[[8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8]];
  for(let i=0;i<15;i++){const[r1,c1]=fp1[i];if(r1<n&&c1<n)g[r1][c1]=fb[i];if(i<14){const[r2,c2]=fp2[i];if(r2<n&&c2<n)g[r2][c2]=fb[i];}}
  return g;
}

// ─── SEND TO PHONE MODAL ────────────────────────────────────────────────────
function SendToPhoneModal({ toolId, toolName, onClose }) {
  const { T } = useLume();
  const url = 'https://onekit.tools/#/' + toolId;
  const [copied, setCopied] = useState(false);
  const copyLink = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:T.surface,borderRadius:16,padding:28,maxWidth:340,width:'100%',border:'1px solid '+T.border,textAlign:'center' }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:14,fontWeight:700,color:T.text,marginBottom:4 }}>Send to Phone</div>
        <div style={{ fontSize:12,color:T.textMuted,marginBottom:20 }}>Scan to open {toolName} on mobile</div>
        <div style={{ display:'flex',justifyContent:'center',marginBottom:20 }}><QRCode data={url} size={160} /></div>
        <div style={{ padding:'8px 12px',background:T.elevated,borderRadius:8,fontFamily:MONO,fontSize:11,color:T.purpleLight,marginBottom:16,wordBreak:'break-all' }}>{url}</div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={copyLink} style={{ flex:1,padding:'10px',background:copied?T.green:T.purple,color:'#fff',border:'none',borderRadius:8,fontFamily:FONT,fontSize:13,fontWeight:600,cursor:'pointer' }}>{copied?'Copied!':'Copy Link'}</button>
          <button onClick={onClose} style={{ padding:'10px 16px',background:T.elevated,color:T.textMuted,border:'1px solid '+T.border,borderRadius:8,fontFamily:FONT,fontSize:13,cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── MULTI-WINDOW SYSTEM ────────────────────────────────────────────────────
function WindowManager({ windows, setWindows, children }) {
  const bringToFront = (id) => { setWindows(ws => { const mx = Math.max(...ws.map(w => w.zIndex)); return ws.map(w => w.id === id ? { ...w, zIndex: mx + 1 } : w); }); };
  const closeWindow = (id) => { setWindows(ws => ws.filter(w => w.id !== id)); };
  const minimizeWindow = (id) => { setWindows(ws => ws.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w)); };
  const { T } = useLume();
  return (
    <>
      {children}
      {windows.map(win => { const TC = TOOL_COMPONENTS[win.toolId]; if (!TC || win.minimized) return null; return (<ToolWindow key={win.id} win={win} onFocus={()=>bringToFront(win.id)} onClose={()=>closeWindow(win.id)} onMinimize={()=>minimizeWindow(win.id)} ToolComp={TC} />); })}
      {windows.some(w => w.minimized) && (
        <div style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:99999,background:T.surface,borderTop:'1px solid '+T.border,padding:'6px 12px',display:'flex',gap:6,overflowX:'auto' }}>
          {windows.filter(w => w.minimized).map(w => { const tool = TOOLS.find(t => t.id === w.toolId); return (
            <button key={w.id} onClick={() => minimizeWindow(w.id)} style={{ padding:'6px 12px',background:T.elevated,border:'1px solid '+T.border,borderRadius:6,color:T.text,fontFamily:FONT,fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' }}>{tool?.name||'Tool'}</button>
          ); })}
        </div>
      )}
    </>
  );
}

function ToolWindow({ win, onFocus, onClose, onMinimize, ToolComp }) {
  const { T } = useLume();
  const [pos, setPos] = useState({ x: win.x||60, y: win.y||60 });
  const [maximized, setMaximized] = useState(false);
  const [showSP, setShowSP] = useState(false);
  const tool = TOOLS.find(t => t.id === win.toolId);
  const handleDrag = (e) => { if(maximized)return; e.preventDefault(); onFocus(); const sx=e.clientX-pos.x,sy=e.clientY-pos.y; const mv=(ev)=>setPos({x:ev.clientX-sx,y:Math.max(0,ev.clientY-sy)}); const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);}; document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up); };
  const ws = maximized ? {position:'fixed',inset:0,zIndex:win.zIndex} : {position:'fixed',left:pos.x,top:pos.y,width:win.w||480,zIndex:win.zIndex};
  return (
    <>
      <div style={{ ...ws, background:T.bg, border:maximized?'none':'1px solid '+T.border, borderRadius:maximized?0:12, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', maxHeight:maximized?'100dvh':(win.h||520) }} onClick={onFocus}>
        <div onMouseDown={handleDrag} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:T.surface,borderBottom:'1px solid '+T.border,cursor:maximized?'default':'grab',userSelect:'none',flexShrink:0 }}>
          <div style={{ display:'flex',gap:6,flexShrink:0 }}>
            <button onClick={onClose} style={{ width:12,height:12,borderRadius:6,background:'#ff5f57',border:'none',cursor:'pointer',padding:0 }} />
            <button onClick={onMinimize} style={{ width:12,height:12,borderRadius:6,background:'#febd2f',border:'none',cursor:'pointer',padding:0 }} />
            <button onClick={()=>setMaximized(m=>!m)} style={{ width:12,height:12,borderRadius:6,background:'#28c840',border:'none',cursor:'pointer',padding:0 }} />
          </div>
          <div style={{ flex:1,fontSize:12,fontWeight:700,color:T.text,textAlign:'center' }}>{tool?.name||'Tool'}</div>
          <button onClick={()=>setShowSP(true)} title="Send to Phone" style={{ background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:14,padding:'2px 4px' }}>📱</button>
        </div>
        <div style={{ flex:1,overflow:'auto',padding:16 }}><ToolComp theme={T} /></div>
      </div>
      {showSP && <SendToPhoneModal toolId={win.toolId} toolName={tool?.name} onClose={()=>setShowSP(false)} />}
    </>
  );
}

// ─── TOOL IMPLEMENTATIONS ───────────────────────────────────────────────────
function Calculator() {
  const { T, s } = useLume();
  const [display, setDisplay] = useState('0'); const [expr, setExpr] = useState('');
  const press = (v) => {
    if (v==='C'){setDisplay('0');setExpr('');return;} if(v==='⌫'){setDisplay(d=>d.length>1?d.slice(0,-1):'0');return;}
    if (v==='='){try{const safe=expr.replace(/×/g,'*').replace(/÷/g,'/');const res=Function("'use strict'; return ("+safe+")")();setDisplay(String(parseFloat(res.toFixed(10))));setExpr(String(parseFloat(res.toFixed(10))));}catch{setDisplay('Error');setExpr('');}return;}
    if(v==='±'){setDisplay(d=>d.startsWith('-')?d.slice(1):'-'+d);setExpr(e=>e.startsWith('-')?e.slice(1):'-'+e);return;}
    if(v==='%'){try{setDisplay(d=>String(parseFloat(d)/100));setExpr(e=>String(parseFloat(e)/100));}catch{}return;}
    const ne=expr===''&&display==='0'?v:expr+v; setExpr(ne); setDisplay(display==='0'&&!'+-×÷.'.includes(v)?v:display+v);
  };
  const btns=['C','±','%','÷','7','8','9','×','4','5','6','-','1','2','3','+','0','.','⌫','='];
  const isOp=(b)=>['÷','×','-','+','='].includes(b);
  return (<div>
    <div style={{background:T.elevated,borderRadius:12,padding:'20px 16px 12px',marginBottom:16,textAlign:'right'}}>
      <div style={{fontSize:13,color:T.textDim,minHeight:18,fontFamily:MONO}}>{expr||' '}</div>
      <div style={{fontSize:36,fontWeight:700,fontFamily:MONO,color:T.text,wordBreak:'break-all'}}>{display}</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:8}}>
      {btns.map(b=>(<button key={b} onClick={()=>press(b)} style={{padding:'16px 0',fontSize:18,fontWeight:600,fontFamily:FONT,border:'none',borderRadius:10,cursor:'pointer',background:b==='='?T.red:isOp(b)?T.purple:b==='C'?T.borderLight:T.elevated,color:'#ffffff',transition:'all 0.15s'}}>{b}</button>))}
    </div>
  </div>);
}

function PercentageCalc() {
  const { T, s } = useLume();
  const [mode,setMode]=useState(0); const [a,setA]=useState(''); const [b,setB]=useState('');
  const modes=['What is X% of Y?','X is what % of Y?','% change from X to Y'];
  const calc=()=>{const x=parseFloat(a),y=parseFloat(b);if(isNaN(x)||isNaN(y))return '—';if(mode===0)return((x/100)*y).toFixed(2);if(mode===1)return((x/y)*100).toFixed(2)+'%';return(((y-x)/Math.abs(x))*100).toFixed(2)+'%';};
  return (<div>
    <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>{modes.map((m,i)=>(<button key={i} onClick={()=>{setMode(i);setA('');setB('');}} style={{...s.btnSmall(mode===i?T.purple:T.elevated),border:'1px solid '+(mode===i?T.purple:T.border)}}>{m}</button>))}</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
      <div><label style={s.label}>{mode===2?'From':mode===1?'Value':'Percentage'}</label><input style={s.input} type='number' value={a} onChange={e=>setA(e.target.value)} placeholder='0' /></div>
      <div><label style={s.label}>{mode===2?'To':mode===1?'Total':'Number'}</label><input style={s.input} type='number' value={b} onChange={e=>setB(e.target.value)} placeholder='0' /></div>
    </div>
    <div style={s.result}>{calc()}</div>
  </div>);
}

function TipCalc() {
  const { T, s } = useLume();
  const [bill,setBill]=useState(''); const [tip,setTip]=useState(18); const [split,setSplit]=useState(1);
  const b=parseFloat(bill)||0; const tipAmt=b*(tip/100); const total=b+tipAmt; const pp=split>0?total/split:total;
  return (<div>
    <label style={s.label}>Bill Amount ($)</label>
    <input style={{...s.input,marginBottom:16}} type='number' value={bill} onChange={e=>setBill(e.target.value)} placeholder='0.00' />
    <label style={s.label}>Tip: {tip}%</label>
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {[10,15,18,20,25].map(t=>(<button key={t} onClick={()=>setTip(t)} style={{...s.btnSmall(tip===t?T.purple:T.elevated),border:'1px solid '+(tip===t?T.purple:T.border)}}>{t}%</button>))}
      <input type='number' value={tip} onChange={e=>setTip(Number(e.target.value))} style={{...s.input,width:70}} />
    </div>
    <label style={s.label}>Split Between</label>
    <input style={{...s.input,marginBottom:20,width:80}} type='number' min='1' value={split} onChange={e=>setSplit(Math.max(1,parseInt(e.target.value)||1))} />
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
      <div style={s.result}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Tip</div>${tipAmt.toFixed(2)}</div>
      <div style={s.result}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Total</div>${total.toFixed(2)}</div>
      <div style={{...s.result,color:T.green}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Per Person</div>${pp.toFixed(2)}</div>
    </div>
  </div>);
}

function BMICalc() {
  const { T, s } = useLume();
  const [unit,setUnit]=useState('imperial'); const [h1,setH1]=useState(''); const [h2,setH2]=useState(''); const [w,setW]=useState('');
  const calc=()=>{const wt=parseFloat(w);if(unit==='imperial'){const i2=(parseFloat(h1)||0)*12+(parseFloat(h2)||0);if(!i2||!wt)return null;return(703*wt)/(i2*i2);}const cm=parseFloat(h1);if(!cm||!wt)return null;return wt/((cm/100)**2);};
  const bmi=calc(); const cat=bmi?(bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese'):null;
  const catColor=bmi?(bmi<18.5?T.yellow:bmi<25?T.green:bmi<30?T.orange:T.red):T.textMuted;
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:16}}>{['imperial','metric'].map(u=>(<button key={u} onClick={()=>{setUnit(u);setH1('');setH2('');setW('');}} style={{...s.btnSmall(unit===u?T.purple:T.elevated),border:'1px solid '+(unit===u?T.purple:T.border),textTransform:'capitalize'}}>{u}</button>))}</div>
    <div style={{display:'grid',gridTemplateColumns:unit==='imperial'?'1fr 1fr':'1fr',gap:12,marginBottom:12}}>
      <div><label style={s.label}>{unit==='imperial'?'Feet':'Height (cm)'}</label><input style={s.input} type='number' value={h1} onChange={e=>setH1(e.target.value)} /></div>
      {unit==='imperial'&&<div><label style={s.label}>Inches</label><input style={s.input} type='number' value={h2} onChange={e=>setH2(e.target.value)} /></div>}
    </div>
    <label style={s.label}>Weight ({unit==='imperial'?'lbs':'kg'})</label>
    <input style={{...s.input,marginBottom:20}} type='number' value={w} onChange={e=>setW(e.target.value)} />
    {bmi&&(<div style={{...s.result,color:catColor}}><div style={{fontSize:32,fontWeight:700}}>{bmi.toFixed(1)}</div><div style={{fontSize:14,marginTop:4}}>{cat}</div></div>)}
  </div>);
}

function UnitConverter() {
  const { T, s } = useLume();
  const units={Length:{m:1,km:1000,cm:0.01,mm:0.001,mi:1609.344,yd:0.9144,ft:0.3048,in:0.0254},Weight:{kg:1,g:0.001,mg:0.000001,lb:0.453592,oz:0.0283495,ton:907.185},Temperature:{'°C':'c','°F':'f','K':'k'},Volume:{L:1,mL:0.001,gal:3.78541,qt:0.946353,cup:0.236588,'fl oz':0.0295735}};
  const [cat,setCat]=useState('Length'); const [from,setFrom]=useState(''); const [to,setTo]=useState('');
  const [fromU,setFromU]=useState(''); const [toU,setToU]=useState('');
  useEffect(()=>{const k=Object.keys(units[cat]);setFromU(k[0]);setToU(k[1]||k[0]);setFrom('');setTo('');},[cat]);
  const convert=(val,fu,tu)=>{if(!val||val==='')return'';const v=parseFloat(val);if(isNaN(v))return'';if(cat==='Temperature'){let c;if(fu==='°C')c=v;else if(fu==='°F')c=(v-32)*5/9;else c=v-273.15;if(tu==='°C')return c.toFixed(4);if(tu==='°F')return(c*9/5+32).toFixed(4);return(c+273.15).toFixed(4);}const base=v*units[cat][fu];return(base/units[cat][tu]).toFixed(6).replace(/\.?0+$/,'');};
  return (<div>
    <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>{Object.keys(units).map(c=>(<button key={c} onClick={()=>setCat(c)} style={{...s.btnSmall(cat===c?T.purple:T.elevated),border:'1px solid '+(cat===c?T.purple:T.border)}}>{c}</button>))}</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div><label style={s.label}>From</label><select value={fromU} onChange={e=>{setFromU(e.target.value);setTo(convert(from,e.target.value,toU));}} style={{...s.input,marginBottom:8}}>{Object.keys(units[cat]).map(u=><option key={u} value={u}>{u}</option>)}</select><input style={s.input} type='number' value={from} onChange={e=>{setFrom(e.target.value);setTo(convert(e.target.value,fromU,toU));}} placeholder='0' /></div>
      <div><label style={s.label}>To</label><select value={toU} onChange={e=>{setToU(e.target.value);setTo(convert(from,fromU,e.target.value));}} style={{...s.input,marginBottom:8}}>{Object.keys(units[cat]).map(u=><option key={u} value={u}>{u}</option>)}</select><input style={s.inputMono} readOnly value={to} placeholder='—' /></div>
    </div>
  </div>);
}

function ColorConverter() {
  const { T, s } = useLume();
  const [hex,setHex]=useState('#8b0000');
  const hexToRgb=(h)=>{const m=h.replace('#','').match(/.{2}/g);return m?m.map(x=>parseInt(x,16)):[0,0,0];};
  const rgbToHsl=([r,g,b])=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s2=0;if(mx!==mn){const d=mx-mn;s2=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}return[Math.round(h*360),Math.round(s2*100),Math.round(l*100)];};
  const rgb=hexToRgb(hex); const hsl=rgbToHsl(rgb);
  return (<div>
    <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:20}}>
      <input type='color' value={hex} onChange={e=>setHex(e.target.value)} style={{width:60,height:60,border:'none',borderRadius:8,cursor:'pointer',background:'none'}} />
      <div style={{flex:1}}><label style={s.label}>HEX</label><input style={s.inputMono} value={hex} onChange={e=>setHex(e.target.value)} /></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div style={s.card}><div style={{fontSize:11,color:T.textMuted,marginBottom:6}}>RGB</div><div style={{fontFamily:MONO,color:T.green}}>{'rgb('+rgb.join(', ')+')'}</div><CopyBtn text={'rgb('+rgb.join(', ')+')'} /></div>
      <div style={s.card}><div style={{fontSize:11,color:T.textMuted,marginBottom:6}}>HSL</div><div style={{fontFamily:MONO,color:T.green}}>{'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)'}</div><CopyBtn text={'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)'} /></div>
    </div>
    <div style={{height:48,borderRadius:8,background:hex,marginTop:12,border:'1px solid '+T.border}} />
  </div>);
}

function Base64Tool() {
  const { T, s } = useLume();
  const [input,setInput]=useState(''); const [output,setOutput]=useState(''); const [mode,setMode]=useState('encode');
  const run=(val,m)=>{try{setOutput(m==='encode'?btoa(val):atob(val));}catch{setOutput('Invalid input');}};
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:16}}>{['encode','decode'].map(m=>(<button key={m} onClick={()=>{setMode(m);setInput('');setOutput('');}} style={{...s.btnSmall(mode===m?T.purple:T.elevated),border:'1px solid '+(mode===m?T.purple:T.border),textTransform:'capitalize'}}>{m}</button>))}</div>
    <label style={s.label}>Input</label>
    <textarea style={s.textarea} value={input} onChange={e=>{setInput(e.target.value);run(e.target.value,mode);}} placeholder={mode==='encode'?'Enter text to encode...':'Enter Base64 to decode...'} />
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'12px 0 6px'}}><label style={{...s.label,margin:0}}>Output</label>{output&&<CopyBtn text={output} />}</div>
    <textarea style={s.textareaMono} readOnly value={output} />
  </div>);
}

function PasswordGen() {
  const { T, s } = useLume();
  const [len,setLen]=useState(16); const [opts,setOpts]=useState({upper:true,lower:true,numbers:true,symbols:true}); const [pw,setPw]=useState('');
  const generate=useCallback(()=>{let chars='';if(opts.upper)chars+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';if(opts.lower)chars+='abcdefghijklmnopqrstuvwxyz';if(opts.numbers)chars+='0123456789';if(opts.symbols)chars+='!@#$%^&*()_+-=[]{}|;:,.<>?';if(!chars)return;const arr=new Uint32Array(len);crypto.getRandomValues(arr);setPw(Array.from(arr,v=>chars[v%chars.length]).join(''));},[len,opts]);
  useEffect(()=>{generate();},[generate]);
  const strength=len>=20&&Object.values(opts).filter(Boolean).length>=3?'Strong':len>=12?'Good':'Weak';
  const sc=strength==='Strong'?T.green:strength==='Good'?T.yellow:T.red;
  return (<div>
    <div style={{...s.result,fontSize:20,wordBreak:'break-all',letterSpacing:1,marginBottom:16,position:'relative'}}>{pw}<div style={{position:'absolute',top:8,right:8}}><CopyBtn text={pw} /></div></div>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span style={{fontSize:12,color:sc,fontWeight:700}}>{strength}</span><div style={{flex:1,height:4,background:T.border,borderRadius:2}}><div style={{width:strength==='Strong'?'100%':strength==='Good'?'60%':'30%',height:'100%',background:sc,borderRadius:2,transition:'all 0.3s'}} /></div></div>
    <label style={s.label}>Length: {len}</label>
    <input type='range' min='4' max='64' value={len} onChange={e=>setLen(Number(e.target.value))} style={{width:'100%',marginBottom:16,accentColor:T.purple}} />
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{Object.keys(opts).map(k=>(<button key={k} onClick={()=>setOpts(o=>({...o,[k]:!o[k]}))} style={{...s.btnSmall(opts[k]?T.purple:T.elevated),border:'1px solid '+(opts[k]?T.purple:T.border),textTransform:'capitalize'}}>{k}</button>))}</div>
    <button onClick={generate} style={s.btn(T.red)}>Generate New</button>
  </div>);
}

function LoremIpsum() {
  const { T, s } = useLume();
  const words='lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  const [count,setCount]=useState(3); const [type,setType]=useState('paragraphs');
  const gen=()=>{if(type==='words')return Array.from({length:count},(_,i)=>words[i%words.length]).join(' ');if(type==='sentences')return Array.from({length:count},()=>{const l=8+Math.floor(Math.random()*12);return Array.from({length:l},()=>words[Math.floor(Math.random()*words.length)]).join(' ')+'.';}).join(' ');return Array.from({length:count},()=>{const sc=3+Math.floor(Math.random()*4);return Array.from({length:sc},()=>{const l=8+Math.floor(Math.random()*12);let s=Array.from({length:l},()=>words[Math.floor(Math.random()*words.length)]).join(' ')+'.';return s.charAt(0).toUpperCase()+s.slice(1);}).join(' ');}).join('\n\n');};
  const text=gen();
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:16}}>{['paragraphs','sentences','words'].map(t=>(<button key={t} onClick={()=>setType(t)} style={{...s.btnSmall(type===t?T.purple:T.elevated),border:'1px solid '+(type===t?T.purple:T.border),textTransform:'capitalize'}}>{t}</button>))}</div>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><label style={{...s.label,margin:0}}>Count:</label><input type='number' min='1' max='50' value={count} onChange={e=>setCount(Math.max(1,parseInt(e.target.value)||1))} style={{...s.input,width:70}} /><CopyBtn text={text} /></div>
    <div style={{...s.textarea,minHeight:200,whiteSpace:'pre-wrap',color:T.textMuted,fontSize:13}}>{text}</div>
  </div>);
}

function UUIDGen() {
  const { T, s } = useLume();
  const gen=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16);});
  const [uuids,setUuids]=useState(()=>Array.from({length:5},gen)); const [count,setCount]=useState(5);
  return (<div>
    <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16}}><label style={{...s.label,margin:0}}>Count:</label><input type='number' min='1' max='50' value={count} onChange={e=>setCount(Math.max(1,parseInt(e.target.value)||1))} style={{...s.input,width:70}} /><button onClick={()=>setUuids(Array.from({length:count},gen))} style={s.btn(T.red)}>Generate</button></div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>{uuids.map((u,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,background:T.elevated,padding:'8px 12px',borderRadius:6,fontFamily:MONO,fontSize:13,color:T.purpleLight}}><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{u}</span><CopyBtn text={u} /></div>))}</div>
    <button onClick={()=>navigator.clipboard.writeText(uuids.join('\n'))} style={{...s.btn(T.purple),marginTop:12,width:'100%'}}>Copy All</button>
  </div>);
}

function WordCounter() {
  const { T, s } = useLume();
  const [text,setText]=useState('');
  const words=text.trim()?text.trim().split(/\s+/).length:0; const chars=text.length; const charsNoSpace=text.replace(/\s/g,'').length;
  const sentences=text.trim()?(text.match(/[.!?]+/g)||[]).length||(text.trim()?1:0):0;
  const paragraphs=text.trim()?text.split(/\n\n+/).filter(p=>p.trim()).length:0; const readTime=Math.max(1,Math.ceil(words/200));
  return (<div>
    <textarea style={{...s.textarea,minHeight:160}} value={text} onChange={e=>setText(e.target.value)} placeholder='Paste or type your text here...' />
    <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:10,marginTop:16}}>
      {[['Words',words],['Characters',chars],['No Spaces',charsNoSpace],['Sentences',sentences],['Paragraphs',paragraphs],['Read Time',readTime+'m']].map(([label,val])=>(<div key={label} style={{...s.result,padding:12}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{label}</div><div style={{fontSize:20,fontWeight:700}}>{val}</div></div>))}
    </div>
  </div>);
}

function CaseConverter() {
  const { T, s } = useLume();
  const [text,setText]=useState('');
  const cases={UPPERCASE:t=>t.toUpperCase(),lowercase:t=>t.toLowerCase(),'Title Case':t=>t.replace(/\w\S*/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()),'Sentence case':t=>t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g,c=>c.toUpperCase()),camelCase:t=>t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g,(_,c)=>c.toUpperCase()),'snake_case':t=>t.toLowerCase().replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,''),'kebab-case':t=>t.toLowerCase().replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')};
  const [active,setActive]=useState('UPPERCASE'); const result=text?cases[active](text):'';
  return (<div>
    <textarea style={s.textarea} value={text} onChange={e=>setText(e.target.value)} placeholder='Enter your text...' />
    <div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'12px 0'}}>{Object.keys(cases).map(c=>(<button key={c} onClick={()=>setActive(c)} style={{...s.btnSmall(active===c?T.purple:T.elevated),border:'1px solid '+(active===c?T.purple:T.border)}}>{c}</button>))}</div>
    {result&&(<div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><label style={{...s.label,margin:0}}>Result</label><CopyBtn text={result} /></div><div style={{...s.textareaMono,minHeight:80,whiteSpace:'pre-wrap'}}>{result}</div></div>)}
  </div>);
}

function JSONFormatter() {
  const { T, s } = useLume();
  const [input,setInput]=useState(''); const [output,setOutput]=useState(''); const [error,setError]=useState('');
  const format=(indent=2)=>{try{const p=JSON.parse(input);setOutput(JSON.stringify(p,null,indent));setError('');}catch(e){setError(e.message);setOutput('');}};
  const minify=()=>{try{setOutput(JSON.stringify(JSON.parse(input)));setError('');}catch(e){setError(e.message);setOutput('');}};
  return (<div>
    <label style={s.label}>Input JSON</label>
    <textarea style={s.textareaMono} value={input} onChange={e=>setInput(e.target.value)} placeholder='{"key": "value"}' />
    <div style={{display:'flex',gap:8,margin:'12px 0'}}><button onClick={()=>format(2)} style={s.btn(T.purple)}>Format</button><button onClick={minify} style={s.btn(T.elevated)}>Minify</button>{output&&<CopyBtn text={output} />}</div>
    {error&&<div style={{color:T.red,fontSize:13,fontFamily:MONO,marginBottom:8}}>{error}</div>}
    {output&&<textarea style={{...s.textareaMono,minHeight:200}} readOnly value={output} />}
  </div>);
}

function RegexTester() {
  const { T, s } = useLume();
  const [pattern,setPattern]=useState(''); const [flags,setFlags]=useState('g'); const [text,setText]=useState('');
  const [matches,setMatches]=useState([]);
  useEffect(()=>{if(!pattern||!text){setMatches([]);return;}try{const re=new RegExp(pattern,flags);const m=[];let match;if(flags.includes('g')){while((match=re.exec(text))!==null){m.push({value:match[0],index:match.index,groups:match.slice(1)});if(!match[0])break;}}else{match=re.exec(text);if(match)m.push({value:match[0],index:match.index,groups:match.slice(1)});}setMatches(m);}catch{setMatches([]);};},[pattern,flags,text]);
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:12}}>
      <div style={{flex:1}}><label style={s.label}>Pattern</label><input style={s.inputMono} value={pattern} onChange={e=>setPattern(e.target.value)} placeholder='[a-z]+' /></div>
      <div style={{width:80}}><label style={s.label}>Flags</label><input style={s.inputMono} value={flags} onChange={e=>setFlags(e.target.value)} placeholder='g' /></div>
    </div>
    <label style={s.label}>Test String</label>
    <textarea style={s.textarea} value={text} onChange={e=>setText(e.target.value)} placeholder='Enter text to test against...' />
    <div style={{marginTop:12,fontSize:13}}><span style={{color:T.textMuted}}>Matches: </span><span style={{color:matches.length?T.green:T.textDim,fontWeight:700}}>{matches.length}</span></div>
    {matches.length>0&&(<div style={{display:'flex',flexDirection:'column',gap:4,marginTop:8}}>{matches.slice(0,50).map((m,i)=>(<div key={i} style={{display:'flex',gap:8,alignItems:'center',fontSize:12,fontFamily:MONO,padding:'4px 8px',background:T.elevated,borderRadius:4}}><span style={{color:T.textDim}}>#{i}</span><span style={{color:T.purpleLight}}>'{m.value}'</span><span style={{color:T.textDim}}>@{m.index}</span>{m.groups.length>0&&<span style={{color:T.yellow}}>groups: [{m.groups.join(', ')}]</span>}</div>))}</div>)}
  </div>);
}

function HashGen() {
  const { T, s } = useLume();
  const [input,setInput]=useState(''); const [hashes,setHashes]=useState({});
  const compute=async(val)=>{if(!val){setHashes({});return;}const enc=new TextEncoder().encode(val);const results={};for(const algo of['SHA-1','SHA-256','SHA-384','SHA-512']){const buf=await crypto.subtle.digest(algo,enc);results[algo]=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}setHashes(results);};
  return (<div>
    <label style={s.label}>Input Text</label>
    <textarea style={s.textarea} value={input} onChange={e=>{setInput(e.target.value);compute(e.target.value);}} placeholder='Enter text to hash...' />
    {Object.keys(hashes).length>0&&(<div style={{display:'flex',flexDirection:'column',gap:8,marginTop:16}}>{Object.entries(hashes).map(([algo,hash])=>(<div key={algo} style={s.card}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><span style={{fontSize:12,fontWeight:700,color:T.purpleLight}}>{algo}</span><CopyBtn text={hash} /></div><div style={{fontFamily:MONO,fontSize:11,color:T.green,wordBreak:'break-all'}}>{hash}</div></div>))}</div>)}
  </div>);
}

// ─── TOOL MAP ────────────────────────────────────────────────────────────────
const TOOL_COMPONENTS = {
  'calculator': Calculator, 'percentage': PercentageCalc, 'tip': TipCalc, 'bmi': BMICalc,
  'unit-converter': UnitConverter, 'color-converter': ColorConverter, 'base64': Base64Tool,
  'password-gen': PasswordGen, 'lorem': LoremIpsum, 'uuid': UUIDGen,
  'word-counter': WordCounter, 'case-converter': CaseConverter,
  'json-formatter': JSONFormatter, 'regex': RegexTester, 'hash-gen': HashGen, 'clipbreaker': ClipBreaker,
  'glyph-stitcher': GlyphStitcher, 'ai-text-scrub': AITextScrub, 'vibe-check': VibeCheck,
  'llms-txt': LLMSTxtGenerator,
};


// ─── TOOL GUIDE (collapsible how-to-use) ────────────────────────────────────
function ToolGuide({ text }) {
  const { T } = useLume();
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div style={{ margin: '0 0 16px', borderRadius: 10, border: '1px solid '+T.border, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '12px 16px', background: T.surface, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.text }}>
        <span>How to use this tool</span>
        <span style={{ color: T.purpleLight, fontSize: 16, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px 16px', fontSize: 13, lineHeight: 1.7, color: T.textMuted, borderTop: '1px solid '+T.border }}>
          {text}
        </div>
      )}
    </div>
  );
}

// ─── FEATURES PAGE ──────────────────────────────────────────────────────────
function FeaturesPage() {
  const { T } = useLume();
  const goHome = () => { window.location.hash = ''; };
  const features = [
    { icon: '⧉', name: 'Multi-Window', desc: 'Open multiple tools at the same time in independent floating windows. Drag to reposition, minimize to the taskbar, or maximize to full screen. Each window has its own state — use a calculator while referencing a color converter without switching back and forth.' },
    { icon: '📱', name: 'Send to Phone', desc: 'Tap the phone icon on any tool to generate a QR code linking directly to that tool. Scan with your phone camera to instantly open the same tool on mobile. Also includes a copy-link button for sharing via text or messaging apps.' },
    { icon: '🌑', name: 'Lume Toggle', desc: 'Three visual themes: True Noir (dark, high-contrast default), Paper White (warm light mode), and Concrete (muted gray). Your preference is saved automatically — OneKit remembers your chosen theme every time you return.' },
    { icon: '🔀', name: 'Device Toggle', desc: 'Override the automatic responsive layout. Force desktop view on mobile to see the full-width grid, or force mobile view on desktop to preview how tools look on smaller screens. Useful for developers testing responsive behavior.' },
  ];
  return (
    <div style={{ background: T.bg, minHeight: '100dvh', fontFamily: FONT, color: T.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid '+T.border, background: T.surface }}>
        <button onClick={goHome} style={{ background: 'none', border: 'none', color: T.purpleLight, fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Features</div>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, marginBottom: 8 }}>Platform Features</h1>
        <p style={{ color: T.textMuted, marginBottom: 32, fontSize: 14, lineHeight: 1.6 }}>OneKit is more than a collection of tools. These platform features make it faster, more flexible, and truly yours.</p>
        {features.map(f => (
          <div key={f.name} style={{ padding: 20, borderRadius: 12, background: T.surface, border: '1px solid '+T.border, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{f.name}</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: T.textMuted, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
        <div style={{ textAlign: 'center', padding: '32px 0 0', borderTop: '1px solid '+T.border, fontSize: 12, color: T.textDim, marginTop: 24 }}>
          {'© ' + new Date().getFullYear() + ' SVRD Holdings · '}<span style={{ color: T.purpleLight }}>OneKit</span>{' · Every tool. One place.'}
        </div>
      </div>
    </div>
  );
}
// ─── PAGES ──────────────────────────────────────────────────────────────────
function PrivacyPage() {
  const { T } = useLume();
  const goHome=()=>{window.location.hash='';};
  return (<div style={{background:T.bg,minHeight:'100dvh',fontFamily:FONT,color:T.text}}>
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 20px',borderBottom:'1px solid '+T.border,background:T.surface}}>
      <button onClick={goHome} style={{background:'none',border:'none',color:T.purpleLight,fontSize:20,cursor:'pointer',padding:0}}>←</button>
      <div style={{fontSize:16,fontWeight:700,color:T.text}}>Privacy Policy</div>
    </div>
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 20px 60px',lineHeight:1.7,fontSize:14,color:T.textMuted}}>
      <h1 style={{fontSize:28,fontWeight:800,color:T.text,marginBottom:8}}>Privacy Policy</h1>
      <p style={{color:T.textMuted,marginBottom:32}}>Last updated: March 16, 2026</p>
      <p style={{marginBottom:20}}>OneKit (onekit.tools) is operated by SVRD Holdings. This Privacy Policy explains how we collect, use, and protect information when you use our website and tools.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Information We Collect</h2>
      <p style={{marginBottom:20}}>OneKit is designed to respect your privacy. Our tools run entirely in your browser. We do not collect, store, or transmit any data you enter into our tools.</p>
      <p style={{marginBottom:20}}>We may collect anonymous usage data through Google Analytics.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Advertising</h2>
      <p style={{marginBottom:20}}>OneKit uses Google AdSense to display advertisements.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Contact</h2>
      <p style={{marginBottom:20}}>For privacy-related questions, contact us at privacy@onekit.tools.</p>
      <div style={{textAlign:'center',padding:'32px 0 0',borderTop:'1px solid '+T.border,fontSize:12,color:T.textDim,marginTop:40}}>{'© '+new Date().getFullYear()+' SVRD Holdings · '}<span style={{color:T.purpleLight}}>OneKit</span>{' · Every tool. One place.'}</div>
    </div>
  </div>);
}

function TermsPage() {
  const { T } = useLume();
  const goHome=()=>{window.location.hash='';};
  return (<div style={{background:T.bg,minHeight:'100dvh',fontFamily:FONT,color:T.text}}>
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 20px',borderBottom:'1px solid '+T.border,background:T.surface}}>
      <button onClick={goHome} style={{background:'none',border:'none',color:T.purpleLight,fontSize:20,cursor:'pointer',padding:0}}>←</button>
      <div style={{fontSize:16,fontWeight:700,color:T.text}}>Terms of Service</div>
    </div>
    <div style={{maxWidth:720,margin:'0 auto',padding:'32px 20px 60px',lineHeight:1.7,fontSize:14,color:T.textMuted}}>
      <h1 style={{fontSize:28,fontWeight:800,color:T.text,marginBottom:8}}>Terms of Service</h1>
      <p style={{color:T.textMuted,marginBottom:32}}>Last updated: March 16, 2026</p>
      <p style={{marginBottom:20}}>Welcome to OneKit (onekit.tools), operated by SVRD Holdings. By using our website and tools, you agree to the following terms.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Use of Service</h2>
      <p style={{marginBottom:20}}>OneKit provides free browser-based utility tools.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Data Processing</h2>
      <p style={{marginBottom:20}}>All tool operations are performed locally in your web browser.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Intellectual Property</h2>
      <p style={{marginBottom:20}}>The OneKit name, logo, design, and code are the property of SVRD Holdings.</p>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text,marginTop:32,marginBottom:12}}>Contact</h2>
      <p style={{marginBottom:20}}>For questions about these Terms, contact us at legal@onekit.tools.</p>
      <div style={{textAlign:'center',padding:'32px 0 0',borderTop:'1px solid '+T.border,fontSize:12,color:T.textDim,marginTop:40}}>{'© '+new Date().getFullYear()+' SVRD Holdings · '}<span style={{color:T.purpleLight}}>OneKit</span>{' · Every tool. One place.'}</div>
    </div>
  </div>);
}

// ─── FLOATING BUBBLE (Lume + Device Toggle) ─────────────────────────────────
function FloatingBubble({ lumeId, setLumeId, deviceMode, setDeviceMode }) {
  const { T } = useLume();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => { try { const s = localStorage.getItem('onekit-bubble-pos'); return s ? JSON.parse(s) : { x: null, y: null }; } catch { return { x: null, y: null }; } });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const bubbleRef = useRef(null);
  const moved = useRef(false);

  const bx = pos.x ?? (typeof window !== 'undefined' ? window.innerWidth - 56 : 300);
  const by = pos.y ?? 80;

  const handleDown = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    dragging.current = true; moved.current = false;
    dragStart.current = { x: touch.clientX, y: touch.clientY, px: bx, py: by };
    e.preventDefault();
  };
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragging.current) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - dragStart.current.x, dy = touch.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      const nx = Math.max(0, Math.min(window.innerWidth - 48, dragStart.current.px + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 48, dragStart.current.py + dy));
      setPos({ x: nx, y: ny });
    };
    const handleUp = () => {
      if (dragging.current && pos.x !== null) { try { localStorage.setItem('onekit-bubble-pos', JSON.stringify(pos)); } catch {} }
      dragging.current = false;
    };
    window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false }); window.addEventListener('touchend', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleUp); };
  }, [pos]);

  const handleTap = () => { if (!moved.current) setOpen(o => !o); };
  const cycleLume = () => { const k = Object.keys(LUME_THEMES); const i = k.indexOf(lumeId); const next = k[(i+1)%k.length]; setLumeId(next); try { localStorage.setItem('onekit-lume', next); } catch {} };
  const cycleDevice = () => { const m = ['auto','desktop','mobile']; const i = m.indexOf(deviceMode); const next = m[(i+1)%m.length]; setDeviceMode(next); try { localStorage.setItem('onekit-device-mode', next); } catch {} };
  const dIcons = { auto: '🔀', desktop: '🖥️', mobile: '📱' }; const dLabels = { auto: 'Auto', desktop: 'Desktop', mobile: 'Mobile' };

  return (
    <>
      {/* Backdrop to close */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 99996 }} onClick={() => setOpen(false)} />}
      <div ref={bubbleRef} style={{ position: 'fixed', left: bx, top: by, zIndex: 99998, userSelect: 'none', touchAction: 'none' }}>
        {/* Expanded menu */}
        {open && (
          <div style={{ position: 'absolute', bottom: 52, right: 0, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
            <button onClick={cycleLume} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: T.surface, border: '1px solid '+T.border, borderRadius: 10, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              {LUME_THEMES[lumeId].icon} {LUME_THEMES[lumeId].name}
            </button>
            <button onClick={cycleDevice} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: T.surface, border: '1px solid '+T.border, borderRadius: 10, cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              {dIcons[deviceMode]} {dLabels[deviceMode]}
            </button>
          </div>
        )}
        {/* Main bubble */}
        <div onMouseDown={handleDown} onTouchStart={handleDown} onClick={handleTap}
          style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, '+T.red+', '+T.purple+')', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '2px solid '+T.border, fontSize: 16, transition: 'transform 0.15s', transform: open ? 'scale(1.1)' : 'scale(1)' }}>
          {open ? '✕' : '⚙'}
        </div>
      </div>
    </>
  );
}

// ─── GLOBAL STYLES ──────────────────────────────────────────────────────────
function GlobalStyles({ T }) {
  return (<style>{`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${T.bg}; color: ${T.text}; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; transition: background 0.3s, color 0.3s; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${T.scrollTrack}; }
    ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 3px; }
    ::selection { background: ${T.selection}; color: ${T.selectionText}; }
    select { background: ${T.elevated} !important; color: ${T.text} !important; }
    option { background: ${T.elevated}; color: ${T.text}; }
  `}</style>);
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [route,setRoute]=useState(()=>window.location.hash.slice(2)||'');
  const [filterCat,setFilterCat]=useState('all'); const [search,setSearch]=useState('');
  const [lumeId,setLumeId]=useState(getLumeFromStorage);
  const [deviceMode,setDeviceMode]=useState(getDeviceModeFromStorage);
  const [windows,setWindows]=useState([]); const [showSendPhone,setShowSendPhone]=useState(null);

  const T=useMemo(()=>makeT(lumeId),[lumeId]);
  const s=useMemo(()=>makeStyles(T),[T]);

  useEffect(()=>{document.documentElement.removeAttribute('data-device');if(deviceMode!=='auto')document.documentElement.setAttribute('data-device',deviceMode);},[deviceMode]);
  useEffect(()=>{const h=()=>{const r=window.location.hash.slice(2)||'';setRoute(r);const tool=TOOLS.find(t=>t.id===r);document.title=tool?tool.name+' — OneKit | Free Online '+tool.name:'OneKit — Every tool. One place. Free Online Tools';};window.addEventListener('hashchange',h);return()=>window.removeEventListener('hashchange',h);},[]);

  const navigate=(id)=>{window.location.hash='#/'+id;}; const goHome=()=>{window.location.hash='';setRoute('');};
  const openInWindow=(toolId)=>{const ex=windows.find(w=>w.toolId===toolId);if(ex){const mx=Math.max(...windows.map(w=>w.zIndex),50);setWindows(ws=>ws.map(w=>w.id===ex.id?{...w,zIndex:mx+1,minimized:false}:w));return;}const off=windows.length*30;setWindows(ws=>[...ws,{id:Date.now().toString(),toolId,x:80+off,y:60+off,w:480,h:520,zIndex:100+windows.length,minimized:false}]);};

  const activeTool=TOOLS.find(t=>t.id===route); const ToolComponent=activeTool?TOOL_COMPONENTS[activeTool.id]:null;
  const filtered=useMemo(()=>{let list=TOOLS;if(filterCat!=='all')list=list.filter(t=>t.cat===filterCat);if(search)list=list.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())||t.desc.toLowerCase().includes(search.toLowerCase()));return list;},[filterCat,search]);
  const lumeValue=useMemo(()=>({T,s,lumeId}),[T,s,lumeId]);
  const containerStyle=deviceMode==='mobile'?{maxWidth:430,margin:'0 auto'}:deviceMode==='desktop'?{minWidth:1024}:{};

  return (
    <LumeContext.Provider value={lumeValue}>
      <GlobalStyles T={T} />
      <FloatingBubble lumeId={lumeId} setLumeId={setLumeId} deviceMode={deviceMode} setDeviceMode={setDeviceMode} />
      <WindowManager windows={windows} setWindows={setWindows}>
        <div style={containerStyle}>
          {route==='privacy'?<PrivacyPage />:
           route==='features'?<FeaturesPage />:
           route==='terms'?<TermsPage />:
           activeTool&&ToolComponent?(
            <div style={{background:T.bg,minHeight:'100dvh',fontFamily:FONT,color:T.text}}>
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 20px',borderBottom:'1px solid '+T.border,background:T.surface}}>
                <button onClick={goHome} style={{background:'none',border:'none',color:T.purpleLight,fontSize:20,cursor:'pointer',padding:0}}>←</button>
                <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:T.text}}>{activeTool.name}</div><div style={{fontSize:12,color:T.textMuted}}>{activeTool.desc}</div></div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>openInWindow(activeTool.id)} title="Open in window" style={{background:T.elevated,border:'1px solid '+T.border,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:14,color:T.textMuted}}>⧉</button>
                  <button onClick={()=>setShowSendPhone(activeTool.id)} title="Send to phone" style={{background:T.elevated,border:'1px solid '+T.border,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:14,color:T.textMuted}}>📱</button>
                </div>
              </div>
              <div style={{padding:'0 20px'}}><AdSlot variant="banner" /></div>
              <div style={{padding:'0 20px'}}><ToolGuide text={activeTool.guide} /></div>
              <div style={{padding:'0 20px 20px'}}><ToolComponent theme={T} /></div>
              <div style={{padding:'0 20px'}}><PlaybookBanner /></div>
              <div style={{padding:'0 20px 40px'}}><AdSlot variant="inline" /></div>
            </div>
          ):(
            <div style={{background:T.bg,minHeight:'100dvh',fontFamily:FONT,color:T.text}}>
              <div style={{padding:'48px 20px 32px',textAlign:'center'}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:'linear-gradient(135deg, '+T.red+', '+T.purple+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#ffffff'}}>O</div>
                  <span style={{fontSize:28,fontWeight:800,letterSpacing:-1,color:T.text}}>OneKit</span>
                </div>
                <p style={{fontSize:15,color:T.textMuted,maxWidth:400,margin:'0 auto 12px'}}>Every tool. One place.</p>
                <p style={{fontSize:12,color:T.textDim,maxWidth:500,margin:'0 auto 20px',lineHeight:1.6}}>Free online calculators, converters, generators, text tools, media tools, and developer utilities. 20+ browser-based tools — 100% private, no sign-up required. All processing happens locally on your device.</p>
                <div style={{maxWidth:440,margin:'0 auto',position:'relative'}}>
                  <input style={{...s.input,paddingLeft:40,fontSize:15,borderRadius:12,background:T.surface,border:'1px solid '+T.borderLight}} value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search tools...' />
                  <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:16,color:T.textDim}}>🔍</span>
                </div>
              </div>
              <div style={{padding:'0 20px 16px',display:'flex',gap:6,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                <button onClick={()=>setFilterCat('all')} style={{...s.btnSmall(filterCat==='all'?T.purple:T.elevated),border:'1px solid '+(filterCat==='all'?T.purple:T.border),whiteSpace:'nowrap'}}>All</button>
                {CATEGORIES.map(c=>(<button key={c.id} onClick={()=>setFilterCat(c.id)} style={{...s.btnSmall(filterCat===c.id?T.purple:T.elevated),border:'1px solid '+(filterCat===c.id?T.purple:T.border),whiteSpace:'nowrap'}}>{c.icon+' '+c.label}</button>))}
              </div>
              <div style={{padding:'0 20px'}}><PlaybookBanner /></div>
              <div style={{padding:'0 20px'}}><AdSlot variant="leaderboard" /></div>
              <div style={{padding:'0 20px 60px',display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:12,marginTop:16}}>
                {filtered.map(tool=>{const cat=CATEGORIES.find(c=>c.id===tool.cat);return(
                  <div key={tool.id} style={{...s.card,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14,transition:'all 0.2s',border:'1px solid '+T.border,marginBottom:0,position:'relative'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.purple;e.currentTarget.style.background=T.elevated;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface;}}>
                    <div onClick={()=>navigate(tool.id)} style={{display:'flex',alignItems:'center',gap:14,flex:1}}>
                      <div style={{width:40,height:40,borderRadius:10,background:T.elevated,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{cat?cat.icon:'🔧'}</div>
                      <div><div style={{fontSize:14,fontWeight:700,color:T.text}}>{tool.name}</div><div style={{fontSize:12,color:T.textMuted}}>{tool.desc}</div></div>
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <button onClick={e=>{e.stopPropagation();openInWindow(tool.id);}} title="Open in window" style={{background:'none',border:'none',fontSize:14,cursor:'pointer',color:T.textDim,padding:'4px',opacity:0.5,transition:'opacity 0.2s'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>⧉</button>
                      <button onClick={e=>{e.stopPropagation();setShowSendPhone(tool.id);}} title="Send to phone" style={{background:'none',border:'none',fontSize:14,cursor:'pointer',color:T.textDim,padding:'4px',opacity:0.5,transition:'opacity 0.2s'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>📱</button>
                    </div>
                  </div>
                );})}
              </div>
              <div style={{textAlign:'center',padding:'20px',borderTop:'1px solid '+T.border,fontSize:12,color:T.textDim}}>
                <div style={{marginBottom:16,display:'flex',justifyContent:'center',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                  <a href='#/features' style={{color:T.purpleLight,textDecoration:'none',fontWeight:700,fontSize:13}}>Features</a>
                  <a href='#/privacy' style={{color:T.textMuted,textDecoration:'none'}}>Privacy Policy</a>
                  <a href='#/terms' style={{color:T.textMuted,textDecoration:'none'}}>Terms of Service</a>
                </div>
                {'© '+new Date().getFullYear()+' SVRD Holdings · '}<span style={{color:T.purpleLight}}>OneKit</span>{' · Every tool. One place.'}
              </div>
            </div>
          )}
        </div>
      </WindowManager>
      {showSendPhone&&<SendToPhoneModal toolId={showSendPhone} toolName={TOOLS.find(t=>t.id===showSendPhone)?.name||'Tool'} onClose={()=>setShowSendPhone(null)} />}
    </LumeContext.Provider>
  );
}
