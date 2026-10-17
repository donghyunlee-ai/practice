/* 파이썬 연습 (donghyunlee.kr/practice). © 2026 이동현. 이용 조건은 LICENSE.txt와 화면의 '이용 안내와 저작권'(#/terms)
   로그인 없는 정적 페이지다. 파이썬은 브라우저 안(worker.js의 Pyodide)에서 실행하고,
   풀이 기록은 이 브라우저의 localStorage에만 둔다. 학생 코드는 어디로도 보내지 않는다. */
(() => {
  "use strict";

  const VERSION = "20261017b";
  // 한국어 표(TYPE_NAMES, LEVEL_NAMES, ERR_KO, PLOT_NAMES)마다 같은 열쇠의 영어 표(_EN)를 둔다. tools/check_i18n.py가 열쇠를 맞춰 본다
  const TYPE_NAMES = { predict: "출력 예측", fill: "빈칸 완성", write: "작성", fix: "코드 리뷰" };
  const TYPE_NAMES_EN = { predict: "Predict the output", fill: "Fill in the blanks", write: "Write code", fix: "Code review" };
  const TYPE_ORDER = ["predict", "fill", "write", "fix"];
  const LEVEL_NAMES = { 1: "기본", 2: "보통", 3: "도전" };
  const LEVEL_NAMES_EN = { 1: "Basic", 2: "Medium", 3: "Challenge" };
  const ERROR_CHOICES = ["NameError", "TypeError", "ValueError", "IndexError", "KeyError", "ZeroDivisionError",
    "SyntaxError", "IndentationError", "AttributeError", "UnboundLocalError", "FileNotFoundError", "FileExistsError",
    "ModuleNotFoundError", "ImportError"];
  const ERR_KO = {
    SyntaxError: "문법이 맞지 않습니다. 콜론(:), 괄호, 따옴표가 빠졌는지 봅니다.",
    IndentationError: "들여쓰기가 맞지 않습니다. 같은 블록은 같은 칸만큼 들여 씁니다.",
    NameError: "정의하지 않은 이름을 썼습니다. 오타가 있는지, 쓰기 전에 값을 넣었는지 봅니다.",
    TypeError: "자료형이 맞지 않는 연산입니다. 예를 들어 문자열과 숫자는 더할 수 없습니다.",
    ValueError: "값의 모양이 맞지 않습니다. int(\"3.5\")처럼 바꿀 수 없는 값이나, 언패킹할 개수가 다를 때 납니다.",
    IndexError: "리스트 범위를 벗어난 번호입니다. 마지막 번호는 길이보다 1 작습니다.",
    KeyError: "딕셔너리에 없는 키입니다.",
    ZeroDivisionError: "0으로 나눴습니다.",
    AttributeError: "그 자료형에 없는 메서드나 속성입니다.",
    UnboundLocalError: "함수 안에서 값을 넣기 전에 그 이름을 읽었습니다.",
    EOFError: "input()이 읽을 값이 없습니다. 입력값 칸을 채웁니다.",
    RecursionError: "함수가 자기 자신을 끝없이 부릅니다.",
    FileNotFoundError: "그 이름의 파일이 없습니다. 파일 이름과 경로를 봅니다.",
    FileExistsError: "이미 있는 파일입니다. 'x' 모드는 없는 파일만 새로 만듭니다.",
    ModuleNotFoundError: "그 이름의 모듈이 없습니다. 이름이 맞는지, 이 환경에 있는 모듈인지 봅니다.",
    ImportError: "모듈 안에 그 이름이 없습니다. from 뒤의 모듈과 import 뒤의 이름을 봅니다.",
    UnicodeDecodeError: "파일을 다른 인코딩으로 읽었습니다. open()의 encoding을 봅니다.",
    UnsupportedOperation: "파일을 연 모드로는 할 수 없는 일입니다. 읽기 모드로 연 파일에는 쓸 수 없습니다.",
    AssertionError: "assert 뒤의 조건이 거짓이라 멈췄습니다. 그 조건이 왜 거짓이 되었는지 봅니다.",
    StepLimit: "실행한 줄이 100만 줄을 넘어 멈췄습니다. 끝나지 않는 반복이 있는지, 같은 일을 너무 많이 되풀이하지 않는지 봅니다.",
    SystemExit: "exit()나 sys.exit()로 실행을 끝냈습니다. 함수 안에서는 쓰지 않습니다.",
    TimeLimit: "효율성 기준 안에 끝나지 않았습니다. 같은 일을 더 적게 되풀이하는 방법을 찾아봅니다.",
    OutputLimit: "출력이 너무 많아 멈췄습니다. 반복이 끝나는지 봅니다.",
    Timeout: "실행이 너무 오래 걸려 멈췄습니다. 반복이 끝나는지 봅니다. 파이썬을 다시 준비합니다.",
  };
  const ERR_EN = {
    SyntaxError: "The syntax is wrong. Check for a missing colon (:), parenthesis, or quote.",
    IndentationError: "The indentation is wrong. Lines in the same block must be indented by the same amount.",
    NameError: "You used a name that is not defined. Check for typos, and make sure the name gets a value before you use it.",
    TypeError: "This operation does not work with these types. For example, you cannot add a string and a number.",
    ValueError: "The value has the wrong form. This happens with a value that cannot be converted, like int(\"3.5\"), or when the number of values to unpack does not match.",
    IndexError: "The index is out of range. The last index is one less than the length.",
    KeyError: "The key is not in the dictionary.",
    ZeroDivisionError: "You divided by zero.",
    AttributeError: "That type has no such method or attribute.",
    UnboundLocalError: "Inside the function, you read the name before giving it a value.",
    EOFError: "input() has no value to read. Fill in the input box.",
    RecursionError: "The function keeps calling itself without end.",
    FileNotFoundError: "There is no file with that name. Check the file name and path.",
    FileExistsError: "The file already exists. Mode 'x' only creates a new file.",
    ModuleNotFoundError: "There is no module with that name. Check the spelling, and check that the module is available here.",
    ImportError: "The module has no such name. Check the module after from and the name after import.",
    UnicodeDecodeError: "The file was read with the wrong encoding. Check the encoding argument of open().",
    UnsupportedOperation: "You cannot do this in the mode you opened the file with. For example, you cannot write to a file opened for reading.",
    AssertionError: "The condition after assert was false, so the program stopped. Find out why the condition became false.",
    StepLimit: "Stopped after running more than 1,000,000 lines. Check for a loop that never ends, or work that repeats too many times.",
    SystemExit: "exit() or sys.exit() ended the program. Do not use them inside a function.",
    TimeLimit: "Did not finish within the efficiency limit. Look for a way to repeat the same work fewer times.",
    OutputLimit: "Stopped because of too much output. Check that the loop ends.",
    Timeout: "Stopped because it ran too long. Check that the loop ends. Python is restarting.",
  };

  // ------------------------------------------------------------------ 화면 언어(2026-10-17, SPEC-i18n 2절)
  // LANG은 화면을 그릴 때마다 길 찾기(render)가 정한다: 과목 주소는 그 과목의 lang, #/en·#/en/me·#/en/terms는 en, 나머지는 ko.
  // 문구는 T(한국어, params) 하나로 거른다. 한국어 문장이 열쇠이고, 한국어 화면에서는 열쇠를 그대로 돌려주므로 글자 하나 바뀌지 않는다.
  // {name}은 params로 채운다. 영어 값에는 {n|problem|problems}처럼 n이 1일 때와 아닐 때의 낱말을 고르는 꼴도 쓴다.
  // 영어 표 EN에 없는 열쇠는 한국어로 두고 MISSING에 모은다(콘솔에서 __practiceI18n.missing()으로 본다).
  // EN은 파일 끝, 시작 코드 바로 앞에 있다. 점검은 tools/check_i18n.py(T 밖에 남은 한국어, 빠진 열쇠, 영어 값의 한글).
  let LANG = "ko";
  const MISSING = new Set();
  const PARAM = /\{(\w+)(?:\|([^|{}]*)\|([^|{}]*))?\}/g;
  function T(ko, params) {
    let s = ko;
    if (LANG === "en") {
      if (Object.prototype.hasOwnProperty.call(EN, ko)) s = EN[ko];
      else MISSING.add(ko);
    }
    if (!params) return s;
    return s.replace(PARAM, (m, k, one, many) => {
      if (!(k in params)) return m;
      if (one !== undefined) return Number(params[k]) === 1 ? one : many;
      return String(params[k]);
    });
  }
  window.__practiceI18n = { missing: () => [...MISSING], lang: () => LANG };
  const typeName = (t) => (LANG === "en" ? TYPE_NAMES_EN : TYPE_NAMES)[t];
  const levelName = (l) => (LANG === "en" ? LEVEL_NAMES_EN : LEVEL_NAMES)[l];
  const errHelp = (type) => (LANG === "en" ? ERR_EN : ERR_KO)[type];
  const modeName = (kind) => (kind === "ta" ? T("타임어택") : T("모의 시험"));
  // 바깥 주소. 영어 화면은 홈페이지의 영어 쪽으로 보낸다
  const URLS = {
    ko: { home: "https://donghyunlee.kr/", books: "https://donghyunlee.kr/books/", privacy: "https://donghyunlee.kr/privacy/", about: "https://donghyunlee.kr/about/" },
    en: { home: "https://donghyunlee.kr/en/", books: "https://donghyunlee.kr/en/books/", privacy: "https://donghyunlee.kr/en/privacy/", about: "https://donghyunlee.kr/en/about/" },
  };
  const siteUrl = (k) => URLS[LANG][k];
  const homeHref = () => (LANG === "en" ? "#/en" : "#/");
  const meHref = () => (LANG === "en" ? "#/en/me" : "#/me");
  const termsHref = () => (LANG === "en" ? "#/en/terms" : "#/terms");
  const onLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

  // ------------------------------------------------------------------ 도우미
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const main = $("#main");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // harness.py의 norm과 같다: 앞뒤 빈 줄과 줄 끝 공백은 비교하지 않는다
  const norm = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "")
    .split("\n").map((l) => l.replace(/\s+$/, "")).join("\n");
  const inl = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  const md = (s) => String(s ?? "").split(/\n+/).filter((x) => x.trim()).map((x) => `<p>${inl(x)}</p>`).join("");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const SUBMIT_KEY = isMac ? "⌘↵" : "Ctrl+↵";

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }

  function fmtDuration(sec) {
    sec = Math.round(sec);
    const m = Math.floor(sec / 60);
    return m ? T("{m}분 {s}초", { m, s: sec % 60 }) : T("{s}초", { s: sec });
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    if (LANG === "en") return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // 세트 코드에서 같은 순서를 만드는 난수
  function seedFrom(str) {
    let h = 2166136261;
    for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function newSetCode() {
    const buf = new Uint32Array(4);
    crypto.getRandomValues(buf);
    return Array.from(buf, (x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
  }

  // ------------------------------------------------------------------ 이 브라우저에만 두는 기록
  const STORE_KEY = "dhl-practice-v1";
  const Store = {
    data: { v: 1, courses: {}, set: {} },
    load() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        const d = raw ? JSON.parse(raw) : null;
        if (d && d.v === 1 && d.courses) this.data = { set: {}, ...d };
      } catch (e) { /* 저장소를 못 쓰면 이번 방문 동안만 기억한다 */ }
    },
    save() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
    },
    // 바꿀 때마다 저장된 기록을 다시 읽고 그 위에 고쳐 저장한다. 탭 두 개를 열어 두어도 한쪽이 다른 쪽의 기록을 지우지 않는다.
    update(fn) {
      this.load();
      fn(this.data);
      return this.save();
    },
    course(cid) {
      if (!this.data.courses[cid]) this.data.courses[cid] = { p: {}, ta: [] };
      return this.data.courses[cid];
    },
    prob(cid, pid) { return this.course(cid).p[pid] || {}; },
    patch(cid, pid, obj) {
      return this.update(() => {
        const c = this.course(cid);
        c.p[pid] = { ...(c.p[pid] || {}), ...obj };
      });
    },
    record(cid, pid, ok) {
      this.update(() => {
        const c = this.course(cid);
        const r = c.p[pid] || {};
        c.p[pid] = { ...r, s: ok || r.s === 2 ? 2 : 1, n: (r.n || 0) + 1, at: Date.now(), last: ok ? 1 : 0 };
      });
    },
    setting(key, value) {
      if (value === undefined) return this.data.set[key];
      this.update(() => { this.data.set[key] = value; });
      return value;
    },
  };

  // ------------------------------------------------------------------ 파이썬 실행기(worker.js)
  // 요청은 줄을 세워 하나씩 보낸다. 제한 시간은 Worker가 그 요청을 받는 순간부터 잰다. 시간을 넘기면 Worker를
  // 끄고 새로 띄운 뒤, 기다리던 요청은 새 Worker로 이어서 보낸다(앞의 요청 때문에 뒤의 요청이 실패하지 않게).
  const Py = {
    worker: null, seq: 0, queue: [], current: null, state: "idle", info: null, booting: null, loaded: new Set(),
    setState(state) {
      this.state = state;
      const el = $("#py-status");
      if (!el) return;
      el.dataset.state = state;
      const label = {
        idle: T("파이썬 대기"),
        loading: T("파이썬 준비 중"),
        ready: T("파이썬 {v} 준비됨", { v: this.info ? this.info.python.split(".").slice(0, 2).join(".") : "" }),
        error: T("파이썬을 불러오지 못함"),
      }[state];
      el.innerHTML = `<span class="long">${esc(label)}</span>`;
      el.title = state === "error" ? T("눌러서 다시 불러옵니다") :
        state === "ready" ? T("브라우저 안에서 실행됩니다 (Pyodide {pyodide}, Python {python})", { pyodide: this.info.pyodide, python: this.info.python }) :
          T("파이썬은 이 브라우저 안에서 실행됩니다");
    },
    start() {
      if (this.booting) return this.booting;
      const worker = new Worker(`assets/worker.js?v=${VERSION}`);
      this.worker = worker;
      this.loaded = new Set();  // 새 Worker에는 그래프 도구가 아직 없다
      worker.onmessage = (e) => {
        if (worker !== this.worker) return;
        const { id, ok, result, error } = e.data;
        const job = this.current;
        if (!job || job.id !== id) return;
        clearTimeout(job.timer);
        this.current = null;
        if (ok) { job.resolve(result); this.pump(); return; }
        const err = new Error(error);
        err.python = job.op !== "boot";  // 채점기 안의 오류. 상태가 꼬였을 수 있어 Worker를 새로 띄운다
        job.reject(err);
        if (err.python) this.restart();
      };
      worker.onerror = (e) => {
        e.preventDefault();
        if (worker === this.worker) this.fail(new Error(e.message || "worker error"));
      };
      this.setState("loading");
      const harnessUrl = new URL(`assets/harness.py?v=${VERSION}`, location.href).href;
      this.booting = new Promise((resolve, reject) => {
        this.send({ op: "boot", payload: { harnessUrl }, ms: 120000, resolve, reject });
      }).then((info) => {
        this.info = info;
        this.setState("ready");
        this.pump();
        return info;
      }, (err) => {
        this.fail(err);
        throw err;
      });
      return this.booting;
    },
    send(job) {
      job.id = ++this.seq;
      this.current = job;
      job.timer = setTimeout(() => {
        if (this.current !== job) return;
        this.current = null;
        const err = new Error("timeout");
        err.timeout = true;
        job.reject(err);
        if (job.op === "boot") this.fail(err); else this.restart();
      }, job.ms);
      this.worker.postMessage({ id: job.id, op: job.op, payload: job.payload });
    },
    pump() {
      if (this.state !== "ready" || this.current || !this.queue.length) return;
      this.send(this.queue.shift());
    },
    restart() {  // 지금 Worker를 끄고, 기다리는 요청이 있으면 새 Worker를 띄워 잇는다
      if (this.worker) this.worker.terminate();
      this.worker = null;
      this.booting = null;
      this.current = null;
      this.setState("idle");
      if (this.queue.length) this.start().catch(() => {});
    },
    fail(err) {  // 파이썬을 불러오지 못함: 기다리던 요청도 모두 실패로 돌린다
      if (this.worker) this.worker.terminate();
      this.worker = null;
      this.booting = null;
      const jobs = (this.current ? [this.current] : []).concat(this.queue.splice(0));
      this.current = null;
      jobs.forEach((job) => { clearTimeout(job.timer); job.reject(err); });
      this.setState("error");
      console.warn("파이썬을 불러오지 못했습니다", err);  // i18n:ok 개발자 콘솔
    },
    call(op, payload, ms = 10000) {
      return new Promise((resolve, reject) => {
        this.queue.push({ op, payload, ms, resolve, reject });
        this.start().then(() => this.pump(), () => {});
      });
    },
    // 시각화 과목의 그래프 도구(matplotlib, pandas, seaborn). 처음 한 번은 내려받느라 오래 걸린다.
    // 실행과 채점 전마다 부른다(이미 있으면 바로 끝나고, Worker를 다시 띄운 뒤에는 다시 불러온다)
    load(packages) {
      return this.call("load", { packages }, 180000).then((r) => { this.loaded = new Set(r.packages); return r; });
    },
    ready(packages) { return packages.every((n) => this.loaded.has(n)); },
  };

  // 채점하지 못했을 때의 안내. 불러오기 실패와 채점기 안의 오류를 나눈다
  const pyErrorText = (err) => (err && err.python ?
    T("채점기에서 오류가 나서 파이썬을 다시 준비합니다. 잠시 뒤 다시 눌러 주세요.") :
    T("파이썬을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요."));
  // 입력을 멈춘 뒤 잠깐 기다렸다 저장하는 초안. 페이지를 닫을 때는 바로 저장한다
  let pendingDraft = null;

  // ------------------------------------------------------------------ 코드 색칠
  const KW = new Set(("False None True and as assert async await break class continue def del elif else except " +
    "finally for from global if import in is lambda nonlocal not or pass raise return try while with yield").split(" "));
  const BI = new Set(("print input int float str len range list dict tuple set sum min max abs round sorted type bool " +
    "enumerate zip isinstance open map filter any all reversed").split(" "));
  const TOKEN = /(#[^\n]*)|((?:\b[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?))|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_ㄱ-힝][\wㄱ-힝]*)|(\n)|([^\S\n]+)|([\s\S])/g;

  function wrapTok(text, cls) {
    return text.split("\n").map((part) => (part ? `<span class="tk-${cls}">${esc(part)}</span>` : "")).join("\n");
  }

  function hl(code) {
    let out = "";
    let prev = "";
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      const [t, com, str, num, id, nl, ws] = m;
      let cls = null;
      if (com) cls = "com";
      else if (str) cls = "str";
      else if (num) cls = "num";
      else if (id) {
        if (KW.has(id)) cls = "kw";
        else if (prev === "def") cls = "fn";
        else if (BI.has(id) && code[TOKEN.lastIndex] === "(") cls = "bi";
      }
      out += cls ? wrapTok(t, cls) : esc(t);
      if (!nl && !ws) prev = t;
    }
    return out;
  }

  function codeBlock(html, extraClass = "") {
    return `<pre class="code ${extraClass}">${html.split("\n").map((l) => `<span class="ln">${l}</span>`).join("")}</pre>`;
  }

  function blankWidth(answer) {
    const n = answer.length;
    return n <= 4 ? 6 : n <= 10 ? 12 : 18;
  }

  // ------------------------------------------------------------------ 코드 입력 칸
  function insertText(ta, text) {
    ta.focus();
    let done = false;
    try { done = document.execCommand("insertText", false, text); } catch (e) { done = false; }
    if (!done) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function selectLines(ta) {
    const v = ta.value;
    const start = v.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    let end = v.indexOf("\n", ta.selectionEnd - (ta.selectionEnd > ta.selectionStart && v[ta.selectionEnd - 1] === "\n" ? 1 : 0));
    if (end < 0) end = v.length;
    return { start, end, lines: v.slice(start, end).split("\n") };
  }

  function makeEditor(wrapper, { value, onChange, onSubmit }) {
    const ta = $("textarea", wrapper);
    const gutter = $(".gutter", wrapper);
    ta.value = value;
    const sync = () => {
      const n = ta.value.split("\n").length;
      gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
      ta.rows = Math.max(n + 1, 6);
    };
    ta.addEventListener("input", () => { sync(); if (onChange) onChange(ta.value); });
    ta.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (onSubmit) onSubmit(); return; }
      if (e.key === "Tab") {
        e.preventDefault();
        const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n");
        if (!e.shiftKey && !multi) { insertText(ta, "    "); return; }
        const { start, end, lines } = selectLines(ta);
        const changed = lines.map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, "") : "    " + l)).join("\n");
        ta.setSelectionRange(start, end);
        insertText(ta, changed);
        ta.setSelectionRange(start, start + changed.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const v = ta.value;
        const pos = ta.selectionStart;
        const line = v.slice(v.lastIndexOf("\n", pos - 1) + 1, pos);
        let indent = line.match(/^[ \t]*/)[0];
        if (/:\s*(#.*)?$/.test(line)) indent += "    ";
        insertText(ta, "\n" + indent);
        return;
      }
      if (e.key === "Backspace" && ta.selectionStart === ta.selectionEnd) {
        const v = ta.value;
        const pos = ta.selectionStart;
        const before = v.slice(v.lastIndexOf("\n", pos - 1) + 1, pos);
        if (before.length && /^ +$/.test(before)) {
          e.preventDefault();
          const cut = before.length % 4 || 4;
          const want = v.slice(0, pos - cut) + v.slice(pos);
          ta.setSelectionRange(pos - cut, pos);
          insertText(ta, "");
          if (ta.value !== want) {  // 빈 글자 넣기로 지우지 못하는 브라우저가 있어 결과를 보고 직접 맞춘다
            ta.value = want;
            ta.dispatchEvent(new Event("input", { bubbles: true }));
          }
          // Chrome은 줄을 비우면 커서를 윗줄 끝에 둔다. 그러면 다음 글자가 윗줄에 붙고, 백스페이스가 윗줄 글자를 지운다(2026-10-14 사용자 제보)
          ta.setSelectionRange(pos - cut, pos - cut);
        }
      }
    });
    sync();
    return ta;
  }

  // ------------------------------------------------------------------ 데이터
  const courseCache = {};
  let courseIndex = null;

  async function getIndex() {
    if (!courseIndex) {
      courseIndex = fetch(`data/courses.json?v=${VERSION}`).then((r) => {
        if (!r.ok) throw new Error(`courses.json ${r.status}`);
        return r.json();
      });
    }
    return courseIndex;
  }

  async function getCourse(cid) {
    if (!courseCache[cid]) {
      courseCache[cid] = fetch(`data/${encodeURIComponent(cid)}.json?v=${VERSION}`).then((r) => {
        if (!r.ok) {
          const err = new Error(`${cid}.json ${r.status}`);
          err.notFound = r.status === 404;
          throw err;
        }
        return r.json();
      }).then((c) => {
        c.byId = Object.fromEntries(c.problems.map((p, i) => [p.id, { ...p, index: i }]));
        c.problems = c.problems.map((p) => c.byId[p.id]);
        c.chapterByNum = Object.fromEntries(c.chapters.map((ch) => [ch.num, ch]));
        c.sectionByNum = {};
        c.bySection = {};
        c.byChapter = {};
        c.chapters.forEach((ch) => {
          c.byChapter[ch.num] = [];
          ch.sections.forEach((sec) => { c.sectionByNum[sec.num] = { ...sec, chapter: ch.num }; });
        });
        c.problems.forEach((p) => {
          (c.bySection[p.section] = c.bySection[p.section] || []).push(p);
          (c.byChapter[p.chapter] = c.byChapter[p.chapter] || []).push(p);
        });
        return c;
      }).catch((err) => {
        delete courseCache[cid];  // 다음에 다시 받아 보게 한다
        throw err;
      });
    }
    return courseCache[cid];
  }

  // 채점기에 보낼 문제 정보. lang은 채점기가 메시지 언어를 고르는 칸이다(영어 과목의 문제에는 빌드가 "en"을 붙인다)
  const wire = (p) => ({
    type: p.type, parts: p.parts, code: p.code, tests: p.tests, forbid: p.forbid, require: p.require,
    max_changed: p.max_changed, entry: p.entry, lang: p.lang || LANG,
  });

  // ------------------------------------------------------------------ 출력 예측 채점(파이썬 없이)
  function gradePredict(p, text, errOn, errType) {
    const want = p.expect;
    const got = norm(String(text || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"'));  // 휴대폰의 스마트 따옴표
    if (want.error) {
      if (!errOn) return { ok: false, msg: T("아직 아닙니다. 이 코드가 끝까지 실행될지 위에서부터 한 줄씩 다시 따라가 봅니다.") };
      if (errType !== want.error) return { ok: false, msg: T("오류가 나는 것은 맞습니다. 오류 이름을 다시 봅니다. 오류 메시지는 마지막 줄의 이름부터 읽습니다.") };
      if (got !== want.stdout) {
        return { ok: false, msg: /Error/.test(got) ? T("오류 이름은 맞습니다. 칸에는 오류가 나기 전에 찍힌 줄만 적습니다. 오류 메시지는 적지 않고, 찍힌 줄이 없으면 칸을 비웁니다.") :
          T("오류 이름은 맞습니다. 오류가 나기 전에 찍히는 줄을 다시 봅니다. 찍힌 줄이 없으면 칸을 비웁니다.") };
      }
      return { ok: true };
    }
    if (errOn) return { ok: false, msg: T("아직 아닙니다. 이 코드는 오류 없이 끝까지 실행됩니다.") };
    if (got === want.stdout) return { ok: true };
    if (!got) return { ok: false, msg: T("출력을 적어 주세요.") };
    const a = got.split("\n");
    const b = want.stdout.split("\n");
    if (got.replace(/"/g, "'") === want.stdout) {
      return { ok: false, msg: T("글자는 맞고 따옴표만 다릅니다. 리스트나 딕셔너리를 찍으면 안의 문자열은 작은따옴표로 보입니다.") };
    }
    if (got.replace(/\s+/g, "") === want.stdout.replace(/\s+/g, "")) {
      const shape = /[\[({]/.test(want.stdout) ? " " + T("리스트, 튜플, 딕셔너리는 쉼표 뒤를 한 칸 띄워 찍습니다.") : "";
      const end = /\bend\s*=/.test(p.code || "") ? " " + T("`end=`가 있는 print는 줄을 바꾸지 않고 그 글자를 붙입니다.") : "";
      return { ok: false, msg: `${T("글자는 맞고 띄어쓰기나 줄 바꿈만 다릅니다. print는 값 사이를 한 칸 띄우고, 한 번 부를 때마다 줄을 바꿉니다.")}${end}${shape}` };
    }
    if (want.stdout.includes("<class '") && !got.includes("<class '")) {
      return { ok: false, msg: T("type()의 결과는 `<class 'int'>`처럼 찍힙니다. 자료형 이름만 적지 않았는지 봅니다.") };
    }
    if (a.length !== b.length) {
      return { ok: false, msg: T("줄 수가 다릅니다. 지금 {n}줄을 적었습니다. print가 몇 번 실행되는지 다시 셉니다.", { n: a.length }) };
    }
    const i = a.findIndex((line, k) => line !== b[k]);
    return { ok: false, msg: T("{n}번째 줄이 다릅니다. 그 줄을 찍는 순간의 값을 다시 따라가 봅니다.", { n: i + 1 }) };
  }

  // ------------------------------------------------------------------ 결과 그리기
  function errorHtml(error) {
    if (!error) return "";
    if (error.type === "SyntaxError" && /U\+201[89CD]/.test(error.message || "")) {  // 휴대폰이나 맥의 스마트 따옴표
      return `<div class="errline">${error.line ? `${T("{n}번째 줄", { n: error.line })} · ` : ""}SyntaxError: ${esc(error.message)}</div>` +
        `<div class="errko">${T("둥근 따옴표(‘ ’ “ ”)가 들어 있습니다. 파이썬 코드에는 곧은 따옴표(' \")를 씁니다. 기기에서 스마트 따옴표(스마트 구두점)를 끄면 바로 칠 수 있습니다.")}</div>`;
    }
    const where = error.line ? `${T("{n}번째 줄", { n: error.line })} · ` : "";
    const msg = ["StepLimit", "OutputLimit", "Timeout", "TimeLimit"].includes(error.type) ? "" :
      `${esc(error.type)}: ${esc(error.message)}`;
    return `<div class="errline">${where}${msg || esc(errHelp(error.type) || error.type)}</div>` +
      (msg && errHelp(error.type) ? `<div class="errko">${esc(errHelp(error.type))}</div>` : "");
  }

  // 함수를 부르는 테스트는 부른 식을 이름으로 보인다. 따로 이름을 붙였거나 준비 코드가 있으면 이름과 식을 함께 보인다.
  // 준비 코드가 결과를 담아 둔 이름 하나(result, content)를 보는 테스트는 붙인 이름만 보인다.
  const helperName = (t) => t.setup && t.label !== t.expr && /^\w+$/.test(t.expr);
  const testLabel = (t) => (t.expr && !t.var && !helperName(t) ? (t.label && !t.label.includes(t.expr) ?
    `${esc(t.label)} <code>${esc(t.expr)}</code>` : t.label && t.label !== t.expr ? esc(t.label) : `<code>${esc(t.expr)}</code>`) : esc(t.label));

  function testHtml(t) {
    const mark = t.ok ? "✓" : "✗";
    const opt = t.optional ? `<span class="opt">${T("도전 · 통과 여부에 넣지 않음")}</span>` : "";
    const label = testLabel(t);
    let body = "";
    if (!t.ok) {
      if (t.plot) {  // 그래프 문제: 목표 그림과 다른 점을 말로 보이고, 이 테스트에서 그린 내 그림을 붙인다
        if (t.note) body += `<p class="small">${inl(t.note)}</p>`;
        if (t.error) body += errorHtml(t.error);
        if (t.diffs && t.diffs.length) body += `<ul class="diffs">${t.diffs.map((d) => `<li>${inl(d)}</li>`).join("")}</ul>`;
        if (t.image) body += figureHtml(t.image, T("이 테스트에서 그린 내 그림"));
      } else if (t.note && !("expected" in t)) body += `<p class="small">${inl(t.note)}</p>`;
      else if (t.expr !== undefined) {
        const noVar = t.var && t.error && t.error.type === "NameError" && !t.error.line;  // 답을 담을 변수가 없음
        const want = t.expected_error ? T("{name} 오류", { name: t.expected_error }) : t.expected;
        const got = noVar ? T("(없음)") : t.error ? T("{name} 오류", { name: t.error.type }) : t.got;
        const vname = t.var ? t.expr.replace(/^\((.*)\)$/, "$1") : "";
        const call = /\)\s*$/.test(t.expr) && !/^\(/.test(t.expr);  // 함수를 부른 식인가, 이름을 읽는 식인가
        if (t.setup) body += `<p class="tiny muted">${T("채점할 때 먼저 실행한 코드")}</p><pre class="out">${esc(t.setup.trim())}</pre>`;
        body += `<div class="cmp"><div><span>${t.var ? T("기대한 {name}", { name: esc(vname) }) : T("기대한 값")}</span><pre class="out">${esc(want)}</pre></div>` +
          `<div><span>${t.var ? T("내 코드의 {name}", { name: esc(vname) }) : call ? T("내 함수가 돌려준 값") : T("실행한 뒤의 값")}</span><pre class="out ${t.error ? "err" : ""}">${esc(got ?? "")}</pre></div></div>`;
        if (t.printed) body += `<p class="tiny muted">${T("함수가 찍은 출력: {out}", { out: esc(t.printed.split("\n").slice(0, 3).join(" / ")) })}</p>`;
        if (t.error && !noVar) body += errorHtml(t.error);
        if (t.note) body += `<p class="small">${inl(t.note)}</p>`;
      } else {
        const want = t.expected_error ? `${t.expected ? t.expected + "\n" : ""}(${T("{name} 오류", { name: t.expected_error })})` : t.expected;
        body += `<div class="cmp"><div><span>${T("기대한 출력")}</span><pre class="out">${esc(want)}</pre></div>` +
          `<div><span>${T("내 코드의 출력")}</span><pre class="out">${esc(t.got)}</pre></div></div>`;
        if (t.error) body += errorHtml(t.error);
      }
      // 이름에 입력값이 이미 보이는 테스트(빌드가 붙인 '입력값 3, 5', 영어판 'Input: 3, 5')에는 넣은 값을 따로 적지 않는다
      const stdinShown = String(t.label).startsWith(LANG === "en" ? "Input:" : "입력값");  // i18n:ok 빌드가 붙인 이름과 맞춰 본다
      if (t.stdin && !stdinShown) body += `<p class="tiny muted">${T("input()에 넣은 값: {values}", { values: t.stdin.map(esc).join(", ") })}</p>`;
    }
    return `<li class="${t.ok ? "ok" : "bad"}"><div class="th"><span class="mark">${mark}</span><span>${label}</span>${opt}</div>${body}</li>`;
  }

  function gradeHtml(r) {
    if (r.blocked) {
      return { cls: "bad", html: `<h3>✗ ${T("아직 아닙니다")}</h3><p>${inl(r.blocked)}</p>${errorHtml(r.error)}` };
    }
    const req = r.tests.filter((t) => !t.optional);
    const passed = req.filter((t) => t.ok).length;
    const head = r.ok ? `<h3>✓ ${T("정답입니다")}</h3>` : `<h3>✗ ${T("아직 아닙니다")}</h3>`;
    let html = `${head}<p class="small">${T("확인 {n}개 중 {k}개 통과", { n: req.length, k: passed })}` +
      (r.changed !== undefined ? ` · ${T("바꾼 줄 {n}줄", { n: r.changed })}` : "") + `</p>`;
    html += `<ul class="tests">${r.tests.map(testHtml).join("")}</ul>`;
    if (r.notes && r.notes.length) html += r.notes.map((n) => `<p class="small">${inl(n)}</p>`).join("");
    return { cls: r.ok ? "ok" : "bad", html };
  }

  function consoleHtml(r, title = T("실행 결과")) {
    const text = r.screen || r.stdout || "";
    const v = r.var;  // 답을 담는 변수가 있는 문제: 실행이 끝났을 때의 값
    const varHtml = !v ? "" : v.missing ? `<p class="small muted" style="margin-top:6px">${T("아직 {name}에 값을 담지 않았습니다.", { name: `<code>${esc(v.missing)}</code>` })}</p>` :
      `<p class="small" style="margin-top:6px">${T("실행이 끝났을 때 {vars}", { vars: v.names.map((n, i) => `<code>${esc(n)} = ${esc(v.values[i])}</code>`).join(", ") })}</p>`;
    const img = !("image" in r) ? "" : r.image ? figureHtml(r.image, T("내 그림")) : `<p class="small muted" style="margin-top:6px">${T("(그린 그림 없음)")}</p>`;
    return `<span class="label">${esc(title)}</span><pre class="out">${esc(text) || `<span class="muted">${T("(출력 없음)")}</span>`}</pre>${errorHtml(r.error)}${varHtml}${img}`;
  }

  // ------------------------------------------------------------------ 그래프 문제(시각화 과목, 2026-10-14)
  // 채점기가 그림에서 읽는 칸의 이름. 문제 원본의 plot에 적은 칸만 비교한다(harness.compare_plot)
  const PLOT_NAMES = {
    layout: "Axes 배치", suptitle: "그림 전체 제목", sharex: "X축 공유", sharey: "Y축 공유", kind: "그래프 종류",
    bars: "막대(자리와 높이)", barh: "가로 막대(자리와 길이)", errorbars: "오차 막대 수", errorbar_ends: "오차 막대의 양 끝",
    fills: "채운 영역 수(오차 띠 등)", lines: "선의 값과 라벨",
    points: "점의 좌표", groups: "점의 색 묶음", title: "제목", xlabel: "X축 라벨", ylabel: "Y축 라벨", legend: "범례",
    xticks: "X축 눈금 라벨", yticks: "Y축 눈금 라벨", texts: "그래프 안의 글자(값 라벨, 주석)", arrows: "화살표 주석이 가리키는 점",
    xlim: "X축 범위", ylim: "Y축 범위",
    line_colors: "선 색", bar_colors: "막대 색", figlegend: "그림 범례", figtexts: "그림에 적은 글자(fig.text)", figsize: "그림 크기(figsize)",
    saved: "저장한 파일(이름과 픽셀 크기)", saved_names: "저장한 파일 이름", wedges: "원 그래프 조각(라벨과 비율)", boxes: "박스 플롯(사분위수, 수염, 이상치 수)",
    legend_title: "범례 제목", xscale: "X축 눈금 방식", yscale: "Y축 눈금 방식", xgrid: "X축 격자(세로선)", ygrid: "Y축 격자(가로선)",
    spines: "보이는 테두리", line_styles: "선 모양과 마커",
  };
  const PLOT_NAMES_EN = {
    layout: "Axes layout", suptitle: "figure title", sharex: "shared x-axis", sharey: "shared y-axis", kind: "chart type",
    bars: "bars (positions and heights)", barh: "horizontal bars (positions and lengths)", errorbars: "number of error bars", errorbar_ends: "error bar ends",
    fills: "number of filled areas (such as error bands)", lines: "line values and labels",
    points: "point coordinates", groups: "point color groups", title: "title", xlabel: "x-axis label", ylabel: "y-axis label", legend: "legend",
    xticks: "x-axis tick labels", yticks: "y-axis tick labels", texts: "text inside the plot (value labels, annotations)", arrows: "points that arrow annotations point to",
    xlim: "x-axis range", ylim: "y-axis range",
    line_colors: "line colors", bar_colors: "bar colors", figlegend: "figure legend", figtexts: "text on the figure (fig.text)", figsize: "figure size (figsize)",
    saved: "saved file (name and pixel size)", saved_names: "saved file names", wedges: "pie wedges (labels and shares)", boxes: "box plot (quartiles, whiskers, number of outliers)",
    legend_title: "legend title", xscale: "x-axis scale", yscale: "y-axis scale", xgrid: "x-axis grid (vertical lines)", ygrid: "y-axis grid (horizontal lines)",
    spines: "visible spines", line_styles: "line styles and markers",
  };
  const plotName = (k) => (LANG === "en" ? PLOT_NAMES_EN : PLOT_NAMES)[k];
  // 받침이 있으면 '을', 없으면 '를'(끝의 괄호 설명은 건너뛰고 본다). 한국어 화면에서만 쓴다
  const objParticle = (w) => {
    const t = String(w).replace(/\([^)]*\)$/, "").trim();
    const c = t.charCodeAt(t.length - 1);
    return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 0 ? "를" : "을";  // i18n:ok 한국어 조사
  };
  const figureHtml = (src, caption, cls = "my-fig") =>
    `<figure class="${cls}"><img src="${src.startsWith("data/") ? `${esc(src)}?v=${VERSION}` : `data:image/png;base64,${src}`}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`;

  function plotSpecHtml(p, todo) {
    const fields = p.plot.map((k) => plotName(k) || k);
    const colors = p.plot.some((k) => k.endsWith("_colors"));
    const size = p.plot.some((k) => k === "figsize" || k === "saved");
    const marks = p.plot.includes("line_styles");
    const axisLabels = p.plot.includes("xlabel") || p.plot.includes("ylabel");
    // 목표 그림에 있어도 채점하지 않는 꾸밈(2026-10-15 학생처럼 풀기 시험: 지문에 없는 마커와 축 라벨이 목표 그림에 보여 헷갈림)
    const notGraded = [colors ? "" : T("색"), marks ? "" : T("마커"), axisLabels ? "" : T("축 라벨"), size ? "" : T("그림 크기"), T("글꼴")].filter(Boolean);
    const code = p.code || (p.parts || []).join("");
    const given = [...new Set(p.tests.flatMap((t) => (t.replace || []).map(([old]) => old)))]
      .sort((a, b) => code.indexOf(a.split("\n")[0]) - code.indexOf(b.split("\n")[0]))
      .flatMap((block) => {
        const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
        return ls.length <= 2 ? ls : [`${ls[0]} … ${ls[ls.length - 1]}`];
      });
    const rows = [];
    if (p.type !== "write") rows.push([T("할 일"), esc(todo)]);
    rows.push([T("그림"), `${p.figure ? `${T("목표 그림처럼 그립니다.")} ` : ""}` +
      `${T("채점할 때 내 그림에서 {fields}{obj} 읽어 비교합니다.", { fields: esc(fields.join(", ")), obj: LANG === "ko" ? objParticle(fields[fields.length - 1]) : "" })} ` +
      T("여기에 적지 않은 것({items} 등)은 목표 그림에 있어도 보지 않습니다.", { items: notGraded.join(", ") })]);
    if (given.length) rows.push([T("입력"), T("주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 다시 그립니다.", { lines: given.map((l) => `<code>${esc(l)}</code>`).join(", ") })]);
    return `<dl class="io-spec">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  }

  // ------------------------------------------------------------------ 문제 한 개
  function howto(p, mode) {
    if (p.type === "predict") {
      return mode === "ta" ? T("실행하지 않고 출력을 적습니다.") :
        T("실행하지 않고 한 줄씩 따라가 출력을 적습니다. 채점한 뒤에 실행해서 대조할 수 있습니다.");
    }
    if (p.type === "fill") return T("빈칸을 채웁니다. 채점할 때 채운 코드를 실행해 확인합니다.");
    if (p.type === "fix") {
      return (p.silent === false ? T("오류로 멈추는 코드입니다. 고칠 곳을 찾아 고칩니다.") :
        T("오류 없이 실행되지만 의도와 다르게 동작하는 코드입니다. 고칠 곳을 찾아 고칩니다.")) +
        (p.max_changed ? ` ${T("{n}줄 안에서 고칠 수 있습니다.", { n: p.max_changed })}` : "");
    }
    const replaced = p.tests.some((t) => t.replace);
    return replaced ? T("맨 위의 주어진 코드는 그대로 두고 이어서 씁니다. 채점할 때 그 값을 바꿔 여러 번 실행합니다.") :
      /^class\s/m.test(p.code || "") ? T("클래스를 완성합니다. 채점할 때 여러 값으로 객체를 만들고 메서드를 불러 봅니다.") :
        T("함수를 완성합니다. 채점할 때 여러 값으로 함수를 불러 봅니다.");
  }

  // 작성형의 입력과 출력(2026-10-13 사용자 결정). 원본에 answer(답을 담는 변수)나 output: print를 적은 문제에 보인다.
  // 입력은 맨 위의 주어진 줄, 출력은 답을 담는 변수나 print, 예는 주어진 값 그대로 실행했을 때의 결과다.
  function ioSpecHtml(p) {
    if (p.type === "write" && !p.answer && p.output !== "print") {
      const prog = p.tests.find((t) => t.kind === "program" && !t.replace && !t.optional && !t.expect.error);
      if (!prog) return "";
      const calls = p.tests.filter((t) => t.kind === "call" && !t.var).length;
      const cls = /^class\s/m.test(p.code || "");
      const when = prog.stdin ? T("입력값이 {values}일 때", { values: prog.stdin.map(esc).join(", ") }) : T("주어진 값 그대로일 때");
      return `<dl class="io-spec"><dt>${cls ? T("클래스") : T("함수")}</dt><dd>${calls ? (cls ? T("채점할 때 여러 값으로 객체를 만들고 메서드를 불러 결과를 봅니다.") :
        T("채점할 때 여러 값으로 함수를 불러 돌려준 값을 봅니다.")) : (cls ? T("문제에서 말한 클래스를 만듭니다.") : T("문제에서 말한 함수를 만듭니다."))}</dd>` +
        `<dt>${T("출력")}</dt><dd>${T("프로그램 전체가 찍는 내용도 글자 그대로 비교합니다. 지문에서 찍으라고 한 것만 남기고, 확인용으로 더한 print는 채점하기 전에 지웁니다.")}</dd>` +
        `<dt>${T("예")}</dt><dd>${T("{when} 이렇게 찍힙니다.", { when })}<pre class="out">${esc(norm(prog.expect.stdout))}</pre></dd></dl>`;
    }
    if (p.type !== "write" || !(p.answer || p.output === "print")) return "";
    const first = p.tests.find((t) => !t.replace && !t.optional && (t.var || t.kind === "program"));
    if (!first || (!first.var && first.expect.error)) return "";
    // 채점할 때 값을 바꾸는 줄만 입력으로 보인다(시작 코드의 뼈대나 print는 빼고). 시작 코드에 나오는 차례대로.
    const code = p.code || "";
    const given = [...new Set(p.tests.flatMap((t) => (t.replace || []).map(([old]) => old)))]
      .sort((a, b) => code.indexOf(a.split("\n")[0]) - code.indexOf(b.split("\n")[0]))
      .flatMap((block) => {  // 세 줄 넘는 블록(여러 줄 리스트 등)은 첫 줄과 끝 줄만 보인다
        const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
        return ls.length <= 2 ? ls : [`${ls[0]} … ${ls[ls.length - 1]}`];
      });
    const names = !p.answer ? [] : Array.isArray(p.answer) ? p.answer : [p.answer];
    const vars = names.map((n) => `<code>${esc(n)}</code>`).join(", ");
    const rows = [];
    const fileNames = Object.keys(p.files || {});
    if (fileNames.length) {
      const changed = p.tests.some((t) => t.files && JSON.stringify(t.files) !== JSON.stringify(p.files));
      rows.push([T("파일"), T("실행할 때 같은 폴더에 {names} 파일이 있습니다.", { names: fileNames.map((n) => `<code>${esc(n)}</code>`).join(", ") }) +
        (changed ? ` ${T("채점할 때 파일 내용을 바꿔 여러 번 실행합니다.")}` : "")]);
    }
    if (first.stdin) rows.push([T("입력"), T("input()으로 값을 읽습니다. 채점할 때 여러 값을 넣어 실행합니다.")]);
    else if (given.length) {
      rows.push([T("입력"), T("주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 여러 번 실행합니다.", { lines: given.map((l) => `<code>${esc(l)}</code>`).join(", ") })]);
    }
    rows.push([T("출력"), names.length ? T("답을 변수 {vars}에 담습니다. print는 확인용으로 써도 되고, 채점은 {vars}의 값만 봅니다.", { vars }) :
      T("print로 출력합니다. 찍힌 내용을 글자 그대로 비교합니다(줄 끝 공백과 앞뒤 빈 줄은 보지 않습니다).")]);
    const when = first.stdin ? T("입력값이 {values}일 때", { values: first.stdin.map(esc).join(", ") }) : fileNames.length ? T("주어진 파일 그대로일 때") : T("주어진 값 그대로일 때");
    const shown = names.length === 1 ? [first.expect.value] : first.expect.parts || [];
    rows.push([T("예"), names.length ? T("{when} {vars}", { when, vars: names.map((n, i) => `<code>${esc(n)} = ${esc(shown[i] ?? "")}</code>`).join(", ") }) :
      `${T("{when} 이렇게 찍힙니다.", { when })}<pre class="out">${esc(norm(first.expect.stdout))}</pre>`]);
    return `<dl class="io-spec">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  }
  function planHtml(p) {
    if (p.type === "predict") return "";
    const items = p.tests.map((t) => testLabel(t) + (t.optional ? ` (${T("도전")})` : ""));
    return `<p class="tiny muted">${T("채점할 때 확인하는 것: {items}", { items: items.join(" · ") })}</p>`;
  }

  function solutionHtml(p) {
    let html = `<h3>${T("정답")}</h3>`;
    if (p.type === "predict") {
      const e = p.expect;
      if (p.stdin) html += `<p class="tiny muted">${T("Colab 화면에서는 input의 안내 문구와 친 값까지 이렇게 보입니다.")}</p><pre class="out">${esc(e.screen)}</pre>`;
      else html += `<pre class="out">${esc(e.stdout) || `<span class="muted">${T("(출력 없음)")}</span>`}</pre>`;
      if (e.error) html += `<div class="errline">${e.line ? `${T("{n}번째 줄", { n: e.line })} · ` : ""}${esc(e.error)}: ${esc(e.message)}</div>`;
    } else if (p.type === "fill") {
      let code = "";
      p.parts.forEach((part, i) => {
        code += hl(part);
        if (i < p.answers.length) code += `<mark class="ans">${esc(p.answers[i])}</mark>`;
      });
      html += codeBlock(code);
    } else {
      html += codeBlock(hl(p.solution.replace(/\n+$/, "")));
    }
    if (p.explain) html += `<h3 style="margin-top:14px">${T("해설")}</h3>${md(p.explain)}`;
    if (p.more) html += `<p class="small"><b>${T("더 해 보기")}</b> ${inl(p.more)}</p>`;
    return html;
  }

  // 오류 이름 고르기 목록. 과목의 출력 예측 문제에 쓰인 오류 이름은 늘 들어가게 한다
  const choiceCache = new Map();
  function errorChoices(course) {
    if (!choiceCache.has(course.id)) {
      const used = course.problems.filter((q) => q.type === "predict" && q.expect && q.expect.error).map((q) => q.expect.error);
      choiceCache.set(course.id, [...new Set([...ERROR_CHOICES, ...used])]);
    }
    return choiceCache.get(course.id);
  }

  // 9장 파일 문제: 실행할 때 폴더에 미리 있는 파일을 이름과 내용으로 보인다
  // 끝의 줄바꿈은 상자에 보이지 않지만 줄 수와 readlines() 결과를 가르므로 이름 옆에 적는다(모듈 .py 파일은 빼고)
  function filesHtml(p) {
    return Object.entries(p.files || {}).map(([name, text]) =>
      `<div class="file-box"><div class="file-name">${T("파일 {name}", { name: `<code>${esc(name)}</code>` })}` +
      (text.trim() && !name.endsWith(".py") ? ` · ${text.endsWith("\n") ? T("마지막 줄 끝에 줄바꿈 있음") : T("마지막 줄 끝에 줄바꿈 없음")}` : "") + `</div>` +
      (text.trim() ? `<pre class="out">${esc(text.replace(/\n$/, ""))}</pre>` : `<p class="tiny muted">${T("(빈 파일)")}</p>`) + `</div>`).join("");
  }

  function mountProblem(root, course, p, opts) {
    const mode = opts.mode; // practice | ta
    const cid = course.id;
    const exam = mode === "ta" || !!Store.setting("exam");
    // 타임어택에서 실행을 켜면 출력 예측을 뺀 문제에 실행 버튼을 둔다
    const taRun = mode === "ta" && !!opts.run && p.type !== "predict";
    const rec = mode === "practice" ? Store.prob(cid, p.id) : {};
    const draft = (mode === "practice" ? rec.d : opts.draft) || {};
    let attempts = 0;
    let hintShown = 0;
    let busy = false;
    let graded = false;
    let warnedEmpty = false;
    const usesPython = p.type !== "predict";
    const pkgs = (course.packages || []).length ? course.packages : null;  // 그래프 도구가 필요한 과목
    if (usesPython) Py.start().catch(() => {});
    if (pkgs) Py.load(pkgs).catch(() => {});  // 미리 불러 두어 처음 실행을 기다리지 않게

    // 영어 과목의 book은 절 번호만이라('§7.6') '교재' 말을 붙이지 않는다(조정자 결정, SPEC 5절)
    const meta = [T("교재 {book}", { book: esc(p.book) })];

    let body = (p.figure ? figureHtml(p.figure, T("목표 그림 · 주어진 값 그대로 그렸을 때"), "target-fig") : "") + filesHtml(p);
    if (p.type === "predict") {
      body += codeBlock(hl(p.code));
      if (p.stdin) body += `<div class="stdin">${T("input()에 차례로 친 값 {values}", { values: p.stdin.map((v) => `<code>${esc(v)}</code>`).join("") })}</div>`;
      body += `<label class="label" for="ans">${T("출력 예측")}</label>
        <textarea id="ans" class="answer" rows="4" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"
          placeholder="${T("print가 찍을 내용을 줄마다 적습니다")}"></textarea>
        <div class="errpick">
          <label class="switch"><input type="checkbox" id="err-on"> ${T("오류가 나서 중간에 멈춘다")}</label>
          <select id="err-type" hidden aria-label="${T("오류 이름")}"><option value="">${T("오류 이름 고르기")}</option>
            ${errorChoices(course).map((e) => `<option>${e}</option>`).join("")}</select>
        </div>
        <p class="tiny muted errhelp">${T("끝까지 실행되지 못하고 오류로 멈춘다고 예측할 때만 체크하고 오류 이름을 고릅니다. 오류가 나기 전에 찍히는 줄이 있으면 위 칸에 적습니다.")}</p>`;
    } else if (p.type === "fill") {
      let html = "";
      p.parts.forEach((part, i) => {
        html += hl(part);
        if (i < p.answers.length) {
          const w = blankWidth(p.answers[i]);
          // 코드를 줄 단위로 나누므로 입력 칸 태그 안에 줄바꿈을 넣지 않는다
          html += `<input class="blank" data-i="${i}" data-w="${w}" style="width:calc(${w}ch + 14px)" spellcheck="false" ` +
            `autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="${T("빈칸 {n}", { n: i + 1 })}" placeholder="${i + 1}">`;
        }
      });
      body += codeBlock(html);
    } else {
      body += `<div class="editor"><pre class="gutter" aria-hidden="true"></pre>
        <textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"
          aria-label="${T("코드 입력")}"></textarea></div>`;
    }
    const needsInput = usesPython && /input\s*\(/.test(p.code || (p.parts || []).join("") || "");
    if (needsInput && (mode === "practice" || taRun)) {
      body += `<label class="label" for="stdin">${T("실행할 때 input()이 읽을 값")} <span class="muted small">(${T("한 줄에 하나")})</span></label>
        <textarea id="stdin" class="stdin-input" rows="2" spellcheck="false" autocapitalize="off" autocorrect="off">${esc((p.stdin || []).join("\n"))}</textarea>`;
    }

    const runLabel = p.type === "predict" ? T("실행해서 대조") : T("실행");
    const gradeLabel = () => (mode === "ta" ? T("제출") : T("채점하기"));
    const ioSpec = p.plot ? plotSpecHtml(p, howto(p, mode)) : ioSpecHtml(p);
    root.innerHTML = `
      <article class="card problem">
        <div class="phead">
          <span class="badge ${p.type}">${typeName(p.type)}</span>
          <span class="level">${levelName(p.level) || ""}</span>
          <h1>${esc(p.title)}</h1>
        </div>
        <p class="pmeta">${meta.join(" · ")}</p>
        <div class="prompt">${md(p.prompt)}</div>
        ${ioSpec || `<p class="howto">${esc(howto(p, mode))}</p>`}
        ${mode === "practice" ? planHtml(p) : ""}
        <div class="pbody">${body}</div>
        <div class="actions">
          <button class="btn primary" data-act="grade">${gradeLabel()} <span class="kbd">${SUBMIT_KEY}</span></button>
          ${mode === "practice" ? `
            <button class="btn" data-act="run" ${p.type === "predict" || exam ? "hidden" : ""}>${runLabel}</button>
            ${p.hints && p.hints.length ? `<button class="btn ghost" data-act="hint">${T("힌트")} <span class="hint-count">0/${p.hints.length}</span></button>` : ""}
            ${p.type === "write" || p.type === "fix" ? `<button class="btn ghost" data-act="reset">${T("처음 코드로")}</button>` : ""}
            <span class="spacer"></span>
            <button class="btn ghost" data-act="solution" ${rec.n || rec.s === 2 ? "" : "disabled"} title="${T("한 번 채점한 뒤에 열 수 있습니다")}">${T("정답과 해설")}</button>` :
          taRun ? `<button class="btn" data-act="run">${T("실행")}</button>` : ""}
        </div>
        <div class="result" hidden aria-live="polite"></div>
        <div class="console" hidden></div>
        <ol class="hints"></ol>
        <div class="solution" hidden></div>
      </article>`;

    const resultEl = $(".result", root);
    const consoleEl = $(".console", root);
    const gradeBtn = $('[data-act="grade"]', root);
    const runBtn = $('[data-act="run"]', root);
    const solBtn = $('[data-act="solution"]', root);
    const saveDraft = (d) => {
      if (mode === "practice") Store.patch(cid, p.id, { d });
      else if (opts.onDraft) opts.onDraft(d);
    };
    let saveTimer = null;
    const saveSoon = (fn) => {
      clearTimeout(saveTimer);
      const flush = () => { clearTimeout(saveTimer); if (pendingDraft === flush) pendingDraft = null; saveDraft(fn()); };
      pendingDraft = flush;
      saveTimer = setTimeout(flush, 400);
    };

    // 답 입력
    let getAnswer;
    if (p.type === "predict") {
      const ans = $("#ans", root);
      const errOn = $("#err-on", root);
      const errType = $("#err-type", root);
      ans.value = draft.text || "";
      errOn.checked = !!draft.err;
      errType.value = draft.errType || "";
      errType.hidden = !errOn.checked;
      const snapshot = () => ({ text: ans.value, err: errOn.checked, errType: errType.value });
      errOn.addEventListener("change", () => { errType.hidden = !errOn.checked; saveSoon(snapshot); });
      errType.addEventListener("change", () => saveSoon(snapshot));
      ans.addEventListener("input", () => saveSoon(snapshot));
      ans.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); grade(); }
      });
      getAnswer = snapshot;
    } else if (p.type === "fill") {
      const blanks = $$(".blank", root);
      (draft.blanks || []).forEach((v, i) => { if (blanks[i]) blanks[i].value = v; });
      const fit = (el) => { el.style.width = `calc(${Math.max(+el.dataset.w, el.value.length + 2)}ch + 14px)`; };
      blanks.forEach((el, i) => {
        fit(el);
        el.addEventListener("input", () => { fit(el); saveSoon(() => ({ blanks: blanks.map((b) => b.value) })); });
        el.addEventListener("keydown", (e) => {
          if (e.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter") {
            e.preventDefault();
            if ((e.metaKey || e.ctrlKey) || i === blanks.length - 1) grade(); else blanks[i + 1].focus();
          }
        });
      });
      getAnswer = () => ({ blanks: blanks.map((b) => b.value) });
    } else {
      const ta = makeEditor($(".editor", root), {
        value: draft.code != null ? draft.code : p.code,
        onChange: (v) => saveSoon(() => ({ code: v })),
        onSubmit: () => grade(),
      });
      getAnswer = () => ({ code: ta.value });
      const reset = $('[data-act="reset"]', root);
      if (reset) {
        reset.addEventListener("click", () => {
          if (ta.value !== p.code && !confirm(T("처음 코드로 되돌릴까요? 지금 쓴 코드는 지워집니다."))) return;
          ta.value = p.code;
          ta.dispatchEvent(new Event("input"));
          ta.focus();
        });
      }
    }

    function setBusy(on, text) {
      busy = on;
      gradeBtn.disabled = on;
      if (runBtn) runBtn.disabled = on;
      gradeBtn.firstChild.textContent = on ? `${text} ` : `${gradeLabel()} `;
    }

    function showResult(cls, html) {
      resultEl.className = `result ${cls}`;
      resultEl.innerHTML = html;
      resultEl.hidden = false;
    }

    function afterGrade(ok) {
      attempts += 1;
      graded = true;
      if (mode === "practice") {
        Store.record(cid, p.id, ok);
        if (solBtn) solBtn.disabled = false;
        if (runBtn) runBtn.hidden = false;
        if (opts.onGraded) opts.onGraded(ok);
      }
    }

    function isEmpty(answer) {
      if (p.type === "predict") return !answer.text.trim() && !answer.err;
      if (p.type === "fill") return answer.blanks.every((b) => !b.trim());
      return !answer.code.trim() || norm(answer.code) === norm(p.code);
    }

    async function grade() {
      if (busy || (mode === "ta" && graded)) return;
      const answer = getAnswer();
      if (isEmpty(answer)) {
        if (mode === "practice" && p.type === "predict") {
          showResult("info", `<p>${T("출력을 먼저 적습니다. 아무것도 찍히지 않는다고 생각하면 그 까닭을 떠올려 봅니다.")}</p>`);
          return;
        }
        if (mode === "ta" && !warnedEmpty) {
          warnedEmpty = true;
          showResult("info", `<p>${p.type === "write" || p.type === "fix" ? T("코드를 고치지 않았습니다.") : T("답이 비어 있습니다.")} ${T("그대로 내려면 제출을 한 번 더 누릅니다.")}</p>`);
          return;
        }
      }
      if (p.type === "predict") {
        const r = gradePredict(p, answer.text, answer.err, answer.errType);
        if (mode === "ta") { graded = true; opts.onSubmit({ ok: r.ok, answer }); return; }
        if (r.ok) {
          showResult("ok", `<h3>✓ ${T("정답입니다")}</h3>${md(p.explain)}`);
        } else {
          showResult("bad", `<h3>✗ ${T("아직 아닙니다")}</h3><p>${inl(r.msg)}</p>`);
        }
        afterGrade(r.ok);
        return;
      }
      setBusy(true, Py.state !== "ready" ? T("파이썬 준비 중") : pkgs && !Py.ready(pkgs) ? T("그래프 도구 준비 중") : T("채점 중"));
      const job = !pkgs ? Py.call("grade", { problem: wire(p), answer }, 12000) :
        Py.load(pkgs).then(() => { setBusy(true, T("채점 중")); return Py.call("grade", { problem: wire(p), answer }, 30000); });
      if (opts.onGrading) opts.onGrading(job.catch(() => {}));  // 타임어택: 시간이 끝나도 이 채점은 기다렸다 넣는다
      try {
        const r = await job;
        if (mode === "ta") { graded = true; opts.onSubmit({ ok: r.ok, answer, report: r }); return; }
        const g = gradeHtml(r);
        showResult(g.cls, g.html);
        if (p.type === "fill") $$(".blank", root).forEach((b) => b.classList.toggle("ok", r.ok));
        afterGrade(r.ok);
      } catch (err) {
        if (err.timeout) {
          if (mode === "ta") { graded = true; opts.onSubmit({ ok: false, answer, timeout: true }); return; }
          showResult("bad", `<h3>✗ ${T("아직 아닙니다")}</h3>${errorHtml({ type: "Timeout" })}`);
          afterGrade(false);
        } else {
          showResult("info", `<h3>${T("채점하지 못했습니다")}</h3><p>${esc(pyErrorText(err))}</p>`);
        }
      } finally {
        setBusy(false);
      }
    }

    async function run() {
      if (busy) return;
      let code;
      let stdin = p.stdin || [];
      if (p.type === "predict") code = p.code;
      else if (p.type === "fill") {
        const a = getAnswer().blanks;
        code = p.parts[0] + a.map((b, i) => b.trim() + p.parts[i + 1]).join("");  // 채점과 같이 앞뒤 공백을 지운다
      } else code = getAnswer().code;
      const stdinEl = $("#stdin", root);
      if (stdinEl) stdin = stdinEl.value.split("\n").filter((x, i, arr) => x !== "" || i < arr.length - 1);
      setBusy(true, Py.state !== "ready" ? T("파이썬 준비 중") : pkgs && !Py.ready(pkgs) ? T("그래프 도구 준비 중") : T("실행 중"));
      try {
        if (pkgs) { await Py.load(pkgs); setBusy(true, T("실행 중")); }
        // lang은 채점기가 실행 결과의 안내(오류 설명 등)를 고르는 칸이다(SPEC 2절)
        const r = await Py.call("run", { code, stdin, var: p.type === "write" && p.answer ? p.answer : null, files: p.files || null, plot: !!pkgs, lang: LANG },
          pkgs ? 20000 : 10000);  // 변수 하나면 문자열, 여럿이면 목록
        consoleEl.innerHTML = consoleHtml(r, p.type === "predict" ? T("실제 실행 결과") : T("실행 결과"));
      } catch (err) {
        consoleEl.innerHTML = err.timeout ? consoleHtml({ screen: "", error: { type: "Timeout" } }) :
          `<p class="muted">${esc(pyErrorText(err))}</p>`;
      } finally {
        consoleEl.hidden = false;
        setBusy(false);
      }
    }

    gradeBtn.addEventListener("click", grade);
    if (runBtn) runBtn.addEventListener("click", run);
    const hintBtn = $('[data-act="hint"]', root);
    if (hintBtn) {
      hintBtn.addEventListener("click", () => {
        if (hintShown >= p.hints.length) return;
        hintShown += 1;
        $(".hints", root).insertAdjacentHTML("beforeend", `<li><b>${T("힌트 {n}", { n: hintShown })}</b>${inl(p.hints[hintShown - 1])}</li>`);
        $(".hint-count", hintBtn).textContent = `${hintShown}/${p.hints.length}`;
        if (hintShown >= p.hints.length) hintBtn.disabled = true;
      });
    }
    if (solBtn) {
      solBtn.addEventListener("click", () => {
        const el = $(".solution", root);
        el.innerHTML = solutionHtml(p);
        el.hidden = false;
        Store.patch(cid, p.id, { rev: true });
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    return { grade, focus: () => { const f = $("#ans, .blank, textarea.code-input", root); if (f) f.focus({ preventScroll: true }); } };
  }

  // ------------------------------------------------------------------ 코딩 테스트 문제
  // 함수 하나를 완성하고, 보이는 예시와 숨은 테스트로 채점한다. 점수는 통과한 정확성 테스트의 비율이다.
  // 효율성 테스트는 정확성을 모두 통과한 뒤에 하나씩 따로 돌린다. C 안에서 오래 도는 코드는 실행 줄 수에
  // 잡히지 않으므로 PERF_TIMEOUT이 지나면 시간 초과로 보고 파이썬을 다시 준비한다.
  const PERF_TIMEOUT = 8000;
  const GRADE_TIMEOUT = 20000;
  const isTestCourse = (c) => c.kind === "test";
  const hasPerf = (p) => p.tests.some((t) => t.perf);
  const requiredCount = (p) => p.tests.filter((t) => !t.optional).length;
  const fmtNum = (n) => Number(n).toLocaleString(LANG === "en" ? "en-US" : "ko-KR");

  function ioTableHtml(p) {
    const head = (p.params || []).map((x) => `<th>${esc(x)}</th>`).join("") + "<th>result</th>";
    const rows = p.examples.map((ex) => `<tr>${ex.args.map((a) => `<td>${esc(a)}</td>`).join("")}<td>${esc(ex.result)}</td></tr>`).join("");
    return `<div class="io-wrap"><table class="io"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function prereqHtml(p) {
    if (!p.prereq || !p.prereq.length) return "";
    return `<p class="prereq small"><span class="muted">${T("필요한 기초")}</span>${p.prereq.map((x) =>
      `<a href="#/${esc(x.course)}/ch/${esc(x.num.split(".")[0])}/${esc(x.num)}">${esc(x.num)} ${esc(x.title)}</a>`).join("")}</p>`;
  }

  function failWhy(t) {
    if (t.pending) return T("정확성을 모두 통과하면 확인합니다");
    if (t.skipped) return T("건너뜀");
    if (!t.error) return T("틀린 값");
    if (t.error.type === "TimeLimit") return T("시간 초과");
    if (t.error.type === "StepLimit") return T("줄 수 한도(100만 줄)");
    return `${T("{name} 오류", { name: t.error.type })}${t.error.line ? ` · ${T("{n}번째 줄", { n: t.error.line })}` : ""}`;
  }

  function ctTestHtml(t) {
    const cls = t.pending ? "pending" : t.ok ? "ok" : "bad";
    const mark = t.pending ? "·" : t.ok ? "✓" : "✗";
    if (t.example) {  // 보이는 예시는 입력과 값을 모두 보여 준다
      let body = "";
      if (!t.ok) {
        const got = t.error ? T("{name} 오류", { name: t.error.type }) : t.got;
        body += `<div class="cmp"><div><span>${T("기대한 값")}</span><pre class="out">${esc(t.expected)}</pre></div>` +
          `<div><span>${T("내 함수가 돌려준 값")}</span><pre class="out ${t.error ? "err" : ""}">${esc(got ?? "")}</pre></div></div>`;
        if (t.error) body += errorHtml(t.error);
        if (t.note) body += `<p class="small">${inl(t.note)}</p>`;
      }
      if (t.printed) body += `<p class="tiny muted">${T("함수가 찍은 출력: {out}", { out: esc(t.printed.split("\n").slice(0, 3).join(" / ")) })}</p>`;
      return `<li class="${cls}"><div class="th"><span class="mark">${mark}</span><span>${esc(t.label)}</span>` +
        `<code class="expr">${esc(t.expr)}</code></div>${body}</li>`;
    }
    // 숨은 테스트와 효율성 테스트는 입력을 보이지 않고 갈래 이름과 결과만 보여 준다
    const why = t.ok ? (t.perf && t.steps != null ? T("{steps}줄 · 기준 {max}줄", { steps: fmtNum(t.steps), max: fmtNum(t.max_steps) }) : "") : failWhy(t);
    let body = "";
    if (!t.ok && !t.pending && !t.skipped) {
      if (t.error && t.error.type !== "TimeLimit") body += errorHtml(t.error);
      if (t.note) body += `<p class="small">${inl(t.note)}</p>`;
    }
    return `<li class="${cls}"><div class="th"><span class="mark">${mark}</span><span>${esc(t.label)}</span>` +
      `<span class="hint-label">${esc(t.hint || "")}</span>${why ? `<span class="why">${esc(why)}</span>` : ""}</div>${body}</li>`;
  }

  function ctReportHtml(r) {
    if (r.blocked) return { cls: "bad", html: `<h3>✗ ${T("{n}점", { n: 0 })}</h3><p>${inl(r.blocked)}</p>${errorHtml(r.error)}` };
    const req = r.tests.filter((t) => !t.optional);
    const perf = r.tests.filter((t) => t.perf);
    const k = r.perfWrong || 0;
    let html = (r.ok ? `<h3>✓ ${T("통과 · 100점")}</h3>` : `<h3>✗ ${T("{n}점", { n: r.score })}</h3>`) +
      `<p class="small">${T("정확성 테스트 {n}개 중 {k}개 통과", { n: r.total - k, k: r.passed })}` +
      (k ? ` · ${T("효율성 테스트 {k}개는 시간 안에 끝났지만 틀려서 정확성 실패로 셈", { k })}` : "") +
      (!perf.length ? "" : perf.every((t) => t.pending) ? ` · ${T("효율성(도전)은 정확성을 모두 통과하면 잽니다")}` :
        ` · ${T("효율성(도전) {k} / {n}", { k: perf.filter((t) => t.ok).length, n: perf.length })}`) + `</p>`;
    html += `<ul class="tests">${req.filter((t) => t.example).map(ctTestHtml).join("")}</ul>`;
    html += `<p class="ct-sub">${T("숨은 테스트")} <span>${T("입력은 보이지 않고 어떤 경우인지만 보입니다")}</span></p>` +
      `<ul class="tests">${req.filter((t) => !t.example).map(ctTestHtml).join("")}</ul>`;
    if (perf.length) {
      html += `<p class="ct-sub">${T("효율성")} <span>${T("도전 · 시간 초과는 점수에 넣지 않음 · 실행한 줄 수로 잽니다")}</span></p>` +
        `<ul class="tests">${perf.map(ctTestHtml).join("")}</ul>`;
    }
    return { cls: r.ok ? "ok" : "bad", html };
  }

  function ctExamplesHtml(r) {
    if (r.blocked) return { cls: "bad", html: `<h3>${T("실행하지 못했습니다")}</h3><p>${inl(r.blocked)}</p>${errorHtml(r.error)}` };
    const ok = r.tests.filter((t) => t.ok).length;
    const all = ok === r.tests.length;
    return {
      cls: all ? "ok" : "bad",
      html: `<h3>${all ? "✓" : "✗"} ${T("예시 {n}개 중 {k}개 맞음", { n: r.tests.length, k: ok })}</h3>` +
        `<p class="small muted">${T("예시만 돌렸습니다. 제출하면 숨은 테스트까지 채점합니다.")}</p>` +
        `<ul class="tests">${r.tests.map(ctTestHtml).join("")}</ul>`,
    };
  }

  function ctSolutionHtml(p) {
    return `<h3>${T("모범 코드")}</h3>${codeBlock(hl(p.solution.replace(/\n+$/, "")))}` +
      (p.explain ? `<h3 style="margin-top:14px">${T("해설")}</h3>${md(p.explain)}` : "") +
      `<p class="tiny muted">${T("다른 방법으로 풀어도 숨은 테스트를 모두 통과하면 정답입니다.")}</p>`;
  }

  // 정확성 테스트를 한 번에 채점하고, 모두 통과하면 효율성 테스트를 하나씩 돌린다
  async function gradeCodeTest(p, code, { perf = true, onStage, stopOnTimeout = false } = {}) {
    const base = await Py.call("grade", { problem: { ...wire(p), tests: p.tests.filter((t) => !t.perf) }, answer: { code } }, GRADE_TIMEOUT);
    const perfTests = p.tests.filter((t) => t.perf);
    if (!perfTests.length) return base;
    const results = [];
    if (perf && !base.blocked && base.ok) {
      for (const t of perfTests) {
        if (stopOnTimeout && results.some((x) => x.timedOut)) {  // 시험 끝: 시간 초과는 점수와 상관없으니 더 기다리지 않는다
          results.push({ label: t.label, hint: t.hint, perf: true, optional: true, ok: false, skipped: true });
          continue;
        }
        if (onStage) onStage(T("효율성 {k}/{n}", { k: results.length + 1, n: perfTests.length }));
        try {
          const r = await Py.call("grade", { problem: { ...wire(p), tests: [t] }, answer: { code } }, PERF_TIMEOUT);
          results.push(r.tests[0]);
        } catch (err) {
          if (!err.timeout) throw err;
          results.push({ label: t.label, hint: t.hint, perf: true, optional: true, ok: false, max_steps: t.max_steps, timedOut: true,
            error: { type: "TimeLimit", message: "", line: null },
            note: T("{s}초 안에 끝나지 않았습니다. 반복 대신 셈으로 바로 구하거나 같은 일을 덜 되풀이하는 방법을 찾아봅니다.", { s: PERF_TIMEOUT / 1000 }) });
        }
      }
    } else {
      perfTests.forEach((t) => results.push({ label: t.label, hint: t.hint, perf: true, optional: true, ok: false, pending: true }));
    }
    const out = { ...base, tests: base.tests.concat(results), perf: { passed: results.filter((x) => x.ok).length, total: results.length } };
    // 효율성 테스트가 시간이나 줄 수 한도가 아닌 이유로 틀리면(값이 틀림, 오류) 정확성 실패로 센다.
    // 큰 값에서만 틀리는 실수 나눗셈이나, 작은 크기로 미리 만든 표를 넘는 입력(IndexError)을 거르려는 것이다.
    const LIMITS = ["TimeLimit", "StepLimit", "Timeout", "MemoryError", "RecursionError", "OutputLimit"];
    const wrong = results.filter((t) => !t.ok && !t.pending && !t.skipped && !(t.error && LIMITS.includes(t.error.type)));
    if (wrong.length) {
      wrong.forEach((t) => {
        t.counts = true;
        t.note = t.error ? T("큰 입력에서 오류가 났습니다. 제한 사항의 가장 큰 값까지 맞게 도는지 봅니다. 이 테스트는 정확성 실패로 셉니다.") :
          T("시간 안에 끝났지만 값이 틀렸습니다. 큰 값에서만 틀리는 까닭(실수 나눗셈 등)을 찾아봅니다. 이 테스트는 정확성 실패로 셉니다.");
      });
      out.ok = false;
      out.perfWrong = wrong.length;
      out.total = base.total + wrong.length;
      out.score = Math.floor((100 * base.passed) / out.total + 0.5);
    }
    return out;
  }

  function mountCodeTest(root, course, p, opts) {
    const mode = opts.mode; // practice | exam
    const cid = course.id;
    const rec = mode === "practice" ? Store.prob(cid, p.id) : {};
    const draft = rec.d || {};
    const perfN = p.tests.filter((t) => t.perf).length;
    const sec = course.sectionByNum[p.section];
    let busy = false;
    let hintShown = 0;
    let warnedStarter = false;
    Py.start().catch(() => {});

    root.innerHTML = `
      <article class="card problem ct">
        <div class="phead">
          <span class="badge lv${p.level}">${levelName(p.level) || ""}</span>
          ${perfN ? `<span class="level">${T("효율성 도전 {n}", { n: perfN })}</span>` : ""}
          <h1>${esc(p.title)}</h1>
        </div>
        ${mode === "practice" && sec ? `<p class="pmeta">${esc(sec.num)} ${esc(sec.title)}</p>` : ""}
        <h2 class="ct-h">${T("문제 설명")}</h2>
        <div class="prompt">${md(p.prompt)}</div>
        <h2 class="ct-h">${T("제한 사항")}</h2>
        <ul class="ct-list">${(p.constraints || []).map((x) => `<li>${inl(x)}</li>`).join("")}</ul>
        <h2 class="ct-h">${T("입출력 예")}</h2>
        ${ioTableHtml(p)}
        ${mode === "practice" ? prereqHtml(p) : ""}
        <h2 class="ct-h">${T("풀이")} <span class="muted small">${T("함수 {entry}를 완성합니다", { entry: `<code>${esc(p.entry)}</code>` })}</span></h2>
        <div class="editor"><pre class="gutter" aria-hidden="true"></pre>
          <textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"
            aria-label="${T("코드 입력")}"></textarea></div>
        <div class="actions">
          <button class="btn" data-act="examples">${T("예시 실행")}</button>
          <button class="btn primary" data-act="submit">${T("제출")} <span class="kbd">${SUBMIT_KEY}</span></button>
          ${mode === "practice" && p.hints && p.hints.length ? `<button class="btn ghost" data-act="hint">${T("힌트")} <span class="hint-count">0/${p.hints.length}</span></button>` : ""}
          <button class="btn ghost" data-act="reset">${T("처음 코드로")}</button>
          ${mode === "practice" && p.solution ? `<span class="spacer"></span><button class="btn ghost" data-act="solution" ${rec.n || rec.s === 2 ? "" : "disabled"}
            title="${T("한 번 제출한 뒤에 열 수 있습니다")}">${T("모범 코드와 해설")}</button>` : ""}
        </div>
        <p class="tiny muted howto">${T("예시 실행은 보이는 예시만 돌립니다. 제출하면 숨은 테스트까지 채점하고, 점수는 통과한 정확성 테스트의 비율입니다.")}${perfN ? ` ${T("효율성은 정확성을 모두 통과한 뒤에 실행한 줄 수로 잽니다.")}` : ""}${mode === "exam" ? ` ${T("제출은 여러 번 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다.")}` : ""}</p>
        <div class="result" hidden aria-live="polite"></div>
        <ol class="hints"></ol>
        <div class="solution" hidden></div>
      </article>`;

    const resultEl = $(".result", root);
    const exBtn = $('[data-act="examples"]', root);
    const subBtn = $('[data-act="submit"]', root);
    const solBtn = $('[data-act="solution"]', root);
    let saveTimer = null;
    const ta = makeEditor($(".editor", root), {
      value: opts.code ?? (draft.code != null ? draft.code : p.code),
      onChange: (v) => {
        if (mode === "practice") { clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.patch(cid, p.id, { d: { code: v } }), 400); }
        if (opts.onChange) opts.onChange(v);
      },
      onSubmit: () => submit(),
    });

    function setBusy(on, btn, text) {
      busy = on;
      exBtn.disabled = on;
      subBtn.disabled = on;
      exBtn.textContent = on && btn === exBtn ? text : T("예시 실행");
      subBtn.firstChild.textContent = on && btn === subBtn ? `${text} ` : `${T("제출")} `;
    }

    function showResult(cls, html) {
      resultEl.className = `result ${cls}`;
      resultEl.innerHTML = html;
      resultEl.hidden = false;
    }

    function failed(err) {
      if (err.timeout) showResult("bad", `<h3>✗ ${T("채점하지 못했습니다")}</h3>${errorHtml({ type: "Timeout" })}`);
      else showResult("info", `<h3>${T("채점하지 못했습니다")}</h3><p>${esc(pyErrorText(err))}</p>`);
    }

    async function runExamples() {
      if (busy) return;
      setBusy(true, exBtn, Py.state === "ready" ? T("실행 중") : T("파이썬 준비 중"));
      try {
        const r = await Py.call("grade", { problem: { ...wire(p), tests: p.tests.filter((t) => t.example) }, answer: { code: ta.value } }, GRADE_TIMEOUT);
        const g = ctExamplesHtml(r);
        showResult(g.cls, g.html);
      } catch (err) {
        failed(err);
      } finally {
        setBusy(false);
      }
    }

    async function submit() {
      if (busy) return;
      const code = ta.value;
      if (!code.trim() || norm(code) === norm(p.code)) {
        if (mode === "practice" || !warnedStarter) {
          warnedStarter = true;
          showResult("info", `<p>${T("시작 코드 그대로입니다. 함수를 완성한 뒤 제출합니다.")}${mode === "exam" ? ` ${T("그대로 내려면 제출을 한 번 더 누릅니다.")}` : ""}</p>`);
          return;
        }
      }
      setBusy(true, subBtn, Py.state === "ready" ? T("채점 중") : T("파이썬 준비 중"));
      try {
        const r = await gradeCodeTest(p, code, { onStage: (text) => setBusy(true, subBtn, text) });
        const g = ctReportHtml(r);
        showResult(g.cls, g.html);
        if (mode === "practice") {
          const prev = Store.prob(cid, p.id);
          Store.record(cid, p.id, r.ok);
          Store.patch(cid, p.id, { best: Math.max(prev.best || 0, r.score || 0) });
          if (solBtn) solBtn.disabled = false;
        }
        if (opts.onSubmit) opts.onSubmit(r, code);
      } catch (err) {
        failed(err);
      } finally {
        setBusy(false);
      }
    }

    exBtn.addEventListener("click", runExamples);
    subBtn.addEventListener("click", submit);
    $('[data-act="reset"]', root).addEventListener("click", () => {
      if (ta.value !== p.code && !confirm(T("처음 코드로 되돌릴까요? 지금 쓴 코드는 지워집니다."))) return;
      ta.value = p.code;
      ta.dispatchEvent(new Event("input"));
      ta.focus();
    });
    const hintBtn = $('[data-act="hint"]', root);
    if (hintBtn) {
      hintBtn.addEventListener("click", () => {
        if (hintShown >= p.hints.length) return;
        hintShown += 1;
        $(".hints", root).insertAdjacentHTML("beforeend", `<li><b>${T("힌트 {n}", { n: hintShown })}</b>${inl(p.hints[hintShown - 1])}</li>`);
        $(".hint-count", hintBtn).textContent = `${hintShown}/${p.hints.length}`;
        if (hintShown >= p.hints.length) hintBtn.disabled = true;
      });
    }
    if (solBtn) {
      solBtn.addEventListener("click", () => {
        const el = $(".solution", root);
        el.innerHTML = ctSolutionHtml(p);
        el.hidden = false;
        Store.patch(cid, p.id, { rev: true });
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    return { focus: () => ta.focus({ preventScroll: true }) };
  }

  // ------------------------------------------------------------------ 화면: 처음(과목 목록)
  // 과목의 언어(courses.json과 과목 JSON의 lang, 없으면 ko)와 첫 화면에 보일지(hidden이 아니면 보인다)
  const langOfMeta = (m) => m.lang || "ko";
  const listedMeta = (m) => !m.hidden || onLocal;  // 로컬에서는 숨긴 과목도 보여 시험한다(SPEC 5절)
  async function viewHome() {
    document.title = T("파이썬 연습 · 이동현");
    const index = (await getIndex()).filter((m) => langOfMeta(m) === LANG && listedMeta(m));
    const cards = [];
    for (const meta of index) {
      const c = await getCourse(meta.id);
      const test = isTestCourse(c);
      const solved = solvedIn(meta.id, c.problems);
      const kinds = test ? [1, 2, 3].map((l) => `${levelName(l)} ${c.problems.filter((p) => p.level === l).length}`) :
        TYPE_ORDER.map((t) => `${typeName(t)} ${c.problems.filter((p) => p.type === t).length}`);
      cards.push(`<article class="card course-card">
        <p class="eyebrow">${esc(c.eyebrow)}${meta.hidden ? ` <span class="hidden-tag">hidden</span>` : ""}</p>
        <h2><a href="#/${esc(c.id)}">${esc(c.title)}</a></h2>
        <p class="subtitle">${esc(c.subtitle)}</p>
        <p class="small">${inl(c.card || c.lead)}</p>
        <p class="tiny muted">${T("문제 {n}개", { n: c.problems.length })} · ${kinds.join(" · ")}</p>
        <div class="progress"><span style="width:${c.problems.length ? (100 * solved) / c.problems.length : 0}%"></span></div>
        <p class="tiny muted" style="margin-top:4px">${T("푼 문제 {k} / {n}", { k: solved, n: c.problems.length })}</p>
        <div class="actions">
          <a class="btn primary" href="#/${esc(c.id)}">${T("차례 보기")}</a>
          ${test ? `<a class="btn mint" href="#/${esc(c.id)}/exam">${T("모의 시험")}</a>` : c.ta === false ? "" : `<a class="btn mint" href="#/${esc(c.id)}/ta">${T("타임어택")}</a>`}
        </div>
      </article>`);
    }
    // 영어 과목이 아직 하나도 열리지 않았으면 안내 한 줄과 한국어 첫 화면 링크만 둔다(SPEC 5절)
    const none = !cards.length && LANG === "en" ?
      `<p class="lead section">${T("아직 열린 영어 과목이 없습니다.")} <a href="#/">${T("한국어 첫 화면으로")}</a></p>` : "";
    main.innerHTML = `<div class="view">
      <h1>${T("파이썬 연습")}</h1>
      ${none || `<p class="lead">${T("책의 차례를 따라 푸는 연습과, 숨은 테스트로 채점하는 코딩 테스트 연습이 있습니다. 파이썬은 이 브라우저 안에서 실행되고, 푼 기록은 이 브라우저에만 남습니다.")}</p>
      <div class="grid-2 section">${cards.join("")}</div>`}
    </div>`;
  }

  // ------------------------------------------------------------------ 화면: 차례
  const listState = { cid: null, chapter: null, type: "all", status: "all", order: [] };

  function statusOf(cid, pid) {
    const r = Store.prob(cid, pid);
    return r.s === 2 ? "solved" : r.s === 1 ? "tried" : "new";
  }

  const solvedIn = (cid, list) => list.filter((p) => statusOf(cid, p.id) === "solved").length;
  const statusLabel = (st) => ({ solved: T("푼 문제"), tried: T("틀린 문제"), new: T("안 푼 문제") })[st];
  const secTitle = (s) => `<span class="stitle">${esc(s.title)}${s.sub ? `<span class="sub">${esc(s.sub)}</span>` : ""}</span>`;
  const secAnchor = (num) => `s-${num.replace(".", "-")}`;

  function tocChapter(c, ch) {
    const cid = c.id;
    const list = c.byChapter[ch.num];
    const head = `<span class="num">${ch.num}</span><span class="name">${esc(ch.title)}</span>` +
      (ch.sub ? `<span class="sub">${esc(ch.sub)}</span>` : "");
    if (!list.length) {
      return `<div class="toc-ch empty"><div class="toc-ch-head">${head}<span class="count">${T("준비 중")}</span></div></div>`;
    }
    const secs = ch.sections.map((s) => {
      const ps = c.bySection[s.num] || [];
      if (!ps.length) {
        return `<li class="empty"><span class="snum">${s.num}</span>${secTitle(s)}<span class="count">${esc(s.none || T("준비 중"))}</span></li>`;
      }
      return `<li><a href="#/${esc(cid)}/ch/${ch.num}/${s.num}"><span class="snum">${s.num}</span>${secTitle(s)}` +
        `<span class="count">${T("{n}문제", { n: ps.length })}</span></a></li>`;
    }).join("");
    return `<div class="toc-ch"><a class="toc-ch-head" href="#/${esc(cid)}/ch/${ch.num}">${head}` +
      `<span class="count">${T("{n}문제 · 푼 문제 {k}", { n: list.length, k: solvedIn(cid, list) })}</span></a><ul class="toc-secs">${secs}</ul></div>`;
  }

  async function viewBook(cid) {
    const c = await getCourse(cid);
    document.title = T("{title} · 파이썬 연습", { title: c.title });
    const test = isTestCourse(c);
    const solved = solvedIn(cid, c.problems);
    const counts = TYPE_ORDER.map((t) => [t, c.problems.filter((p) => p.type === t).length]);
    const statsHtml = test ?
      [1, 2, 3].map((l) => `<span>${levelName(l)} <b>${c.problems.filter((p) => p.level === l).length}</b></span>`).join("") +
        `<span>${T("효율성 도전")} <b>${c.problems.filter(hasPerf).length}</b></span>` :
      counts.map(([t, n]) => `<span>${typeName(t)} <b>${n}</b></span>`).join("");
    const pkgNote = T("문제를 처음 열 때 matplotlib, pandas, seaborn을 한 번 내려받습니다(약 20MB). 한 번 받으면 브라우저가 기억해 다음부터 빨리 열립니다. 그림 글자(제목, 라벨, 범례)는 영어로 씁니다.");
    const secondMode = c.ta === false ? `
        <div class="card mode-card">
          <h2><span class="mode-icon ta">▦</span>${T("그래프 도구")}</h2>
          <p>${pkgNote}</p>
        </div>` : test ? `
        <div class="card mode-card">
          <h2><span class="mode-icon ta">⏱</span>${T("모의 시험")}</h2>
          <p>${T("무작위로 뽑거나 직접 고른 문제를 40~120분 안에, 또는 제한 없이 풉니다. 예시는 몇 번이든 실행하고, 끝날 때의 코드로 점수를 매깁니다.")}</p>
          <div><a class="btn mint" href="#/${esc(cid)}/exam">${T("모의 시험 시작")}</a></div>
        </div>` : `
        <div class="card mode-card">
          <h2><span class="mode-icon ta">⏱</span>${T("타임어택")}</h2>
          <p>${T("무작위로 뽑거나 직접 고른 문제를 제한 시간 안에, 또는 제한 없이 풉니다. 실행해 보며 풀지, 실행 없이 풀지 고릅니다.")}${c.packages ? ` ${T("그래프 도구를 다 받은 뒤에 시계가 돕니다.")}` : ""}</p>
          <div><a class="btn mint" href="#/${esc(cid)}/ta">${T("타임어택 시작")}</a></div>
        </div>`;
    // 코딩 테스트의 '필요한 기초'가 가리키는 책 과목. 한국어는 『』로 묶는다
    const prereqBook = c.prereq ? `<a href="#/${esc(c.prereq.id)}">${LANG === "en" ? esc(c.prereq.title) : `『${esc(c.prereq.title)}』`}</a>` : "";
    const tip = c.packages ? `${T("지문과 목표 그림을 먼저 보고 무엇을 그릴지 정합니다. 실행하면 내 그림이 나오니 목표 그림과 견주어 본 뒤 채점합니다. 채점은 그림에서 값과 라벨을 읽어 비교합니다.")} ${pkgNote}` : test ?
      T("예시를 먼저 실행해 보고, 제한 사항에서 가장 작은 값과 가장 큰 값을 떠올린 뒤 제출합니다. 숨은 테스트는 입력을 보여 주지 않고 어떤 경우였는지만 알려 줍니다.") +
        (c.prereq ? ` ${T("막히면 문제 아래 '필요한 기초'에서 {book}의 해당 절로 갑니다.", { book: prereqBook })}` : "") :
      T("출력 예측과 빈칸 문제는 실행하기 전에 먼저 답을 적고, 채점한 뒤에 실행해서 대조합니다. 교재 1장의 예측, 실행, 대조 순서입니다.");
    const extras = c.problems.some((p) => p.solution) ? (test ? T("힌트와 모범 코드를") : T("힌트와 해설을")) : T("힌트를");
    main.innerHTML = `<div class="view">
      <div class="crumbs"><a href="${homeHref()}">← ${T("파이썬 연습")}</a></div>
      <p class="eyebrow">${esc(c.eyebrow)}</p>
      <h1>${esc(c.title)}</h1>
      <p class="subtitle">${esc(c.subtitle)}</p>
      <p class="lead">${inl(c.lead)}</p>
      <div class="stats"><span>${T("문제 <b>{n}</b>개", { n: c.problems.length })}</span>${statsHtml}</div>

      <div class="grid-2 section">
        <div class="card mode-card">
          <h2><span class="mode-icon practice">✎</span>${T("연습")}</h2>
          <p>${T("차례에서 장과 절을 골라 풀고 바로 채점합니다.")} ${T("{what} 볼 수 있고, 푼 기록은 이 브라우저에 남습니다.", { what: extras })}</p>
          <div><a class="btn primary" href="#toc" data-scroll="toc">${T("차례 보기")}</a></div>
        </div>${secondMode}
      </div>

      <div class="section">
        <div class="row small"><b>${T("푼 문제 {k} / {n}", { k: solved, n: c.problems.length })}</b><span class="spacer"></span>
          <a href="${meHref()}" class="small">${T("내 기록")}</a></div>
        <div class="progress" style="margin-top:6px"><span style="width:${c.problems.length ? (100 * solved) / c.problems.length : 0}%"></span></div>
      </div>

      <div class="tip section">${tip}</div>

      <section class="section" id="toc">
        <h2>${T("차례")}</h2>
        <p class="small muted">${filledChapters(c).length === c.chapters.length ? T("모든 장에 문제가 있습니다.") :
          T("지금은 {range}에 문제가 있고, 다른 장은 차례로 채웁니다.", { range: chapterRange(filledChapters(c)) })}</p>
        <div class="toc">${c.chapters.map((ch) => tocChapter(c, ch)).join("")}</div>
      </section></div>`;
    $(".view", main).addEventListener("click", (e) => {
      const t = e.target.closest("[data-scroll]");
      if (!t) return;
      e.preventDefault();
      $(`#${t.dataset.scroll}`).scrollIntoView({ behavior: "smooth" });
    });
  }

  // ------------------------------------------------------------------ 화면: 장
  function rowHtml(cid, p, test) {
    const st = statusOf(cid, p.id);
    const stLabel = statusLabel(st);
    let badge = `<span class="badge ${p.type}">${typeName(p.type)}</span>`;
    let meta = levelName(p.level) || "";
    if (test) {  // 코딩 테스트는 모두 작성형이므로 난이도를 꼬리표로, 최고 점수와 효율성을 뒤에 쓴다
      const r = Store.prob(cid, p.id);
      badge = `<span class="badge lv${p.level}">${levelName(p.level) || ""}</span>`;
      meta = [r.n ? T("최고 {n}점", { n: r.best || 0 }) : "", hasPerf(p) ? T("효율성 도전") : ""].filter(Boolean).join(" · ");
    }
    return `<li><a href="#/${esc(cid)}/p/${esc(p.id)}">
      <span class="status-dot ${st}" title="${stLabel}" aria-label="${stLabel}"></span>
      ${badge}
      <span class="t">${esc(p.title)}</span>
      <span class="meta">${meta}</span></a></li>`;
  }

  async function viewChapter(cid, num, secNum) {
    const c = await getCourse(cid);
    const ch = c.chapterByNum[num];
    if (!ch) { main.innerHTML = `<p>${T("없는 장입니다.")} <a href="#/${esc(cid)}">${T("차례로")}</a></p>`; return; }
    document.title = `${T("{n}장 {title}", { n: ch.num, title: ch.title })} · ${c.title}`;
    const test = isTestCourse(c);
    const list = c.byChapter[ch.num];
    const solved = solvedIn(cid, list);
    const withProblems = c.chapters.filter((x) => c.byChapter[x.num].length);
    const at = withProblems.indexOf(ch);
    const prevCh = withProblems[at - 1];
    const nextCh = at >= 0 ? withProblems[at + 1] : null;
    // 쪽 번호는 한국어 책의 것이라 영어 화면에서는 보이지 않는다(조정자 결정, SPEC 1절)
    const pagesText = (x) => (x.pages && LANG === "ko" ? `${T("교재 {a}~{b}쪽", { a: x.pages[0], b: x.pages[1] })} · ` : "");
    main.innerHTML = `<div class="view">
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <p class="eyebrow">${T("{n}장", { n: ch.num })}</p>
      <h1>${esc(ch.title)}${ch.sub ? `<span class="h1sub">${esc(ch.sub)}</span>` : ""}</h1>
      <p class="small muted">${pagesText(ch)}${T("문제 {n}개", { n: list.length })} · ${T("푼 문제 {k}", { k: solved })}</p>
      <div class="progress" style="margin:6px 0 4px"><span style="width:${list.length ? (100 * solved) / list.length : 0}%"></span></div>
      <div class="filters">
        ${test ? "" : `<div class="chips" role="group" aria-label="${T("유형")}">${[["all", T("모든 유형")], ...TYPE_ORDER.map((t) => [t, typeName(t)])]
          .map(([k, v]) => `<button class="chip" data-type="${k}" aria-pressed="${listState.type === k}">${v}</button>`).join("")}</div>`}
        <div class="chips" role="group" aria-label="${T("상태")}">${[["all", T("모두")], ["new", T("안 푼 문제")], ["tried", T("틀린 문제")], ["solved", T("푼 문제")]]
          .map(([k, v]) => `<button class="chip" data-status="${k}" aria-pressed="${listState.status === k}">${v}</button>`).join("")}</div>
        ${test ? "" : `<label class="switch"><input type="checkbox" id="exam" ${Store.setting("exam") ? "checked" : ""}>
          ${T("실행 없이 풀기")} <span class="muted">(${T("채점하기 전에는 실행 버튼을 숨깁니다")})</span></label>`}
      </div>
      <div id="secs"></div>
      <nav class="pnav">
        ${prevCh ? `<a class="btn" href="#/${esc(cid)}/ch/${prevCh.num}">← ${T("{n}장 {title}", { n: prevCh.num, title: esc(prevCh.title) })}</a>` : `<a class="btn" href="#/${esc(cid)}">← ${T("차례")}</a>`}
        ${nextCh ? `<a class="btn" href="#/${esc(cid)}/ch/${nextCh.num}">${T("{n}장 {title}", { n: nextCh.num, title: esc(nextCh.title) })} →</a>` : "<span></span>"}
      </nav></div>`;

    const renderList = () => {
      const type = test ? "all" : listState.type;
      const filtering = type !== "all" || listState.status !== "all";
      const order = [];
      let html = "";
      for (const s of ch.sections) {
        const all = c.bySection[s.num] || [];
        const items = all.filter((p) => (type === "all" || p.type === type) &&
          (listState.status === "all" || statusOf(cid, p.id) === listState.status));
        if (!items.length) {
          if (!filtering && !all.length) {
            html += `<div class="sec-head empty" id="${secAnchor(s.num)}"><h2><span class="snum">${s.num}</span>${secTitle(s)}</h2>` +
              `<span class="muted small">${esc(s.none || T("준비 중"))}</span></div>`;
          }
          continue;
        }
        items.forEach((p) => order.push(p.id));
        html += `<div class="sec-head" id="${secAnchor(s.num)}"><h2><span class="snum">${s.num}</span>${secTitle(s)}</h2>
          <span class="muted small">${pagesText(s)}${T("{n}문제", { n: items.length })}</span></div>
          <ul class="plist">${items.map((p) => rowHtml(cid, p, test)).join("")}</ul>`;
      }
      $("#secs").innerHTML = html || `<p class="empty-msg card">${T("조건에 맞는 문제가 없습니다.")}</p>`;
      listState.order = order;
      listState.cid = cid;
      listState.chapter = ch.num;
    };
    renderList();

    $(".view", main).addEventListener("click", (e) => {
      const t = e.target.closest("[data-type],[data-status]");
      if (!t) return;
      if (t.dataset.type) listState.type = t.dataset.type;
      if (t.dataset.status) listState.status = t.dataset.status;
      $$("[data-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === listState.type)));
      $$("[data-status]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.status === listState.status)));
      renderList();
    });
    if (!test) $("#exam").addEventListener("change", (e) => Store.setting("exam", e.target.checked));
    if (secNum) {
      const el = document.getElementById(secAnchor(secNum));
      if (el) { el.scrollIntoView(); return "keep"; }
    }
    return null;
  }

  // ------------------------------------------------------------------ 화면: 문제
  async function viewProblem(cid, pid) {
    const c = await getCourse(cid);
    const p = c.byId[pid];
    if (!p) { main.innerHTML = `<p>${T("문제를 찾을 수 없습니다.")} <a href="#/${esc(cid)}">${T("차례로")}</a></p>`; return; }
    document.title = `${p.title} · ${c.title}`;
    const ch = c.chapterByNum[p.chapter];
    const s = c.sectionByNum[p.section];
    const inSection = c.bySection[p.section];
    const order = listState.cid === cid && listState.order.includes(pid) ? listState.order : c.problems.map((x) => x.id);
    const at = order.indexOf(pid);
    const prev = order[at - 1];
    const next = order[at + 1];
    const test = isTestCourse(c);
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}/ch/${ch.num}/${s.num}">← ${T("{n}장 {title}", { n: ch.num, title: esc(ch.title) })}</a>
        <span>${s.num} ${esc(s.title)}</span><span>${inSection.indexOf(p) + 1} / ${inSection.length}</span><span class="spacer"></span>
        ${test ? "" : `<label class="switch"><input type="checkbox" id="exam" ${Store.setting("exam") ? "checked" : ""}> ${T("실행 없이 풀기")}</label>`}</div>
      <div id="problem"></div>
      <nav class="pnav">
        ${prev ? `<a class="btn" href="#/${esc(cid)}/p/${esc(prev)}">← ${T("이전 문제")}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#/${esc(cid)}/p/${esc(next)}">${T("다음 문제")} →</a>` : `<a class="btn" href="#/${esc(cid)}/ch/${ch.num}">${T("{n}장 목록으로", { n: ch.num })}</a>`}
      </nav>`;
    if (test) {
      mountCodeTest($("#problem"), c, p, { mode: "practice" });
      return;
    }
    const view = mountProblem($("#problem"), c, p, { mode: "practice" });
    $("#exam").addEventListener("change", (e) => { Store.setting("exam", e.target.checked); render(); });
    view.focus();
  }

  // ------------------------------------------------------------------ 화면: 타임어택과 모의 시험
  // 기본기 과목은 타임어택(문제마다 한 번 제출), 코딩 테스트 과목은 모의 시험(끝날 때의 코드로 점수)이다.
  // 문제는 '무작위로 뽑기'(세트 코드와 범위가 같으면 같은 문제)나 '직접 고르기'(링크의 p=에 문제 번호)로 정한다.
  // 진행 중인 것은 Store.data.taLive와 examLive에 두어 페이지를 닫거나 새로 고쳐도 남은 시간으로 잇고,
  // 끝난 것은 과목 기록(ta, exam)에 문제별 결과와 함께 남긴다.
  let TA = null;
  let EXAM = null;
  // 이 페이지에서 끝내는 중인 회차(시작 시각). 끝내는 사이에 같은 회차 화면을 다시 열어도 두 번 끝내지 않는다
  const FINISHING = new Set();
  const finishingCard = () => `<div class="card"><h2>${T("채점하는 중")}</h2><p class="muted">${T("끝낸 회차의 결과를 정리하고 있습니다. 잠시 뒤 결과 화면으로 넘어갑니다.")}</p></div>`;
  // 제한 시간의 0은 '제한 없음'이다. 시계는 걸린 시간을 보이고, 시간이 다 돼 끝나는 일이 없다(2026-10-14 사용자 요청)
  // 이름(타임어택, 모의 시험)은 화면 언어를 따르도록 modeName(kind)으로 쓴다
  const MODES = {
    ta: { max: 30, counts: [1, 3, 5, 10, 15, 20], times: [1, 2, 3, 5, 10, 20, 30, 0], setting: "ta",
      def: { n: 10, m: 10, t: ["write"], run: true } },  // 문제 수, 기본 유형(작성), 1~3분 제한 시간은 2026-10-15 사용자 요청
    exam: { max: 6, counts: [2, 3, 4], times: [40, 60, 120, 0], setting: "exam-opt",
      def: { n: 3, m: 40 } },
  };
  // 과목의 course.yaml에 ta: {n: 5, m: 20}처럼 적으면 그 과목만의 기본값과 저장 칸을 쓴다(시각화, 2026-10-15).
  // 그래프 문제는 한 문제에 시간이 더 들어 기본기와 같은 기본값(10문제, 10분)이 맞지 않는다
  const modeConf = (c, kind) => {
    const M = MODES[kind];
    const own = kind === "ta" && c.ta && typeof c.ta === "object" ? c.ta : null;
    return own ? { setting: `${M.setting}-${c.id}`, def: { ...M.def, ...own } } : { setting: M.setting, def: M.def };
  };
  const limitText = (m) => (m ? T("{m}분", { m }) : T("제한 없음"));
  // 진행 중인 회차의 시계: 제한 시간이 있으면 남은 시간, 없으면 걸린 시간
  const runClock = (x) => fmtClock(x.end ? (x.end - Date.now()) / 1000 : (Date.now() - x.start) / 1000);
  const usedSec = (x) => { const s = (Date.now() - x.start) / 1000; return x.o.m ? Math.min(s, x.o.m * 60) : s; };
  const modeOf = (c) => (isTestCourse(c) ? "exam" : "ta");
  const cleanCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const filledChapters = (c) => c.chapters.filter((ch) => c.byChapter[ch.num].length).map((ch) => String(ch.num));
  const bookOrder = (c, ids) => [...new Set(ids)].filter((id) => c.byId[id]).sort((a, b) => c.byId[a].index - c.byId[b].index);
  const setLabel = (o) => (o.how === "pick" ? T("직접 고른 문제") : T("세트 {code}", { code: `<b>${esc(o.code)}</b>` }));
  const runLabelText = (run) => (run ? T("실행해 보기") : T("실행 없이"));

  // 2, 3, 4, 7장을 '2~4·7장'처럼 줄여 쓴다(영어는 'Ch. 2–4, 7')
  function chapterRange(nums) {
    const runs = [];
    nums.map(Number).sort((a, b) => a - b).forEach((n) => {
      const last = runs[runs.length - 1];
      if (last && n === last[1] + 1) last[1] = n; else runs.push([n, n]);
    });
    const en = LANG === "en";
    return T("{range}장", { range: runs.map(([a, b]) => (a === b ? `${a}` : `${a}${en ? "–" : "~"}${b}`)).join(en ? ", " : "·") });
  }

  async function copyText(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); } catch (e) { prompt(T("이 내용을 복사하세요"), text); }
  }

  function setupOptions(c, kind, query) {
    const M = MODES[kind];
    const conf = modeConf(c, kind);
    const q = new URLSearchParams(query || "");
    const saved = Store.setting(conf.setting) || {};
    const groups = filledChapters(c);
    const num = (key, list) => {
      const v = Number(q.get(key) || (saved[key] ?? conf.def[key]));  // 저장한 0(제한 없음)도 살린다
      return list.includes(v) ? v : conf.def[key];
    };
    const p = bookOrder(c, (q.get("p") || "").split(",")).slice(0, M.max);
    // 범위는 저장하지 않는다. 문제가 늘어난 장이 빠지지 않게, 링크에 없으면 모든 장으로 시작한다.
    let g = (q.get("g") || "").split(",").filter((x) => groups.includes(x));
    if (!g.length) g = groups;
    const o = { how: p.length ? "pick" : "rand", code: cleanCode(q.get("code")), n: num("n", M.counts), m: num("m", M.times), g, p };
    if (kind === "ta") {
      o.t = (q.get("t") ? q.get("t").split(",") : saved.t || conf.def.t).filter((x) => TYPE_NAMES[x]);
      if (!o.t.length) o.t = conf.def.t.slice();
      o.run = q.has("run") ? q.get("run") !== "0" : saved.run ?? conf.def.run;
    }
    return o;
  }

  function setupQuery(kind, o) {
    const parts = o.how === "pick" ? [`p=${o.p.join(",")}`] :
      [`code=${o.code}`, `n=${o.n}`, ...(kind === "ta" ? [`t=${o.t.join(",")}`] : []), `g=${o.g.join(",")}`];
    parts.push(`m=${o.m}`);
    if (kind === "ta") parts.push(`run=${o.run ? 1 : 0}`);
    return parts.join("&");
  }

  const taPool = (c, o) => c.problems.filter((p) => o.t.includes(p.type) && o.g.includes(String(p.chapter)));

  function taPick(c, o) {
    const seed = seedFrom([o.code, o.t.slice().sort().join(","), o.g.slice().sort().join(",")].join("|"));
    return shuffle(taPool(c, o).map((p) => p.id), rng(seed)).slice(0, o.n);
  }

  // 세트 코드로 같은 문제를 뽑는다. 기본, 보통, 도전이 고루 섞이게 고르고 쉬운 문제부터 놓는다.
  function examPick(c, o) {
    const pool = c.problems.filter((p) => o.g.includes(String(p.chapter)));
    const rand = rng(seedFrom(["exam", o.code, o.g.slice().sort().join(",")].join("|")));
    const byLevel = { 1: [], 2: [], 3: [] };
    shuffle(pool, rand).forEach((p) => (byLevel[p.level] || byLevel[2]).push(p));
    const want = Math.min(o.n, pool.length);
    const pattern = [1, 2, 3, 2, 1, 3];
    const picked = [];
    for (let k = 0; picked.length < want; k++) {
      const bucket = byLevel[pattern[k % pattern.length]];
      if (bucket.length) picked.push(bucket.shift());
    }
    return picked.sort((a, b) => a.level - b.level || a.index - b.index).map((p) => p.id);
  }

  const pickIds = (c, kind, o) => (o.how === "pick" ? o.p.slice() : kind === "ta" ? taPick(c, o) : examPick(c, o));

  function liveRun(kind, cid) {
    const mem = kind === "ta" ? TA : EXAM;
    const x = mem && !mem.done ? mem : Store.data[`${kind}Live`];
    return x && x.cid === cid && !x.done ? x : null;
  }

  function saveRun(kind) {
    const x = kind === "ta" ? TA : EXAM;
    Store.update((d) => { d[`${kind}Live`] = x && !x.done ? x : null; });
  }

  function dropRun(kind) {
    if (kind === "ta") TA = null; else EXAM = null;
    Store.update((d) => { d[`${kind}Live`] = null; });
  }

  // 결과 화면에서 틀린 문제만 다시 푸는 링크. 직접 고르기로 연다.
  const retryHref = (cid, kind, e, ids) => `#/${cid}/${kind}?${setupQuery(kind, { how: "pick", p: ids, m: e.m, run: e.run !== false })}`;

  // 직접 고르기: 장과 절로 묶은 목록에서 고른다. 고른 차례와 상관없이 책 차례대로 낸다.
  // 검색칸에 적은 낱말이 모두 들어간 문제만 보인다(제목, 지문, 문제 번호, 절과 장 이름에서 찾는다).
  const fold = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/[`*]/g, "");
  function mountPicker(root, c, { max, selected, typeFilter, onChange }) {
    const cid = c.id;
    const test = isTestCourse(c);
    const sel = new Set(selected);
    let type = "all";
    let terms = [];
    let openBefore = null;  // 검색을 시작하기 전에 펼쳐 둔 장. 검색칸을 비우면 그대로 되돌린다
    const secTitle = {};
    c.chapters.forEach((ch) => ch.sections.forEach((s) => { secTitle[s.num] = `${s.num} ${s.title} ${ch.title}`; }));
    const hay = new Map(c.problems.map((p) => [p.id, fold([p.id, p.title, p.prompt, secTitle[p.section]].join(" "))]));
    const opened = new Set(selected.map((id) => String(c.byId[id].chapter)));
    const badge = (p) => (test ? `<span class="badge lv${p.level}">${levelName(p.level)}</span>` :
      `<span class="badge ${p.type}">${typeName(p.type)}</span>`);
    const row = (p) => {
      const st = statusOf(cid, p.id);
      return `<li data-id="${esc(p.id)}"><label><input type="checkbox" class="pk-box" data-id="${esc(p.id)}">${badge(p)}` +
        `<span class="t">${esc(p.title)}</span><span class="status-dot ${st}" title="${statusLabel(st)}"></span></label></li>`;
    };
    const chapterHtml = (ch) => {
      const open = opened.has(String(ch.num));
      const secs = ch.sections.filter((s) => (c.bySection[s.num] || []).length).map((s) => `
          <div class="pk-sec">
            <label class="pk-sec-head"><input type="checkbox" class="pk-box" data-scope="sec" data-key="${s.num}">` +
              `<span class="snum">${s.num}</span><span>${esc(s.title)}</span></label>
            <ul class="pk-list">${c.bySection[s.num].map(row).join("")}</ul>
          </div>`).join("");
      return `<div class="pk-ch">
        <div class="pk-head">
          <input type="checkbox" class="pk-box" data-scope="ch" data-key="${ch.num}" aria-label="${T("{n}장 문제 모두 고르기", { n: ch.num })}">
          <button type="button" class="pk-open" aria-expanded="${open}" aria-controls="pk-b${ch.num}">
            <span class="num">${ch.num}</span><span class="name">${esc(ch.title)}</span><span class="cnt"></span><span class="caret" aria-hidden="true"></span>
          </button>
        </div>
        <div class="pk-body" id="pk-b${ch.num}" ${open ? "" : "hidden"}>${secs}</div>
      </div>`;
    };
    root.innerHTML = `<div class="picker">
      <div class="pk-bar">
        <span>${T("고른 문제 {n}개", { n: `<b class="pk-n">0</b>` })} <span class="muted tiny pk-max">${T("최대 {n}개", { n: max })}</span></span>
        <span class="spacer"></span>
        <button type="button" class="btn small ghost" data-pk="wrong"></button>
        <button type="button" class="btn small ghost" data-pk="clear">${T("비우기")}</button>
      </div>
      <ol class="pk-picked"></ol>
      <p class="pk-empty tiny muted">${T("장을 펼쳐 문제를 고릅니다. 장 번호 앞의 칸을 누르면 그 장의 문제를 모두 고릅니다.")}</p>
      <div class="pk-find">
        <input type="search" class="pk-q" placeholder="${T("문제 찾기: 제목이나 지문의 낱말")}" aria-label="${T("문제 찾기")}" autocomplete="off" spellcheck="false">
        <span class="pk-hits tiny muted" aria-live="polite"></span>
      </div>
      ${typeFilter ? `<div class="chips pk-types" role="group" aria-label="${T("유형으로 거르기")}">${[["all", T("모든 유형")], ...TYPE_ORDER.map((t) => [t, typeName(t)])]
        .map(([k, v]) => `<button type="button" class="chip" data-ft="${k}" aria-pressed="${k === "all"}">${v}</button>`).join("")}</div>` : ""}
      <div class="pk-tree">${c.chapters.filter((ch) => c.byChapter[ch.num].length).map(chapterHtml).join("")}</div>
      <p class="pk-none small muted" hidden>${T("찾는 문제가 없습니다. 낱말을 줄이거나 바꿔 봅니다.")}</p>
    </div>`;

    const visible = (p) => (type === "all" || p.type === type) && terms.every((t) => hay.get(p.id).includes(t));
    const scope = (box) => (box.dataset.scope === "ch" ? c.byChapter[box.dataset.key] :
      box.dataset.scope === "sec" ? c.bySection[box.dataset.key] : [c.byId[box.dataset.id]]).filter(visible);
    const wrongIds = () => c.problems.filter((p) => statusOf(cid, p.id) === "tried").map((p) => p.id);

    function sync(quiet) {
      $$(".pk-list li", root).forEach((li) => { li.hidden = !visible(c.byId[li.dataset.id]); });
      $$(".pk-sec, .pk-ch", root).forEach((el) => { el.hidden = !$(".pk-list li:not([hidden])", el); });
      const hits = c.problems.filter(visible).length;
      $(".pk-hits", root).textContent = terms.length ? T("{n}문제 찾음", { n: hits }) : "";
      $(".pk-none", root).hidden = hits > 0;
      $$(".pk-box", root).forEach((box) => {
        if (box.dataset.id) { box.checked = sel.has(box.dataset.id); return; }
        const items = scope(box);
        const n = items.filter((p) => sel.has(p.id)).length;
        box.checked = items.length > 0 && n === items.length;
        box.indeterminate = n > 0 && n < items.length;
        if (box.dataset.scope === "ch") $(".cnt", box.parentElement).textContent = n ? T("{k} / {n} 고름", { k: n, n: items.length }) : T("{n}문제", { n: items.length });
      });
      const ids = bookOrder(c, [...sel]);
      $(".pk-n", root).textContent = ids.length;
      $(".pk-picked", root).innerHTML = ids.map((id, i) => `<li><button type="button" class="pk-chip" data-rm="${esc(id)}" ` +
        `title="${T("빼기")}" aria-label="${T("{n}번 {title} 빼기", { n: i + 1, title: esc(c.byId[id].title) })}"><b>${i + 1}</b>${esc(c.byId[id].title)}<span aria-hidden="true">✕</span></button></li>`).join("");
      $(".pk-picked", root).hidden = !ids.length;
      $(".pk-empty", root).hidden = !!ids.length;
      const wrong = wrongIds().filter((id) => !sel.has(id)).length;
      const wrongBtn = $('[data-pk="wrong"]', root);
      wrongBtn.hidden = !wrong;
      wrongBtn.textContent = T("틀린 문제 담기 {n}", { n: wrong });
      $('[data-pk="clear"]', root).hidden = !ids.length;
      if (!quiet) onChange();
    }

    function add(list) {
      const fresh = list.filter((id) => !sel.has(id));
      const room = max - sel.size;
      fresh.slice(0, room).forEach((id) => sel.add(id));
      if (fresh.length > room) toast(T("{n}문제까지 고를 수 있습니다", { n: max }));
    }

    // 찾는 동안에는 찾은 문제가 있는 장을 모두 펼친다
    function search(text) {
      const next = fold(text).split(/\s+/).filter(Boolean);
      if (next.length && !terms.length) openBefore = new Set($$('.pk-open[aria-expanded="true"]', root).map((b) => b.getAttribute("aria-controls")));
      terms = next;
      $$(".pk-open", root).forEach((b) => {
        const on = terms.length ? true : openBefore ? openBefore.has(b.getAttribute("aria-controls")) : b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", String(on));
        $(`#${b.getAttribute("aria-controls")}`, root).hidden = !on;
      });
      if (!terms.length) openBefore = null;
      sync(true);
    }
    const q = $(".pk-q", root);
    q.addEventListener("input", () => search(q.value));
    q.addEventListener("keydown", (e) => {  // 검색칸의 엔터가 시작 버튼(폼 제출)이 되지 않게 한다
      if (e.key === "Enter") e.preventDefault();
      if (e.key === "Escape" && q.value) { e.preventDefault(); q.value = ""; search(""); }
    });

    root.addEventListener("change", (e) => {
      const box = e.target.closest(".pk-box");
      if (!box) return;
      const ids = scope(box).map((p) => p.id);
      if (box.checked) add(ids); else ids.forEach((id) => sel.delete(id));
      sync();
    });
    root.addEventListener("click", (e) => {
      const t = e.target.closest(".pk-open, [data-rm], [data-ft], [data-pk]");
      if (!t) return;
      if (t.classList.contains("pk-open")) {
        const on = t.getAttribute("aria-expanded") !== "true";
        t.setAttribute("aria-expanded", String(on));
        $(`#${t.getAttribute("aria-controls")}`, root).hidden = !on;
        return;
      }
      if (t.dataset.rm) sel.delete(t.dataset.rm);
      else if (t.dataset.ft) {
        type = t.dataset.ft;
        $$("[data-ft]", root).forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
      } else if (t.dataset.pk === "clear") sel.clear();
      else if (t.dataset.pk === "wrong") add(wrongIds());
      sync();
    });
    sync(true);
    return { selected: () => bookOrder(c, [...sel]) };
  }

  async function viewSetup(cid, kind, query) {
    const c = await getCourse(cid);
    if (c.ta === false) { location.replace(`#/${cid}`); return; }  // 타임어택을 두지 않는 과목
    if (modeOf(c) !== kind) { location.replace(`#/${cid}/${modeOf(c)}`); return; }
    const M = MODES[kind];
    const conf = modeConf(c, kind);
    const ta = kind === "ta";
    // 그래프 과목: 시작 화면에서 그래프 도구(약 20MB)를 미리 받는다. 받는 동안에는 시계가 돌지 않게 시작을 미룬다
    const pkgs = (c.packages || []).length ? c.packages : null;
    let pkgState = !pkgs || Py.ready(pkgs) ? "ready" : "loading";
    let formEl = null;  // 다 받았을 때 이 화면이 아직 떠 있으면 시작 버튼을 켠다(다른 화면으로 옮겼으면 그대로 둔다)
    const pkgJob = pkgs ? Py.load(pkgs).then(() => { pkgState = "ready"; }, () => { pkgState = "failed"; })
      .then(() => { if (formEl && formEl.isConnected) update(); }) : null;
    document.title = T("{title} · 파이썬 연습", { title: modeName(kind) });
    if (!ta || setupOptions(c, kind, query).t.some((t) => t !== "predict")) Py.start().catch(() => {});
    const live = liveRun(kind, cid);
    const left = live ? (live.end ? (live.end - Date.now()) / 1000 : Infinity) : 0;
    const o = setupOptions(c, kind, query);
    const groups = filledChapters(c);
    let how = o.how;
    const chip = (name, value, label, on) => `<button type="button" class="chip" data-${name}="${value}" aria-pressed="${on}">${label}</button>`;
    const liveText = !live ? "" : !live.end ? `${T("제한 없음")} · ${T("걸린 시간 {t}", { t: runClock(live) })}` :
      left > 0 ? T("남은 시간 {t}", { t: fmtClock(left) }) : T("시간이 끝났습니다");
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <h1>${modeName(kind)}</h1>
      <p class="lead">${ta ? T("제한 시간 안에, 또는 제한 없이 여러 문제를 풉니다. 문제마다 한 번만 제출하고, 답과 해설은 끝난 뒤에 한꺼번에 봅니다.") :
        T("시간을 재고 코딩 테스트처럼 풉니다. 예시 실행과 제출은 몇 번이든 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다. 힌트는 끝난 뒤 연습 화면에서 봅니다.")}</p>
      ${live ? `<div class="warnbox section"><b>${ta ? T("진행 중인 타임어택이 있습니다.") : T("진행 중인 모의 시험이 있습니다.")}</b> ${setLabel(live.o)} · ${T("{n}문제", { n: live.ids.length })} · ${liveText}
        <div class="actions"><a class="btn primary" href="#/${esc(cid)}/${kind}/run">${left > 0 ? T("이어서 풀기") : T("결과 보기")}</a>
          <button class="btn ghost" type="button" id="su-drop">${T("그만두기")}</button></div></div>` : ""}
      <form class="card section setup" id="su-form">
        <div class="seg" role="group" aria-label="${T("문제 정하기")}">
          <button type="button" data-how="rand">${T("무작위로 뽑기")}</button><button type="button" data-how="pick">${T("직접 고르기")}</button>
        </div>
        <div class="form-grid" data-only="rand">
          <label>${T("범위")}</label>
          <div class="chips" id="su-g">${chip("all", 1, T("모두"), false)}${groups.map((n) => chip("g", n, T("{n}장 {title}", { n, title: esc(c.chapterByNum[n].title) }), o.g.includes(n))).join("")}</div>
          ${ta ? `<label>${T("유형")}</label><div class="chips" id="su-t">${TYPE_ORDER.map((t) => chip("t", t, typeName(t), o.t.includes(t))).join("")}</div>` : ""}
          <label>${T("문제 수")}</label><div class="chips" id="su-n">${M.counts.map((n) => chip("n", n, T("{n}문제", { n }), o.n === n)).join("")}</div>
        </div>
        <div id="su-pick" data-only="pick"></div>
        <div class="form-grid su-more">
          <label>${T("제한 시간")}</label><div class="chips" id="su-m">${M.times.map((m) => chip("m", m, limitText(m), o.m === m)).join("")}</div>
          ${ta ? `<label>${T("실행")}</label><div><div class="chips" id="su-run">${chip("run", 1, runLabelText(true), o.run)}${chip("run", 0, runLabelText(false), !o.run)}</div>
            <p class="tiny muted su-help">${T("실행해 보기를 고르면 빈칸 완성, 작성, 코드 리뷰에서 제출하기 전에 실행해 볼 수 있습니다. 출력 예측은 언제나 실행 없이 풉니다.")}</p></div>` : ""}
          <label for="su-code" data-only="rand">${T("세트 코드")}</label>
          <div class="row" data-only="rand"><input id="su-code" class="code-field" maxlength="8" value="${esc(o.code)}" placeholder="${T("비움")}" autocomplete="off" spellcheck="false">
            <span class="small muted">${T("비워 두면 새로 만듭니다. 같은 코드를 넣으면 같은 문제가 나옵니다.")}</span></div>
        </div>
        <div class="su-foot">
          ${pkgs ? `<p class="tiny muted" id="su-pkg" aria-live="polite"></p>` : ""}
          <p class="su-sum" id="su-sum" aria-live="polite"></p>
          <div class="actions">
            <button class="btn mint" type="submit">${T("시작")}</button>
            <button class="btn ghost" type="button" id="su-link" title="${T("같은 문제로 시작하는 링크를 복사합니다")}">${T("링크 복사")}</button>
          </div>
        </div>
      </form>
      <p class="small muted" style="margin-top:14px">${ta ? T("출력 예측과 빈칸 완성은 코드를 읽는 연습이라 빨리 풀 수 있고, 작성과 코드 리뷰는 문제마다 시간이 더 걸립니다.") :
        T("효율성 테스트의 시간 초과는 시험 점수에 넣지 않습니다. 큰 입력에서 값이 틀리거나 오류가 나면 정확성 실패로 셉니다.")} ${T("풀다가 페이지를 닫거나 새로 고쳐도 이 브라우저에 남은 답과 남은 시간으로 이어서 풉니다.")}</p>`;

    formEl = $("#su-form");
    const picker = mountPicker($("#su-pick"), c, { max: M.max, selected: o.p, typeFilter: ta, onChange: () => update() });
    const pressed = (id) => $$(`#${id} .chip`).filter((b) => b.getAttribute("aria-pressed") === "true");
    const pressedValue = (id, key, fallback) => { const b = pressed(id)[0]; return b ? b.dataset[key] : String(fallback); };
    const read = () => {
      const r = {
        how,
        code: how === "rand" ? cleanCode($("#su-code").value) : "",
        g: pressed("su-g").filter((b) => b.dataset.g).map((b) => b.dataset.g),
        n: +pressedValue("su-n", "n", conf.def.n),
        m: +pressedValue("su-m", "m", conf.def.m),
        p: how === "pick" ? picker.selected() : [],
      };
      if (ta) {
        r.t = pressed("su-t").map((b) => b.dataset.t);
        r.run = pressedValue("su-run", "run", 1) === "1";
      }
      return r;
    };
    const update = () => {
      $$("[data-only]", main).forEach((el) => { el.hidden = el.dataset.only !== how; });
      $$("[data-how]", main).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.how === how)));
      const r = read();
      $("#su-g [data-all]").setAttribute("aria-pressed", String(r.g.length === groups.length));
      // 출력 예측만 고르면 실행 버튼이 나올 문제가 없으므로 요약에 쓰지 않는다
      const runnable = ta && (how === "pick" ? r.p.some((id) => c.byId[id].type !== "predict") : r.t.some((t) => t !== "predict"));
      const runText = runnable ? ` · ${runLabelText(r.run)}` : "";
      let ok = false;
      let sum = "";
      let sub = "";
      if (how === "pick") {
        ok = r.p.length > 0;
        sum = ok ? `${T("고른 {n}문제", { n: r.p.length })} · ${limitText(r.m)}${runText}` : T("풀 문제를 고릅니다.");
      } else {
        const pool = ta ? taPool(c, r).length : c.problems.filter((p) => r.g.includes(String(p.chapter))).length;
        if (!r.g.length) sum = T("범위를 하나 이상 고릅니다.");
        else if (ta && !r.t.length) sum = T("유형을 하나 이상 고릅니다.");
        else if (!pool) sum = T("고른 범위에 그 유형의 문제가 없습니다. 범위나 유형을 더 고릅니다.");
        else {
          ok = true;
          sum = `${T("무작위 {n}문제", { n: Math.min(pool, r.n) })} · ${limitText(r.m)}${runText}`;
          sub = ta ? T("{range}의 {types} {n}문제에서 뽑습니다.", { range: chapterRange(r.g), types: r.t.map((t) => typeName(t)).join(LANG === "en" ? ", " : "·"), n: pool }) :
            `${T("{range} {n}문제에서 뽑습니다.", { range: chapterRange(r.g), n: pool })} ${T("기본, 보통, 도전을 고루 섞어 쉬운 문제부터 놓습니다.")}`;
        }
      }
      $("#su-sum").innerHTML = `<b>${esc(sum)}</b>${sub ? `<span class="muted">${esc(sub)}</span>` : ""}`;
      if (pkgs) {
        $("#su-pkg").textContent = pkgState === "ready" ? T("그래프 도구(matplotlib, pandas, seaborn)가 준비됐습니다.") :
          pkgState === "failed" ? T("그래프 도구를 받지 못했습니다. 인터넷 연결을 확인하고 새로 고칩니다.") :
          T("그래프 도구(matplotlib, pandas, seaborn)를 받는 중입니다. 처음에는 약 20MB라 조금 걸리고, 다 받으면 시작할 수 있습니다.");
      }
      $('#su-form [type="submit"]').disabled = !ok || (pkgs && pkgState !== "ready");
      $("#su-link").disabled = !ok;
    };

    $("#su-form").addEventListener("click", (e) => {
      if (e.target.closest("#su-pick")) return;  // 직접 고르기 목록은 mountPicker가 받는다
      const seg = e.target.closest("[data-how]");
      if (seg) { how = seg.dataset.how; update(); return; }
      const b = e.target.closest(".chip");
      if (!b) return;
      const group = b.parentElement;
      if (b.dataset.all) {
        const on = b.getAttribute("aria-pressed") !== "true";
        $$("[data-g]", group).forEach((x) => x.setAttribute("aria-pressed", String(on)));
      } else if (["su-n", "su-m", "su-run"].includes(group.id)) {
        $$(".chip", group).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      } else b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
      update();
    });
    $("#su-link").addEventListener("click", () => {
      const r = read();
      if (r.how === "rand" && !r.code) { r.code = newSetCode(); $("#su-code").value = r.code; }
      copyText(`${location.origin}${location.pathname}#/${cid}/${kind}?${setupQuery(kind, r)}`,
        T("링크를 복사했습니다. 이 링크로 시작하면 같은 문제가 나옵니다."));
    });
    const drop = $("#su-drop");
    if (drop) {
      drop.addEventListener("click", () => {
        if (!confirm(ta ? T("진행 중인 타임어택을 그만둘까요? 기록에 남지 않습니다.") : T("진행 중인 모의 시험을 그만둘까요? 기록에 남지 않습니다."))) return;
        dropRun(kind);
        render();
      });
    }
    $("#su-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($('#su-form [type="submit"]').disabled) return;
      if (live && !confirm(ta ? T("진행 중인 타임어택을 그만두고 새로 시작할까요? 그 타임어택은 기록에 남지 않습니다.") :
        T("진행 중인 모의 시험을 그만두고 새로 시작할까요? 그 모의 시험은 기록에 남지 않습니다."))) return;
      const r = read();
      if (r.how === "rand" && !r.code) r.code = newSetCode();
      Store.setting(conf.setting, ta ? { n: r.n, m: r.m, t: r.t, run: r.run } : { n: r.n, m: r.m });
      const ids = pickIds(c, kind, r);
      const now = Date.now();
      const x = { cid, o: r, ids, i: 0, start: now, end: r.m ? now + r.m * 60000 : 0, done: false };  // end 0은 제한 없음
      if (ta) TA = { ...x, res: [], drafts: {} }; else EXAM = { ...x, codes: {}, subs: {} };
      saveRun(kind);
      if (ids.some((id) => c.byId[id].type !== "predict")) Py.start().catch(() => {});
      history.replaceState(null, "", `#/${cid}/${kind}?${setupQuery(kind, r)}`);
      location.hash = `#/${cid}/${kind}/run`;
    });
    update();
    if (pkgJob) pkgJob.catch(() => {});
  }

  async function viewTARun(cid) {
    const c = await getCourse(cid);
    TA = liveRun("ta", cid);
    if (TA && TA.ids.some((id) => !c.byId[id])) dropRun("ta");  // 문제가 바뀐 뒤의 옛 타임어택은 잇지 않는다
    if (!TA) { location.replace(`#/${cid}/ta`); return; }
    TA.res = TA.res || [];
    TA.drafts = TA.drafts || {};
    const run = TA;  // 이 화면이 맡은 회차. 새로 시작한 회차에 앞 회차의 늦은 채점이 섞이지 않게 한다
    if (FINISHING.has(run.start)) { main.innerHTML = finishingCard(); return; }
    let finishing = false;
    let waiting = null;  // 채점 중인 제출. 그사이 시간이 끝나도 결과를 기다렸다 넣는다
    document.title = T("타임어택 진행 중 · 파이썬 연습");
    main.innerHTML = `
      <div class="ta-bar">
        <span class="ta-time" id="ta-time" title="${TA.end ? T("남은 시간") : T("걸린 시간")}">${runClock(TA)}</span>
        <span class="ta-meta"><b id="ta-pos"></b> · ${T("맞힌 문제 {n}", { n: `<b id="ta-ok">0</b>` })} · ${setLabel(TA.o)}${TA.o.run ? "" : ` · ${T("실행 없이")}`}${TA.end ? "" : ` · ${T("제한 없음")}`}</span>
        <span class="spacer"></span>
        <button class="btn small ghost" id="ta-stop">${T("그만하기")}</button>
      </div>
      <div id="ta-problem"></div>
      <div id="ta-after" class="actions" hidden></div>`;

    let saveTimer = null;
    const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRun("ta"), 500); };
    const okCount = () => TA.res.filter((r) => r && r.ok).length;
    const tick = () => {
      const el = $("#ta-time");
      if (!el) return;
      el.textContent = runClock(TA);
      if (!TA.end) return;  // 제한 없음: 시간이 다 돼 끝나는 일이 없다
      const left = (TA.end - Date.now()) / 1000;
      el.classList.toggle("low", left <= 60);
      if (left <= 0) finish();
    };
    const timer = setInterval(tick, 250);
    setCleanup(() => { clearInterval(timer); clearTimeout(saveTimer); if (TA && !TA.done) saveRun("ta"); });

    async function finish() {
      if (run.done || finishing || FINISHING.has(run.start)) return;
      finishing = true;
      FINISHING.add(run.start);
      const x = run;
      x.used = usedSec(x);
      clearInterval(timer);
      clearTimeout(saveTimer);
      x.ending = true;  // 끝내는 중에 새로 고치면 다시 열 때 곧바로 끝낸다
      saveRun("ta");
      $$("#ta-problem button, #ta-after button, #ta-stop").forEach((b) => { b.disabled = true; });
      if (waiting) {  // 마감 직전에 낸 답은 채점이 끝날 때까지(길어야 몇 초, 그래프 문제는 더 길게) 기다렸다 결과에 넣는다
        await Promise.race([waiting, new Promise((ok) => setTimeout(ok, (c.packages || []).length ? 35000 : 8000))]);
        await new Promise((ok) => setTimeout(ok, 0));
      }
      FINISHING.delete(x.start);
      if (x.done) return;
      x.done = true;
      const items = x.ids.map((id, i) => {
        const r = x.res[i];
        if (!r) return { id, ok: false, none: true };
        return r.ok ? { id, ok: true } : { id, ok: false, a: r.answer, timeout: r.timeout || undefined, why: r.why || undefined };
      });
      Store.update((d) => {
        const st = Store.course(cid);
        st.ta = [{ at: Date.now(), code: x.o.code, how: x.o.how, q: setupQuery("ta", x.o), m: x.o.m, run: x.o.run,
          sec: Math.round(x.used), n: items.length, ok: items.filter((it) => it.ok).length, items }, ...st.ta].slice(0, 30);
        if (d.taLive && d.taLive.start === x.start) d.taLive = null;
      });
      if (!TA || TA.start === x.start) location.hash = `#/${cid}/ta/result`;
    }

    function after(r) {
      if (TA.done || finishing) return;
      $("#ta-ok").textContent = okCount();
      const last = TA.i >= TA.ids.length - 1;
      const box = $("#ta-after");
      box.innerHTML = `<div class="result ${r.ok ? "ok" : "bad"}" style="margin:0;flex:1"><h3>${r.ok ? `✓ ${T("맞았습니다")}` : `✗ ${T("틀렸습니다")}`}</h3>
        <p class="small">${r.ok ? "" : r.timeout ? `${T("실행이 너무 오래 걸렸습니다.")} ` : ""}${T("답과 해설은 끝난 뒤에 봅니다.")}</p></div>
        <button class="btn primary" id="ta-next">${last ? T("결과 보기") : T("다음 문제")} <span class="kbd">↵</span></button>`;
      box.hidden = false;
      $$(".actions button", $("#ta-problem")).forEach((b) => { b.disabled = true; });
      $("#ta-next").addEventListener("click", () => {
        if (last) { finish(); return; }
        TA.i += 1;
        saveRun("ta");
        show();
      });
      $("#ta-next").focus();
    }

    function show() {
      const at = TA.i;
      const id = TA.ids[at];
      const p = c.byId[id];
      $("#ta-pos").textContent = `${at + 1} / ${TA.ids.length}`;
      $("#ta-ok").textContent = okCount();
      $("#ta-after").hidden = true;
      $("#ta-after").innerHTML = "";
      const view = mountProblem($("#ta-problem"), c, p, {
        mode: "ta",
        run: TA.o.run,
        draft: TA.drafts[id],
        onDraft: (d) => { TA.drafts[id] = d; saveSoon(); },
        onGrading: (job) => { waiting = job; },
        onSubmit: (r) => {
          if (TA !== run || run.done || run.i !== at) return;  // 다른 회차이거나, 끝났거나, 다른 문제로 넘어간 뒤의 채점은 버린다
          TA.res[at] = { ok: !!r.ok, answer: r.answer, timeout: !!r.timeout, why: p.plot && !r.ok ? plotWhy(r.report) : undefined };
          delete TA.drafts[id];
          saveRun("ta");
          Store.record(cid, id, r.ok);
          after(r);
        },
      });
      view.focus();
      window.scrollTo({ top: 0 });
    }

    $("#ta-stop").addEventListener("click", () => { if (confirm(T("여기서 끝낼까요? 지금까지 낸 답으로 결과를 봅니다."))) finish(); });
    tick();
    if (TA.ending && !TA.done) finish();  // 끝내는 중에 새로 고쳤다
    if (TA.done) return;
    if (TA.res[TA.i]) {  // 내고 나서 다음 문제로 넘어가기 전에 새로 고쳤으면 다음 문제부터 잇는다
      if (TA.i >= TA.ids.length - 1) { finish(); return; }
      TA.i += 1;
      saveRun("ta");
    }
    show();
  }

  async function viewTAResult(cid, query) {
    const c = await getCourse(cid);
    const e = Store.course(cid).ta[+(new URLSearchParams(query || "").get("i") || 0)];
    if (!e || !e.items) { location.replace(`#/${cid}/ta`); return; }
    document.title = T("타임어택 결과 · 파이썬 연습");
    const wrong = e.items.filter((it) => !it.ok && c.byId[it.id]).map((it) => it.id);
    const link = `${location.origin}${location.pathname}#/${cid}/ta?${e.q}`;
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <h1>${T("타임어택 결과")}</h1>
      <div class="card">
        <div class="score">${e.ok}<small> / ${T("{n}문제", { n: e.n })}</small></div>
        <p class="muted" style="margin-top:6px">${resultMeta(e)} · ${runLabelText(e.run)} · ${fmtDate(e.at)}</p>
        <div class="actions">
          ${wrong.length ? `<a class="btn primary" href="${esc(retryHref(cid, "ta", e, wrong))}">${T("못 푼 문제만 다시 ({n})", { n: wrong.length })}</a>` : ""}
          <a class="btn mint" href="#/${esc(cid)}/ta?${esc(e.q)}">${T("같은 문제 다시")}</a>
          ${e.how === "pick" ? "" : `<a class="btn" href="#/${esc(cid)}/ta?${esc(e.q.replace(/code=[A-Z0-9]*/, "code="))}">${T("새 세트")}</a>`}
          <button class="btn ghost" id="ta-copy">${T("링크 복사")}</button>
        </div>
      </div>
      <h2 class="section">${T("문제별 답과 해설")}</h2>
      <div class="stack" id="ta-review"></div>`;
    $("#ta-review").innerHTML = e.items.map((it, i) => {
      const p = c.byId[it.id];
      if (!p) return "";
      const state = it.none ? T("안 냄") : it.ok ? T("맞음") : it.timeout ? T("틀림 · 시간 초과") : T("틀림");
      return `<details class="card" ${it.ok ? "" : "open"}>
        <summary class="row"><b>${i + 1}. ${esc(p.title)}</b><span class="badge ${p.type}">${typeName(p.type)}</span>
          <span class="${it.ok ? "" : "muted"}">${it.ok ? "✓" : "✗"} ${state}</span><span class="spacer"></span>
          <a class="small" href="#/${esc(cid)}/p/${esc(p.id)}">${T("연습에서 다시 풀기")}</a></summary>
        <div style="margin-top:12px">${p.type === "predict" ? codeBlock(hl(p.code)) : ""}${p.figure ? figureHtml(p.figure, T("목표 그림"), "target-fig") : ""}${myAnswerHtml(p, it.a)}${whyHtml(it.why)}${solutionHtml(p)}</div>
      </details>`;
    }).join("");
    $("#ta-copy").addEventListener("click", () => copyText(link, T("링크를 복사했습니다. 이 링크로 시작하면 같은 문제가 나옵니다.")));
  }

  // 결과 화면의 요약 줄 앞부분: 걸린 시간 · 제한 · 세트(타임어택과 모의 시험이 같이 쓴다)
  const resultMeta = (e) => `${T("걸린 시간 {t}", { t: fmtDuration(e.sec) })} · ${e.m ? T("제한 {m}분", { m: e.m }) : T("제한 없음")} · ` +
    (e.how === "pick" ? T("직접 고른 문제") : T("세트 코드 {code}", { code: `<b>${esc(e.code)}</b>` }));

  // 그래프 문제의 틀린 까닭: 처음 떨어진 테스트의 그림 차이(많으면 셋까지). 기록에 남기므로 짧게 둔다
  function plotWhy(report) {
    if (!report) return undefined;
    if (report.blocked) return [report.blocked];
    const t = (report.tests || []).find((x) => !x.ok && !x.optional);
    if (!t) return undefined;
    if (t.diffs && t.diffs.length) return [`${t.label}: ${t.diffs[0]}`, ...t.diffs.slice(1, 3)];
    if (t.error) return [`${t.label}: ${t.error.type}${t.error.line ? `(${T("{n}번째 줄", { n: t.error.line })})` : ""} ${t.error.message || ""}`.trim()];
    if (t.note) return [`${t.label}: ${t.note}`];
    return undefined;
  }
  const whyHtml = (why) => (why && why.length ?
    `<h3>${T("틀린 까닭")}</h3><ul class="diffs" style="margin-bottom:14px">${why.map((d) => `<li>${inl(d)}</li>`).join("")}</ul>` : "");

  function myAnswerHtml(p, a) {
    if (!a) return "";
    let text = "";
    if (p.type === "predict") {
      const t = (a.text || "").trim();
      text = t + (a.err ? `${t ? "\n" : ""}(${T("오류: {name}", { name: a.errType || T("이름 고르지 않음") })})` : "");
    } else if (p.type === "fill") text = (a.blanks || []).map((b, i) => T("빈칸 {n}: {v}", { n: i + 1, v: b || T("(비움)") })).join("\n");
    else text = a.code || "";
    return `<h3>${T("내 답")}</h3><pre class="out" style="margin-bottom:14px">${esc(text) || `<span class="muted">${T("(비움)")}</span>`}</pre>`;
  }

  async function viewExamRun(cid) {
    const c = await getCourse(cid);
    EXAM = liveRun("exam", cid);
    if (EXAM && EXAM.ids.some((id) => !c.byId[id])) dropRun("exam");  // 문제가 바뀐 뒤의 옛 시험은 잇지 않는다
    if (!EXAM) { location.replace(`#/${cid}/exam`); return; }
    const run = EXAM;  // 이 화면이 맡은 회차
    if (FINISHING.has(run.start)) { main.innerHTML = finishingCard(); return; }
    document.title = T("모의 시험 진행 중 · 파이썬 연습");
    main.innerHTML = `
      <div class="ta-bar exam-bar">
        <span class="ta-time" id="ex-time" title="${EXAM.end ? T("남은 시간") : T("걸린 시간")}">${runClock(EXAM)}</span>
        <div class="exam-tabs" id="ex-tabs" aria-label="${T("문제")}"></div>
        <span class="spacer"></span>
        <span class="ta-meta">${setLabel(EXAM.o)}${EXAM.end ? "" : ` · ${T("제한 없음")}`}</span>
        <button class="btn small" id="ex-end">${T("시험 끝내기")}</button>
      </div>
      <div id="ex-problem"></div>`;

    let saveTimer = null;
    let finishing = false;
    const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRun("exam"), 500); };
    const renderTabs = () => {
      $("#ex-tabs").innerHTML = EXAM.ids.map((id, i) => {
        const s = EXAM.subs[id];
        const edited = EXAM.codes[id] != null && (!s || s.code !== EXAM.codes[id]) && norm(EXAM.codes[id]) !== norm(c.byId[id].code);
        const st = s ? `${T("{n}점", { n: s.score })}${edited ? ` · ${T("고침")}` : ""}` : edited ? T("쓰는 중") : T("안 냄");
        return `<button type="button" class="exam-tab" data-i="${i}" aria-current="${i === EXAM.i}">` +
          `<b>${i + 1}</b><span class="nm">${esc(c.byId[id].title)}</span><span class="st">${st}</span></button>`;
      }).join("");
    };
    const show = () => {
      renderTabs();
      const id = EXAM.ids[EXAM.i];
      const p = c.byId[id];
      mountCodeTest($("#ex-problem"), c, p, {
        mode: "exam",
        code: EXAM.codes[id] ?? p.code,
        onChange: (v) => { EXAM.codes[id] = v; saveSoon(); renderTabs(); },
        onSubmit: (r, code) => {
          if (EXAM !== run || run.done) return;  // 다른 회차이거나 시험이 끝난 뒤에 도착한 결과는 버린다
          EXAM.subs[id] = { score: r.blocked ? 0 : r.score, passed: r.blocked ? 0 : r.passed, total: r.total || requiredCount(p),
            ok: !!r.ok, perf: r.ok ? r.perf || null : null, code, at: Date.now() };  // 효율성은 정확성을 모두 통과했을 때만 잰다
          if (EXAM.codes[id] == null) EXAM.codes[id] = code;  // 채점을 기다리는 동안 고친 코드는 그대로 둔다
          saveRun("exam");
          renderTabs();
        },
      });
      window.scrollTo({ top: 0 });
    };
    $("#ex-tabs").addEventListener("click", (e) => {
      const b = e.target.closest(".exam-tab");
      if (!b || finishing) return;
      EXAM.i = +b.dataset.i;
      saveRun("exam");
      show();
    });
    const tick = () => {
      const el = $("#ex-time");
      if (!el) return;
      el.textContent = runClock(EXAM);
      if (!EXAM.end) return;  // 제한 없음: '시험 끝내기'를 누를 때까지 잇는다
      const left = (EXAM.end - Date.now()) / 1000;
      el.classList.toggle("low", left <= 300);
      if (left <= 0) finish();
    };
    const timer = setInterval(tick, 250);
    setCleanup(() => { clearInterval(timer); clearTimeout(saveTimer); if (EXAM && !EXAM.done) saveRun("exam"); });
    $("#ex-end").addEventListener("click", () => {
      if (confirm(T("시험을 끝낼까요? 문제마다 지금 코드로 점수를 매깁니다."))) finish();
    });

    async function finish() {
      if (finishing || EXAM.done || FINISHING.has(EXAM.start)) return;
      finishing = true;
      FINISHING.add(EXAM.start);
      clearInterval(timer);
      clearTimeout(saveTimer);
      const x = EXAM;
      x.used = usedSec(x);
      x.ending = true;  // 채점하는 동안 페이지를 닫아도, 다시 열면 남은 시간과 상관없이 곧바로 이어서 끝낸다
      saveRun("exam");  // 결과를 쓰기 전까지 진행 기록을 지우지 않는다
      x.done = true;
      $$("#ex-tabs .exam-tab, #ex-end").forEach((b) => { b.disabled = true; });
      $("#ex-problem").innerHTML = `<div class="card"><h2>${T("채점하는 중")}</h2><p class="muted" id="ex-prog">${T("문제마다 마지막 코드로 점수를 매깁니다.")}</p></div>`;
      const items = [];
      for (const [i, id] of x.ids.entries()) {
        const p = c.byId[id];
        const code = x.codes[id] ?? p.code;
        const sub = x.subs[id];
        const base = { id, total: requiredCount(p), code };
        if (sub && sub.code === code) { items.push({ ...base, score: sub.score, passed: sub.passed, ok: sub.ok, perf: sub.perf }); continue; }
        if (norm(code) === norm(p.code)) { items.push({ ...base, score: 0, passed: 0, ok: false, none: true }); continue; }
        const prog = $("#ex-prog");
        if (prog) prog.textContent = T("{n}번 문제의 마지막 코드를 채점합니다.", { n: i + 1 });
        // 제출할 때와 같이 효율성 테스트까지 돌린다. 큰 입력에서 값이 틀리거나 오류가 나면 정확성 실패로 세기 때문이다.
        let r = null;
        const stage = (text) => { const el = $("#ex-prog"); if (el) el.textContent = `${T("{n}번 문제의 마지막 코드를 채점합니다.", { n: i + 1 })} ${text}`; };
        for (let k = 0; k < 2 && !r; k++) {  // 채점기 오류로 못 매기면 한 번 더 해 본다. 끝나지 않는 코드는 다시 돌리지 않는다
          try { r = await gradeCodeTest(p, code, { onStage: stage, stopOnTimeout: true }); } catch (err) { if (err.timeout) break; }
        }
        items.push(r ? { ...base, total: r.total || base.total, score: r.blocked ? 0 : r.score, passed: r.blocked ? 0 : r.passed,
          ok: !!r.ok, perf: r.ok ? r.perf || null : null, auto: true } :
          { ...base, score: 0, passed: 0, ok: false, auto: true, failed: true });
      }
      items.forEach((it) => { if (!it.none) Store.record(cid, it.id, it.ok); });
      Store.update((d) => {
        const st = Store.course(cid);
        st.exam = [{ at: Date.now(), code: x.o.code, how: x.o.how, q: setupQuery("exam", x.o), m: x.o.m, sec: Math.round(x.used), items },
          ...(st.exam || [])].slice(0, 20);
        if (d.examLive && d.examLive.start === x.start) d.examLive = null;  // 그사이 새로 시작한 시험은 건드리지 않는다
      });
      FINISHING.delete(x.start);
      if (!EXAM || EXAM.start === x.start) location.hash = `#/${cid}/exam/result`;
    }

    tick();
    if (EXAM.ending && !EXAM.done) finish();  // 끝내는 중에 새로 고쳤다
    if (!EXAM.done) show();
  }

  function examLine(c, e) {
    const sum = e.items.reduce((a, it) => a + it.score, 0);
    const g = (new URLSearchParams(e.q).get("g") || "").split(",").filter(Boolean);
    // 수업에서 붙여 내는 줄이다. 영어판도 같은 칸 차례로 쓴다
    const set = e.how === "pick" ? `${T("직접 고름 {ids}", { ids: e.items.map((it) => it.id).join("·") })} | ` :
      `${T("세트 {code}", { code: e.code })} | ${g.length ? `${chapterRange(g)} ` : ""}`;
    return `${T("코딩 테스트 모의 시험")} | ${set}${T("{n}문제", { n: e.items.length })} ${limitText(e.m)} | ` +
      e.items.map((it, i) => T("{i}번 {n}점", { i: i + 1, n: it.score })).join(", ") + ` | ${T("합계 {sum}/{max}", { sum, max: e.items.length * 100 })} | ${fmtDuration(e.sec)}`;
  }

  async function viewExamResult(cid, query) {
    const c = await getCourse(cid);
    const e = (Store.course(cid).exam || [])[+(new URLSearchParams(query || "").get("i") || 0)];
    if (!e) { location.replace(`#/${cid}/exam`); return; }
    document.title = T("모의 시험 결과 · 파이썬 연습");
    const sum = e.items.reduce((a, it) => a + it.score, 0);
    const line = examLine(c, e);
    const retry = e.items.filter((it) => it.score < 100 && c.byId[it.id]).map((it) => it.id);
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <h1>${T("모의 시험 결과")}</h1>
      <div class="card">
        <div class="score">${sum}<small> / ${T("{n}점", { n: e.items.length * 100 })}</small></div>
        <p class="muted" style="margin-top:6px">${resultMeta(e)} · ${fmtDate(e.at)}</p>
        <p class="small" style="margin:12px 0 6px"><b>${T("결과 줄")}</b> <span class="muted">${T("수업에서 결과를 낼 때 이 줄을 복사해 붙입니다. 이름이나 코드는 들어 있지 않습니다.")}</span></p>
        <div class="result-line" id="ex-line">${esc(line)}</div>
        <div class="actions">
          <button class="btn" id="ex-copy">${T("결과 줄 복사")}</button>
          ${retry.length ? `<a class="btn primary" href="${esc(retryHref(cid, "exam", e, retry))}">${T("못 푼 문제만 다시 ({n})", { n: retry.length })}</a>` : ""}
          <a class="btn mint" href="#/${esc(cid)}/exam?${esc(e.q)}">${T("같은 문제 다시")}</a>
          ${e.how === "pick" ? "" : `<a class="btn" href="#/${esc(cid)}/exam?${esc(e.q.replace(/code=[A-Z0-9]*/, "code="))}">${T("새 세트")}</a>`}
        </div>
      </div>
      <h2 class="section">${c.problems.some((p) => p.solution) ? T("문제별 점수와 모범 코드") : T("문제별 점수")}</h2>
      <div class="stack" id="ex-review"></div>`;
    $("#ex-review").innerHTML = e.items.map((it, i) => {
      const p = c.byId[it.id];
      if (!p) return "";
      const state = it.none ? T("안 냄") : it.failed ? T("채점하지 못함") : `${T("{n}점", { n: it.score })} · ${T("정확성 {k}/{n}", { k: it.passed, n: it.total })}`;
      const perf = it.perf && it.perf.total ? ` · ${T("효율성 {k}/{n}", { k: it.perf.passed, n: it.perf.total })}` : "";
      return `<details class="card" ${it.ok ? "" : "open"}>
        <summary class="row"><b>${i + 1}. ${esc(p.title)}</b><span class="badge lv${p.level}">${levelName(p.level)}</span>
          <span class="${it.ok ? "" : "muted"}">${it.ok ? "✓" : "✗"} ${esc(state + perf)}</span><span class="spacer"></span>
          <a class="small" href="#/${esc(cid)}/p/${esc(p.id)}">${T("연습에서 다시 풀기")}</a></summary>
        <div style="margin-top:12px">
          ${it.none ? "" : `<h3>${T("내 코드")}</h3>${codeBlock(hl(String(it.code).replace(/\n+$/, "")))}`}
          ${it.auto ? `<p class="tiny muted" style="margin-top:6px">${T("마지막으로 낸 뒤에 고친 코드여서, 끝날 때 다시 채점했습니다.")}</p>` : ""}
          ${p.solution ? `<div style="margin-top:14px">${ctSolutionHtml(p)}</div>` : ""}
        </div>
      </details>`;
    }).join("");
    $("#ex-copy").addEventListener("click", () => copyText(line, T("결과 줄을 복사했습니다")));
  }

  // ------------------------------------------------------------------ 화면: 내 기록
  // ------------------------------------------------------------------ 화면: 이용 안내와 저작권(#/terms)
  // 2026-10-15 사용자 결정(A안): 문제와 코드 모두 모든 권리 보유. 개인 학습과 수업에서 링크로 나누는 것만 허락 없이 한다.
  // 같은 내용을 web/LICENSE.txt에 두어 공개 저장소(donghyunlee-ai/practice)에도 나간다. 영어 화면(#/en/terms)은 LICENSE.txt의 영어 부분과 같은 뜻이다.
  function viewTerms() {
    document.title = T("{title} · 파이썬 연습", { title: T("이용 안내와 저작권") });
    main.innerHTML = `<div class="view prose">
      <div class="crumbs"><a href="${homeHref()}">← ${T("파이썬 연습")}</a></div>
      <h1>${T("이용 안내와 저작권")}</h1>
      <p class="lead">${T("이 사이트의 문제와 코드를 어디까지 쓸 수 있는지, 사이트가 쓰는 오픈소스는 무엇인지 적었습니다.")}</p>
      <div class="card section">
        <h2>${T("저작권")}</h2>
        <p>${T("이 사이트의 문제(지문, 시작 코드, 정답 코드, 힌트, 해설), 목표 그림, 화면 문구와 프로그램 코드(채점기 포함)의 저작권은 이동현에게 있습니다. © 2026 이동현. 모든 권리는 저작권자에게 있습니다.")}</p>
      </div>
      <div class="card section">
        <h2>${T("자유롭게 할 수 있는 것")}</h2>
        <ul>
          <li>${T("혼자 공부하며 문제를 풀고, 내가 쓴 답과 풀이 기록을 내 기기에 두는 것")}</li>
          <li>${T("수업이나 스터디에서 이 사이트와 문제의 주소(링크)를 나누는 것")}</li>
          <li>${T("문제 하나를 화면 캡처나 짧은 인용으로 소개하는 것. 이때 출처로 '파이썬 연습(donghyunlee.kr/practice)'을 밝힙니다.")}</li>
        </ul>
      </div>
      <div class="card section">
        <h2>${T("허락을 받아야 하는 것")}</h2>
        <ul>
          <li>${T("문제, 해설, 그림을 모아 복제하거나 다른 사이트, 문제은행, 교재, 시험지에 옮겨 싣는 것")}</li>
          <li>${T("이 사이트의 문제나 코드로 돈을 받는 강의, 책, 앱, 서비스를 만드는 것")}</li>
          <li>${T("이 사이트의 코드(채점기 포함)를 가져다 다른 사이트나 프로그램을 만드는 것")}</li>
          <li>${T("문제와 해설을 인공지능 학습용 데이터로 모으거나 쓰는 것")}</li>
        </ul>
        <p>${T("허락이 필요하면 {link}에 적힌 연락처로 문의합니다.", { link: `<a href="${siteUrl("about")}">donghyunlee.kr</a>` })}</p>
      </div>
      <div class="card section">
        <h2>${T("책과의 관계")}</h2>
        <p>${T("기본기 과목과 시각화 과목은 AI ERA SERIES의 『AI 시대의 파이썬 기본기』, 『AI 시대의 파이썬 데이터 시각화』 차례에 맞춰 따로 쓴 연습 문제입니다. 책의 본문, 예제, 연습문제는 옮기지 않았습니다.")}</p>
      </div>
      <div class="card section">
        <h2>${T("오픈소스 고지")}</h2>
        <p>${T("이 사이트는 아래 오픈소스를 각 라이선스에 따라 씁니다. 각 소프트웨어의 저작권은 그 저작자에게 있습니다.")}</p>
        <ul>
          <li>${T("Pyodide 0.27.8(브라우저 안의 파이썬, micropip 포함): Mozilla Public License 2.0. jsDelivr에서 받아 씁니다.")}</li>
          <li>Python 3.12: Python Software Foundation License</li>
          <li>${T("matplotlib: Matplotlib License(PSF 기반)")}</li>
          <li>NumPy, pandas: BSD 3-Clause License</li>
          <li>${T("seaborn 0.13.2: BSD 3-Clause License, Copyright (c) 2012-2023, Michael L. Waskom. 휠 파일을 바꾸지 않고 사이트에 두며, 라이선스 전문은 휠 안의 LICENSE.md에 있습니다.")}</li>
          <li>${T("Pretendard 글꼴: SIL Open Font License 1.1. jsDelivr에서 받아 씁니다.")}</li>
        </ul>
        <p class="small muted">${T("그 밖에 Pyodide가 함께 불러오는 패키지(pyparsing, cycler, kiwisolver 등)는 각자의 라이선스를 따릅니다.")}</p>
      </div>
    </div>`;
  }

  async function viewMe() {
    document.title = T("{title} · 파이썬 연습", { title: T("내 기록") });
    // 이 언어의 과목만 보인다. 숨긴 과목은 기록이 있을 때만(주소로 열어 풀어 본 경우) 보인다
    const hasRecord = (id) => { const s = Store.data.courses[id]; return !!s && (Object.keys(s.p || {}).length > 0 || (s.ta || []).length > 0 || (s.exam || []).length > 0); };
    const index = (await getIndex()).filter((m) => langOfMeta(m) === LANG && (listedMeta(m) || hasRecord(m.id)));
    let html = `<h1>${T("내 기록")}</h1>
      <p class="lead">${T("기록은 이 브라우저에만 있습니다. 다른 컴퓨터에서 이어 하려면 기록 파일을 내보낸 뒤 그 컴퓨터에서 가져옵니다. 브라우저의 사이트 데이터를 지우면 기록도 지워집니다.")}</p>`;
    const thead = `<thead><tr><th>${T("날짜")}</th><th>${T("세트")}</th><th>${T("점수")}</th><th>${T("시간")}</th></tr></thead>`;
    for (const meta of index) {
      const c = await getCourse(meta.id);
      const st = Store.course(meta.id);
      const test = isTestCourse(c);
      const by = test ? [1, 2, 3].map((l) => {
        const ps = c.problems.filter((p) => p.level === l);
        return `${levelName(l)} ${ps.filter((p) => statusOf(meta.id, p.id) === "solved").length}/${ps.length}`;
      }) : TYPE_ORDER.map((t) => {
        const ps = c.problems.filter((p) => p.type === t);
        return `${typeName(t)} ${ps.filter((p) => statusOf(meta.id, p.id) === "solved").length}/${ps.length}`;
      });
      const exams = st.exam || [];
      const history = test ?
        `<h3 style="margin-top:14px">${T("모의 시험")}</h3>
        ${exams.length ? `<table class="records">${thead}<tbody>
          ${exams.slice(0, 10).map((e, i) => `<tr><td>${fmtDate(e.at)}</td><td><a href="#/${esc(meta.id)}/exam/result?i=${i}">${e.how === "pick" ? T("직접 고름") : esc(e.code)}</a></td>
            <td>${e.items.reduce((a, it) => a + it.score, 0)} / ${e.items.length * 100}</td><td>${fmtDuration(e.sec)}</td></tr>`).join("")}</tbody></table>` :
          `<p class="small muted">${T("아직 기록이 없습니다.")}</p>`}` :
        `<h3 style="margin-top:14px">${T("타임어택")}</h3>
        ${st.ta.length ? `<table class="records">${thead}<tbody>
          ${st.ta.slice(0, 10).map((t, i) => `<tr><td>${fmtDate(t.at)}</td><td><a href="#/${esc(meta.id)}/${t.items ? `ta/result?i=${i}` : `ta?${esc(t.q)}`}">${t.how === "pick" ? T("직접 고름") : esc(t.code)}</a></td>
            <td>${t.ok} / ${t.n}</td><td>${fmtDuration(t.sec)}</td></tr>`).join("")}</tbody></table>` :
          `<p class="small muted">${T("아직 기록이 없습니다.")}</p>`}`;
      const solved = c.problems.filter((p) => statusOf(meta.id, p.id) === "solved").length;
      const tried = c.problems.filter((p) => statusOf(meta.id, p.id) === "tried");
      const byCh = c.chapters.filter((ch) => c.byChapter[ch.num].length)
        .map((ch) => T("{n}장 {k}/{m}", { n: ch.num, k: solvedIn(meta.id, c.byChapter[ch.num]), m: c.byChapter[ch.num].length }));
      html += `<div class="card section">
        <p class="eyebrow">${esc(c.eyebrow)}</p><h2>${esc(c.title)}</h2>
        <div class="row small"><b>${T("푼 문제 {k} / {n}", { k: solved, n: c.problems.length })}</b><span class="muted">${byCh.join(" · ")}</span></div>
        <p class="tiny muted" style="margin:2px 0 0">${by.join(" · ")}</p>
        <div class="progress" style="margin:6px 0 14px"><span style="width:${c.problems.length ? (100 * solved) / c.problems.length : 0}%"></span></div>
        ${tried.length ? `<p class="small">${T("아직 못 푼 문제: {list}", { list: tried.map((p) => `<a href="#/${esc(meta.id)}/p/${esc(p.id)}">${esc(p.title)}</a>`).join(", ") })}</p>` : ""}
        ${history}
      </div>`;
    }
    html += `<div class="card section"><h2>${T("기록 파일")}</h2>
      <div class="actions" style="margin-top:4px">
        <button class="btn" id="export">${T("기록 내보내기")}</button>
        <label class="btn" for="import">${T("기록 가져오기")}</label><input type="file" id="import" accept="application/json,.json" hidden>
        <span class="spacer"></span><button class="btn ghost" id="wipe">${T("이 브라우저의 기록 지우기")}</button>
      </div></div>`;
    main.innerHTML = html;
    $("#export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(Store.data, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      const d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = `python-practice-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $("#import").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        if (!d || d.v !== 1 || typeof d.courses !== "object") throw new Error("형식");  // i18n:ok 화면에 보이지 않는 오류 이름
        if (!confirm(T("가져온 기록으로 바꿀까요? 이 브라우저의 지금 기록은 지워집니다."))) return;
        Store.data = { set: {}, ...d };
        Store.save();
        toast(T("기록을 가져왔습니다"));
        render();
      } catch (err) { alert(T("기록 파일을 읽지 못했습니다. 이 사이트에서 내보낸 파일인지 확인해 주세요.")); }
    });
    $("#wipe").addEventListener("click", () => {
      if (!confirm(T("이 브라우저의 풀이 기록을 모두 지울까요? 되돌릴 수 없습니다."))) return;
      Store.data = { v: 1, courses: {}, set: {} };
      Store.save();
      toast(T("기록을 지웠습니다"));
      render();
    });
  }

  // ------------------------------------------------------------------ 화면: 자체 점검(링크 없음, #/selftest)
  // 개발 도구라 한국어 그대로 둔다(SPEC 2절). 아래 i18n:ko-only부터 i18n:end까지는 tools/check_i18n.py가 보지 않는다
  // i18n:ko-only
  async function viewSelftest() {
    document.title = "selftest 진행 중";
    main.innerHTML = `<h1>자체 점검</h1>
      <p class="lead">모든 문제의 정답은 통과하고 틀린 답은 걸러지는지, 이 브라우저의 파이썬으로 채점해 봅니다.</p>
      <p id="st-sum" class="muted">파이썬을 준비하는 중입니다.</p>
      <table class="records"><thead><tr><th>문제</th><th>확인</th><th>결과</th></tr></thead><tbody id="st-body"></tbody></table>`;
    const body = $("#st-body");
    const results = [];
    const add = (name, what, ok, info = "") => {
      ok = !!ok;
      results.push(ok);
      body.insertAdjacentHTML("beforeend", `<tr><td>${esc(name)}</td><td>${esc(what)}</td><td>${ok ? "✓" : "✗"} ${esc(ok && info.length > 80 ? "" : info)}</td></tr>`);
      $("#st-sum").textContent = `확인 ${results.length}개 중 ${results.filter(Boolean).length}개 통과`;
    };
    const t0 = performance.now();
    await Py.start();
    add("파이썬", `Pyodide ${Py.info.pyodide}, Python ${Py.info.python}`, true, "");
    const g = (p, answer) => Py.call("grade", { problem: wire(p), answer }, p.plot ? 40000 : 15000);
    // 코딩 테스트의 모범 코드는 공개 데이터에 없다. 로컬에서는 build.py가 만든 local-solutions.json으로 돌려 본다.
    // 영어 과목의 항목은 열쇠가 '<과목>/<문제>'이고, 없으면 같은 아이디의 한국어판 항목을 쓴다(SPEC 5절)
    const local = onLocal ? await fetch(`data/local-solutions.json?v=${VERSION}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : {};
    let skipped = 0;
    for (const meta of await getIndex()) {
      const c = await getCourse(meta.id);
      if ((c.packages || []).length) {
        const t1 = performance.now();
        await Py.load(c.packages);
        add(meta.id, "그래프 도구 불러오기", true, `${c.packages.join(", ")} ${Math.round(performance.now() - t1)}ms`);
      }
      for (const p of c.problems) {
        const name = langOfMeta(meta) === "ko" ? p.id : `${c.id}/${p.id}`;  // 영어판은 문제 아이디가 같아 과목을 붙여 가른다
        const loc = local[`${c.id}/${p.id}`] || local[p.id];
        if (p.entry) {  // 코딩 테스트: 모범 코드는 효율성까지 모두 통과하고, 시작 코드는 통과하지 못한다
          const solution = p.solution || (loc && loc.solution);
          if (solution) {
            const good = await g(p, { code: solution });
            add(name, "모범 코드가 효율성까지 모두 통과", good.ok && good.score === 100 && good.tests.every((t) => t.ok),
              good.ok ? "" : JSON.stringify(good.blocked || good.tests.filter((t) => !t.ok).map((t) => [t.label, t.error && t.error.type])).slice(0, 200));
          } else skipped += 1;
          const bad = await g(p, { code: p.code });
          add(name, "시작 코드는 통과하지 못함", !bad.ok);
          continue;
        }
        if (p.type === "predict") {
          const r = await Py.call("run", { code: p.code, stdin: p.stdin || [], files: p.files || null, plot: !!(c.packages || []).length });
          const same = norm(r.stdout) === p.expect.stdout && (r.error ? r.error.type : null) === p.expect.error;
          add(name, "실행 결과가 빌드 때와 같음", same, same ? "" : `${norm(r.stdout)} ${r.error ? r.error.type : ""}`);
          add(name, "정답 채점", gradePredict(p, p.expect.stdout, !!p.expect.error, p.expect.error).ok);
          add(name, "빈 답은 틀림", !gradePredict(p, "", false, "").ok);
        } else {
          const good = await g(p, p.type === "fill" ? { blanks: p.answers } : { code: p.solution });
          add(name, "정답 통과", good.ok, good.ok ? "" : JSON.stringify(good.blocked || good.tests.filter((t) => !t.ok)).slice(0, 200));
          const badAnswer = p.type === "fill" ? { blanks: p.answers.map(() => "") } : { code: p.code };
          if (p.type !== "write" || p.code.trim()) {
            const bad = await g(p, badAnswer);
            add(name, p.type === "fill" ? "빈칸을 비우면 틀림" : p.type === "fix" ? "고치기 전 코드는 틀림" : "시작 코드는 틀림", !bad.ok);
          }
          // 그래프 과목: 빌드(matplotlib 3.10)가 확인한 흔한 오답과 다른 맞는 답을 이 브라우저의 판으로 다시 채점한다
          const extra = loc || {};
          const asAnswer = (x) => (p.type === "fill" ? { blanks: x.blanks } : { code: x.code });
          for (const w of extra.wrong || []) {
            const r = await g(p, asAnswer(w));
            add(name, `흔한 오답 '${w.name}'은 틀림`, !r.ok);
          }
          for (const x of extra.accept || []) {
            const r = await g(p, asAnswer(x));
            add(name, `다른 맞는 답 '${x.name}'은 통과`, r.ok,
              r.ok ? "" : JSON.stringify(r.blocked || r.tests.filter((t) => !t.ok).map((t) => [t.label, t.diffs || (t.error && t.error.type)])).slice(0, 200));
          }
        }
      }
    }
    if (skipped) add("코딩 테스트 모범 코드", `공개 데이터에 없어 ${skipped}문제는 빌드에서만 확인`, true, "");
    let t = performance.now();
    let r = await Py.call("run", { code: "n = 0\nwhile True:\n    n += 1\n", stdin: [] });
    add("끝나지 않는 반복", "줄 수 한도로 멈춤", r.error && r.error.type === "StepLimit", `${Math.round(performance.now() - t)}ms`);
    // 코딩 테스트 효율성: 반복으로 푼 답은 줄 수 기준에서 멈추고, C 안에서 오래 도는 답은 제한 시간에서 멈춘다
    const perfProblem = {
      type: "write", entry: "f(n)", code: "def f(n):\n    return 0\n", examples: [], params: ["n"],
      tests: [
        { kind: "call", label: "예시 1", expr: "f(3)", expect: { value: "3" }, example: true },
        { kind: "call", label: "효율성 1", expr: "f(10**9)", expect: { value: "499999999500000000" }, hint: "큰 n", perf: true, optional: true, max_steps: 50000 },
      ],
    };
    t = performance.now();
    const loop = await gradeCodeTest(perfProblem, "def f(n):\n    if n == 3:\n        return 3\n    s = 0\n    for i in range(n):\n        s += i\n    return s\n");
    const lt = loop.tests.find((x) => x.perf);
    add("효율성(줄 수)", "반복으로 푼 답은 기준을 넘어 시간 초과", loop.ok && lt && !lt.ok && lt.error && lt.error.type === "TimeLimit",
      `${lt && lt.steps != null ? fmtNum(lt.steps) + "줄, " : ""}${Math.round(performance.now() - t)}ms`);
    t = performance.now();
    const cslow = await gradeCodeTest(perfProblem, "def f(n):\n    if n == 3:\n        return 3\n    return sum(range(10**10))\n");
    const ct = cslow.tests.find((x) => x.perf);
    add("효율성(제한 시간)", `C 안에서 오래 도는 답은 ${PERF_TIMEOUT / 1000}초 뒤 시간 초과`, cslow.ok && ct && !ct.ok && ct.error && ct.error.type === "TimeLimit",
      `${Math.round(performance.now() - t)}ms`);
    r = await Py.call("run", { code: 'while True:\n    print("a")\n', stdin: [] });
    add("끝없는 출력", "출력 한도로 멈춤", r.error && r.error.type === "OutputLimit");
    r = await Py.call("run", { code: "x = input()\n", stdin: [] });
    add("입력값 없음", "EOFError", r.error && r.error.type === "EOFError");
    t = performance.now();
    let timedOut = false;
    try { await Py.call("run", { code: "sum(range(10**10))\n", stdin: [] }, 3000); } catch (err) { timedOut = !!err.timeout; }
    add("C 안에서 도는 긴 계산", "3초 뒤 멈춤", timedOut);
    r = await Py.call("run", { code: "print(6 * 7)\n", stdin: [] });
    add("멈춘 뒤 다시 준비", "다시 실행됨", r.stdout === "42\n", `멈춤부터 다시 실행까지 ${Math.round(performance.now() - t)}ms`);
    const pass = results.filter(Boolean).length;
    $("#st-sum").textContent = `확인 ${results.length}개 중 ${pass}개 통과 · ${Math.round((performance.now() - t0) / 1000)}초`;
    document.title = `selftest ${pass}/${results.length}`;
  }
  // i18n:end

  // ------------------------------------------------------------------ 위쪽 막대와 아래쪽 고지의 언어
  // 한국어는 index.html에 적힌 그대로다. 처음 영어로 바꿀 때 한국어 원본을 받아 두고, 한국어로 돌아오면 그대로 되돌린다.
  // 영어는 아래 문구로 만든다(링크는 홈페이지의 영어 쪽, SPEC 2절).
  let chromeLang = "ko";
  let chromeKo = null;
  const footerHtml = () => `
      <p>${T("파이썬은 이 브라우저 안에서 실행됩니다. 작성한 코드와 풀이 기록은 이 브라우저에만 저장되고 서버로 보내지 않습니다.")}</p>
      <p>${T("이 사이트는 방문 통계를 위해 Google Analytics를 사용합니다. 수집 항목, 보유 기간, 거부 방법은 {privacy}에 있습니다.", { privacy: `<a href="${siteUrl("privacy")}">${T("개인정보 처리방침")}</a>` })}</p>
      <p>${T("문제, 해설, 그림과 사이트 코드의 저작권은 이동현에게 있습니다. 혼자 공부하거나 수업에서 링크로 나누는 것은 자유이고, 복제, 재배포, 판매는 허락을 받아야 합니다.")}</p>
      <p class="footer-links"><a href="${siteUrl("home")}">donghyunlee.kr</a> · <a href="${siteUrl("privacy")}">${T("개인정보 처리방침")}</a> · <a href="${termsHref()}">${T("이용 안내와 저작권")}</a> · ${T("© 2026 이동현")}</p>
    `;
  function setLang(lang) {
    LANG = lang === "en" ? "en" : "ko";
    if (LANG === chromeLang) return;
    const nav = $(".topnav");
    const links = $$("[data-nav]", nav);
    if (!chromeKo) {
      chromeKo = {
        skip: $(".skip").textContent, brandHref: $(".brand").getAttribute("href"), brand: $(".brand span").textContent,
        nav: nav.getAttribute("aria-label"), links: links.map((a) => [a.getAttribute("href"), a.textContent]),
        footer: $(".footer .wrap").innerHTML,
      };
    }
    chromeLang = LANG;
    document.documentElement.lang = LANG;
    if (LANG === "ko") {
      $(".skip").textContent = chromeKo.skip;
      $(".brand").setAttribute("href", chromeKo.brandHref);
      $(".brand span").textContent = chromeKo.brand;
      nav.setAttribute("aria-label", chromeKo.nav);
      links.forEach((a, i) => { a.setAttribute("href", chromeKo.links[i][0]); a.textContent = chromeKo.links[i][1]; });
      $(".footer .wrap").innerHTML = chromeKo.footer;
    } else {
      $(".skip").textContent = T("본문으로 건너뛰기");
      $(".brand").setAttribute("href", homeHref());
      $(".brand span").textContent = T("파이썬 연습");
      nav.setAttribute("aria-label", T("주 메뉴"));
      const en = { me: [meHref(), T("내 기록")], books: [siteUrl("books"), T("도서")], home: [siteUrl("home"), T("홈페이지")] };
      links.forEach((a) => { const [href, text] = en[a.dataset.nav]; a.setAttribute("href", href); a.textContent = text; });
      $(".footer .wrap").innerHTML = footerHtml();
    }
    const loading = $(".loading", main);
    if (loading) loading.textContent = T("불러오는 중입니다.");
    Py.setState(Py.state);
  }

  // ------------------------------------------------------------------ 언어 바꾸기 링크(위쪽 막대)
  // 과목 화면은 짝 과목(pair)의 같은 자리로, 첫 화면·내 기록·이용 안내는 다른 언어의 같은 화면으로 보낸다(SPEC 2절, 5절).
  // 문제 화면은 짝 과목의 같은 절로 가는 링크를 두고, 누를 때 짝 과목에 같은 문제가 있으면 그 문제로 보낸다.
  // 한국어 화면의 English는 가려는 영어 화면이 보일 때만 둔다: 과목 화면은 짝 과목이 hidden이 아닐 때,
  // 그 밖의 화면은 hidden이 아닌 영어 과목이 하나라도 있을 때. 영어 화면의 한국어는 늘 둔다.
  let switchSeq = 0;
  async function updateLangSwitch(hash, page, cid) {
    const seq = ++switchSeq;
    const a = $("#lang-switch");
    if (!a) return;
    const other = LANG === "en" ? "ko" : "en";
    let href = null;
    let problem = null;
    try {
      const index = await getIndex();
      const open = (m) => other === "ko" || !m.hidden;
      const anyOpen = index.some((m) => langOfMeta(m) === other && open(m));
      if (cid) {
        const meta = index.find((m) => m.id === cid);
        const pair = meta && meta.pair ? index.find((m) => m.id === meta.pair) : null;
        if (pair) {
          if (open(pair)) {
            const rest = hash.slice(2 + cid.length);
            const pm = rest.match(/^\/p\/([\w-]+)$/);
            if (pm) {
              const p = (await getCourse(cid)).byId[pm[1]];
              href = p ? `#/${pair.id}/ch/${p.chapter}/${p.section}` : `#/${pair.id}`;
              if (p) problem = `${pair.id}/${p.id}`;
            } else {
              href = `#/${pair.id}${rest.replace(/^\/(ta|exam)\/(run|result).*$/, "/$1")}`;  // 진행과 결과는 그 과목의 기록이라 시작 화면으로
            }
          }
        } else if (other === "ko" || anyOpen) href = other === "en" ? "#/en" : "#/";
      } else if (page && (other === "ko" || anyOpen)) {
        href = { home: ["#/", "#/en"], me: ["#/me", "#/en/me"], terms: ["#/terms", "#/en/terms"] }[page][other === "en" ? 1 : 0];
      }
    } catch (err) { href = null; }
    if (seq !== switchSeq) return;
    a.hidden = !href;
    if (!href) return;
    a.setAttribute("href", href);
    a.textContent = other === "en" ? "English" : "한국어";  // i18n:ok 언어 이름은 그 언어로 쓴다
    a.setAttribute("lang", other);
    a.setAttribute("hreflang", other);
    if (problem) a.dataset.problem = problem; else delete a.dataset.problem;
  }
  function onLangSwitchClick(e) {
    const a = e.currentTarget;
    if (!a.dataset.problem || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const [pair, pid] = a.dataset.problem.split("/");
    const fallback = a.getAttribute("href");
    getCourse(pair).then((pc) => (pc.byId[pid] ? `#/${pair}/p/${pid}` : fallback), () => fallback)
      .then((h) => { location.hash = h; });
  }

  // 과목 주소의 언어: courses.json의 lang(작아서 먼저 본다). 목록에 없는 과목은 과목 JSON의 lang
  async function courseLang(cid) {
    const meta = (await getIndex()).find((m) => m.id === cid);
    return langOfMeta(meta || await getCourse(cid));
  }

  // ------------------------------------------------------------------ 길 찾기
  let cleanup = null;
  function setCleanup(fn) { cleanup = fn; }

  async function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const hash = location.hash || "#/";
    // [주소, 화면, 언어(과목 주소는 과목의 lang을 따르므로 비운다), 언어 바꾸기에 쓰는 화면 이름]
    const routes = [
      [/^#\/?$/, viewHome, "ko", "home"],
      [/^#\/en\/?$/, viewHome, "en", "home"],
      [/^#\/me$/, viewMe, "ko", "me"],
      [/^#\/en\/me$/, viewMe, "en", "me"],
      [/^#\/terms$/, viewTerms, "ko", "terms"],
      [/^#\/en\/terms$/, viewTerms, "en", "terms"],
      [/^#\/selftest$/, viewSelftest, "ko", null],
      [/^#\/([a-z0-9-]+)$/, (m) => viewBook(m[1])],
      [/^#\/([a-z0-9-]+)\/ch\/(\d+)(?:\/(\d+\.\d+))?$/, (m) => viewChapter(m[1], +m[2], m[3])],
      [/^#\/([a-z0-9-]+)\/p\/([\w-]+)$/, (m) => viewProblem(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/ta\/run$/, (m) => viewTARun(m[1])],
      [/^#\/([a-z0-9-]+)\/ta\/result(?:\?(.*))?$/, (m) => viewTAResult(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/ta(?:\?(.*))?$/, (m) => viewSetup(m[1], "ta", m[2])],
      [/^#\/([a-z0-9-]+)\/exam\/run$/, (m) => viewExamRun(m[1])],
      [/^#\/([a-z0-9-]+)\/exam\/result(?:\?(.*))?$/, (m) => viewExamResult(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/exam(?:\?(.*))?$/, (m) => viewSetup(m[1], "exam", m[2])],
    ];
    if (hash === "#toc") return;
    const notFound = () => `<p>${T("없는 페이지입니다.")} <a href="${homeHref()}">${T("처음으로")}</a></p>`;
    for (const [re, fn, fixed, page] of routes) {
      const m = hash.match(re);
      if (m) {
        let keep = null;
        try {
          setLang(fixed || await courseLang(m[1]));
          updateLangSwitch(hash, page, fixed ? null : m[1]);
          keep = await fn(m);
        } catch (err) {
          if (err.notFound) { main.innerHTML = notFound(); updateLangSwitch(hash, null, null); }
          else {
            console.error(err);
            main.innerHTML = `<div class="warnbox">${T("페이지를 불러오지 못했습니다. 새로 고침해 보세요.")}</div>`;
          }
        }
        if (keep !== "keep" && !/\/(ta|exam)\/run$/.test(hash)) window.scrollTo({ top: 0 });
        return;
      }
    }
    main.innerHTML = notFound();
    updateLangSwitch(hash, null, null);
  }

  // ------------------------------------------------------------------ 영어 표(T의 열쇠 → 영어)
  // 짧고 쉬운 미국 영어로 쓴다. 용어는 SPEC-i18n 2절의 표를 따른다(채점하기 Check, 제출 Submit, 숨은 테스트 hidden tests,
  // 내 기록 My progress, 목표 그림 Target figure, 그래프 도구 plotting libraries, 장 Chapter, 차례 Contents 등).
  // 같은 뜻의 한국어 문장은 같은 영어로 쓴다. {n|problem|problems}는 n이 1이면 앞의 낱말, 아니면 뒤의 낱말이다.
  // 열쇠를 더하거나 고치면 python3 tools/check_i18n.py로 빠진 것과 한글이 남은 것을 본다.
  const EN = {
    // 공통: 이름, 시간, 파이썬 상태
    "타임어택": "Time attack",
    "모의 시험": "Mock exam",
    "{m}분 {s}초": "{m} min {s} sec",
    "{s}초": "{s} sec",
    "{m}분": "{m} min",
    "제한 없음": "No limit",
    "파이썬 대기": "Python idle",
    "파이썬 준비 중": "Loading Python",
    "파이썬 {v} 준비됨": "Python {v} ready",
    "파이썬을 불러오지 못함": "Python failed to load",
    "눌러서 다시 불러옵니다": "Click to try again",
    "브라우저 안에서 실행됩니다 (Pyodide {pyodide}, Python {python})": "Runs in your browser (Pyodide {pyodide}, Python {python})",
    "파이썬은 이 브라우저 안에서 실행됩니다": "Python runs in this browser",
    "채점기에서 오류가 나서 파이썬을 다시 준비합니다. 잠시 뒤 다시 눌러 주세요.": "The grader hit an error, so Python is restarting. Wait a moment and try again.",
    "파이썬을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.": "Could not load Python. Check your internet connection and try again.",

    // 출력 예측 채점
    "아직 아닙니다. 이 코드가 끝까지 실행될지 위에서부터 한 줄씩 다시 따라가 봅니다.": "Trace the code again line by line from the top, and check whether it really runs to the end.",
    "오류가 나는 것은 맞습니다. 오류 이름을 다시 봅니다. 오류 메시지는 마지막 줄의 이름부터 읽습니다.": "Yes, it raises an error, but check the error name again. Read an error message starting with the name on its last line.",
    "오류 이름은 맞습니다. 칸에는 오류가 나기 전에 찍힌 줄만 적습니다. 오류 메시지는 적지 않고, 찍힌 줄이 없으면 칸을 비웁니다.": "The error name is right. In the box, write only the lines printed before the error. Do not write the error message, and leave the box empty if nothing is printed.",
    "오류 이름은 맞습니다. 오류가 나기 전에 찍히는 줄을 다시 봅니다. 찍힌 줄이 없으면 칸을 비웁니다.": "The error name is right. Check again which lines are printed before the error. Leave the box empty if nothing is printed.",
    "아직 아닙니다. 이 코드는 오류 없이 끝까지 실행됩니다.": "This code runs to the end without an error.",
    "출력을 적어 주세요.": "Write the output.",
    "글자는 맞고 따옴표만 다릅니다. 리스트나 딕셔너리를 찍으면 안의 문자열은 작은따옴표로 보입니다.": "The text is right, but the quotes differ. When you print a list or a dictionary, the strings inside it appear in single quotes.",
    "리스트, 튜플, 딕셔너리는 쉼표 뒤를 한 칸 띄워 찍습니다.": "Lists, tuples, and dictionaries print a space after each comma.",
    "`end=`가 있는 print는 줄을 바꾸지 않고 그 글자를 붙입니다.": "A print with `end=` adds that text instead of starting a new line.",
    "글자는 맞고 띄어쓰기나 줄 바꿈만 다릅니다. print는 값 사이를 한 칸 띄우고, 한 번 부를 때마다 줄을 바꿉니다.": "The text is right, but the spaces or line breaks differ. print puts one space between values and starts a new line each time it is called.",
    "type()의 결과는 `<class 'int'>`처럼 찍힙니다. 자료형 이름만 적지 않았는지 봅니다.": "type() prints a result like `<class 'int'>`. Check that you did not write only the type name.",
    "줄 수가 다릅니다. 지금 {n}줄을 적었습니다. print가 몇 번 실행되는지 다시 셉니다.": "The number of lines differs. You wrote {n} {n|line|lines}. Count again how many times print runs.",
    "{n}번째 줄이 다릅니다. 그 줄을 찍는 순간의 값을 다시 따라가 봅니다.": "Line {n} differs. Trace the values again at the moment that line is printed.",

    // 실행과 채점 결과
    "{n}번째 줄": "Line {n}",
    "둥근 따옴표(‘ ’ “ ”)가 들어 있습니다. 파이썬 코드에는 곧은 따옴표(' \")를 씁니다. 기기에서 스마트 따옴표(스마트 구두점)를 끄면 바로 칠 수 있습니다.": "The code has curly quotes (‘ ’ “ ”). Python code uses straight quotes (' \"). Turn off smart quotes (smart punctuation) on your device to type them directly.",
    "도전 · 통과 여부에 넣지 않음": "Challenge · not counted toward passing",
    "이 테스트에서 그린 내 그림": "Your figure from this test",
    "{name} 오류": "Error: {name}",
    "(없음)": "(none)",
    "채점할 때 먼저 실행한 코드": "Code run first during grading",
    "기대한 {name}": "Expected {name}",
    "기대한 값": "Expected value",
    "내 코드의 {name}": "{name} in your code",
    "내 함수가 돌려준 값": "Your function returned",
    "실행한 뒤의 값": "Value after running",
    "함수가 찍은 출력: {out}": "Printed by your function: {out}",
    "기대한 출력": "Expected output",
    "내 코드의 출력": "Your output",
    "input()에 넣은 값: {values}": "Values given to input(): {values}",
    "아직 아닙니다": "Not yet",
    "정답입니다": "Correct",
    "확인 {n}개 중 {k}개 통과": "Passed {k} of {n} {n|check|checks}",
    "바꾼 줄 {n}줄": "{n} {n|line|lines} changed",
    "실행 결과": "Output",
    "실제 실행 결과": "Actual output",
    "아직 {name}에 값을 담지 않았습니다.": "You have not stored a value in {name} yet.",
    "실행이 끝났을 때 {vars}": "When the run ended: {vars}",
    "내 그림": "Your figure",
    "(그린 그림 없음)": "(no figure drawn)",
    "(출력 없음)": "(no output)",
    "채점하지 못했습니다": "Could not grade",
    "실행하지 못했습니다": "Could not run",

    // 그래프 문제 안내
    "색": "color",
    "마커": "markers",
    "축 라벨": "axis labels",
    "그림 크기": "figure size",
    "글꼴": "fonts",
    "할 일": "Task",
    "그림": "Figure",
    "목표 그림처럼 그립니다.": "Draw a chart like the target figure.",
    "채점할 때 내 그림에서 {fields}{obj} 읽어 비교합니다.": "Grading reads these from your figure and compares them: {fields}.",
    "여기에 적지 않은 것({items} 등)은 목표 그림에 있어도 보지 않습니다.": "Anything not listed here ({items}, and so on) is not checked, even if it appears in the target figure.",
    "주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 다시 그립니다.": "Keep the given lines ({lines}) as they are. Grading changes these values and draws the chart again.",
    "목표 그림": "Target figure",
    "목표 그림 · 주어진 값 그대로 그렸을 때": "Target figure · drawn with the given values",

    // 문제 화면: 푸는 법, 입력과 출력
    "실행하지 않고 출력을 적습니다.": "Write the output without running the code.",
    "실행하지 않고 한 줄씩 따라가 출력을 적습니다. 채점한 뒤에 실행해서 대조할 수 있습니다.": "Without running the code, trace it line by line and write the output. After you check, you can run it to compare.",
    "빈칸을 채웁니다. 채점할 때 채운 코드를 실행해 확인합니다.": "Fill in the blanks. Grading runs the completed code to check it.",
    "오류로 멈추는 코드입니다. 고칠 곳을 찾아 고칩니다.": "This code stops with an error. Find the problem and fix it.",
    "오류 없이 실행되지만 의도와 다르게 동작하는 코드입니다. 고칠 곳을 찾아 고칩니다.": "This code runs without an error but does not do what it should. Find the problem and fix it.",
    "{n}줄 안에서 고칠 수 있습니다.": "You can fix it by changing {n} {n|line|lines} or fewer.",
    "맨 위의 주어진 코드는 그대로 두고 이어서 씁니다. 채점할 때 그 값을 바꿔 여러 번 실행합니다.": "Keep the given code at the top as it is and write your code below it. Grading changes those values and runs the code several times.",
    "클래스를 완성합니다. 채점할 때 여러 값으로 객체를 만들고 메서드를 불러 봅니다.": "Complete the class. Grading creates objects with different values and calls their methods.",
    "함수를 완성합니다. 채점할 때 여러 값으로 함수를 불러 봅니다.": "Complete the function. Grading calls it with different values.",
    "입력값이 {values}일 때": "With the inputs {values}",
    "주어진 값 그대로일 때": "With the given values",
    "주어진 파일 그대로일 때": "With the given files",
    "클래스": "Class",
    "함수": "Function",
    "채점할 때 여러 값으로 객체를 만들고 메서드를 불러 결과를 봅니다.": "Grading creates objects with different values, calls their methods, and checks the results.",
    "채점할 때 여러 값으로 함수를 불러 돌려준 값을 봅니다.": "Grading calls the function with different values and checks what it returns.",
    "문제에서 말한 클래스를 만듭니다.": "Write the class the problem describes.",
    "문제에서 말한 함수를 만듭니다.": "Write the function the problem describes.",
    "입력": "Input",
    "출력": "Output",
    "예": "Example",
    "파일": "Files",
    "프로그램 전체가 찍는 내용도 글자 그대로 비교합니다. 지문에서 찍으라고 한 것만 남기고, 확인용으로 더한 print는 채점하기 전에 지웁니다.": "Everything the whole program prints is also compared exactly. Print only what the problem asks for, and remove any print you added for testing before you check.",
    "{when} 이렇게 찍힙니다.": "{when}, it prints:",
    "{when} {vars}": "{when}: {vars}",
    "실행할 때 같은 폴더에 {names} 파일이 있습니다.": "When the code runs, these files are in the same folder: {names}.",
    "채점할 때 파일 내용을 바꿔 여러 번 실행합니다.": "Grading changes the file contents and runs the code several times.",
    "input()으로 값을 읽습니다. 채점할 때 여러 값을 넣어 실행합니다.": "The code reads values with input(). Grading runs it with different inputs.",
    "주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 여러 번 실행합니다.": "Keep the given lines ({lines}) as they are. Grading changes these values and runs the code several times.",
    "답을 변수 {vars}에 담습니다. print는 확인용으로 써도 되고, 채점은 {vars}의 값만 봅니다.": "Store the answer in {vars}. You may use print for testing; grading looks only at the value of {vars}.",
    "print로 출력합니다. 찍힌 내용을 글자 그대로 비교합니다(줄 끝 공백과 앞뒤 빈 줄은 보지 않습니다).": "Show the result with print. The printed text is compared exactly (spaces at line ends and blank lines at the start or end are ignored).",
    "채점할 때 확인하는 것: {items}": "Grading checks: {items}",
    "파일 {name}": "File {name}",
    "마지막 줄 끝에 줄바꿈 있음": "Ends with a newline",
    "마지막 줄 끝에 줄바꿈 없음": "No newline at the end",
    "(빈 파일)": "(empty file)",
    "교재 {book}": "{book}",
    "input()에 차례로 친 값 {values}": "Typed into input(), in order: {values}",

    // 문제 화면: 답 칸과 버튼
    "출력 예측": "Predict the output",
    "print가 찍을 내용을 줄마다 적습니다": "Write each line that print shows",
    "오류가 나서 중간에 멈춘다": "It stops with an error",
    "오류 이름": "Error name",
    "오류 이름 고르기": "Choose the error name",
    "끝까지 실행되지 못하고 오류로 멈춘다고 예측할 때만 체크하고 오류 이름을 고릅니다. 오류가 나기 전에 찍히는 줄이 있으면 위 칸에 적습니다.": "Check this only if you predict that the code stops with an error before it finishes, and then choose the error name. Write any lines printed before the error in the box above.",
    "빈칸 {n}": "Blank {n}",
    "코드 입력": "Code editor",
    "실행할 때 input()이 읽을 값": "Values for input() when you run",
    "한 줄에 하나": "one per line",
    "실행해서 대조": "Run and compare",
    "실행": "Run",
    "제출": "Submit",
    "채점하기": "Check",
    "힌트": "Hint",
    "힌트 {n}": "Hint {n}",
    "처음 코드로": "Reset code",
    "한 번 채점한 뒤에 열 수 있습니다": "Available after you check once",
    "정답과 해설": "Answer and explanation",
    "처음 코드로 되돌릴까요? 지금 쓴 코드는 지워집니다.": "Reset to the starting code? The code you wrote will be deleted.",
    "출력을 먼저 적습니다. 아무것도 찍히지 않는다고 생각하면 그 까닭을 떠올려 봅니다.": "Write the output first. If you think nothing is printed, think about why.",
    "코드를 고치지 않았습니다.": "You have not changed the code.",
    "답이 비어 있습니다.": "Your answer is empty.",
    "그대로 내려면 제출을 한 번 더 누릅니다.": "To submit it anyway, press Submit again.",
    "그래프 도구 준비 중": "Loading plotting libraries",
    "채점 중": "Grading",
    "실행 중": "Running",
    "도전": "Challenge",
    "정답": "Answer",
    "Colab 화면에서는 input의 안내 문구와 친 값까지 이렇게 보입니다.": "In Colab, the screen also shows the input prompts and the values you typed, like this:",
    "해설": "Explanation",
    "더 해 보기": "Try more",

    // 코딩 테스트
    "필요한 기초": "Basics you need",
    "정확성을 모두 통과하면 확인합니다": "Checked after all correctness tests pass",
    "건너뜀": "Skipped",
    "틀린 값": "Wrong value",
    "시간 초과": "Time limit exceeded",
    "줄 수 한도(100만 줄)": "Line limit (1,000,000 lines)",
    "{steps}줄 · 기준 {max}줄": "{steps} lines · limit {max} lines",
    "{n}점": "{n} {n|point|points}",
    "통과 · 100점": "Passed · 100 points",
    "정확성 테스트 {n}개 중 {k}개 통과": "Passed {k} of {n} correctness {n|test|tests}",
    "효율성 테스트 {k}개는 시간 안에 끝났지만 틀려서 정확성 실패로 셈": "{k} efficiency {k|test|tests} finished in time but gave a wrong answer, so {k|it counts as a correctness failure|they count as correctness failures}",
    "효율성(도전)은 정확성을 모두 통과하면 잽니다": "Efficiency (challenge) is measured after all correctness tests pass",
    "효율성(도전) {k} / {n}": "Efficiency (challenge) {k} / {n}",
    "숨은 테스트": "Hidden tests",
    "입력은 보이지 않고 어떤 경우인지만 보입니다": "Inputs are hidden; you see only what kind of case each test is",
    "효율성": "Efficiency",
    "도전 · 시간 초과는 점수에 넣지 않음 · 실행한 줄 수로 잽니다": "Challenge · timeouts do not affect the score · measured by lines run",
    "예시 {n}개 중 {k}개 맞음": "{k} of {n} {n|example|examples} correct",
    "예시만 돌렸습니다. 제출하면 숨은 테스트까지 채점합니다.": "Only the examples were run. Submit to grade the hidden tests too.",
    "모범 코드": "Model solution",
    "다른 방법으로 풀어도 숨은 테스트를 모두 통과하면 정답입니다.": "A different approach is also correct if it passes all hidden tests.",
    "효율성 {k}/{n}": "Efficiency {k}/{n}",
    "{s}초 안에 끝나지 않았습니다. 반복 대신 셈으로 바로 구하거나 같은 일을 덜 되풀이하는 방법을 찾아봅니다.": "Did not finish within {s} seconds. Try computing the answer directly with arithmetic instead of a loop, or find a way to repeat less work.",
    "큰 입력에서 오류가 났습니다. 제한 사항의 가장 큰 값까지 맞게 도는지 봅니다. 이 테스트는 정확성 실패로 셉니다.": "An error occurred on a large input. Check that your code works up to the largest values in the constraints. This test counts as a correctness failure.",
    "시간 안에 끝났지만 값이 틀렸습니다. 큰 값에서만 틀리는 까닭(실수 나눗셈 등)을 찾아봅니다. 이 테스트는 정확성 실패로 셉니다.": "It finished in time, but the value is wrong. Find out why it fails only for large values (float division, for example). This test counts as a correctness failure.",
    "효율성 도전 {n}": "{n} efficiency {n|test|tests}",
    "효율성 도전": "Efficiency challenge",
    "문제 설명": "Description",
    "제한 사항": "Constraints",
    "입출력 예": "Examples",
    "풀이": "Solution",
    "함수 {entry}를 완성합니다": "Complete the function {entry}",
    "예시 실행": "Run examples",
    "한 번 제출한 뒤에 열 수 있습니다": "Available after you submit once",
    "모범 코드와 해설": "Model solution and explanation",
    "예시 실행은 보이는 예시만 돌립니다. 제출하면 숨은 테스트까지 채점하고, 점수는 통과한 정확성 테스트의 비율입니다.": "Run examples tests only the visible examples. Submit also grades the hidden tests; your score is the share of correctness tests you pass.",
    "효율성은 정확성을 모두 통과한 뒤에 실행한 줄 수로 잽니다.": "Efficiency is measured by the number of lines run, after all correctness tests pass.",
    "제출은 여러 번 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다.": "You can submit many times; your score uses your code when the exam ends.",
    "시작 코드 그대로입니다. 함수를 완성한 뒤 제출합니다.": "This is still the starting code. Complete the function, then submit.",

    // 첫 화면, 과목, 장
    "파이썬 연습": "Python Practice",
    "파이썬 연습 · 이동현": "Python Practice · Donghyun Lee",
    "{title} · 파이썬 연습": "{title} · Python Practice",
    "책의 차례를 따라 푸는 연습과, 숨은 테스트로 채점하는 코딩 테스트 연습이 있습니다. 파이썬은 이 브라우저 안에서 실행되고, 푼 기록은 이 브라우저에만 남습니다.": "Practice that follows the contents of the books, plus coding test practice graded by hidden tests. Python runs in this browser, and your progress is saved only in this browser.",
    "아직 열린 영어 과목이 없습니다.": "No English courses are open yet.",
    "한국어 첫 화면으로": "Go to the Korean courses",
    "문제 {n}개": "{n} {n|problem|problems}",
    "문제 <b>{n}</b>개": "<b>{n}</b> {n|problem|problems}",
    "{n}문제": "{n} {n|problem|problems}",
    "{n}문제 · 푼 문제 {k}": "{n} {n|problem|problems} · Solved {k}",
    "푼 문제 {k} / {n}": "Solved {k} / {n}",
    "푼 문제 {k}": "Solved {k}",
    "푼 문제": "Solved",
    "틀린 문제": "Wrong",
    "안 푼 문제": "Not tried",
    "차례 보기": "View contents",
    "차례": "Contents",
    "차례로": "Back to contents",
    "준비 중": "Coming soon",
    "그래프 도구": "Plotting libraries",
    "문제를 처음 열 때 matplotlib, pandas, seaborn을 한 번 내려받습니다(약 20MB). 한 번 받으면 브라우저가 기억해 다음부터 빨리 열립니다. 그림 글자(제목, 라벨, 범례)는 영어로 씁니다.": "The first time you open a problem, your browser downloads matplotlib, pandas, and seaborn once (about 20 MB). After that, your browser remembers them, so problems open faster. Write the text in figures (titles, labels, legends) in English.",
    "무작위로 뽑거나 직접 고른 문제를 40~120분 안에, 또는 제한 없이 풉니다. 예시는 몇 번이든 실행하고, 끝날 때의 코드로 점수를 매깁니다.": "Solve randomly drawn or hand-picked problems in 40 to 120 minutes, or with no time limit. Run the examples as often as you like; your score uses your code at the end.",
    "모의 시험 시작": "Start a mock exam",
    "무작위로 뽑거나 직접 고른 문제를 제한 시간 안에, 또는 제한 없이 풉니다. 실행해 보며 풀지, 실행 없이 풀지 고릅니다.": "Solve randomly drawn or hand-picked problems within a time limit, or with no limit. Choose whether you may run code while you solve.",
    "그래프 도구를 다 받은 뒤에 시계가 돕니다.": "The clock starts after the plotting libraries finish downloading.",
    "타임어택 시작": "Start a time attack",
    "지문과 목표 그림을 먼저 보고 무엇을 그릴지 정합니다. 실행하면 내 그림이 나오니 목표 그림과 견주어 본 뒤 채점합니다. 채점은 그림에서 값과 라벨을 읽어 비교합니다.": "Read the prompt and look at the target figure first to decide what to draw. When you run your code, your figure appears, so compare it with the target figure before you check. Grading reads the values and labels from your figure and compares them.",
    "예시를 먼저 실행해 보고, 제한 사항에서 가장 작은 값과 가장 큰 값을 떠올린 뒤 제출합니다. 숨은 테스트는 입력을 보여 주지 않고 어떤 경우였는지만 알려 줍니다.": "Run the examples first. Think of the smallest and largest values in the constraints, and then submit. Hidden tests do not show their inputs; they only tell you what kind of case each one was.",
    "막히면 문제 아래 '필요한 기초'에서 {book}의 해당 절로 갑니다.": "If you get stuck, follow the 'Basics you need' links below each problem to the matching section of {book}.",
    "출력 예측과 빈칸 문제는 실행하기 전에 먼저 답을 적고, 채점한 뒤에 실행해서 대조합니다. 교재 1장의 예측, 실행, 대조 순서입니다.": "For Predict the output and Fill in the blanks problems, write your answer before you run the code, and run it after you check to compare. This is the predict, run, compare routine from Chapter 1.",
    "힌트와 모범 코드를": "hints and model solutions",
    "힌트와 해설을": "hints and explanations",
    "힌트를": "hints",
    "연습": "Practice",
    "차례에서 장과 절을 골라 풀고 바로 채점합니다.": "Pick a chapter and section from the contents, solve the problems, and check them right away.",
    "{what} 볼 수 있고, 푼 기록은 이 브라우저에 남습니다.": "You can see {what}, and your progress is saved in this browser.",
    "모든 장에 문제가 있습니다.": "Every chapter has problems.",
    "지금은 {range}에 문제가 있고, 다른 장은 차례로 채웁니다.": "Problems are available for {range} so far; the other chapters will be added over time.",
    "{range}장": "Ch. {range}",
    "최고 {n}점": "Best {n}",
    "없는 장입니다.": "This chapter does not exist.",
    "{n}장": "Chapter {n}",
    "{n}장 {title}": "Chapter {n}: {title}",
    "{n}장 목록으로": "Back to Chapter {n}",
    "교재 {a}~{b}쪽": "Book pp. {a}–{b}",
    "유형": "Type",
    "모든 유형": "All types",
    "상태": "Status",
    "모두": "All",
    "실행 없이 풀기": "Solve without running",
    "채점하기 전에는 실행 버튼을 숨깁니다": "hides the Run button until you check",
    "조건에 맞는 문제가 없습니다.": "No problems match these filters.",
    "문제를 찾을 수 없습니다.": "Problem not found.",
    "이전 문제": "Previous problem",
    "다음 문제": "Next problem",

    // 타임어택과 모의 시험: 시작 화면
    "제한 시간 안에, 또는 제한 없이 여러 문제를 풉니다. 문제마다 한 번만 제출하고, 답과 해설은 끝난 뒤에 한꺼번에 봅니다.": "Solve several problems within a time limit, or with no limit. You submit each problem only once, and you see the answers and explanations together at the end.",
    "시간을 재고 코딩 테스트처럼 풉니다. 예시 실행과 제출은 몇 번이든 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다. 힌트는 끝난 뒤 연습 화면에서 봅니다.": "Solve problems against the clock, like a coding test. You can run examples and submit as many times as you like, and your score uses your code when the exam ends. Hints are available afterward in practice mode.",
    "진행 중인 타임어택이 있습니다.": "You have a time attack in progress.",
    "진행 중인 모의 시험이 있습니다.": "You have a mock exam in progress.",
    "걸린 시간 {t}": "Time used {t}",
    "남은 시간 {t}": "Time left {t}",
    "시간이 끝났습니다": "Time is up",
    "이어서 풀기": "Continue",
    "결과 보기": "See results",
    "그만두기": "Quit",
    "문제 정하기": "Choose problems",
    "무작위로 뽑기": "Draw at random",
    "직접 고르기": "Pick your own",
    "범위": "Chapters",
    "문제 수": "Number of problems",
    "제한 시간": "Time limit",
    "실행해 보기": "Running allowed",
    "실행 없이": "No running",
    "실행해 보기를 고르면 빈칸 완성, 작성, 코드 리뷰에서 제출하기 전에 실행해 볼 수 있습니다. 출력 예측은 언제나 실행 없이 풉니다.": "With Running allowed, you can run your code before you submit in Fill in the blanks, Write code, and Code review problems. Predict the output problems are always solved without running.",
    "세트 코드": "Set code",
    "비움": "Empty",
    "비워 두면 새로 만듭니다. 같은 코드를 넣으면 같은 문제가 나옵니다.": "Leave it empty to make a new one. The same code gives the same problems.",
    "시작": "Start",
    "같은 문제로 시작하는 링크를 복사합니다": "Copies a link that starts with the same problems",
    "링크 복사": "Copy link",
    "출력 예측과 빈칸 완성은 코드를 읽는 연습이라 빨리 풀 수 있고, 작성과 코드 리뷰는 문제마다 시간이 더 걸립니다.": "Predict the output and Fill in the blanks are code-reading practice, so they go quickly. Write code and Code review take more time per problem.",
    "효율성 테스트의 시간 초과는 시험 점수에 넣지 않습니다. 큰 입력에서 값이 틀리거나 오류가 나면 정확성 실패로 셉니다.": "Efficiency timeouts do not count toward the exam score. A wrong value or an error on a large input counts as a correctness failure.",
    "풀다가 페이지를 닫거나 새로 고쳐도 이 브라우저에 남은 답과 남은 시간으로 이어서 풉니다.": "If you close or reload the page while solving, you can continue with the answers and remaining time saved in this browser.",
    "고른 {n}문제": "{n} chosen {n|problem|problems}",
    "풀 문제를 고릅니다.": "Choose problems to solve.",
    "범위를 하나 이상 고릅니다.": "Choose at least one chapter.",
    "유형을 하나 이상 고릅니다.": "Choose at least one type.",
    "고른 범위에 그 유형의 문제가 없습니다. 범위나 유형을 더 고릅니다.": "The chosen chapters have no problems of these types. Choose more chapters or types.",
    "무작위 {n}문제": "{n} random {n|problem|problems}",
    "{range}의 {types} {n}문제에서 뽑습니다.": "Drawn from {n} {n|problem|problems} in {range} ({types}).",
    "{range} {n}문제에서 뽑습니다.": "Drawn from {n} {n|problem|problems} in {range}.",
    "기본, 보통, 도전을 고루 섞어 쉬운 문제부터 놓습니다.": "Basic, Medium, and Challenge problems are mixed evenly, easiest first.",
    "그래프 도구(matplotlib, pandas, seaborn)가 준비됐습니다.": "The plotting libraries (matplotlib, pandas, seaborn) are ready.",
    "그래프 도구를 받지 못했습니다. 인터넷 연결을 확인하고 새로 고칩니다.": "Could not download the plotting libraries. Check your internet connection and reload the page.",
    "그래프 도구(matplotlib, pandas, seaborn)를 받는 중입니다. 처음에는 약 20MB라 조금 걸리고, 다 받으면 시작할 수 있습니다.": "Downloading the plotting libraries (matplotlib, pandas, seaborn). The first download is about 20 MB and takes a little while. You can start when it finishes.",
    "링크를 복사했습니다. 이 링크로 시작하면 같은 문제가 나옵니다.": "Link copied. Starting from this link gives the same problems.",
    "이 내용을 복사하세요": "Copy this text",
    "진행 중인 타임어택을 그만둘까요? 기록에 남지 않습니다.": "Quit the time attack in progress? It will not be saved.",
    "진행 중인 모의 시험을 그만둘까요? 기록에 남지 않습니다.": "Quit the mock exam in progress? It will not be saved.",
    "진행 중인 타임어택을 그만두고 새로 시작할까요? 그 타임어택은 기록에 남지 않습니다.": "Quit the time attack in progress and start a new one? The current one will not be saved.",
    "진행 중인 모의 시험을 그만두고 새로 시작할까요? 그 모의 시험은 기록에 남지 않습니다.": "Quit the mock exam in progress and start a new one? The current one will not be saved.",

    // 문제 고르기
    "{n}장 문제 모두 고르기": "Select all problems in Chapter {n}",
    "고른 문제 {n}개": "Selected: {n}",
    "최대 {n}개": "(max {n})",
    "비우기": "Clear",
    "장을 펼쳐 문제를 고릅니다. 장 번호 앞의 칸을 누르면 그 장의 문제를 모두 고릅니다.": "Open a chapter to choose problems. Check the box before a chapter number to select all of its problems.",
    "문제 찾기: 제목이나 지문의 낱말": "Find problems: words from the title or prompt",
    "문제 찾기": "Find problems",
    "유형으로 거르기": "Filter by type",
    "찾는 문제가 없습니다. 낱말을 줄이거나 바꿔 봅니다.": "No problems found. Try fewer or different words.",
    "{n}문제 찾음": "{n} {n|problem|problems} found",
    "{k} / {n} 고름": "{k} / {n} selected",
    "빼기": "Remove",
    "{n}번 {title} 빼기": "Remove {n}. {title}",
    "틀린 문제 담기 {n}": "Add wrong problems ({n})",
    "{n}문제까지 고를 수 있습니다": "You can choose up to {n} problems",

    // 타임어택과 모의 시험: 진행과 결과
    "채점하는 중": "Grading",
    "끝낸 회차의 결과를 정리하고 있습니다. 잠시 뒤 결과 화면으로 넘어갑니다.": "Wrapping up the results of this round. The results screen will open in a moment.",
    "직접 고른 문제": "Hand-picked problems",
    "세트 {code}": "Set {code}",
    "타임어택 진행 중 · 파이썬 연습": "Time attack in progress · Python Practice",
    "남은 시간": "Time left",
    "걸린 시간": "Time used",
    "맞힌 문제 {n}": "Correct {n}",
    "그만하기": "Finish",
    "맞았습니다": "Correct",
    "틀렸습니다": "Wrong",
    "실행이 너무 오래 걸렸습니다.": "It ran too long.",
    "답과 해설은 끝난 뒤에 봅니다.": "You will see the answer and explanation at the end.",
    "여기서 끝낼까요? 지금까지 낸 답으로 결과를 봅니다.": "Finish now? Your results will use the answers you have submitted so far.",
    "타임어택 결과 · 파이썬 연습": "Time attack results · Python Practice",
    "타임어택 결과": "Time attack results",
    "못 푼 문제만 다시 ({n})": "Retry missed problems ({n})",
    "같은 문제 다시": "Same problems again",
    "새 세트": "New set",
    "문제별 답과 해설": "Answers and explanations",
    "안 냄": "Not submitted",
    "맞음": "Correct",
    "틀림 · 시간 초과": "Wrong · timed out",
    "틀림": "Wrong",
    "연습에서 다시 풀기": "Try again in practice",
    "제한 {m}분": "Limit {m} min",
    "세트 코드 {code}": "Set code {code}",
    "틀린 까닭": "Why it was wrong",
    "오류: {name}": "Error: {name}",
    "이름 고르지 않음": "no name chosen",
    "빈칸 {n}: {v}": "Blank {n}: {v}",
    "(비움)": "(empty)",
    "내 답": "Your answer",
    "모의 시험 진행 중 · 파이썬 연습": "Mock exam in progress · Python Practice",
    "문제": "Problems",
    "시험 끝내기": "End exam",
    "고침": "edited",
    "쓰는 중": "Editing",
    "시험을 끝낼까요? 문제마다 지금 코드로 점수를 매깁니다.": "End the exam? Each problem will be scored with its current code.",
    "문제마다 마지막 코드로 점수를 매깁니다.": "Scoring each problem with its last code.",
    "{n}번 문제의 마지막 코드를 채점합니다.": "Grading the last code for problem {n}.",
    "직접 고름 {ids}": "Picked {ids}",
    "코딩 테스트 모의 시험": "Coding test mock exam",
    "{i}번 {n}점": "Q{i} {n}",
    "합계 {sum}/{max}": "Total {sum}/{max}",
    "모의 시험 결과 · 파이썬 연습": "Mock exam results · Python Practice",
    "모의 시험 결과": "Mock exam results",
    "결과 줄": "Result line",
    "수업에서 결과를 낼 때 이 줄을 복사해 붙입니다. 이름이나 코드는 들어 있지 않습니다.": "To hand in your result in class, copy and paste this line. It does not include your name or your code.",
    "결과 줄 복사": "Copy result line",
    "문제별 점수와 모범 코드": "Scores and model solutions",
    "문제별 점수": "Scores by problem",
    "채점하지 못함": "Could not grade",
    "정확성 {k}/{n}": "Correctness {k}/{n}",
    "내 코드": "Your code",
    "마지막으로 낸 뒤에 고친 코드여서, 끝날 때 다시 채점했습니다.": "You changed this code after your last submission, so it was graded again when the exam ended.",
    "결과 줄을 복사했습니다": "Result line copied",

    // 내 기록
    "내 기록": "My progress",
    "기록은 이 브라우저에만 있습니다. 다른 컴퓨터에서 이어 하려면 기록 파일을 내보낸 뒤 그 컴퓨터에서 가져옵니다. 브라우저의 사이트 데이터를 지우면 기록도 지워집니다.": "Your progress is saved only in this browser. To continue on another computer, export a progress file and import it on that computer. If you clear this site's data in your browser, your progress is deleted too.",
    "날짜": "Date",
    "세트": "Set",
    "점수": "Score",
    "시간": "Time",
    "직접 고름": "Picked",
    "아직 기록이 없습니다.": "No records yet.",
    "{n}장 {k}/{m}": "Ch. {n}: {k}/{m}",
    "아직 못 푼 문제: {list}": "Not solved yet: {list}",
    "기록 파일": "Progress file",
    "기록 내보내기": "Export progress",
    "기록 가져오기": "Import progress",
    "이 브라우저의 기록 지우기": "Clear progress in this browser",
    "가져온 기록으로 바꿀까요? 이 브라우저의 지금 기록은 지워집니다.": "Replace your progress with the imported file? Your current progress in this browser will be deleted.",
    "기록을 가져왔습니다": "Progress imported",
    "기록 파일을 읽지 못했습니다. 이 사이트에서 내보낸 파일인지 확인해 주세요.": "Could not read the progress file. Make sure it was exported from this site.",
    "이 브라우저의 풀이 기록을 모두 지울까요? 되돌릴 수 없습니다.": "Delete all progress in this browser? This cannot be undone.",
    "기록을 지웠습니다": "Progress deleted",

    // 이용 안내와 저작권(web/LICENSE.txt의 영어 부분과 같은 뜻)
    "이용 안내와 저작권": "Terms and copyright",
    "이 사이트의 문제와 코드를 어디까지 쓸 수 있는지, 사이트가 쓰는 오픈소스는 무엇인지 적었습니다.": "What you may do with the problems and code on this site, and which open-source software the site uses.",
    "저작권": "Copyright",
    "이 사이트의 문제(지문, 시작 코드, 정답 코드, 힌트, 해설), 목표 그림, 화면 문구와 프로그램 코드(채점기 포함)의 저작권은 이동현에게 있습니다. © 2026 이동현. 모든 권리는 저작권자에게 있습니다.": "The problems on this site (prompts, starter code, solutions, hints, explanations), target figures, interface text, and program code (including the grader) are protected by copyright and belong to Donghyun Lee. © 2026 Donghyun Lee. All rights reserved.",
    "자유롭게 할 수 있는 것": "What you may do freely",
    "혼자 공부하며 문제를 풀고, 내가 쓴 답과 풀이 기록을 내 기기에 두는 것": "Solve the problems for personal study, and keep your answers and progress on your own device",
    "수업이나 스터디에서 이 사이트와 문제의 주소(링크)를 나누는 것": "Share links to this site and its problems in classes and study groups",
    "문제 하나를 화면 캡처나 짧은 인용으로 소개하는 것. 이때 출처로 '파이썬 연습(donghyunlee.kr/practice)'을 밝힙니다.": "Show a single problem in a screenshot or a short quote, with attribution to 'Python Practice (donghyunlee.kr/practice)'",
    "허락을 받아야 하는 것": "What requires permission",
    "문제, 해설, 그림을 모아 복제하거나 다른 사이트, 문제은행, 교재, 시험지에 옮겨 싣는 것": "Copying problems, explanations, or figures in bulk, or republishing them on other sites or in problem banks, textbooks, or exams",
    "이 사이트의 문제나 코드로 돈을 받는 강의, 책, 앱, 서비스를 만드는 것": "Using the problems or code of this site in paid courses, books, apps, or services",
    "이 사이트의 코드(채점기 포함)를 가져다 다른 사이트나 프로그램을 만드는 것": "Reusing the code of this site (including the grader) to build other sites or programs",
    "문제와 해설을 인공지능 학습용 데이터로 모으거나 쓰는 것": "Collecting or using the problems and explanations as training data for artificial intelligence",
    "허락이 필요하면 {link}에 적힌 연락처로 문의합니다.": "To ask for permission, use the contact information on {link}.",
    "책과의 관계": "Relationship to the books",
    "기본기 과목과 시각화 과목은 AI ERA SERIES의 『AI 시대의 파이썬 기본기』, 『AI 시대의 파이썬 데이터 시각화』 차례에 맞춰 따로 쓴 연습 문제입니다. 책의 본문, 예제, 연습문제는 옮기지 않았습니다.": "The Python Basics and Python Data Visualization courses are original practice problems written to follow the tables of contents of two Korean-language books in the AI ERA SERIES: Python Fundamentals in the Age of AI and Python Data Visualization in the Age of AI. No text, examples, or exercises from the books are copied here.",
    "오픈소스 고지": "Open-source notices",
    "이 사이트는 아래 오픈소스를 각 라이선스에 따라 씁니다. 각 소프트웨어의 저작권은 그 저작자에게 있습니다.": "This site uses the open-source software below under each one's license. The copyright of each belongs to its authors.",
    "Pyodide 0.27.8(브라우저 안의 파이썬, micropip 포함): Mozilla Public License 2.0. jsDelivr에서 받아 씁니다.": "Pyodide 0.27.8 (Python in the browser, including micropip): Mozilla Public License 2.0. Loaded from jsDelivr.",
    "matplotlib: Matplotlib License(PSF 기반)": "matplotlib: Matplotlib License (PSF-based)",
    "seaborn 0.13.2: BSD 3-Clause License, Copyright (c) 2012-2023, Michael L. Waskom. 휠 파일을 바꾸지 않고 사이트에 두며, 라이선스 전문은 휠 안의 LICENSE.md에 있습니다.": "seaborn 0.13.2: BSD 3-Clause License, Copyright (c) 2012-2023, Michael L. Waskom. The wheel file is hosted on this site unmodified, and the full license text is in LICENSE.md inside the wheel.",
    "Pretendard 글꼴: SIL Open Font License 1.1. jsDelivr에서 받아 씁니다.": "Pretendard font: SIL Open Font License 1.1. Loaded from jsDelivr.",
    "그 밖에 Pyodide가 함께 불러오는 패키지(pyparsing, cycler, kiwisolver 등)는 각자의 라이선스를 따릅니다.": "Other packages that Pyodide loads with these (pyparsing, cycler, kiwisolver, and others) follow their own licenses.",

    // 위쪽 막대와 아래쪽 고지, 길 찾기
    "본문으로 건너뛰기": "Skip to main content",
    "주 메뉴": "Main menu",
    "도서": "Books",
    "홈페이지": "Home",
    "불러오는 중입니다.": "Loading...",
    "파이썬은 이 브라우저 안에서 실행됩니다. 작성한 코드와 풀이 기록은 이 브라우저에만 저장되고 서버로 보내지 않습니다.": "Python runs inside this browser. Your code and progress are saved only in this browser and are not sent to any server.",
    "이 사이트는 방문 통계를 위해 Google Analytics를 사용합니다. 수집 항목, 보유 기간, 거부 방법은 {privacy}에 있습니다.": "This site uses Google Analytics for visit statistics. The {privacy} explains what is collected, how long it is kept, and how to opt out.",
    "개인정보 처리방침": "Privacy policy",
    "문제, 해설, 그림과 사이트 코드의 저작권은 이동현에게 있습니다. 혼자 공부하거나 수업에서 링크로 나누는 것은 자유이고, 복제, 재배포, 판매는 허락을 받아야 합니다.": "The problems, explanations, figures, and site code are copyrighted by Donghyun Lee. You are free to study with them on your own and to share links in classes. Copying, redistributing, or selling them requires permission.",
    "© 2026 이동현": "© 2026 Donghyun Lee",
    "없는 페이지입니다.": "Page not found.",
    "처음으로": "Go to the start page",
    "페이지를 불러오지 못했습니다. 새로 고침해 보세요.": "Could not load the page. Try reloading it.",
  };

  Store.load();
  Py.setState("idle");
  $("#py-status").addEventListener("click", () => { if (Py.state === "error") Py.start().catch(() => {}); });
  if ($("#lang-switch")) $("#lang-switch").addEventListener("click", onLangSwitchClick);
  window.addEventListener("hashchange", render);
  // 페이지를 닫거나 새로 고칠 때 진행 중인 타임어택과 모의 시험을 바로 저장한다
  window.addEventListener("pagehide", () => {
    if (pendingDraft) pendingDraft();
    if (TA && !TA.done) saveRun("ta");
    if (EXAM && !EXAM.done) saveRun("exam");
  });
  // 다른 탭에서 기록을 바꾸면 이 탭의 기록도 새로 읽는다(화면은 다음에 그릴 때 반영된다)
  window.addEventListener("storage", (e) => { if (e.key === STORE_KEY) Store.load(); });
  render();
})();
