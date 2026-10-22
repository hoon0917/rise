/* =========================================================
   앵커사업단 공통 스크립트 — 이모지를 선 아이콘으로 바꿉니다.
   페이지가 나중에 그려 넣는 내용도 자동으로 바뀝니다.
   ========================================================= */
(function(){
  const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    '🔬': P('<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>'),
    '✈': P('<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'),
    '📦': P('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
    '🏛': P('<path d="M3 21h18M4 10h16M12 3 3 8h18zM6 10v8M10 10v8M14 10v8M18 10v8"/>'),
    '🏠': P('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'),
    '📅': P('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    '📋': P('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
    '⚙': P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    '📥': P('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
    '⬇': P('<path d="M12 4v12M6 11l6 6 6-6M5 21h14"/>'),
    '📊': P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    '📄': P('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    '📂': P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    '🔐': P('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    '🔒': P('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    '🔓': P('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
    '📝': P('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    '📌': P('<path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z"/>'),
    '🌿': P('<path d="M5 21c0-9 5-15 15-16-1 10-7 15-15 16z"/><path d="M5 21 14 12"/>'),
  };
  const DOTS = { '🔴':'#e5484d', '💜':'#7c3aed' };
  const DROP = ['✨','♻'];

  const keys = Object.keys(ICONS).concat(Object.keys(DOTS), DROP);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const RE = new RegExp('(' + keys.map(esc).join('|') + ')\\uFE0F?\\s?', 'g');
  const SKIP = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','SVG']);

  function strip(t){ return t.replace(RE,''); }
  function swap(node){
    const t = node.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(t)) return;
    const parent = node.parentNode;
    if (!parent || SKIP.has(parent.nodeName)) return;
    if (parent.nodeName === 'OPTION' || parent.nodeName === 'TITLE') { node.nodeValue = strip(t); return; }
    const frag = document.createDocumentFragment();
    let last = 0; RE.lastIndex = 0; let m;
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      const key = m[1];
      if (ICONS[key]) {
        const s = document.createElement('span'); s.className = 'ic'; s.innerHTML = ICONS[key];
        frag.appendChild(s);
        if (m[0].length > key.length && /\s/.test(m[0].slice(-1))) frag.appendChild(document.createTextNode(' '));
      } else if (DOTS[key]) {
        const s = document.createElement('span'); s.className = 'ic-dot'; s.style.background = DOTS[key];
        frag.appendChild(s); frag.appendChild(document.createTextNode(' '));
      }
      last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    parent.replaceChild(frag, node);
  }
  function walk(root){
    if (root.nodeType === 3) { swap(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = []; let n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(swap);
  }
  function run(){
    document.title = strip(document.title);
    walk(document.body);
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'characterData') swap(m.target);
      else m.addedNodes.forEach(walk);
    })).observe(document.body, { childList:true, subtree:true, characterData:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
