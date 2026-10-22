/* =========================================================
   앵커사업단 공문 엔진
   - hwpx 틀의 {{자리표시자}}를 채워 새 hwpx를 만든다 (양식은 그대로, 글자만 교체)
   - 금액 한글 표기, 날짜 표기, 붙임 줄 만들기, 시행번호 계산, 유사도 계산
   브라우저: window.GongmunEngine / Node 테스트: module.exports
   ========================================================= */
(function (root) {
  const HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph';
  const PH_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

  /* ── 숫자·금액 ───────────────────────────────────────── */
  const toNum = v => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return isFinite(n) ? n : 0;
  };
  const comma = n => Math.round(toNum(n)).toLocaleString('ko-KR');
  // 집행액 칸 표기: 0이면 '-'
  const commaOrDash = n => (Math.round(toNum(n)) === 0 ? '-' : comma(n));

  function koreanAmount(n) {
    n = Math.floor(Math.abs(toNum(n)));
    if (n === 0) return '영';
    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const small = ['', '십', '백', '천'];
    const big = ['', '만', '억', '조'];
    let out = '', unit = 0;
    while (n > 0) {
      const chunk = n % 10000;
      if (chunk > 0) {
        let s = '', c = chunk, pos = 0;
        while (c > 0) {
          const d = c % 10;
          if (d > 0) s = digits[d] + small[pos] + s;
          c = Math.floor(c / 10); pos++;
        }
        out = s + big[unit] + out;
      }
      n = Math.floor(n / 10000); unit++;
    }
    return out;
  }
  // 금40,698,590원(금사천육십구만팔천오백구십원 정, 부가가치세 포함)
  function amountPhrase(n, vatIncluded) {
    if (!toNum(n)) return '';
    return `금${comma(n)}원(금${koreanAmount(n)}원 정${vatIncluded ? ', 부가가치세 포함' : ''})`;
  }

  /* ── 날짜 ────────────────────────────────────────────── */
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const m = String(v).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  // 본문 날짜: 2026. 10. 22.(목)
  function fmtDate(v, withDow) {
    const d = parseDate(v); if (!d) return v ? String(v) : '';
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.` + (withDow ? `(${DOW[d.getDay()]})` : '');
  }
  // 시행일: 2026.10.22.
  function fmtDocDate(v) {
    const d = parseDate(v); if (!d) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.`;
  }
  function isoDate(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /* ── 붙임 ───────────────────────────────────────────── */
  // ["계획공문 1부.", "지출 증빙 자료 각 1부."] → 붙임  1. …\n      2. …  끝.
  function attachmentText(lines) {
    const L = (Array.isArray(lines) ? lines : String(lines || '').split('\n'))
      .map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);
    if (!L.length) return '';
    return L.map((s, i) => (i === 0 ? '붙임  ' : '      ') + `${i + 1}. ${s}` + (i === L.length - 1 ? '  끝.' : '')).join('\n');
  }

  /* ── 시행번호 ───────────────────────────────────────── */
  // "앵커사업단2팀2026 - 090(2026.10.21.)" → 90, "…081-2" → 81
  function parseDocSeq(docNum) {
    let s = String(docNum || '').replace(/\(.*?\)/g, ' ').replace(/20\d\d/g, ' ');
    s = s.replace(/(\d{1,3})\s*[-–]\s*\d{1,2}\s*$/, '$1');
    const m = s.match(/(\d{1,4})\s*$/);
    return m ? parseInt(m[1], 10) : null;
  }

  /* ── 유사도 (글자 두 개씩 묶어 비교) ─────────────────── */
  const norm = s => String(s || '').normalize('NFKC').toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*r\s*&\s*d[^)]*\)/gi, ' ')
    .replace(/[\s·ㆍ・•∙‧.,、;:\-–—_\/()\[\]{}<>'"`~!?]/g, '');
  function bigrams(s) {
    const t = norm(s), set = new Map();
    for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); set.set(g, (set.get(g) || 0) + 1); }
    if (t.length === 1) set.set(t, 1);
    return set;
  }
  function similarity(a, b) {
    const A = a instanceof Map ? a : bigrams(a), B = b instanceof Map ? b : bigrams(b);
    let inter = 0, na = 0, nb = 0;
    A.forEach((v, k) => { na += v; if (B.has(k)) inter += Math.min(v, B.get(k)); });
    B.forEach(v => { nb += v; });
    return na + nb ? (2 * inter) / (na + nb) : 0;
  }

  /* ── hwpx XML 다루기 ────────────────────────────────── */
  const tv = n => (n.data != null ? n.data : n.nodeValue);
  const setTv = (n, v) => { n.data = v; n.nodeValue = v; };
  const isEl = (n, name) => n && n.nodeType === 1 && n.namespaceURI === HP && n.localName === name;
  function ownerP(el) { let c = el.parentNode; while (c && !isEl(c, 'p')) c = c.parentNode; return c; }
  function hasAncestor(el, name) { let c = el.parentNode; while (c) { if (isEl(c, name)) return true; c = c.parentNode; } return false; }
  function allEls(doc, name) { return Array.from(doc.getElementsByTagNameNS(HP, name)); }
  function ownTs(p) { return Array.from(p.getElementsByTagNameNS(HP, 't')).filter(t => ownerP(t) === p); }
  function textNodesOf(t) { return Array.from(t.childNodes).filter(n => n.nodeType === 3); }
  function ownTextNodes(p) { return ownTs(p).flatMap(textNodesOf); }
  function ownText(p) { return ownTs(p).map(t => t.textContent).join(''); }
  function dropLineseg(p) { Array.from(p.childNodes).filter(n => isEl(n, 'linesegarray')).forEach(n => p.removeChild(n)); }

  // 한글이 {{이름}}을 여러 조각(run)으로 나눠 저장한 경우 첫 조각으로 모은다
  function mergeSplitPlaceholders(p) {
    for (let guard = 0; guard < 50; guard++) {
      const nodes = ownTextNodes(p);
      const segs = []; let pos = 0;
      nodes.forEach(n => { segs.push({ n, s: pos, e: pos + tv(n).length }); pos += tv(n).length; });
      const full = nodes.map(tv).join('');
      let fixed = false, m;
      const re = /\{\{[^{}]*?\}\}/g;
      while ((m = re.exec(full))) {
        const a = m.index, b = a + m[0].length;
        const si = segs.findIndex(x => a >= x.s && a < x.e);
        const ei = segs.findIndex(x => b > x.s && b <= x.e);
        if (si < 0 || ei < 0 || si === ei) continue;
        const S = segs[si], E = segs[ei];
        setTv(S.n, tv(S.n).slice(0, a - S.s) + m[0]);
        for (let k = si + 1; k < ei; k++) setTv(segs[k].n, '');
        setTv(E.n, tv(E.n).slice(b - E.s));
        fixed = true; break;
      }
      if (!fixed) return;
    }
  }

  function setOwnText(p, text) {
    const ts = ownTs(p);
    let first = ts[0];
    if (!first) {
      const doc = p.ownerDocument;
      let run = Array.from(p.childNodes).find(n => isEl(n, 'run'));
      if (!run) { run = doc.createElementNS(HP, 'hp:run'); run.setAttribute('charPrIDRef', '0'); p.appendChild(run); }
      first = doc.createElementNS(HP, 'hp:t'); run.appendChild(first);
    }
    while (first.firstChild) first.removeChild(first.firstChild);
    first.appendChild(first.ownerDocument.createTextNode(text));
    ts.slice(1).forEach(t => t.parentNode.removeChild(t));
    dropLineseg(p);
  }
  // 서식만 남긴 문단 복제 (표·그림 등 글자 외 요소 제거)
  function cleanClone(p) {
    const c = p.cloneNode(true);
    const runs = Array.from(c.childNodes).filter(n => isEl(n, 'run'));
    runs.forEach(r => Array.from(r.childNodes).forEach(ch => { if (!isEl(ch, 't')) r.removeChild(ch); }));
    const keep = runs.find(r => r.childNodes.length) || runs[0];
    runs.forEach(r => { if (r !== keep) c.removeChild(r); });
    return c;
  }

  function replaceInParagraph(p, lookup) {
    mergeSplitPlaceholders(p);
    let had = false, allEmpty = true;
    ownTextNodes(p).forEach(n => {
      const v = tv(n);
      if (!v.includes('{{')) return;
      setTv(n, v.replace(PH_RE, (_, key) => {
        had = true;
        const val = lookup(key.trim());
        const s = val == null ? '' : String(val);
        if (s.trim() !== '') allEmpty = false;
        return s;
      }));
    });
    if (!had) return { had: false };
    dropLineseg(p);
    return { had, allEmpty };
  }

  function splitMultiline(p) {
    const txt = ownText(p);
    if (!txt.includes('\n')) return;
    const lines = txt.split('\n');
    setOwnText(p, lines[0]);
    let prev = p;
    lines.slice(1).forEach(line => {
      const c = cleanClone(p);
      if (c.getAttribute('id')) c.setAttribute('id', String(Math.floor(Math.random() * 2e9)));
      setOwnText(c, line);
      prev.parentNode.insertBefore(c, prev.nextSibling);
      prev = c;
    });
  }

  function renumberTable(tbl) {
    const trs = Array.from(tbl.childNodes).filter(n => isEl(n, 'tr'));
    tbl.setAttribute('rowCnt', String(trs.length));
    trs.forEach((tr, r) => Array.from(tr.childNodes).filter(n => isEl(n, 'tc')).forEach(tc => {
      const a = Array.from(tc.childNodes).find(n => isEl(n, 'cellAddr'));
      if (a) a.setAttribute('rowAddr', String(r));
    }));
  }

  // 표의 반복 행: {{목록.필드}}가 들어 있는 행을 항목 수만큼 복제
  function expandRepeatRows(doc, lists) {
    allEls(doc, 'tr').forEach(tr => {
      const ps = Array.from(tr.getElementsByTagNameNS(HP, 'p'));
      ps.forEach(mergeSplitPlaceholders);
      const txt = ps.map(ownText).join('\n');
      const m = txt.match(/\{\{\s*([^{}.\s]+)\.[^{}]+\}\}/);
      if (!m) return;
      const listName = m[1];
      let items = lists[listName] || [];
      if (!items.length) items = [{}];
      const tbl = tr.parentNode;
      items.forEach((item, i) => {
        const clone = tr.cloneNode(true);
        Array.from(clone.getElementsByTagNameNS(HP, 'p')).forEach(p => {
          replaceInParagraph(p, key => {
            const mm = key.match(/^([^.]+)\.(.+)$/);
            if (!mm || mm[1] !== listName) return null;
            if (mm[2] === '#' || mm[2] === '연번') return item[mm[2]] ?? (i + 1);
            return item[mm[2]];
          });
          if (/^\s*\(\s*\)\s*$/.test(ownText(p))) setOwnText(p, '');
        });
        tbl.insertBefore(clone, tr);
      });
      tbl.removeChild(tr);
      renumberTable(tbl);
    });
  }

  function fillSectionXml(xml, data, env) {
    const doc = new env.DOMParser().parseFromString(xml, 'application/xml');
    const values = data.values || {}, lists = data.lists || {};
    expandRepeatRows(doc, lists);
    const toRemove = [];
    allEls(doc, 'p').forEach(p => {
      const r = replaceInParagraph(p, key => values[key]);
      if (!r.had) return;
      // 값이 모두 빈 선택 항목 줄은 본문에서 지운다 (표 안은 칸 모양 유지)
      if (r.allEmpty && !hasAncestor(p, 'tbl') && !p.getElementsByTagNameNS(HP, 'tbl').length) {
        toRemove.push(p); return;
      }
      // 값이 빈 괄호만 남으면 지운다 (예: 세목 미입력 → "()")
      if (/^\s*\(\s*\)\s*$/.test(ownText(p))) setOwnText(p, '');
      splitMultiline(p);
    });
    toRemove.forEach(p => p.parentNode && p.parentNode.removeChild(p));
    // 선택 항목 줄이 빠지면 본문 번호(1. 2. 3.)를 다시 매긴다
    if (data.renumber !== false) {
      const KO = '가나다라마바사아자차카타파하';
      let n = 0, k = 0, kIndent = null;
      allEls(doc, 'p').forEach(p => {
        if (hasAncestor(p, 'tbl')) return;
        const node = ownTextNodes(p).find(x => tv(x).trim() !== '');
        if (!node) return;
        const t = tv(node);
        const m = t.match(/^()(\d{1,2})\.(\s)/); // 들여 쓴 줄(붙임 2. 등)은 건드리지 않음
        if (m) {
          n++; k = 0; kIndent = null;
          if (+m[2] !== n) { setTv(node, m[1] + n + '.' + m[3] + t.slice(m[0].length)); dropLineseg(p); }
          return;
        }
        // 가. 나. 다. 항목도 빠진 줄이 있으면 다시 매긴다 (같은 들여쓰기끼리)
        const g = t.match(/^(\s*)([가-하])\.(\s)/);
        if (!g) return;
        if (kIndent !== null && g[1].length !== kIndent) return;
        kIndent = g[1].length;
        const want = KO[k++];
        if (want && g[2] !== want) { setTv(node, g[1] + want + '.' + g[3] + t.slice(g[0].length)); dropLineseg(p); }
      });
    }
    let out = new env.XMLSerializer().serializeToString(doc);
    if (!/^<\?xml/.test(out)) out = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + out;
    return out;
  }

  async function loadZip(buf, env) { return env.JSZip.loadAsync(buf); }
  function sectionNames(zip) {
    return Object.keys(zip.files).filter(n => /^Contents\/section\d+\.xml$/.test(n))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  }

  async function fillHwpx(buf, data, env) {
    const zip = await loadZip(buf, env);
    const texts = [];
    for (const name of sectionNames(zip)) {
      const xml = await zip.file(name).async('string');
      const outXml = fillSectionXml(xml, data, env);
      zip.file(name, outXml);
      texts.push(outXml.replace(/<hp:t>([^<]*)<\/hp:t>/g, '\u0001$1\u0002').replace(/[^\u0001\u0002]*?\u0001([^\u0002]*)\u0002/g, '$1\n').replace(/<[^>]*>/g, ''));
    }
    if (zip.file('Preview/PrvText.txt')) zip.file('Preview/PrvText.txt', texts.join('\n').slice(0, 1000));
    // mimetype은 맨 앞·무압축이어야 한글이 연다
    const mt = await zip.file('mimetype').async('string');
    const out = new env.JSZip();
    out.file('mimetype', mt, { compression: 'STORE' });
    for (const name of Object.keys(zip.files)) {
      if (name === 'mimetype' || zip.files[name].dir) continue;
      out.file(name, await zip.file(name).async('uint8array'), { compression: 'DEFLATE' });
    }
    return out.generateAsync({ type: env.outputType || 'blob', mimeType: 'application/hwp+zip', compression: 'DEFLATE' });
  }

  // 틀 안의 자리표시자 목록 → { scalars:[이름], lists:{목록:[필드]} }
  async function scanPlaceholders(buf, env) {
    const zip = await loadZip(buf, env);
    const scalars = [], lists = {};
    for (const name of sectionNames(zip)) {
      const doc = new env.DOMParser().parseFromString(await zip.file(name).async('string'), 'application/xml');
      allEls(doc, 'p').forEach(p => {
        mergeSplitPlaceholders(p);
        let m; const re = new RegExp(PH_RE.source, 'g'); const t = ownText(p);
        while ((m = re.exec(t))) {
          const k = m[1].trim(), mm = k.match(/^([^.]+)\.(.+)$/);
          if (mm) { (lists[mm[1]] = lists[mm[1]] || []); if (!lists[mm[1]].includes(mm[2])) lists[mm[1]].push(mm[2]); }
          else if (!scalars.includes(k)) scalars.push(k);
        }
      });
    }
    return { scalars, lists };
  }

  // 결과 hwpx의 본문 글자 (검증·미리보기용)
  async function extractText(buf, env) {
    const zip = await loadZip(buf, env); const lines = [];
    for (const name of sectionNames(zip)) {
      const doc = new env.DOMParser().parseFromString(await zip.file(name).async('string'), 'application/xml');
      allEls(doc, 'p').forEach(p => { const t = ownText(p); if (t.trim()) lines.push(t); });
    }
    return lines;
  }

  const api = { HP, toNum, comma, commaOrDash, koreanAmount, amountPhrase, parseDate, fmtDate, fmtDocDate, isoDate,
    attachmentText, parseDocSeq, norm, bigrams, similarity, fillHwpx, scanPlaceholders, extractText, fillSectionXml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GongmunEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
