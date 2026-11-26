/* 파이썬 연습 (donghyunlee.kr/practice). © 2026 이동현. 이용 조건은 LICENSE.txt와 화면의 '이용 안내와 저작권'(#/terms)
   로그인 없는 정적 페이지다. 파이썬은 브라우저 안(worker.js의 Pyodide)에서 실행하고,
   풀이 기록은 이 브라우저의 localStorage에만 둔다. 학생 코드는 어디로도 보내지 않는다. */
(() => {
  "use strict";

  const VERSION = "20261126b";
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
    RecursionError: "함수가 자기 자신을 너무 깊이 불렀습니다. 끝나는 조건이 없거나, 재귀가 1,000겹 가까이 깊어졌습니다.",
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
    RecursionError: "The function called itself too deeply. Either the recursion never stops, or it went close to 1,000 levels deep.",
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
    ko: { home: "https://donghyunlee.kr/", books: "https://donghyunlee.kr/books/", privacy: "https://donghyunlee.kr/privacy/", about: "https://donghyunlee.kr/about/",
          posts: "https://donghyunlee.kr/posts/", hpai: "https://hpai.kr/",
          essayQuiet: "https://donghyunlee.kr/posts/2026-08-25-ai-code-quiet-errors/",
          essayTimed: "https://donghyunlee.kr/posts/2026-11-14-python-practice-timed-test/" },
    en: { home: "https://donghyunlee.kr/en/", books: "https://donghyunlee.kr/en/books/", privacy: "https://donghyunlee.kr/en/privacy/", about: "https://donghyunlee.kr/en/about/",
          posts: "https://donghyunlee.kr/en/posts/", hpai: "https://hpai.kr/?lang=en",
          essayQuiet: "https://donghyunlee.kr/en/posts/2026-08-25-ai-code-quiet-errors/",
          essayTimed: "https://donghyunlee.kr/en/posts/2026-11-14-python-practice-timed-test/" },
  };
  const siteUrl = (k) => URLS[LANG][k];
  const homeHref = () => (LANG === "en" ? "#/en" : "#/");
  const meHref = () => (LANG === "en" ? "#/en/me" : "#/me");
  const termsHref = () => (LANG === "en" ? "#/en/terms" : "#/terms");
  const onLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

  // 수업 배포 링크(?src=class)와 외부 자연 유입을 분리 계측한다(개인정보 없이 세션 구분만 보관, 2026-11-21)
  const SRC_KEY = "dhl-traffic-src";
  (() => {
    try {
      const sp = new URLSearchParams(location.search);
      const hp = location.hash.includes("?") ? new URLSearchParams(location.hash.slice(location.hash.indexOf("?") + 1)) : null;
      const src = sp.get("src") || (hp && hp.get("src"));
      if (src === "class") sessionStorage.setItem(SRC_KEY, "class");
    } catch (e) { /* 사생활 보호 창 등에서는 이번 요청만 본다 */ }
  })();
  const trafficCohort = () => {
    try { return sessionStorage.getItem(SRC_KEY) === "class" ? "class" : "organic"; } catch (e) { return "organic"; }
  };

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

  // 움직임 줄이기 설정이면 부드러운 스크롤을 끈다(2026-10-21 UI 검토)
  const motion = () => (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  // 채점 결과처럼 단추 아래에 새로 생긴 것이 화면 밖이면 머리가 보이게 스크롤한다(휴대폰에서 결과를 못 보던 문제)
  function reveal(el) {
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight - 96 || r.bottom < 0) el.scrollIntoView({ block: "start", behavior: motion() });
  }

  function toast(msg) {
    $$(".toast", document.body).forEach((t) => t.remove());
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.textContent = msg;
    document.body.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  // 기록을 저장하지 못했을 때 한 번 띄우는 알림(닫을 때까지 남는다)
  function storeWarn() {
    if (document.querySelector(".store-warn")) return;
    const el = document.createElement("div");
    el.className = "store-warn";
    el.setAttribute("role", "alert");
    el.innerHTML = `<p>${T("기록을 저장하지 못했습니다. 창을 닫기 전에 {me}에서 기록 파일을 내보내 두세요.", { me: `<a href="${meHref()}">${T("내 기록")}</a>` })}</p>` +
      `<button type="button" class="btn small">${T("닫기")}</button>`;
    el.querySelector("button").addEventListener("click", () => el.remove());
    document.body.append(el);
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
  // 옛 모의고사 아이디를 새 아이디로 옮긴다(2026-10-24 사용자 결정 "바꿔줘"). 세트의 짝은 아래 OLD_IDS 표이고, 문제는 번호를 그대로 둔다.
  // 이 브라우저의 옛 기록과 옛 주소를 새 아이디로 옮긴다. 빌드 검사가 OLD_IDS 표시가 붙은 줄 밖에 옛 아이디가 남았는지 본다.
  const OLD_IDS = { pcce1: "mock1", pccp1: "mock2" };  // OLD_IDS
  const OLD_ID_RE = /\b(pcce1|pccp1)\b/g;  // OLD_IDS
  const ID_VERSION = 2;  // 기록의 아이디 판. 2부터 새 아이디다
  const newIds = (s) => (typeof s === "string" ? s.replace(OLD_ID_RE, (m) => OLD_IDS[m]) : s);
  // 키 이름을 바꾸고, 두 키가 겹치면 merge로 합친다(문제 기록은 새 쪽을 앞세워 합치고, 처음 치른 때는 이른 쪽)
  function renameKeys(o, merge) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return o;
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      const nk = newIds(k);
      r[nk] = nk in r ? merge(r[nk], v, k !== nk) : v;
    }
    return r;
  }
  const mergeRec = (a, b, bIsOld) => (bIsOld ? { ...b, ...a } : { ...a, ...b });
  // 시험·타임어택 기록과 진행 중인 판 하나를 옮긴다. 세트를 옮긴 기록은 저장된 옛 세트 이름(title)을 지워 지금 이름으로 보이게 한다.
  function migrateRun(x) {
    if (!x || typeof x !== "object") return x;
    const y = { ...x };
    if (typeof y.set === "string" && newIds(y.set) !== y.set) { y.set = newIds(y.set); delete y.title; }
    if (typeof y.q === "string") y.q = newIds(y.q);
    for (const k of ["ids", "p"]) if (Array.isArray(y[k])) y[k] = y[k].map(newIds);
    for (const k of ["codes", "subs", "drafts"]) if (y[k]) y[k] = renameKeys(y[k], mergeRec);
    for (const k of ["items", "res"]) if (Array.isArray(y[k])) y[k] = y[k].map((it) => (it && typeof it === "object" && "id" in it ? { ...it, id: newIds(it.id) } : it));
    if (y.o) y.o = migrateRun(y.o);
    return y;
  }
  function migrateIds(d) {
    if (!d || !d.courses || d.idv >= ID_VERSION) return d;
    for (const [cid, c] of Object.entries(d.courses)) {
      if (!c || typeof c !== "object") continue;
      const n = { ...c };
      n.p = renameKeys(c.p, mergeRec);
      if (c.sets) n.sets = renameKeys(c.sets, (a, b) => Math.min(a, b));
      for (const k of ["exam", "ta"]) if (Array.isArray(c[k])) n[k] = c[k].map(migrateRun);
      d.courses[cid] = n;
    }
    for (const k of ["examLive", "taLive"]) if (d[k]) d[k] = migrateRun(d[k]);
    d.idv = ID_VERSION;
    return d;
  }
  const STORE_KEY = "dhl-practice-v1";
  const Store = {
    data: { v: 1, idv: ID_VERSION, courses: {}, set: {} },
    load() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        const d = raw ? JSON.parse(raw) : null;
        if (d && d.v === 1 && d.courses) {
          const moved = !(d.idv >= ID_VERSION);
          this.data = migrateIds({ set: {}, ...d });
          if (moved && !this.saveFailed) this.save();  // 아이디를 옮긴 기록은 바로 저장해 둔다(한 번만, 2026-10-24)
        }
      } catch (e) { /* 저장소를 못 쓰면 이번 방문 동안만 기억한다 */ }
    },
    // 저장에 실패하면(저장 공간이 참, 사생활 보호 창) 한 번 알리고, 그 뒤에는 저장된 옛 기록을 다시 읽지 않는다.
    // 다시 읽으면 이번 방문에서 바뀐 기록이 옛 기록에 덮인다(2026-10-21 UI 검토)
    saveFailed: false,
    save() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
        this.saveFailed = false;
        return true;
      } catch (e) {
        if (!this.saveFailed) storeWarn();
        this.saveFailed = true;
        return false;
      }
    },
    // 바꿀 때마다 저장된 기록을 다시 읽고 그 위에 고쳐 저장한다. 탭 두 개를 열어 두어도 한쪽이 다른 쪽의 기록을 지우지 않는다.
    update(fn) {
      if (!this.saveFailed) this.load();
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
    record(cid, pid, ok, meta = null) {
      this.update(() => {
        const c = this.course(cid);
        const r = c.p[pid] || {};
        const nextTries = (r.n || 0) + 1;
        const next = { ...r, s: ok || r.s === 2 ? 2 : 1, n: nextTries, at: Date.now(), last: ok ? 1 : 0 };
        if (ok) {
          const curYm = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
          const cleanSec = Math.max(1, Math.min(3600, Math.round((meta && meta.sec) || 10)));
          const openedSol = Boolean((meta && meta.openedSol) || r.rev);
          if (r.s !== 2) {
            next.clean = openedSol ? 0 : 1;
            if (!openedSol) {
              next.ft = nextTries;
              next.fsec = cleanSec;
              next.mYm = curYm;
              next.mft = nextTries;
              next.msec = cleanSec;
            }
          } else if (!openedSol && (r.clean === 1 || (r.clean === undefined && !r.rev))) {
            next.clean = 1;
            const sessTries = Math.max(1, Math.round((meta && meta.tries) || 1));
            if (r.mYm !== curYm || cleanSec < (r.msec || 99999)) {
              next.mYm = curYm;
              next.mft = sessTries;
              next.msec = cleanSec;
            }
          }
        }
        c.p[pid] = next;
      });
    },
    // 오늘의 문제(2026-10-21): 그날 문제를 통과한 날만 { id, at }으로 남긴다. 연속 기록은 두지 않는다
    dailyDone(cid, date) { return !!(this.course(cid).daily || {})[date]; },
    markDaily(cid, date, pid) {
      this.update(() => {
        const c = this.course(cid);
        c.daily = c.daily || {};
        if (!c.daily[date]) c.daily[date] = { id: pid, at: Date.now() };
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
        error: T("파이썬 다시 받기"),
      }[state];
      el.innerHTML = `<span class="long">${esc(label)}</span>`;
      el.setAttribute("aria-label", label);
      if (state === "error") {
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
      } else {
        el.removeAttribute("role");
        el.removeAttribute("tabindex");
      }
      el.hidden = state === "idle";  // '파이썬 대기'는 뜻이 흐려 아무것도 받지 않을 때는 감춘다(2026-10-21 UI 검토)
      el.title = state === "error" ? T("눌러서 다시 불러옵니다") :
        state === "ready" ? T("파이썬 {python} 준비됨 (Pyodide {pyodide})", { pyodide: this.info.pyodide, python: this.info.python }) :
          T("처음 한 번 실행 환경을 준비합니다");
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
      // 실행기 쪽(/practice/python/)은 <base>로 /practice/를 가리키므로 쪽 주소(location)가 아니라 기준 주소로 만든다(2026-11-16)
      const harnessUrl = new URL(`assets/harness.py?v=${VERSION}`, document.baseURI).href;
      this.booting = new Promise((resolve, reject) => {
        this.send({ op: "boot", payload: { harnessUrl }, ms: 120000, resolve, reject });
      }).then((info) => {
        this.info = info;
        this.setState("ready");
        this.pump();
        return info;
      }, (err) => {
        if (!err.stopped) this.fail(err);  // 실행기의 '멈추기'로 끈 것은 불러오기 실패가 아니다
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
    stop() {  // 실행기의 '멈추기'(2026-11-16): 지금 요청과 기다리는 요청을 모두 '멈춤'으로 돌리고 Worker를 끈다(다음 실행 때 새로 띄운다)
      const err = new Error("stopped");
      err.stopped = true;
      const jobs = (this.current ? [this.current] : []).concat(this.queue.splice(0));
      this.current = null;
      if (this.worker) this.worker.terminate();
      this.worker = null;
      this.booting = null;
      jobs.forEach((job) => { clearTimeout(job.timer); job.reject(err); });
      this.setState("idle");
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

  // 코드 칸 아래 키보드 안내 및 터치 기기 기호 막대(2026-11-21)
  let editorSeq = 0;
  const touchOnly = () => !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches);
  const SYMBAR_KEYS = [
    ["Tab", "    "], ["⇧Tab", "dedent"], ["(", "("], [")", ")"], ["[", "["], ["]", "]"],
    [":", ":"], ['"', '"'], ["'", "'"], ["=", "="], ["_", "_"], ["#", "#"],
  ];
  const editorHelpHtml = (id) =>
    `<p class="tiny muted editor-help" id="${id}">${T("Tab은 들여쓰기입니다. 칸을 나가려면 Esc를 누른 뒤 Tab을 누릅니다.")}</p>` +
    `<div class="code-symbar" role="toolbar" aria-label="${T("코드 기호 입력")}">` +
    SYMBAR_KEYS.map(([lbl, act]) => `<button type="button" tabindex="-1" data-sym="${esc(act)}">${esc(lbl)}</button>`).join("") +
    `</div>`;

  function makeEditor(wrapper, { value, onChange, onSubmit, minRows = 6 }) {
    const ta = $("textarea", wrapper);
    const gutter = $(".gutter", wrapper);
    const symbar = wrapper.parentElement ? wrapper.parentElement.querySelector(".code-symbar") : null;
    if (symbar && !symbar._wired) {
      symbar._wired = true;
      symbar.addEventListener("mousedown", (e) => e.preventDefault());
      symbar.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-sym]");
        if (!b) return;
        const sym = b.dataset.sym;
        if (sym === "dedent") {
          const { start, end, lines } = selectLines(ta);
          const changed = lines.map((l) => l.replace(/^ {1,4}/, "")).join("\n");
          ta.setSelectionRange(start, end);
          insertText(ta, changed);
        } else {
          insertText(ta, sym);
        }
        ta.focus({ preventScroll: true });
      });
    }
    ta.value = value;
    const sync = () => {
      const n = ta.value.split("\n").length;
      gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
      ta.rows = Math.max(n + 1, minRows);
    };
    ta.addEventListener("input", () => { sync(); if (onChange) onChange(ta.value); });
    // Tab은 들여쓰기다. Esc를 누른 뒤의 Tab·Shift+Tab만 초점을 옮겨 키보드로 칸을 나갈 수 있게 한다(WCAG 2.1.2, 2026-10-21 UI 검토)
    let leaving = false;
    ta.addEventListener("blur", () => { leaving = false; });
    ta.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Escape") { leaving = true; return; }
      if (e.key === "Tab" && leaving) { leaving = false; return; }
      if (e.key !== "Shift") leaving = false;
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
        // 모의고사 세트 문제(set 칸, 2026-10-20 책 세션 P3)는 장 목록, 진도, 무작위 뽑기와 직접 고르기에 넣지 않는다.
        // 세트를 한 번 치르면 차례의 '모의고사'와 문제 화면에서 다시 푼다
        const all = c.problems.map((p) => c.byId[p.id]);
        c.problems = all.filter((p) => !p.set);
        c.setProblems = all.filter((p) => p.set);
        c.sets = (c.exam_sets || []).map((x) => ({ ...x, items: x.problems.map((id) => c.byId[id]).filter(Boolean) }));
        c.setById = Object.fromEntries(c.sets.map((x) => [x.id, x]));
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
  const predictText = (text) => norm(String(text || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"'));  // 휴대폰의 스마트 따옴표
  function gradePredict(p, text, errOn, errType) {
    const want = p.expect;
    const got = predictText(text);
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

  function testHtml(t, targetProb = null) {
    const mark = t.ok ? "✓" : "✗";
    const opt = t.optional ? `<span class="opt">${T("도전 · 통과 여부에 넣지 않음")}</span>` : "";
    const label = testLabel(t);
    let body = "";
    if (!t.ok) {
      if (t.plot || t.plotly || t.app) {  // 그래프 문제: 목표 그림과 내 그림을 나란히 두고, 다른 점을 바로 아래에 보인다(2026-11-21)
        if (t.note) body += `<p class="small">${inl(t.note)}</p>`;
        if (t.app && t.widgets && Object.keys(t.widgets).length) {
          const kinds = Object.fromEntries(((t.app_view || {}).elements || []).filter((e) => e.t === "widget").map((e) => [e.label, e.kind]));
          body += `<p class="tiny muted">${T("이 테스트의 위젯 값: {values}", { values: esc(widgetText(t.widgets, kinds)) })}</p>`;
        }
        if (t.error) body += errorHtml(t.error);
        const canCompare = targetProb && targetProb.figure && !targetProb.app && !isReport(targetProb) && !t.setup;
        if (t.image) {
          const mine = figureHtml(t.image, T("이 테스트에서 그린 내 그림"));
          body += canCompare ? `<div class="fig-compare">${targetHtml(targetProb, T("목표 그림"))}${mine}</div>` : mine;
        }
        if (t.report_view) body += appHtml(t.report_view, T("이 테스트에서 만든 내 리포트"));
        else if (t.fig) {
          const mine = plotlyHtml(t.fig, T("이 테스트에서 그린 내 그림"));
          body += canCompare ? `<div class="fig-compare">${targetHtml(targetProb, T("목표 그림"))}${mine}</div>` : mine;
        }
        if (t.app_view) body += appHtml(t.app_view, T("이 테스트의 내 앱 화면"));
        if (t.diffs && t.diffs.length) body += `<ul class="diffs">${t.diffs.map((d) => `<li>${inl(d)}</li>`).join("")}</ul>`;
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

  function gradeHtml(r, targetProb = null) {
    if (r.blocked) {
      return { cls: "bad", html: `<h3>✗ ${T("아직 아닙니다")}</h3><p>${inl(r.blocked)}</p>${errorHtml(r.error)}` };
    }
    const req = r.tests.filter((t) => !t.optional);
    const passed = req.filter((t) => t.ok).length;
    const head = r.ok ? `<h3>✓ ${T("정답입니다")}</h3>` : `<h3>✗ ${T("아직 아닙니다")}</h3>`;
    let html = `${head}<p class="small">${T("확인 {n}개 중 {k}개 통과", { n: req.length, k: passed })}` +
      (r.changed !== undefined ? ` · ${T("바꾼 줄 {n}줄", { n: r.changed })}` : "") + `</p>`;
    html += `<ul class="tests">${r.tests.map((t) => testHtml(t, targetProb)).join("")}</ul>`;
    if (r.notes && r.notes.length) html += r.notes.map((n) => `<p class="small">${inl(n)}</p>`).join("");
    return { cls: r.ok ? "ok" : "bad", html };
  }

  function consoleHtml(r, title = T("실행 결과"), targetProb = null) {
    const text = r.screen || r.stdout || "";
    const v = r.var;  // 답을 담는 변수가 있는 문제: 실행이 끝났을 때의 값
    const varHtml = !v ? "" : v.missing ? `<p class="small muted" style="margin-top:6px">${T("아직 {name}에 값을 담지 않았습니다.", { name: `<code>${esc(v.missing)}</code>` })}</p>` :
      `<p class="small" style="margin-top:6px">${T("실행이 끝났을 때 {vars}", { vars: v.names.map((n, i) => `<code>${esc(n)} = ${esc(v.values[i])}</code>`).join(", ") })}</p>`;
    const canCompare = targetProb && targetProb.figure && !targetProb.app && !isReport(targetProb);
    const wrapCompare = (mine) => (canCompare ? `<div class="fig-compare">${targetHtml(targetProb, T("목표 그림"))}${mine}</div>` : mine);
    const img = !("image" in r) ? "" : r.image ? wrapCompare(figureHtml(r.image, T("내 그림"))) : `<p class="small muted" style="margin-top:6px">${T("(그린 그림 없음)")}</p>`;
    const pfig = r.report_view ? appHtml(r.report_view, T("내 리포트")) : !("fig" in r) ? "" : r.fig ? wrapCompare(plotlyHtml(r.fig, T("내 그림"))) :
      `<p class="small muted" style="margin-top:6px">${T("(그린 그림 없음)")}</p>`;
    const app = r.app_view ? appHtml(r.app_view, T("내 앱 화면 · 위젯은 처음 값")) : "";
    return `<span class="label">${esc(title)}</span><pre class="out">${esc(text) || `<span class="muted">${T("(출력 없음)")}</span>`}</pre>${errorHtml(r.error)}${varHtml}${img}${pfig}${app}`;
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
    saved: "saved file (name and size)", saved_names: "saved file names", wedges: "pie wedges (labels and shares)", boxes: "box plot (quartiles, whiskers, number of outliers)",
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

  // ------------------------------------------------------------------ Plotly 그림과 Streamlit 앱 화면(시각화 과목 9·11장, 2026-11-02)
  // 채점기는 Plotly 그림을 Figure JSON으로, 앱은 화면에 놓인 것의 목록으로 돌려준다. HTML에는 자리표만 두고, 화면에 붙으면 그린다.
  // plotly.js는 Plotly 휠 안에 든 것을 바꾸지 않고 사이트에 둔다(외부 서비스를 새로 쓰지 않게, LICENSE.txt).
  const PLOTLY_JS = "assets/vendor/plotly-3.5.0.min.js";
  let plotlyJob = null;
  const loadPlotly = () => plotlyJob || (plotlyJob = new Promise((ok, fail) => {
    const tag = document.createElement("script");
    tag.src = `${PLOTLY_JS}?v=${VERSION}`;
    tag.onload = () => ok(window.Plotly);
    tag.onerror = () => { plotlyJob = null; fail(new Error("plotly.js")); };
    document.head.appendChild(tag);
  }));
  const viewStore = new Map();
  let viewSeq = 0;
  const stash = (src) => { viewSeq += 1; viewStore.set(`v${viewSeq}`, src); return `v${viewSeq}`; };
  const loadView = async (src) => (typeof src === "string" && src.startsWith("data/") ?
    (await fetch(`${src}?v=${VERSION}`)).json() : typeof src === "string" ? JSON.parse(src) : src);
  const plotlyHtml = (src, caption, cls = "my-fig") =>
    `<figure class="${cls}"><div class="pplot" data-pfig="${stash(src)}"></div>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`;
  const appHtml = (src, caption, cls = "my-fig") =>
    `<figure class="${cls}"><div class="appview" data-app="${stash(src)}"></div>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`;
  // 목표 그림: matplotlib 문제는 PNG, Plotly 문제는 Figure JSON, 앱 문제와 HTML 리포트 문제(10장)는 화면 목록(JSON)
  const isReport = (p) => !!p.plotly && p.plotly.some((k) => k === "report" || k === "report_text");
  const targetHtml = (p, caption, cls = "target-fig") => (!p.figure ? "" : !p.figure.endsWith(".json") ? figureHtml(p.figure, caption, cls) :
    p.app || isReport(p) ? appHtml(p.figure, caption, cls) : plotlyHtml(p.figure, caption, cls));
  // 그래프 도구: 과목이 불러오는 패키지와 문제가 더 받는 패키지(Plotly)
  const needPackages = (c, p) => {
    const all = [...new Set([...(c.packages || []), ...((p && p.packages) || [])])];
    return all.length ? all : null;
  };

  async function drawPlotly(el) {
    const src = viewStore.get(el.dataset.pfig);
    el.removeAttribute("data-pfig");
    try {
      const fig = await loadView(src);
      const Plotly = await loadPlotly();
      const layout = { ...(fig.layout || {}), autosize: true };
      layout.height = layout.height || 330;
      await Plotly.newPlot(el, fig.data || [], layout, { displaylogo: false, responsive: true });
    } catch (err) {
      el.innerHTML = `<p class="small muted" style="padding:8px">${T("그림을 그리지 못했습니다. 인터넷 연결을 확인하고 다시 엽니다.")}</p>`;
    }
  }

  async function drawApp(el) {
    const src = viewStore.get(el.dataset.app);
    el.removeAttribute("data-app");
    try {
      el.innerHTML = appViewHtml(await loadView(src));
    } catch (err) {
      el.innerHTML = `<p class="small muted">${T("앱 화면을 그리지 못했습니다.")}</p>`;
    }
  }

  // 위젯 값을 글로 적는다(범위 슬라이더는 1~4). kinds는 위젯 이름 → 종류, 기대 화면이나 내 앱 화면에서 찾는다
  const widgetText = (widgets, kinds) => Object.entries(widgets || {}).map(([k, v]) => `${k} = ${fmtVal(v, kinds[k])}`).join(", ");
  const fmtVal = (v, kind) => (Array.isArray(v) ? (kind === "slider" ? v.join("~") : v.length ? v.map((x) => fmtVal(x)).join(", ") : T("(없음)")) :
    typeof v === "boolean" ? (v ? T("켬") : T("끔")) : v === null || v === undefined ? "" : String(v));
  function appItemHtml(e) {
    switch (e.t) {
      case "title": return `<h2 class="app-title">${esc(e.text)}</h2>`;
      case "header": return `<h3>${esc(e.text)}</h3>`;
      case "subheader": return `<h4>${esc(e.text)}</h4>`;
      case "caption": return `<p class="tiny muted">${esc(e.text)}</p>`;
      case "markdown": case "write": case "text": return `<p class="small">${esc(e.text)}</p>`;
      case "code": return `<pre class="out">${esc(e.text)}</pre>`;
      case "divider": return "<hr>";
      case "metric": return `<div class="app-metric"><span>${esc(e.label)}</span><b>${esc(e.value)}</b>${e.delta ? `<i>${esc(e.delta)}</i>` : ""}</div>`;
      case "alert": return `<div class="app-alert ${esc(e.level)}">${esc(e.text)}</div>`;
      case "widget": return `<div class="app-widget"><span>${esc(e.label)}</span><b>${esc(fmtVal(e.value, e.kind))}</b></div>`;
      case "table": case "chart": {
        const tb = e.table || { columns: [], rows: [], n: 0 };
        const head = `<tr>${tb.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
        const rows = tb.rows.map((row) => `<tr>${row.map((x) => `<td>${esc(fmtVal(x))}</td>`).join("")}</tr>`).join("");
        const more = tb.n > tb.rows.length ? `<p class="tiny muted">${T("모두 {n}행 가운데 앞 {k}행", { n: tb.n, k: tb.rows.length })}</p>` : "";
        return `${e.t === "chart" ? `<p class="tiny muted">st.${esc(e.kind)}</p>` : ""}<div class="app-table"><table>${head}${rows}</table></div>${more}`;
      }
      case "plotly": return e.fig ? plotlyHtml(e.fig, "", "app-chart") : "";
      case "pyplot": return e.png ? `<img class="app-img" src="data:image/png;base64,${e.png}" alt="${T("Matplotlib 그림")}">` : "";
      case "download": return `<div class="app-download"><span class="btn small" aria-disabled="true">${esc(e.label)}</span> ` +
        `<span class="tiny muted">${esc(e.file_name || "")} · ${T("{n}줄", { n: e.lines || 0 })}</span></div>`;
      default: return "";
    }
  }
  function appViewHtml(v) {
    const els = v.elements || [];
    const side = els.filter((e) => e.where.startsWith("sidebar"));
    const main = els.filter((e) => !e.where.startsWith("sidebar"));
    let html = "";
    let i = 0;
    while (i < main.length) {  // 같은 st.columns()로 만든 칸(main/c1.1, main/c1.2)은 한 줄에 나란히 놓는다
      const m = /^(.*?\/c\d+)\./.exec(main[i].where);
      if (!m) { html += appItemHtml(main[i]); i += 1; continue; }
      const group = [];
      while (i < main.length && main[i].where.startsWith(`${m[1]}.`)) { group.push(main[i]); i += 1; }
      const col = (e) => e.where.slice(m[1].length + 1).split("/")[0];
      const cols = [...new Set(group.map(col))].sort((a, b) => a - b);
      html += `<div class="app-cols">${cols.map((c) => `<div>${group.filter((e) => col(e) === c).map(appItemHtml).join("")}</div>`).join("")}</div>`;
    }
    if (v.stopped) html += `<p class="tiny muted app-stop">${T("여기서 st.stop()으로 멈췄습니다.")}</p>`;
    return `<div class="app-frame">${side.length ? `<aside class="app-side">${side.map(appItemHtml).join("")}</aside>` : ""}` +
      `<div class="app-main">${html || `<p class="small muted">${T("(화면에 놓인 것 없음)")}</p>`}</div></div>`;
  }
  new MutationObserver(() => {
    document.querySelectorAll("[data-pfig]").forEach(drawPlotly);
    document.querySelectorAll("[data-app]").forEach(drawApp);
  }).observe(document.documentElement, { childList: true, subtree: true });

  const PLOTLY_NAMES = {
    kind: "그래프 종류", traces: "트레이스(이름과 X·Y 값)", names: "트레이스 이름(범례)", title: "제목", xlabel: "X축 제목", ylabel: "Y축 제목",
    legend_title: "범례 제목", hover: "툴팁 항목(맨 위 이름 포함, 더 넣은 항목은 보지 않음)", hovermode: "툴팁 방식(hovermode)", xrange: "X축 범위", yrange: "Y축 범위", xdtick: "X축 눈금 간격",
    xscale: "X축 눈금 방식(로그 등)", yscale: "Y축 눈금 방식(로그 등)", barmode: "막대 배치(barmode)",
    widths: "선 굵기", sizes: "점 크기", colors: "트레이스 색", markers: "선 위의 점", dashes: "선 모양", symbols: "점 모양", annotations: "주석(글, 자리, 화살표)", texts: "주석 글", hlines: "가로 기준선",
    bar_text: "막대 끝 값", saved: "저장한 HTML(이름과 Plotly.js를 넣었는지)", saved_names: "저장한 파일 이름",
    axis_titles: "축 제목(패널마다)", axis_ranges: "축 범위(패널마다)", tickformats: "눈금 표기(tickformat)",
    legend_groups: "범례 묶음(legendgroup, showlegend)", rangeslider: "범위 슬라이더", rangeselector: "기간 버튼(rangeselector)",
    hover_templates: "툴팁 문구(hovertemplate)", patterns: "막대 빗금(pattern_shape)",
    report: "리포트 파일(차트 수와 차례, Plotly.js를 넣은 횟수, 외부 주소)", report_text: "리포트의 제목과 문단",
  };
  const PLOTLY_NAMES_EN = {
    kind: "chart type", traces: "traces (names and x, y values)", names: "trace names (legend)", title: "title", xlabel: "x-axis title", ylabel: "y-axis title",
    legend_title: "legend title", hover: "tooltip fields (with the name at the top; extra fields are not checked)", hovermode: "tooltip mode (hovermode)", xrange: "x-axis range", yrange: "y-axis range", xdtick: "x-axis tick spacing",
    xscale: "x-axis scale (log and so on)", yscale: "y-axis scale (log and so on)", barmode: "bar mode (barmode)",
    widths: "line widths", sizes: "marker sizes", colors: "trace colors", markers: "markers on lines", dashes: "line dashes", symbols: "marker symbols", annotations: "annotations (text, position, and arrow)", texts: "annotation text", hlines: "horizontal reference lines",
    bar_text: "value labels on bars", saved: "saved HTML (name and whether Plotly.js is inside)", saved_names: "saved file names",
    axis_titles: "axis titles (each panel)", axis_ranges: "axis ranges (each panel)", tickformats: "tick formats (tickformat)",
    legend_groups: "legend groups (legendgroup, showlegend)", rangeslider: "range slider", rangeselector: "range selector buttons",
    hover_templates: "hover templates (hovertemplate)", patterns: "bar patterns (pattern_shape)",
    report: "report file (number and order of charts, how many times Plotly.js is inside, outside addresses)", report_text: "report headings and paragraphs",
  };
  const APP_NAMES = {
    widgets: "위젯(이름, 종류, 자리, 고를 수 있는 값, 처음 값)", metrics: "지표 카드(이름과 값)", alerts: "알림(경고 등)", tables: "표(열과 행)",
    charts: "차트의 값(제목, 색, 점 모양은 보지 않음)", texts: "화면의 글(제목, 소제목 등)", downloads: "내려받기(단추 이름, 파일 이름과 종류, 내용)",
    layout: "배치(본문과 사이드바, st.columns의 칸, 놓인 차례)",
  };
  const APP_NAMES_EN = {
    widgets: "widgets (label, type, place, choices, starting value)", metrics: "metrics (labels and values)", alerts: "alerts (warnings and so on)",
    tables: "tables (columns and rows)", charts: "chart values (titles, colors, and markers are not checked)", texts: "text on the screen (titles, subheaders, and so on)", downloads: "downloads (button label, file name and type, contents)",
    layout: "layout (main area and sidebar, st.columns columns, order)",
  };
  // 채점할 때 값을 바꿔 넣는 주어진 줄(그래프 문제들이 같이 쓴다)
  function givenLines(p) {
    const code = p.code || (p.parts || []).join("");
    return [...new Set(p.tests.flatMap((t) => (t.replace || []).map(([old]) => old)))]
      .sort((a, b) => code.indexOf(a.split("\n")[0]) - code.indexOf(b.split("\n")[0]))
      .flatMap((block) => {
        const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
        return ls.length <= 2 ? ls : [`${ls[0]} … ${ls[ls.length - 1]}`];
      });
  }
  function specRows(rows) {
    return `<dl class="io-spec">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  }
  function plotlySpecHtml(p, todo) {
    const fields = p.plotly.map((k) => (LANG === "en" ? PLOTLY_NAMES_EN : PLOTLY_NAMES)[k] || k);
    if (isReport(p)) {  // HTML 리포트 문제(10장): 저장한 파일을 읽어 비교한다
      const rows = [];
      if (p.type !== "write") rows.push([T("할 일"), esc(todo)]);
      rows.push([T("리포트"), `${p.figure ? `${T("목표 리포트처럼 만듭니다.")} ` : ""}` +
        `${T("채점할 때 내 코드가 저장한 HTML 파일에서 {fields}{obj} 읽어 비교합니다.", { fields: esc(fields.join(", ")), obj: LANG === "ko" ? objParticle(fields[fields.length - 1]) : "" })} ` +
        T("리포트 안 차트의 값과 꾸밈, 글꼴은 보지 않습니다.")]);
      const given = givenLines(p);
      if (given.length) rows.push([T("입력"), T("주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 다시 실행합니다.", { lines: given.map((l) => `<code>${esc(l)}</code>`).join(", ") })]);
      return specRows(rows);
    }
    const notGraded = [p.plotly.includes("colors") ? "" : T("색"), p.plotly.includes("widths") ? "" : T("선 굵기"),
      p.plotly.includes("hover") ? "" : T("툴팁"), T("글꼴")].filter(Boolean);
    const given = givenLines(p);
    const rows = [];
    if (p.type !== "write") rows.push([T("할 일"), esc(todo)]);
    rows.push([T("그림"), `${p.figure ? `${T("목표 그림처럼 그립니다.")} ` : ""}` +
      `${T("채점할 때 내 그림에서 {fields}{obj} 읽어 비교합니다.", { fields: esc(fields.join(", ")), obj: LANG === "ko" ? objParticle(fields[fields.length - 1]) : "" })} ` +
      `${T("여기에 적지 않은 것({items} 등)은 목표 그림에 있어도 보지 않습니다.", { items: notGraded.join(", ") })} ` +
      T("목표 그림과 내 그림 위에 마우스를 올리면 값이 보입니다.")]);
    if (given.length) rows.push([T("입력"), T("주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 다시 그립니다.", { lines: given.map((l) => `<code>${esc(l)}</code>`).join(", ") })]);
    return specRows(rows);
  }
  function appSpecHtml(p, todo) {
    const fields = p.app.map((k) => (LANG === "en" ? APP_NAMES_EN : APP_NAMES)[k] || k);
    const given = givenLines(p);
    const rows = [];
    if (p.type !== "write") rows.push([T("할 일"), esc(todo)]);
    rows.push([T("앱"), `${p.figure ? `${T("목표 화면처럼 만듭니다.")} ` : ""}` +
      `${T("채점할 때 위젯 값을 바꿔 가며 앱을 처음부터 다시 실행하고, 화면의 {fields}{obj} 비교합니다.", { fields: esc(fields.join(", ")), obj: LANG === "ko" ? objParticle(fields[fields.length - 1]) : "" })} ` +
      (p.app.includes("layout") ? T("st.stop()으로 멈추는지도 봅니다. 칸의 너비와 글꼴은 보지 않습니다.") : T("st.stop()으로 멈추는지도 봅니다. 배치와 글꼴은 보지 않습니다."))]);
    const kinds = Object.fromEntries(p.tests.flatMap((t) => ((t.expect || {}).app || {}).widgets || []).map((w) => [w[2], w[1]]));
    if (p.tests.some((t) => Object.keys(t.widgets || {}).length)) {  // 위젯 값을 바꾸는 테스트가 없으면(파일만 바꾸는 문제) 이 줄은 뺀다
      rows.push([T("위젯 값"), T("채점할 때 쓰는 위젯 값: {cases}", {
        cases: p.tests.map((t) => esc(Object.keys(t.widgets || {}).length ? widgetText(t.widgets, kinds) : T("처음 값"))).join(" · ") })]);
    }
    if (given.length) rows.push([T("입력"), T("주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 다시 실행합니다.", { lines: given.map((l) => `<code>${esc(l)}</code>`).join(", ") })]);
    return specRows(rows);
  }

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
    const codes = names.map((n) => `<code>${esc(n)}</code>`);
    // 영어는 a and b, a, b, and c로 잇는다(2026-10-18). 한국어는 지금처럼 쉼표로만 잇는다
    const vars = LANG === "en" && codes.length > 1 ? (codes.length === 2 ? codes.join(" and ") : `${codes.slice(0, -1).join(", ")}, and ${codes[codes.length - 1]}`) : codes.join(", ");
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
    return `<p class="plan">${T("채점할 때 확인하는 것: {items}", { items: items.join(" · ") })}</p>`;  // 13px 회색이 읽기 어려워 14px로(2026-10-21 UI 검토)
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

  // i18n:ko-only
  // ------------------------------------------------------------------ 책 연계(2026-10-18 사용자 요청, 2026-11-24 코딩 테스트 확장)
  // 한국어 화면에만 보인다. 기본기·시각화는 해당 교재 절과 교보문고 전자책 링크를 바로 보여 주고,
  // 코딩 테스트는 03권 book_info가 켜지기 전에는 문제별 prereq로 『AI 시대의 파이썬 기본기』 기초 절을 안내하며,
  // 03권 출간 시 course.yaml에 book_info를 넣으면 풀이 설계 단계와 오답 해설 줄이 맨 위에 자동으로 함께 켜진다.
  const BASICS_BOOK_FALLBACK = {
    id: "basics",
    title: "AI 시대의 파이썬 기본기",
    page: "https://donghyunlee.kr/books/#basics",
    buy: [
      { label: "교보문고 전자책", url: "https://ebook-product.kyobobook.co.kr/dig/epd/ebook/E000013609812" },
      { label: "알라딘", url: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=403414646" },
      { label: "예스24", url: "https://www.yes24.com/product/goods/197288461" },
      { label: "유페이퍼", url: "https://madeby2.upaper.kr/content/1224834" },
    ],
  };
  const bookOf = (course) => (LANG === "ko" && course && course.book_info ? course.book_info : null);
  const prereqBookOf = () => {
    const loaded = typeof courseCache !== "undefined" && courseCache.get ? courseCache.get("basics") : null;
    return (loaded && loaded.book_info) ? { id: "basics", ...loaded.book_info } : BASICS_BOOK_FALLBACK;
  };
  function secInfo(course, num) {
    for (const ch of course.chapters) for (const s of ch.sections) if (s.num === num) return s;
    return null;
  }
  const secPages = (s) => (s && s.pages ? (s.pages[0] === s.pages[1] ? `${s.pages[0]}쪽` : `${s.pages[0]}~${s.pages[1]}쪽`) : "");
  const secCmp = (a, b) => { const [a1, a2] = a.split(".").map(Number); const [b1, b2] = b.split(".").map(Number); return a1 - b1 || a2 - b2; };
  const bookLink = (courseOrId, place, url, text, cls = "", bookId = "") => {
    const cid = typeof courseOrId === "string" ? courseOrId : courseOrId.id;
    const bidAttr = bookId ? ` data-book-id="${esc(bookId)}"` : "";
    return `<a${cls ? ` class="${cls}"` : ""} href="${esc(url)}" data-book="${esc(place)}" data-course="${esc(cid)}"${bidAttr} target="_blank" rel="noopener">${esc(text)}</a>`;
  };
  const inlineBookTargets = (cid, b, place, bookId = "") => {
    const firstBuy = b.buy && b.buy[0] ? [bookLink(cid, place, b.buy[0].url, b.buy[0].label, "", bookId)] : [];
    return [bookLink(cid, place, b.page, "책 소개", "", bookId), ...firstBuy].join(" · ");
  };
  function bookTipHtml(course, p) {
    const b = bookOf(course);
    if (!b || !p.section) return "";
    const s = secInfo(course, p.section);
    const m = String(p.book || "").match(new RegExp(`${p.section.replace(".", "\\.")}절\\s*(\\d+(?:~\\d+)?)쪽`));
    const pages = m ? `${m[1]}쪽` : secPages(s);
    return `<aside class="book-tip"><b>책에서 다시 보기</b>『${esc(b.title)}』 ${esc(p.section)}절 ${esc(s ? s.title : "")}${pages ? ` (${esc(pages)})` : ""} · ` +
      `${inlineBookTargets(course.id, b, "problem", course.id)}</aside>`;
  }
  function ctBookTipHtml(course, p, place = "problem") {
    if (LANG !== "ko" || !course || !p) return "";
    const rows = [];
    const ownBook = bookOf(course);
    if (ownBook) {
      const ch = p.chapter && course.chapterByNum ? course.chapterByNum[p.chapter] : null;
      const chLabel = ch ? `${ch.num}장 ${ch.title}` : (p.topic && p.topic.length ? `${p.topic[0]}장` : "");
      rows.push(`<div class="book-tip-row"><b>풀이 설계와 오답 해설</b>『${esc(ownBook.title)}』${chLabel ? ` ${esc(chLabel)}` : ""} (<code>${esc(p.id)}</code>) · ${inlineBookTargets(course.id, ownBook, place, course.id)}</div>`);
    }
    if (p.prereq && p.prereq.length) {
      const pb = prereqBookOf();
      const secs = p.prereq.map((x) => `${esc(x.num)}절 ${esc(x.title)}`).join(", ");
      const head = place === "daily-done" ? "함께 볼 문법 기초" : "막힌 곳의 문법 기초";
      rows.push(`<div class="book-tip-row"><b>${head}</b>『${esc(pb.title)}』 ${secs} · ${inlineBookTargets(course.id, pb, place, pb.id || "basics")}</div>`);
    }
    return rows.length ? `<aside class="book-tip">${rows.join("")}</aside>` : "";
  }
  function bookReviewHtml(course, problems, place) {
    const b = bookOf(course);
    if (!b) return "";
    const count = new Map();
    for (const p of problems) if (p && p.section) count.set(p.section, (count.get(p.section) || 0) + 1);
    const rows = [...count.entries()].sort((x, y) => y[1] - x[1] || secCmp(x[0], y[0])).slice(0, place === "me" ? 3 : 5);
    if (!rows.length) return "";
    const what = place === "me" ? "못 푼 문제" : "틀림";
    const list = rows.map(([num, n]) => {
      const s = secInfo(course, num);
      return `<li>${esc(num)}절 ${esc(s ? s.title : "")}${s && s.pages ? ` <span class="muted">(${esc(secPages(s))})</span>` : ""} <span class="muted">· ${what} ${n}</span></li>`;
    }).join("");
    // 2026-10-20 사용자 요청("전자책 구매라고 말하니까 조금 거부감"): 색 단추와 '구매'를 빼고 같은 크기의 글자 링크로 둔다
    const links = [bookLink(course, place, b.page, "책 소개", "", course.id), ...(b.buy || []).map((x) => bookLink(course, place, x.url, x.label, "", course.id))];
    return `<div class="card book-review">
      <h3>다시 볼 절</h3>
      <ol class="small">${list}</ol>
      <p class="small">『${esc(b.title)}』의 이 절에서 자세히 다룹니다.</p>
      <p class="book-links small">${links.join(" · ")}</p>
    </div>`;
  }
  function ctBookReviewHtml(course, problems, place) {
    if (LANG !== "ko" || !course || !problems || !problems.length) return "";
    const ownBook = bookOf(course);
    const pb = prereqBookOf();
    const limit = place === "me" ? 3 : 5;
    const what = place === "me" ? "못 푼 문제" : "관련 문항";

    const preMap = new Map();
    for (const p of problems) {
      for (const x of (p && p.prereq) || []) {
        if (!x || !x.num) continue;
        const prev = preMap.get(x.num) || { title: x.title || "", n: 0 };
        prev.n += 1;
        preMap.set(x.num, prev);
      }
    }
    const preRows = [...preMap.entries()].sort((x, y) => y[1].n - x[1].n || secCmp(x[0], y[0])).slice(0, limit);

    if (ownBook) {
      const chMap = new Map();
      for (const p of problems) {
        if (!p) continue;
        const nums = p.chapter ? [p.chapter] : (p.topic || []);
        for (const chNum of nums) chMap.set(Number(chNum), (chMap.get(Number(chNum)) || 0) + 1);
      }
      const chRows = [...chMap.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, limit);
      if (!chRows.length) return "";
      const chList = chRows.map(([num, n]) => {
        const ch = course.chapterByNum && course.chapterByNum[num];
        return `<li>${num}장 ${esc(ch ? ch.title : "")} <span class="muted">· ${what} ${n}</span></li>`;
      }).join("");
      const links = [bookLink(course, place, ownBook.page, "책 소개", "", course.id), ...(ownBook.buy || []).map((x) => bookLink(course, place, x.url, x.label, "", course.id))];
      const preSub = preRows.length ?
        `<p class="tiny muted" style="margin:8px 0 0">함께 볼 문법 기초: 『${esc(pb.title)}』 ${preRows.slice(0, 2).map(([num, v]) => `${esc(num)}절 ${esc(v.title)}`).join(", ")} · ${inlineBookTargets(course.id, pb, place, pb.id || "basics")}</p>` : "";
      return `<div class="card book-review">
        <h3>다시 볼 장과 풀이 설계</h3>
        <ol class="small">${chList}</ol>
        <p class="small">풀이 설계 단계와 흔한 오답 해설은 『${esc(ownBook.title)}』의 이 장에서 자세히 다룹니다.</p>
        <p class="book-links small">${links.join(" · ")}</p>${preSub}
      </div>`;
    }

    if (!preRows.length) return "";
    const preList = preRows.map(([num, v]) => `<li>${esc(num)}절 ${esc(v.title)} <span class="muted">· ${what} ${v.n}</span></li>`).join("");
    const pbLinks = [bookLink(course, place, pb.page, "책 소개", "", pb.id || "basics"), ...(pb.buy || []).map((x) => bookLink(course, place, x.url, x.label, "", pb.id || "basics"))];
    return `<div class="card book-review">
      <h3>다시 볼 기초 절</h3>
      <ol class="small">${preList}</ol>
      <p class="small">풀이 설계 전에 막힌 문법과 자료구조 원리는 『${esc(pb.title)}』의 이 절에서 다룹니다.</p>
      <p class="book-links small">${pbLinks.join(" · ")}</p>
    </div>`;
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-book]");
    if (a && window.gtag) window.gtag("event", "book_click", { course: a.dataset.course, book: a.dataset.bookId || a.dataset.course, place: a.dataset.book, cohort: trafficCohort() });
  });
  // i18n:end

  // ------------------------------------------------------------------ 채점 결과 통계(2026-10-21 사용자 결정, README '채점 결과 통계')
  // 기본기 문제집의 '자주 틀리는' 근거를 모으려고, 과목 JSON에 grade_events가 있는 과목(기본기, 2026-10-26부터 시각화도)에서 채점할 때마다 GA4 이벤트 grade를
  // 보낸다. 보내는 것은 과목, 문제 번호, 유형, 결과(ok, wrong, error), 오류 이름, 이 브라우저에서 그 문제를 몇 번째 낸 것인지(5 이상은 5),
  // 연습과 타임어택 구분, 출력 예측 답이 원본의 흔한 틀린 출력(wrong_outputs)과 같을 때 그 유형 기호(mc)뿐이다.
  // 코드, 답, 출력은 보내지 않는다. GA4는 donghyunlee.kr에서만 켜진다(index.html). 처리방침의 '채점 결과 통계'와 같이 고친다.
  function wrongOutputCode(p, answer) {
    for (const w of p.wrong_outputs || []) {
      const same = "error" in w ? answer.err && (w.error === true || w.error === answer.errType) :
        !answer.err && predictText(answer.text) === w.out;
      if (same) return w.mc;
    }
    return "";
  }
  function gradeEvent(course, p, mode, r, answer) {
    if (!window.gtag || !course.grade_events) return;
    let result = r.ok ? "ok" : "wrong";
    let err = "";
    if (!r.ok && p.type !== "predict") {  // 실행이 오류로 끝났으면 처음 만난 오류 이름(문법 오류, 테스트의 실행 오류, 시간 초과)
      const e = r.timeout ? { type: "Timeout" } :
        (r.blocked && r.error) || (r.tests || []).filter((t) => !t.optional && !t.ok).map((t) => t.error).find(Boolean);
      if (e) { result = "error"; err = String(e.type || ""); }
    }
    // 연습은 채점을 기록한 뒤에 부르므로 n이 이번 제출이다. 타임어택은 끝날 때 기록하므로 하나를 더한다
    const nth = Math.min(5, (Store.prob(course.id, p.id).n || 0) + (mode === "practice" ? 0 : 1));
    const mc = p.type === "predict" && !r.ok ? wrongOutputCode(p, answer) : "";
    window.gtag("event", "grade", { course: course.id, pid: p.id, kind: p.type, result, err, nth, mode, mc, cohort: trafficCohort() });
  }

  // ------------------------------------------------------------------ 나란히 보기(2026-11-12 학생 의견, 사용자 "전체 코딩테스트 프레임워크의 화면구성을 다 바꾸려고")
  // 넓은 화면(1100px 이상)에서는 문제 화면을 두 칸으로 나눈다. 왼쪽은 문제(설명, 제한 사항, 입출력 예, 목표 그림, 읽을 코드, 정답과 해설),
  // 오른쪽은 답을 쓰는 곳(코드 칸, 단추, 힌트, 결과)이다. 오른쪽 칸은 화면에 붙어 있어 문제를 내려 읽어도 코드 칸이 보인다.
  // 좁은 화면과 '위아래로 보기'를 고른 브라우저는 전과 같은 한 줄 순서다. 템플릿에서 data-col="r"인 것이 오른쪽이고
  // (편집기 도움말은 바로 앞 편집기를 따른다), 나눌 때는 처음 순서를 기억해 두고 요소를 옮긴다. 옮기기만 하므로 쓴 코드와 단추 연결은 그대로다.
  const SPLIT_MQ = window.matchMedia ? window.matchMedia("(min-width: 1100px)") : null;
  const splitOn = () => !!(SPLIT_MQ && SPLIT_MQ.matches) && !Store.setting("stack");
  const splitToggleHtml = () => `<button type="button" class="btn small ghost split-toggle"></button>`;
  function arrangeSplit(art) {
    if (!art || !art._kids) return;
    const on = splitOn();
    if (on !== art.classList.contains("split")) {
      const act = art.contains(document.activeElement) ? document.activeElement : null;
      const sel = act && "selectionStart" in act ? [act.selectionStart, act.selectionEnd] : null;
      if (on) {
        const left = document.createElement("div");
        const right = document.createElement("div");
        left.className = "pcol pcol-l";
        right.className = "pcol pcol-r";
        let col = left;
        art._kids.forEach((k) => {
          if (!k.classList.contains("editor-help") && !k.classList.contains("code-symbar")) col = k.dataset.col === "r" ? right : left;
          col.appendChild(k);
        });
        art.replaceChildren(left, right);
      } else {
        art.replaceChildren(...art._kids);
      }
      art.classList.toggle("split", on);
      if (act) {  // 요소를 옮기면 초점과 커서가 풀려서 되돌린다
        act.focus({ preventScroll: true });
        if (sel) { try { act.setSelectionRange(sel[0], sel[1]); } catch (e) { /* 선택을 못 받는 칸 */ } }
      }
    }
    const btn = $(".split-toggle", art);
    if (btn) btn.textContent = on ? T("위아래로 보기") : T("나란히 보기");
    if (on) {  // 오른쪽 칸은 머리줄과, 타임어택·모의 시험의 시계 막대 아래에 붙는다
      const bar = $(".ta-bar");
      const top = ($(".topbar") ? $(".topbar").offsetHeight : 56) + (bar ? bar.offsetHeight + 14 : 0) + 12;
      art.style.setProperty("--pin-top", `${top}px`);
    }
  }
  const arrangeAll = () => $$("article.problem").forEach(arrangeSplit);
  function setupSplit(art) {
    if (!art) return;
    art._kids = Array.from(art.children);
    const btn = $(".split-toggle", art);
    if (btn) {
      btn.addEventListener("click", () => {
        Store.setting("stack", !Store.setting("stack"));
        arrangeAll();
        window.dispatchEvent(new Event("resize"));  // Plotly 그림이 새 칸 너비에 맞게 다시 그려진다
        btn.focus({ preventScroll: true });
      });
    }
    arrangeSplit(art);
  }
  if (SPLIT_MQ) {
    const onChange = () => arrangeAll();
    if (SPLIT_MQ.addEventListener) SPLIT_MQ.addEventListener("change", onChange); else SPLIT_MQ.addListener(onChange);
  }
  window.addEventListener("resize", () => $$("article.problem.split").forEach(arrangeSplit));  // 시계 막대 높이가 바뀌면 붙는 자리도 바꾼다

  function mountProblem(root, course, p, opts) {
    const mode = opts.mode; // practice | ta
    const cid = course.id;
    const exam = mode === "ta" || !!Store.setting("exam");
    // 타임어택에서 실행을 켜면 출력 예측을 뺀 문제에 실행 버튼을 둔다
    const taRun = mode === "ta" && !!opts.run && p.type !== "predict";
    const rec = mode === "practice" ? Store.prob(cid, p.id) : {};
    const draft = (mode === "practice" ? rec.d : opts.draft) || {};
    let attempts = 0;
    let wrongs = 0;  // 이 화면에서 틀린 횟수(두 번째에 책 연계 상자를 띄운다)
    let hintShown = 0;
    let busy = false;
    let graded = false;
    let warnedEmpty = false;
    const openedAt = Date.now();
    let openedSolNow = false;
    const usesPython = p.type !== "predict";
    const pkgs = needPackages(course, p);  // 그래프 도구가 필요한 과목(문제가 더 받는 Plotly 포함)
    if (usesPython) Py.start().catch(() => {});
    if (pkgs) Py.load(pkgs).catch(() => {});  // 미리 불러 두어 처음 실행을 기다리지 않게

    // 영어 과목의 book은 절 번호만이라('§7.6') '교재' 말을 붙이지 않는다(조정자 결정, SPEC 5절)
    const meta = [T("교재 {book}", { book: esc(p.book) })];

    // side는 문제 쪽(나란히 보기의 왼쪽 칸), body는 답을 쓰는 쪽(오른쪽 칸)이다. 한 줄로 볼 때는 side 다음에 body가 와서 전과 순서가 같다
    let side = targetHtml(p, p.app ? T("목표 화면 · 처음 화면") : isReport(p) ? T("목표 리포트 · 주어진 값 그대로 만들었을 때") :
      T("목표 그림 · 주어진 값 그대로 그렸을 때")) + filesHtml(p);
    let body = "";
    if (p.type === "predict") {
      side += codeBlock(hl(p.code));
      if (p.stdin) side += `<div class="stdin">${T("input()에 차례로 친 값 {values}", { values: p.stdin.map((v) => `<code>${esc(v)}</code>`).join("") })}</div>`;
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
      const help = `eh${++editorSeq}`;
      body += `<div class="editor"><pre class="gutter" aria-hidden="true"></pre>
        <textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"
          aria-label="${T("코드 입력")}" aria-describedby="${help}"></textarea></div>${editorHelpHtml(help)}`;
    }
    const needsInput = usesPython && /input\s*\(/.test(p.code || (p.parts || []).join("") || "");
    if (needsInput && (mode === "practice" || taRun)) {
      body += `<label class="label" for="stdin">${T("실행할 때 input()이 읽을 값")} <span class="muted small">(${T("한 줄에 하나")})</span></label>
        <textarea id="stdin" class="stdin-input" rows="2" spellcheck="false" autocapitalize="off" autocorrect="off">${esc((p.stdin || []).join("\n"))}</textarea>`;
    }

    const runLabel = p.type === "predict" ? T("실행해서 대조") : T("실행");
    const gradeLabel = () => (mode === "ta" ? T("제출") : T("채점하기"));
    const ioSpec = p.plot ? plotSpecHtml(p, howto(p, mode)) : p.plotly ? plotlySpecHtml(p, howto(p, mode)) :
      p.app ? appSpecHtml(p, howto(p, mode)) : ioSpecHtml(p);
    root.innerHTML = `
      <article class="card problem">
        <div class="phead">
          <span class="badge ${p.type}">${typeName(p.type)}</span>
          <span class="level">${levelName(p.level) || ""}</span>
          ${splitToggleHtml()}
          <h1>${esc(p.title)}</h1>
        </div>
        <p class="pmeta">${meta.join(" · ")}</p>
        <div class="prompt">${md(p.prompt)}</div>
        ${ioSpec || `<p class="howto">${esc(howto(p, mode))}</p>`}
        ${mode === "practice" ? planHtml(p) : ""}
        ${side ? `<div class="pbody">${side}</div>` : ""}
        <div class="pbody" data-col="r">${body}</div>
        <div class="actions" data-col="r">
          <button class="btn primary" data-act="grade">${gradeLabel()} <span class="kbd">${SUBMIT_KEY}</span></button>
          ${mode === "practice" ? `
            <button class="btn" data-act="run" ${p.type === "predict" || exam ? "hidden" : ""}>${runLabel}</button>
            ${p.hints && p.hints.length ? `<button class="btn ghost" data-act="hint">${T("힌트")} <span class="hint-count">0/${p.hints.length}</span></button>` : ""}
            ${p.type === "write" || p.type === "fix" ? `<button class="btn ghost" data-act="reset">${T("처음 코드로")}</button>` : ""}
            <span class="spacer"></span>
            <button class="btn ghost" data-act="solution" ${rec.n || rec.s === 2 ? "" : "disabled"} title="${T("한 번 채점한 뒤에 열 수 있습니다")}">${T("정답과 해설")}</button>${rec.n || rec.s === 2 ? "" : `<span class="tiny muted locked-note">${T("한 번 채점하면 열립니다")}</span>`}` :
          taRun ? `<button class="btn" data-act="run">${T("실행")}</button>` : ""}
        </div>
        ${mode === "practice" ? `<p class="tiny muted run-aside" data-col="r">${T("문제와 상관없는 코드는 {link}에서 따로 돌려 봅니다.", { link: `<a href="${runHref()}" target="_blank" rel="noopener">${T("파이썬 바로 실행")}</a>` })}</p>` : ""}
        <ol class="hints" data-col="r"></ol>
        <div class="result" data-col="r" hidden aria-live="polite"></div>
        <div class="console" data-col="r" hidden></div>
        <div class="solution" hidden></div>
        <div class="book-slot" data-col="r"></div>
      </article>`;
    setupSplit($("article.problem", root));

    const resultEl = $(".result", root);
    const consoleEl = $(".console", root);
    const bookSlot = $(".book-slot", root);
    const showBookTip = () => { if (mode === "practice" && bookSlot && !bookSlot.innerHTML) bookSlot.innerHTML = bookTipHtml(course, p); };
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

    function markStale() {
      if (!resultEl || resultEl.hidden || resultEl.classList.contains("is-stale") || resultEl.classList.contains("info")) return;
      resultEl.classList.add("is-stale");
      resultEl.insertAdjacentHTML("afterbegin", `<div class="stale-banner">${T("답을 고쳤습니다. 다시 채점해 주세요.")}</div>`);
    }

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
      errOn.addEventListener("change", () => { errType.hidden = !errOn.checked; markStale(); saveSoon(snapshot); });
      errType.addEventListener("change", () => { markStale(); saveSoon(snapshot); });
      ans.addEventListener("input", () => { markStale(); saveSoon(snapshot); });
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
        el.addEventListener("input", () => { fit(el); markStale(); saveSoon(() => ({ blanks: blanks.map((b) => b.value) })); });
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
        onChange: (v) => { markStale(); saveSoon(() => ({ code: v })); },
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
      reveal(resultEl);
    }

    function afterGrade(ok) {
      attempts += 1;
      graded = true;
      if (mode === "practice") {
        const elSec = Math.max(1, Math.round((Date.now() - openedAt) / 1000));
        Store.record(cid, p.id, ok, { sec: elSec, tries: attempts, openedSol: openedSolNow });
        if (!ok && ++wrongs >= 2) showBookTip();
        if (solBtn) solBtn.disabled = false;
        const locked = $(".locked-note", root);  // 잠긴 까닭은 마우스를 올려야만 보였다(2026-10-21 UI 검토)
        if (locked) locked.remove();
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
        if (mode === "ta") { graded = true; gradeEvent(course, p, mode, r, answer); opts.onSubmit({ ok: r.ok, answer }); return; }
        if (r.ok) {
          showResult("ok", `<h3>✓ ${T("정답입니다")}</h3>${md(p.explain)}`);
        } else {
          showResult("bad", `<h3>✗ ${T("아직 아닙니다")}</h3><p>${inl(r.msg)}</p>`);
        }
        afterGrade(r.ok);
        gradeEvent(course, p, mode, r, answer);
        return;
      }
      setBusy(true, Py.state !== "ready" ? T("파이썬 준비 중") : pkgs && !Py.ready(pkgs) ? T("그래프 도구 준비 중") : T("채점 중"));
      const job = !pkgs ? Py.call("grade", { problem: wire(p), answer }, 12000) :
        Py.load(pkgs).then(() => { setBusy(true, T("채점 중")); return Py.call("grade", { problem: wire(p), answer }, p.plotly || p.app ? 45000 : 30000); });
      if (opts.onGrading) opts.onGrading(job.catch(() => {}));  // 타임어택: 시간이 끝나도 이 채점은 기다렸다 넣는다
      try {
        const r = await job;
        if (mode === "ta") { graded = true; gradeEvent(course, p, mode, r, answer); opts.onSubmit({ ok: r.ok, answer, report: r }); return; }
        const g = gradeHtml(r, p);
        showResult(g.cls, g.html);
        if (p.type === "fill") $$(".blank", root).forEach((b) => b.classList.toggle("ok", r.ok));
        afterGrade(r.ok);
        gradeEvent(course, p, mode, r, answer);
      } catch (err) {
        if (err.timeout) {
          if (mode === "ta") {
            graded = true;
            gradeEvent(course, p, mode, { ok: false, timeout: true }, answer);
            opts.onSubmit({ ok: false, answer, timeout: true });
            return;
          }
          showResult("bad", `<h3>✗ ${T("아직 아닙니다")}</h3>${errorHtml({ type: "Timeout" })}`);
          afterGrade(false);
          gradeEvent(course, p, mode, { ok: false, timeout: true }, answer);
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
        const r = await Py.call("run", { code, stdin, var: p.type === "write" && p.answer ? p.answer : null, files: p.files || null,
          plot: !!pkgs && !p.plotly && !p.app, plotly: !!p.plotly, app: !!p.app, report: isReport(p), lang: LANG },
          pkgs ? (p.plotly || p.app ? 30000 : 20000) : 10000);  // 변수 하나면 문자열, 여럿이면 목록
        consoleEl.innerHTML = consoleHtml(r, p.type === "predict" ? T("실제 실행 결과") : T("실행 결과"), p);
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
        openedSolNow = true;
        const el = $(".solution", root);
        el.innerHTML = solutionHtml(p);
        el.hidden = false;
        showBookTip();
        const prev = Store.prob(cid, p.id);
        Store.patch(cid, p.id, { rev: true, ...(prev.s !== 2 ? { clean: 0 } : {}) });
        el.scrollIntoView({ behavior: motion(), block: "nearest" });
      });
    }
    // 자동 초점은 출력 예측 칸과 빈칸에만 둔다. 코드 칸은 Tab이 들여쓰기라 열자마자 들어가면 키보드 사용자가 갇힌 것처럼 느낀다.
    // 터치 기기에서는 화면 키보드가 뜨지 않게 두지 않는다(2026-10-21 UI 검토)
    return { grade, focus: () => { const f = !touchOnly() && $("#ans, .blank", root); if (f) f.focus({ preventScroll: true }); } };
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
    const perfPassed = perf.filter((t) => t.ok).length;
    const perfPending = perf.length > 0 && perf.every((t) => t.pending);
    const perfFailed = perf.length > 0 && !perfPending && perfPassed < perf.length;
    const accPill = `<span class="ct-pill ${r.ok ? "ok" : "bad"}">${r.ok ? "✓" : "✗"} ${T("정확성 {k}/{n} · {s}점", { k: r.passed, n: r.total - k, s: r.score })}</span>`;
    const perfPill = !perf.length ? "" : perfPending ?
      `<span class="ct-pill">${T("효율성 대기 · 정확성 통과 후 측정")}</span>` :
      perfFailed ? `<span class="ct-pill warn">! ${T("효율성 {k}/{n} · 시간 초과 (점수 밖)", { k: perfPassed, n: perf.length })}</span>` :
        `<span class="ct-pill ok">✓ ${T("효율성 {k}/{n} 통과 (점수 밖)", { k: perfPassed, n: perf.length })}</span>`;
    let html = (r.ok ? `<h3>✓ ${T("통과 · 100점")}</h3>` : `<h3>✗ ${T("{n}점", { n: r.score })}</h3>`) +
      `<div class="ct-summary">${accPill}${perfPill}</div>` +
      (k ? `<p class="small">${T("효율성 테스트 {k}개는 시간 안에 끝났지만 틀려서 정확성 실패로 셈", { k })}</p>` : "");
    html += `<ul class="tests">${req.filter((t) => t.example).map(ctTestHtml).join("")}</ul>`;
    const hidden = req.filter((t) => !t.example);
    const hiddenBad = hidden.filter((t) => !t.ok);
    const hiddenOk = hidden.filter((t) => t.ok);
    html += `<p class="ct-sub">${T("숨은 테스트")} <span>${T("입력은 보이지 않고 어떤 경우인지만 보입니다")}</span></p>`;
    if (hiddenBad.length) html += `<ul class="tests">${hiddenBad.map(ctTestHtml).join("")}</ul>`;
    if (hiddenOk.length >= 3) {
      html += `<details class="tests-passed"><summary>${T("통과한 숨은 테스트 {n}개 보기", { n: hiddenOk.length })}</summary>` +
        `<ul class="tests">${hiddenOk.map(ctTestHtml).join("")}</ul></details>`;
    } else if (hiddenOk.length) {
      html += `<ul class="tests">${hiddenOk.map(ctTestHtml).join("")}</ul>`;
    }
    if (perf.length) {
      html += `<p class="ct-sub">${T("효율성")} <span>${T("시간 초과는 점수에 넣지 않음 · 실행한 줄 수로 잽니다")}</span></p>` +
        `<ul class="tests">${perf.map(ctTestHtml).join("")}</ul>`;
    }
    // 디버깅 문항(max_changed)에서 두 줄 넘게 바꾸면 채점기가 안내를 붙인다(막지는 않음)
    if (r.changed !== undefined && r.notes && r.notes.length) html += r.notes.map((n) => `<p class="small">${inl(n)}</p>`).join("");
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
    let sessAttempts = 0;
    const openedAt = Date.now();
    let openedSolNow = false;
    const helpId = `eh${++editorSeq}`;
    if (!opts.lazyPy) Py.start().catch(() => {});  // 휴대폰의 오늘의 문제는 코드 칸을 누르거나 실행할 때 받는다(약 13MB)

    root.innerHTML = `
      <article class="card problem ct">
        <div class="phead">
          <span class="badge lv${p.level}">${levelName(p.level) || ""}</span>
          ${p.form ? `<span class="level">${formName(p.form)}</span>` : ""}
          ${perfN ? `<span class="level">${T("효율성 테스트 {n}개", { n: perfN })}</span>` : ""}
          <span class="pid">${esc(p.id)}</span>
          ${splitToggleHtml()}
          <h1>${esc(p.title)}</h1>
        </div>
        ${mode === "practice" && sec ? `<p class="pmeta">${esc(sec.num)} ${esc(sec.title)}</p>` : ""}
        ${mode === "practice" && p.set && p.topic ? `<p class="pmeta">${T("유형 {list}", { list: topicText(course, p) })}</p>` : ""}
        <h2 class="ct-h">${T("문제 설명")}</h2>
        <div class="prompt">${md(p.prompt)}</div>
        <h2 class="ct-h">${T("제한 사항")}</h2>
        <ul class="ct-list">${(p.constraints || []).map((x) => `<li>${inl(x)}</li>`).join("")}</ul>
        <h2 class="ct-h">${T("입출력 예")}</h2>
        ${ioTableHtml(p)}
        ${mode === "practice" ? prereqHtml(p) : ""}
        <h2 class="ct-h" data-col="r">${T("풀이")} <span class="muted small">${p.form === "blank" ? T("빈칸 ____을 채워 {entry} 함수를 완성합니다", { entry: `<code>${esc(p.entry)}</code>` }) :
          p.form === "debug" ? T("한 줄을 고쳐 {entry} 함수를 완성합니다", { entry: `<code>${esc(p.entry)}</code>` }) :
          T("{entry} 함수를 완성합니다", { entry: `<code>${esc(p.entry)}</code>` })}</span></h2>
        <div class="editor" data-col="r"><pre class="gutter" aria-hidden="true"></pre>
          <textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"
            aria-label="${T("코드 입력")}" aria-describedby="${helpId}"></textarea></div>${editorHelpHtml(helpId)}
        <div class="actions" data-col="r">
          <button class="btn" data-act="examples">${T("예시 실행")}</button>
          <button class="btn primary" data-act="submit">${T("제출")} <span class="kbd">${SUBMIT_KEY}</span></button>
          ${mode === "practice" && p.hints && p.hints.length ? `<button class="btn ghost" data-act="hint">${T("힌트")} <span class="hint-count">0/${p.hints.length}</span></button>` : ""}
          <button class="btn ghost" data-act="reset">${T("처음 코드로")}</button>
          ${mode === "practice" && p.solution ? `<span class="spacer"></span><button class="btn ghost" data-act="solution" ${rec.n || rec.s === 2 ? "" : "disabled"}
            title="${T("한 번 제출한 뒤에 열 수 있습니다")}">${T("모범 코드와 해설")}</button>` : ""}
        </div>
        <p class="tiny muted howto" data-col="r">${T("예시 실행은 보이는 예시만 돌립니다. 제출하면 숨은 테스트까지 채점하고, 점수는 통과한 정확성 테스트의 비율입니다.")}${perfN ? ` ${T("효율성은 정확성을 모두 통과한 뒤에 실행한 줄 수로 잽니다.")}` : ""}${mode === "exam" ? ` ${T("제출은 여러 번 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다.")}` : ""}</p>
        <ol class="hints" data-col="r"></ol>
        <div class="book-slot" data-col="r"></div>
        <div class="result" data-col="r" hidden aria-live="polite"></div>
        <div class="solution" hidden></div>
      </article>`;
    setupSplit($("article.problem", root));

    const resultEl = $(".result", root);
    const bookSlot = $(".book-slot", root);
    const showCtBookTip = () => { if (mode === "practice" && bookSlot && !bookSlot.innerHTML) bookSlot.innerHTML = ctBookTipHtml(course, p, "problem"); };
    let wrongs = 0;
    const exBtn = $('[data-act="examples"]', root);
    const subBtn = $('[data-act="submit"]', root);
    const solBtn = $('[data-act="solution"]', root);
    function markStale() {
      if (!resultEl || resultEl.hidden || resultEl.classList.contains("is-stale") || resultEl.classList.contains("info")) return;
      resultEl.classList.add("is-stale");
      resultEl.insertAdjacentHTML("afterbegin", `<div class="stale-banner">${T("답을 고쳤습니다. 다시 채점해 주세요.")}</div>`);
    }
    let saveTimer = null;
    const ta = makeEditor($(".editor", root), {
      value: opts.code ?? (draft.code != null ? draft.code : p.code),
      onChange: (v) => {
        markStale();
        if (mode === "practice") { clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.patch(cid, p.id, { d: { code: v } }), 400); }
        if (opts.onChange) opts.onChange(v);
      },
      onSubmit: () => submit(),
    });
    if (opts.lazyPy) ta.addEventListener("focus", () => Py.start().catch(() => {}), { once: true });

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
      reveal(resultEl);
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
        if (mode === "practice") {
          sessAttempts += 1;
          const elSec = Math.max(1, Math.round((Date.now() - openedAt) / 1000));
          const prev = Store.prob(cid, p.id);
          Store.record(cid, p.id, r.ok, { sec: elSec, tries: sessAttempts, openedSol: openedSolNow });
          Store.patch(cid, p.id, { best: Math.max(prev.best || 0, r.score || 0) });
          if (r.ok) markDailyIfToday(course, p.id);
          if (solBtn) solBtn.disabled = false;
          const perfFailedNow = (r.tests || []).some((t) => t.perf && !t.ok && !t.pending && !t.skipped);
          if ((!r.ok && ++wrongs >= 2) || (r.ok && perfFailedNow)) showCtBookTip();
        }
        showResult(g.cls, g.html);
        if (opts.onSubmit) opts.onSubmit(r, code);
        if (mode === "practice" && opts.onGraded) opts.onGraded(r.ok);
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
        openedSolNow = true;
        const el = $(".solution", root);
        el.innerHTML = ctSolutionHtml(p);
        el.hidden = false;
        const prev = Store.prob(cid, p.id);
        Store.patch(cid, p.id, { rev: true, ...(prev.s !== 2 ? { clean: 0 } : {}) });
        el.scrollIntoView({ behavior: motion(), block: "nearest" });
      });
    }
    return {
      focus: () => ta.focus({ preventScroll: true }),
      code: () => ta.value,
      setCode: (v) => { ta.value = v; ta.dispatchEvent(new Event("input")); },  // 연습에서는 입력처럼 저장된다
    };
  }

  // ------------------------------------------------------------------ 오늘의 문제(2026-10-21 사용자 결정, README '오늘의 문제')
  // 과목 JSON의 daily(start: 첫날, ids: 날짜 차례의 문제, size: 모범 코드 길이, note: 요일 규칙)가 날짜마다 모두에게 같은 문제를
  // 정한다. 날짜는 한국 시각이라 한국어판과 영어판이 같은 날 같은 문제다. 시간 제한과 연속 기록은 두지 않고, 놓친 날은 최근 7일
  // 칸에서 나중에 푼다. 기록은 Store.markDaily(그날 문제를 통과한 날만)이고, 차례나 다른 화면에서 오늘 문제를 통과해도 남긴다.
  // GA4에는 어디서 열었는지(place)만 보낸다. 통과 여부는 풀이 기록이라 보내지 않는다.
  const DAY_MS = 86400000;
  const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);  // 한국 시각에는 서머타임이 없다
  const dayNum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY_MS;
  const dayStr = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
  const dayLocale = () => (LANG === "en" ? "en-US" : "ko-KR");
  const fmtDay = (s) => new Date(dayNum(s) * DAY_MS).toLocaleDateString(dayLocale(),
    { timeZone: "UTC", month: LANG === "en" ? "short" : "long", day: "numeric", weekday: LANG === "en" ? "short" : "long" });
  const dayLetter = (s) => new Date(dayNum(s) * DAY_MS).toLocaleDateString(dayLocale(), { timeZone: "UTC", weekday: "narrow" });
  const kstYesterday = () => dayStr(dayNum(kstToday()) - 1);
  const dailyHref = (cid, date) => `#/${cid}/daily${date && date !== kstToday() ? `/${date}` : ""}`;
  const huntHref = (cid, date) => `#/${cid}/hunt${date && date !== kstToday() ? `?date=${date}` : ""}`;
  function validArenaDate(dateStr, minDate = "2026-10-21") {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const n = dayNum(dateStr);
    if (dayStr(n) !== dateStr) return false;
    const t = dayNum(kstToday());
    return n >= dayNum(minDate) && n <= t && n >= t - 90;
  }
  const dailyStarted = (c) => dayNum(kstToday()) >= dayNum(c.daily.start);
  let dailyFrom = null;  // 오늘의 문제를 연 자리(GA4 place). data-daily-from 링크를 누를 때 정한다
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-daily-from]");
    if (a) dailyFrom = a.dataset.dailyFrom;
  });

  function dailyPid(c, date) {
    const d = c.daily;
    if (!d || !d.ids.length || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
    const i = dayNum(date) - dayNum(d.start);
    if (i < 0) return null;
    if (i < d.ids.length) return d.ids[i];
    const loop = d.ids.length - (d.ids.length % 7) || d.ids.length;  // 표가 끝나면 요일을 맞춰 처음부터 다시 돈다(빌드가 미리 알린다)
    return d.ids[i % loop];
  }

  function markDailyIfToday(c, pid) {
    const today = kstToday();
    if (dailyPid(c, today) === pid) Store.markDaily(c.id, today, pid);
  }

  // 최근 7일(첫날 앞은 빼고). 푼 날은 채운 점이고, 누르면 그날 문제로 간다
  function dailyStripHtml(c, cur, from, querySuffix = "") {
    const t = dayNum(kstToday());
    const done = Store.course(c.id).daily || {};
    const days = [];
    for (let n = Math.max(dayNum(c.daily.start), t - 6); n <= t; n++) days.push(dayStr(n));
    if (!days.length) return "";
    return `<ol class="daily-strip" aria-label="${T("최근 7일")}">${days.map((d) => {
      const label = `${fmtDay(d)} · ${done[d] ? T("풀었음") : T("안 풂")}`;
      return `<li><a href="${dailyHref(c.id, d)}${querySuffix}" data-daily-from="${from}" class="${done[d] ? "ok" : ""}${d === cur ? " cur" : ""}"` +
        ` title="${esc(label)}" aria-label="${esc(label)}"${d === cur ? ' aria-current="date"' : ""}>` +
        `<span class="wd" aria-hidden="true">${esc(dayLetter(d))}</span><span class="dot" aria-hidden="true"></span></a></li>`;
    }).join("")}</ol>`;
  }

  // 내 기록의 한 줄: 푼 날 수와 최근 7일 및 기록 카드 공유
  function dailyMeHtml(c) {
    if (!dailyStarted(c)) return "";
    const n = Object.keys(Store.course(c.id).daily || {}).length;
    const shareBtn = isTestCourse(c) ?
      `<button type="button" class="btn small ghost" data-me-daily-share="${esc(c.id)}">${shareIconSvg()} ${T("기록 카드")}</button>` : "";
    return `<div class="row small daily-me"><b>${T("오늘의 코딩 문제")}</b><span class="muted">${T("푼 날 {n}일", { n })}</span>` +
      `<span class="spacer"></span>${dailyStripHtml(c, kstToday(), "me")}${shareBtn}</div>`;
  }

  async function showDailyDone(c, p, date, justNow, rival = null) {
    const el = $("#daily-done");
    if (!el) return;
    const isToday = date === kstToday();
    const isArenaDaily = isTestCourse(c) && validArenaDate(date, c.daily.start);
    const savedTime = ((Store.course(c.id).dailyTime || {})[date]) || null;
    const solveSec = savedTime ? savedTime.sec : 0;
    const tries = savedTime ? savedTime.tries : 1;
    const posted = isArenaDaily && isArenaPosted("code", date);
    let board = null;
    if (isArenaDaily) {
      board = (posted && solveSec > 0) ?
        await submitArenaCode(c.id, date, p.id, solveSec, tries) :
        await fetchArenaDaily(date);
    }
    let matchVerdict = "";
    if (isArenaDaily && solveSec > 0 && rival) {
      const won = solveSec <= rival.sec;
      matchVerdict = `<p class="small"><b>${won ? `🏆 ${esc(T("기준 기록 {name}({ot})보다 빨리 풀었습니다!", { name: rival.nick, ot: fmtDuration(rival.sec) }))}` : `⚡ ${esc(T("내 통과 시간 {mt} · 기준 기록 {name}({ot})", { mt: fmtDuration(solveSec), name: rival.nick, ot: fmtDuration(rival.sec) }))}`}</b></p>`;
    }
    const promptMsg = isToday ?
      T("방금 통과 기록({t})을 오늘 순위표에 등록할까요?", { t: fmtDuration(solveSec) }) :
      T("방금 통과 기록({t})을 #{d} 순위표에 등록할까요?", { t: fmtDuration(solveSec), d: date.slice(5) });
    const nickBar = isArenaDaily && (solveSec > 0 || posted) ? arenaNickBarHtml("daily-code", {
      promptMsg,
      postMode: solveSec > 0,
      posted,
      dateStr: date,
    }) : "";
    const liveBefore = $("#daily-board-live", main);
    if (liveBefore) liveBefore.remove();
    const myInfo = isArenaDaily ? buildMyDailyShareInfo(c, p, date, board) : null;
    el.innerHTML = `<div class="card daily-done section">
      <div class="daily-done-head">
        <h2>✓ ${isToday ? T("오늘의 코딩 문제를 풀었습니다") : T("이날의 코딩 문제를 풀었습니다")}${solveSec > 0 ? ` <span class="small muted">· ${esc(fmtDuration(solveSec))}</span>` : ""}</h2>
        ${isArenaDaily ? `<button type="button" class="btn small" data-daily-share="${esc(date)}">${shareIconSvg()} ${T("기록 카드")}</button>` : ""}
      </div>
      ${matchVerdict}
      <p>${isToday ? T("하루 1문제 코딩 도전을 마쳤습니다. 내일 새 문제가 열립니다.") : T("여기서 마쳐도 좋습니다.")}</p>
      ${myInfo ? arenaMilestoneProgressHtml(myInfo.clearDays) : ""}
      ${nickBar ? `<div id="daily-code-nick">${nickBar}</div>` : ""}
      ${isArenaDaily && board ? `<div id="daily-code-board">${codeBoardHtml(board, date, { canShare: true })}</div>` : ""}
      ${p.hints && p.hints.length ? `<h3 style="margin-top:16px">${T("요점")}</h3><ol class="small">${p.hints.map((h) => `<li>${inl(h)}</li>`).join("")}</ol>` : ""}
      ${isArenaDaily ? ctBookTipHtml(c, p, "daily-done") : ""}
    </div>`;
    if (isArenaDaily) {
      bindArenaNickBar(el, "daily-code", async (_label, action) => {
        if (action === "save" && solveSec > 0) {
          markArenaPosted("code", date);
          await submitArenaCode(c.id, date, p.id, solveSec, tries);
        }
        await showDailyDone(c, p, date, false, rival);
        await refreshDailyArchive(c, date);
      }, date);
      bindPodiumMsgBar(el, date, async () => {
        await showDailyDone(c, p, date, false, rival);
      });
      bindDailyShareButtons(el, c, p, date, board);
    }
    const strip = $(".daily-bar .daily-strip", main);
    if (strip) strip.outerHTML = dailyStripHtml(c, date, "recent");
    if (justNow) el.scrollIntoView({ behavior: motion(), block: "nearest" });
  }

  async function refreshDailyArchive(c, curDate) {
    const wrap = $("#daily-archive-wrap", main);
    if (!wrap || !isTestCourse(c)) return;
    const archive = await fetchArenaArchive(10);
    if ($("#daily-archive-wrap", main) === wrap) {
      wrap.innerHTML = arenaArchiveHtml(c, archive, curDate);
    }
  }

  async function viewDaily(cid, dateArg, query = "") {
    const c = await getCourse(cid);
    if (!c.daily || (dateArg && dayStr(dayNum(dateArg)) !== dateArg)) {  // 오늘의 코딩 문제가 없는 과목이거나 없는 날짜(2026-13-40)
      const err = new Error(`${cid} daily ${dateArg || ""}`);
      err.notFound = true;
      throw err;
    }
    const params = parseHashParams(query);
    const today = kstToday();
    const yesterday = kstYesterday();
    const date = dateArg || today;
    const isToday = date === today;
    document.title = T("오늘의 코딩 문제 · {title}", { title: c.title });
    const crumbs = `<div class="crumbs"><a href="#/${esc(cid)}">← ${esc(c.title)}</a></div>`;
    const p = dayNum(date) <= dayNum(today) ? c.byId[dailyPid(c, date)] : null;
    if (!p) {
      const msg = dayNum(date) > dayNum(today) ? T("아직 열리지 않은 날입니다.") :
        dayNum(date) < dayNum(c.daily.start) ? T("오늘의 코딩 문제는 {date}에 시작합니다.", { date: esc(fmtDay(c.daily.start)) }) :
          T("이날의 문제가 없습니다.");
      main.innerHTML = `<div class="view">${crumbs}<h1>${T("오늘의 코딩 문제")}</h1><p class="lead">${msg}</p>
        <p class="small muted">${inl(c.daily.note)}</p>${isToday ? "" : `<p><a href="${dailyHref(cid)}">${T("오늘의 코딩 문제로")}</a></p>`}</div>`;
      return;
    }
    if (window.gtag) window.gtag("event", "daily_open", { course: cid, place: dailyFrom || "link", cohort: trafficCohort() });
    dailyFrom = null;
    // 전에 푼 문제면 그날 처음 열 때 시작 코드로 바꿔 다시 풀게 한다. 전에 쓴 코드는 old에 남겨 두고 단추로 불러온다
    const rec = Store.prob(cid, p.id);
    if (rec.s === 2 && rec.fresh !== date && !Store.dailyDone(cid, date)) {
      Store.update(() => {
        const r = Store.course(cid).p[p.id];
        if (r.d && r.d.code != null && norm(r.d.code) !== norm(p.code)) r.old = r.d.code;
        r.d = { code: p.code };
        r.fresh = date;
      });
    }
    const again = Store.prob(cid, p.id).fresh === date && !Store.dailyDone(cid, date);
    const old = Store.prob(cid, p.id).old;
    const lazy = !!(window.matchMedia && matchMedia("(max-width: 720px)").matches);
    const isArenaDaily = isTestCourse(c) && validArenaDate(date, c.daily.start);
    const boardOnly = isArenaDaily && params.board === "1";
    const board = isArenaDaily ? await fetchArenaDaily(date) : null;
    const sharedRival = isArenaDaily && params.r ? parseDailyRival(params.r, c.daily.start) : null;
    const rival = sharedRival || (board ? pickDailyPacemaker(board.code, getArenaPid()) : null);
    const alreadyDone = Store.dailyDone(cid, date);
    const existingTime = ((Store.course(cid).dailyTime || {})[date]) || null;

    if (boardOnly) {
      document.title = `${isToday ? T("오늘의 코딩 문제 순위표") : T("#{d} 코딩 문제 순위표", { d: date.slice(5) })} · ${c.title}`;
      const solveSec = existingTime ? existingTime.sec : 0;
      const solveTries = existingTime ? existingTime.tries : 1;
      const posted = isArenaPosted("code", date);
      const boardJumpBtn = isToday && dayNum(yesterday) >= dayNum(c.daily.start) ?
        `<a class="btn small" href="${dailyHref(cid, yesterday)}?board=1">${T("어제 (#{d})", { d: yesterday.slice(5) })}</a>` :
        !isToday ? `<a class="btn small" href="${dailyHref(cid)}?board=1">${T("오늘 (#{d})", { d: today.slice(5) })}</a>` : "";
      const solveBtnLabel = alreadyDone ? T("다시 풀어 보기") :
        isToday ? T("오늘의 코딩 문제 풀기") : T("#{d} 코딩 문제 풀기", { d: date.slice(5) });
      const promptMsg = isToday ?
        T("방금 통과 기록({t})을 오늘 순위표에 등록할까요?", { t: fmtDuration(solveSec) }) :
        T("방금 통과 기록({t})을 #{d} 순위표에 등록할까요?", { t: fmtDuration(solveSec), d: date.slice(5) });
      const nickHtml = alreadyDone && solveSec > 0 ?
        arenaNickBarHtml("daily-board", { promptMsg, postMode: true, posted, dateStr: date }) :
        arenaNickBarHtml("daily-board", { dateStr: date });
      main.innerHTML = `<div class="view">${crumbs}
        <div class="daily-bar">
          <div>
            <p class="eyebrow">${isToday ? `${T("오늘의 코딩 문제 순위표")} · ${esc(fmtDay(date))}` : `${T("#{d} 코딩 문제 순위표", { d: date.slice(5) })} · ${esc(fmtDay(date))}`}</p>
            <p class="tiny muted"><code>${esc(p.id)}</code> ${esc(p.title)} <span class="badge lv${p.level}">${levelName(p.level)}</span></p>
          </div>
          <div class="daily-bar-right"><a class="btn small primary" href="${dailyHref(cid, date)}" data-daily-from="board">${solveBtnLabel}</a>${boardJumpBtn}${dailyStripHtml(c, date, "board", "?board=1")}</div>
        </div>
        <div id="daily-board-only">${nickHtml}${codeBoardHtml(board, date, { canShare: alreadyDone })}</div>
        <div id="daily-archive-wrap" class="section"></div>
      </div>`;
      bindArenaNickBar(main, "daily-board", async (_label, action) => {
        if (action === "save" && alreadyDone && solveSec > 0) {
          markArenaPosted("code", date);
          await submitArenaCode(cid, date, p.id, solveSec, solveTries);
        }
        await viewDaily(cid, dateArg, query);
      }, date);
      bindPodiumMsgBar(main, date, async () => {
        await viewDaily(cid, dateArg, query);
      });
      bindDailyShareButtons(main, c, p, date, board);
      refreshDailyArchive(c, date);
      return;
    }

    const startedAt = Date.now();
    let tries = existingTime ? existingTime.tries : 0;
    const navJumpBtn = isToday && dayNum(yesterday) >= dayNum(c.daily.start) ?
      `<a class="btn small" href="${dailyHref(cid, yesterday)}" data-daily-from="yesterday">${T("어제 (#{d})", { d: yesterday.slice(5) })}</a>` :
      !isToday ? `<a class="btn small" href="${dailyHref(cid)}" data-daily-from="today">${T("오늘 (#{d})", { d: today.slice(5) })}</a>` : "";
    const boardLinkBtn = isArenaDaily ? `<a class="btn small" href="${dailyHref(cid, date)}?board=1">${T("순위표 · 지난 기록판")}</a>` : "";
    const topShareBtn = isArenaDaily ? `<button type="button" class="btn small ghost" data-daily-share="${esc(date)}">${shareIconSvg()} ${T("공유")}</button>` : "";

    const codeTotal = board ? (board.codeTotal ?? (board.code || []).length) : 0;
    const paceHtml = isArenaDaily ? dailyPaceHtml(date, rival, codeTotal, alreadyDone, existingTime) : "";
    const rivalBannerHtml = sharedRival ? `<section class="duel-invite daily-rival-banner" role="region" aria-label="${esc(T("기록 도전장"))}">
      <div class="daily-rival-row">
        ${arenaPixelAvatarSvg(sharedRival, { rank: sharedRival.rank >= 1 && sharedRival.rank <= 3 ? sharedRival.rank : 0 })}
        <div>
          <p class="eyebrow">DAILY CODING CHALLENGE · #${esc(date.slice(5))}</p>
          <h2>${esc(sharedRival.rank >= 1 ? T("{name}님의 #{r}위 기록({t})에 도전합니다!", { name: sharedRival.nick, r: sharedRival.rank, t: fmtDuration(sharedRival.sec) }) : T("{name}님의 완주 기록({t})에 도전합니다!", { name: sharedRival.nick, t: fmtDuration(sharedRival.sec) }))}</h2>
        </div>
      </div>
    </section>` : "";

    main.innerHTML = `<div class="view">${crumbs}
      <div class="daily-bar">
        <div><p class="eyebrow">${isToday ? `${T("오늘의 코딩 문제")} · ${esc(fmtDay(date))}` : T("{date}의 코딩 문제", { date: esc(fmtDay(date)) })}</p>
          <p class="tiny muted">${inl(c.daily.note)}${LANG === "en" ? ` ${T("날짜는 한국 시각 자정에 바뀝니다.")}` : ""}</p></div>
        <div class="daily-bar-right">${isArenaDaily ? `<span class="dm-timer" id="daily-live-timer">${alreadyDone && existingTime ? `✓ ${esc(fmtDuration(existingTime.sec))}` : "⏱ 00:00"}</span>` : ""}${topShareBtn}${boardLinkBtn}${navJumpBtn}${dailyStripHtml(c, date, "recent")}</div>
      </div>
      ${rivalBannerHtml}
      <div id="daily-pace-mount">${paceHtml}</div>
      ${again ? `<p class="small daily-note">${T("전에 푼 문제입니다. 시작 코드에서 다시 풀어 봅니다.")}` +
        `${old != null ? ` <button type="button" class="btn small ghost" data-act="old">${T("전에 쓴 코드 불러오기")}</button>` : ""}</p>` : ""}
      ${lazy ? `<p class="tiny muted">${T("휴대폰에서는 코드 칸을 누르거나 실행할 때 파이썬(약 13MB)을 받습니다.")}</p>` : ""}
      <div id="problem"></div>
      <div id="daily-done"></div>
    </div>`;
    if (isArenaDaily) bindDailyShareButtons($(".daily-bar", main), c, p, date, () => board);
    let solvedNowSec = alreadyDone && existingTime ? existingTime.sec : 0;
    const syncDailyPace = () => {
      if (!isArenaDaily || !rival) return;
      const curSec = solvedNowSec || Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      updateDailyPaceDom(rival, curSec, Boolean(solvedNowSec || alreadyDone));
    };
    if (isArenaDaily) {
      bindPacemakerToggle($("#daily-pace-mount", main), syncDailyPace);
      syncDailyPace();
    }
    let timerId = null;
    if (isArenaDaily && !alreadyDone) {
      timerId = setInterval(() => {
        const el = $("#daily-live-timer", main);
        const sec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        if (el) el.textContent = `⏱ ${fmtClock(sec)}`;
        if (rival) updateDailyPaceDom(rival, sec, false);
      }, 1000);
      setCleanup(() => { if (timerId) clearInterval(timerId); });
    }
    const view = mountCodeTest($("#problem"), c, p, {
      mode: "practice",
      lazyPy: lazy,
      onSubmit: (r) => {
        tries += 1;
        if (!r.ok) return;
        if (timerId) { clearInterval(timerId); timerId = null; }
        const sec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        if (isArenaDaily) {
          Store.update(() => {
            const sc = Store.course(cid);
            if (!sc.dailyTime) sc.dailyTime = {};
            if (!sc.dailyTime[date] || sec < sc.dailyTime[date].sec) {
              sc.dailyTime[date] = { sec, tries };
            }
          });
          solvedNowSec = Store.course(cid).dailyTime[date].sec;
          const tEl = $("#daily-live-timer", main);
          if (tEl) tEl.textContent = `✓ ${fmtDuration(solvedNowSec)}`;
          if (rival) updateDailyPaceDom(rival, solvedNowSec, true);
        }
        Store.markDaily(cid, date, p.id);
        showDailyDone(c, p, date, true, rival);
      },
    });
    const oldBtn = $('[data-act="old"]', main);
    if (oldBtn) {
      oldBtn.addEventListener("click", () => {
        if (norm(view.code()) !== norm(p.code) && !confirm(T("지금 쓴 코드를 지우고 전에 쓴 코드를 불러올까요?"))) return;
        view.setCode(old);
        oldBtn.disabled = true;
      });
    }
    if (alreadyDone) await showDailyDone(c, p, date, false, rival);
  }

  // ------------------------------------------------------------------ 화면: 처음(과목 목록)
  // 과목의 언어(courses.json과 과목 JSON의 lang, 없으면 ko)와 첫 화면에 보일지(hidden이 아니면 보인다)
  const langOfMeta = (m) => m.lang || "ko";
  const listedMeta = (m) => !m.hidden || onLocal;  // 로컬에서는 숨긴 과목도 보여 시험한다(SPEC 5절)
  // 최근에 풀었거나 시도한 문제 한 줄('이어서 풀기', 2026-11-21)
  function continueBarHtml(courses, filterCid = null) {
    let best = null;
    for (const c of courses) {
      if (filterCid && c.id !== filterCid) continue;
      const pMap = (Store.data.courses[c.id] || {}).p || {};
      for (const p of c.problems) {
        const r = pMap[p.id];
        if (!r || !r.at) continue;
        if (!best || r.at > best.at) best = { at: r.at, c, p, ok: r.s === 2 };
      }
    }
    if (!best) return "";
    const prefix = filterCid ? "" : `${esc(best.c.title)} · `;
    const pidTag = isTestCourse(best.c) ? `<span class="pid">${esc(best.p.id)}</span> ` : "";
    return `<div class="continue-bar"><div><span class="continue-label">${T("이어서 풀기")}</span>` +
      `<a class="continue-link" href="#/${esc(best.c.id)}/p/${esc(best.p.id)}">${prefix}${pidTag}${esc(best.p.title)} →</a></div>` +
      `<span class="tiny muted">${best.ok ? T("푼 문제") : T("풀던 문제")}</span></div>`;
  }

  function homeLiveBoardHtml(ctCourse, board) {
    if (!ctCourse) return "";
    const today = kstToday();
    const shortDay = today.slice(5);
    const entries = (board && board.code) || [];
    const total = board ? (board.codeTotal ?? entries.length) : 0;
    const weekTotal = board ? (Number(board.weekTotal) || 0) : 0;
    const prevChamp = board && board.prevChampion ? board.prevChampion : null;
    const streakers = (board && Array.isArray(board.streakers)) ? board.streakers : [];
    const myPid = getArenaPid();
    const { rows, myRank } = visibleBoardRows(entries, myPid, 3, total);
    const solveHref = dailyHref(ctCourse.id);
    const moreHref = `${dailyHref(ctCourse.id)}?board=1`;
    const baseSummary = myRank ? T("내 순위 {r}위 / {n}명", { r: myRank, n: total }) : T("오늘 등록 {n}명", { n: total });
    const summary = weekTotal > 0 ? `${baseSummary} · ${T("최근 7일 완주 {w}회", { w: weekTotal })}` : baseSummary;
    const medals = ["", "🥇", "🥈", "🥉"];
    const slotHtml = [1, 2, 3].map((r) => {
      const entry = entries[r - 1] || null;
      if (!entry) {
        if (r === 1 && total === 0 && prevChamp) {
          return `<li class="hb-slot rank-1 is-defending">
            ${arenaPixelAvatarSvg(prevChamp, { rank: 1 })}
            <span class="hb-slot-nick" title="${esc(prevChamp.nick)}"><span class="defend-badge">${T("지난 1위")}</span> ${esc(prevChamp.nick)}</span>
            <a class="hb-slot-empty-link" href="${esc(solveHref)}">${esc(T("첫 1위 도전"))} →</a>
            <div class="hb-step">${medals[1]} ${esc(T("{r}위", { r: 1 }))}</div>
          </li>`;
        }
        const cta = r === 1 && total === 0 ? `${T("첫 1위 도전")} →` : `${T("{r}위 도전", { r })} →`;
        return `<li class="hb-slot rank-${r} is-empty">
          ${arenaPixelAvatarSvg(null, { empty: true })}
          <a class="hb-slot-empty-link" href="${esc(solveHref)}">${esc(cta)}</a>
          <div class="hb-step">${medals[r]} ${esc(T("{r}위", { r }))}</div>
        </li>`;
      }
      const isMe = entry.playerId === myPid || Boolean(entry.isMe);
      const quote = arenaPodiumMsgText(isMe && entry.msgIdx == null ? getArenaPodiumMsg() : entry.msgIdx, LANG);
      const badges = `${isMe ? `<span class="me-tag">${T("나")}</span>` : ""}${arenaStreakChipHtml(entry, true)}${arenaMilestoneChipHtml(entry, { includeLocal: isMe })}`;
      const val = `${T("{n}회", { n: entry.tries || 1 })} · ${esc(fmtDuration(entry.sec))}`;
      return `<li class="hb-slot rank-${r}${isMe ? " is-me" : ""}">
        ${quote ? `<span class="hb-speech">${esc(quote)}</span>` : ""}
        ${arenaPixelAvatarSvg(entry, { rank: r, includeLocal: isMe })}
        <span class="hb-slot-nick" title="${esc(entry.nick)}">${esc(entry.nick)}</span>
        ${badges ? `<span class="hb-slot-badges">${badges}</span>` : ""}
        <span class="hb-slot-val">${val}</span>
        <div class="hb-step">${medals[r]} ${esc(T("{r}위", { r }))}</div>
      </li>`;
    }).join("");
    const myExtraRow = myRank > 3 ? (() => {
      const mine = rows.find((x) => x.entry.playerId === myPid || x.entry.isMe);
      if (!mine) return "";
      const val = `${T("{n}회", { n: mine.entry.tries || 1 })} · ${esc(fmtDuration(mine.entry.sec))}`;
      return `<li class="hb-me-extra is-me">
        <span class="hb-rank">${mine.rank}</span>
        ${arenaPixelAvatarSvg(mine.entry, { includeLocal: true })}
        <span class="hb-nick"><b>${esc(mine.entry.nick)}</b><span class="me-tag">${T("나")}</span>${arenaStreakChipHtml(mine.entry, true)}${arenaMilestoneChipHtml(mine.entry, { includeLocal: true })}</span>
        <span class="hb-val">${val}</span>
      </li>`;
    })() : "";
    const streakLine = arenaStreakLineHtml(streakers, "hb-streak-line");
    return `<div class="hb-head">
        <span class="hb-title">🏆 ${T("오늘의 순위")} <span class="hb-day">#${esc(shortDay)}</span></span>
        <span class="hb-head-actions"><span class="hb-sub-pill">${T("오늘의 코딩 문제")}</span><button type="button" class="hb-share-btn" data-daily-share="${esc(today)}">${shareIconSvg()}<span>${T("공유")}</span></button></span>
      </div>
      <ol class="hb-list hb-podium">${slotHtml}${myExtraRow}</ol>
      ${streakLine}
      <div class="hb-foot">
        <span class="muted">${esc(summary)}</span>
        <a class="arena-sublink" href="${esc(moreHref)}">${T("전체 순위 · 기록판")} →</a>
      </div>`;
  }

  async function viewHome() {
    document.title = T("파이썬 코딩 테스트 · 오늘의 코딩 문제");
    const todayForBoard = kstToday();
    const boardPromise = fetchArenaDaily(todayForBoard).catch(() => getCachedOrSeededDaily(todayForBoard));
    const index = (await getIndex()).filter((m) => langOfMeta(m) === LANG && listedMeta(m));
    const loadedCourses = await Promise.all(index.map((m) => getCourse(m.id)));  // 차례로 받지 않고 한꺼번에(2026-10-21 UI 검토)
    const ctCourse = loadedCourses.find((c) => isTestCourse(c)) || null;
    const fastBoard = ctCourse ? await Promise.race([boardPromise, new Promise((res) => setTimeout(() => res(null), 150))]) : null;
    let liveBoard = fastBoard || (ctCourse ? getCachedOrSeededDaily(todayForBoard) : null);
    const totalProblems = loadedCourses.reduce((sum, c) => sum + c.problems.length + (c.setProblems ? c.setProblems.length : 0), 0);
    const cards = [];
    for (let i = 0; i < index.length; i++) {
      const meta = index[i];
      const c = loadedCourses[i];
      const test = isTestCourse(c);
      const solved = solvedIn(meta.id, c.problems);
      const kinds = test ? [1, 2, 3].map((l) => `${levelName(l)} ${c.problems.filter((p) => p.level === l).length}`) :
        TYPE_ORDER.map((t) => `${typeName(t)} ${c.problems.filter((p) => p.type === t).length}`);
      cards.push(`<article class="card course-card">
        <p class="eyebrow">${esc(c.eyebrow)}${meta.hidden ? ` <span class="hidden-tag">hidden</span>` : ""}</p>
        <h2><a href="#/${esc(c.id)}">${esc(c.title)}</a></h2>
        <p class="subtitle">${esc(c.subtitle)}</p>
        <p class="course-desc">${inl(c.card || c.lead)}</p>
        <div class="course-foot">
          <p class="tiny muted course-kinds">${T("문제 {n}개", { n: c.problems.length })} · ${kinds.join(" · ")}</p>
          <div class="progress"><span style="width:${c.problems.length ? (100 * solved) / c.problems.length : 0}%"></span></div>
          <p class="tiny muted course-solved">${T("푼 문제 {k} / {n}", { k: solved, n: c.problems.length })}</p>
          <div class="actions">
            <a class="btn primary" href="#/${esc(c.id)}">${T("차례 보기")}</a>
            ${test ? `<a class="btn mint" href="#/${esc(c.id)}/exam">${T("모의 시험")}</a>` : c.ta === false ? "" : `<a class="btn mint" href="#/${esc(c.id)}/ta">${T("타임어택")}</a>`}
          </div>
        </div>
      </article>`);
    }
    let arenaHtml = "";
    const homeDp = ctCourse && ctCourse.daily ? ctCourse.byId[dailyPid(ctCourse, todayForBoard)] : null;
    if (ctCourse) {
      const today = todayForBoard;
      const dp = homeDp;
      const dpDone = ctCourse.daily ? Store.dailyDone(ctCourse.id, today) : false;
      const dpPill = dpDone ? `<span class="arena-pill done">✓ ${T("풀었음")}</span>` : `<span class="arena-pill">${esc(fmtDay(today))} · ${T("하루 1문제")}</span>`;
      arenaHtml = `<div class="arena-hero-single">
        <section class="card arena-card arena-card-single">
          <div class="arena-single-main">
            <div class="arena-card-top"><h2><a href="${dp ? dailyHref(ctCourse.id) : `#/${esc(ctCourse.id)}`}">${T("오늘의 코딩 문제")}</a></h2>${dpPill}</div>
            <p class="small">${T("날마다 모두에게 같은 코딩 문제 1개를 시간 제한 없이 풉니다.")}</p>
            ${dp ? `<p class="arena-targets"><code>${esc(dp.id)}</code><span>${esc(dp.title)}</span><span class="badge lv${dp.level}">${levelName(dp.level)}</span></p>` : ""}
          </div>
          <div class="actions">
            ${dp ? `<a class="btn small primary" href="${dailyHref(ctCourse.id)}" data-daily-from="home">${dpDone ? T("다시 풀어 보기") : T("오늘의 코딩 문제 풀기")}</a><a class="arena-sublink" href="${dailyHref(ctCourse.id)}?board=1">${T("순위표 · 지난 기록판")} →</a>` : `<a class="btn small primary" href="#/${esc(ctCourse.id)}">${T("차례 보기")}</a>`}
          </div>
        </section>
      </div>`;
    }
    // 영어 과목이 아직 하나도 열리지 않았으면 안내 한 줄과 한국어 첫 화면 링크만 둔다(SPEC 5절)
    const none = !cards.length && LANG === "en" ?
      `<p class="lead section">${T("아직 열린 영어 과목이 없습니다.")} <a href="#/">${T("한국어 첫 화면으로")}</a></p>` : "";
    const cont = cards.length ? continueBarHtml(loadedCourses) : "";
    const heroLead = `<p class="lead">${T("설치·가입 없이 하루 1문제 오늘의 코딩 문제로 실력을 확인하고, 기본기·데이터 시각화·코딩 테스트 문제를 바로 채점합니다.")}</p>`;
    main.innerHTML = `<div class="view">
      ${none ? `<p class="home-kicker">ZERO-INSTALL PYTHON · DAILY CODING CHALLENGE</p><h1>${T("파이썬 코딩 테스트")}</h1>${none}` : `
      <div class="home-hero-split">
        <div class="home-hero-copy">
          <p class="home-kicker">ZERO-INSTALL PYTHON · DAILY CODING CHALLENGE</p>
          <h1>${T("파이썬 코딩 테스트")}</h1>
          ${heroLead}
        </div>
        ${ctCourse ? `<aside class="home-board-box" id="home-live-board" aria-label="${T("오늘의 순위")}">${homeLiveBoardHtml(ctCourse, liveBoard)}</aside>` : ""}
      </div>
      ${cont}
      ${arenaHtml}
      <h2 class="home-sec-title">${T("체계적 실습 과정 · {n}문제", { n: totalProblems })}</h2>
      <div class="grid-2 course-grid">${cards.join("")}</div>`}
    </div>`;
    const mountHomeBoard = () => {
      const box = $("#home-live-board", main);
      if (!box || !ctCourse) return;
      box.innerHTML = homeLiveBoardHtml(ctCourse, liveBoard);
      if (homeDp) bindDailyShareButtons(box, ctCourse, homeDp, todayForBoard, () => liveBoard);
    };
    mountHomeBoard();
    if (ctCourse && homeDp) bindDailyShareButtons(main, ctCourse, homeDp, todayForBoard, () => liveBoard);
    if (ctCourse && !fastBoard) {
      boardPromise.then((b) => {
        if (!b || !$("#home-live-board", main)) return;
        liveBoard = b;
        mountHomeBoard();
      });
    }
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
    document.title = T("{title} · 파이썬 코딩 테스트", { title: c.title });
    const test = isTestCourse(c);
    const solved = solvedIn(cid, c.problems);
    const counts = TYPE_ORDER.map((t) => [t, c.problems.filter((p) => p.type === t).length]);
    const statsHtml = test ?
      [1, 2, 3].map((l) => `<span>${levelName(l)} <b>${c.problems.filter((p) => p.level === l).length}</b></span>`).join("") +
        `<span>${T("효율성 테스트가 있는 문제")} <b>${c.problems.filter(hasPerf).length}</b></span>` :
      counts.map(([t, n]) => `<span>${typeName(t)} <b>${n}</b></span>`).join("");
    const pkgNote = T("문제를 처음 열 때 matplotlib, pandas, seaborn을 한 번 내려받습니다(약 20MB). 한 번 받으면 브라우저가 기억해 다음부터 빨리 열립니다. 그림 글자(제목, 라벨, 범례)는 영어로 씁니다.") +
      (c.problems.some((q) => (q.packages || []).includes("plotly")) ? ` ${T("Plotly를 쓰는 문제는 처음 열 때 Plotly(약 10MB)를 한 번 더 받습니다.")}` : "");
    const secondMode = c.ta === false ? `
        <div class="card mode-card">
          <h2><span class="mode-icon ta">▦</span>${T("그래프 도구")}</h2>
          <p>${pkgNote}</p>
        </div>` : test ? `
        <div class="card mode-card">
          <h2><span class="mode-icon ta">⏱</span>${T("모의 시험")}</h2>
          <p>${T("무작위로 뽑거나 직접 고른 문제를 40~120분 안에, 또는 제한 없이 풉니다. 예시는 몇 번이든 실행하고, 끝날 때의 코드로 점수를 매깁니다.")}${c.sets.length ? ` ${T("시험 형식대로 만든 모의고사 세트도 있습니다.")}` : ""}</p>
          <div><a class="btn mint" href="#/${esc(cid)}/exam">${T("모의 시험 시작")}</a></div>
        </div>` : `
        <div class="card mode-card">
          <h2><span class="mode-icon ta">⏱</span>${T("타임어택")}</h2>
          <p>${T("무작위로 뽑거나 직접 고른 문제를 제한 시간 안에, 또는 제한 없이 풉니다. 실행해 보며 풀지, 실행 없이 풀지 고릅니다.")}${c.packages ? ` ${T("그래프 도구를 다 받은 뒤에 시계가 돕니다.")}` : ""}</p>
          <div><a class="btn mint" href="#/${esc(cid)}/ta">${T("타임어택 시작")}</a></div>
        </div>`;
    // 코딩 테스트의 '필요한 기초'가 가리키는 책 과목. 한국어는 『』로 묶는다
    const prereqBook = c.prereq ? `<a href="#/${esc(c.prereq.id)}">${LANG === "en" ? esc(c.prereq.title) : `『${esc(c.prereq.title)}』`}</a>` : "";
    const tip = c.packages ? `${T("지문과 목표 그림을 먼저 보고 무엇을 그릴지 정합니다. 실행하면 내 그림이 나오니 목표 그림과 비교한 뒤 채점합니다. 채점은 그림에서 값과 라벨을 읽어 비교합니다.")} ${pkgNote}` : test ?
      T("예시를 먼저 실행해 보고, 제한 사항에서 가장 작은 값과 가장 큰 값을 떠올린 뒤 제출합니다. 숨은 테스트는 입력을 보여 주지 않고 어떤 경우였는지만 알려 줍니다.") +
        (c.prereq ? ` ${T("막히면 문제 아래 '필요한 기초'에서 {book}의 해당 절로 갑니다.", { book: prereqBook })}` : "") :
      T("출력 예측과 빈칸 문제는 실행하기 전에 먼저 답을 적고, 채점한 뒤에 실행해서 대조합니다. 교재 1장의 예측, 실행, 대조 순서입니다.");
    const extras = c.problems.some((p) => p.solution) ? (test ? T("힌트와 모범 코드를") : T("힌트와 해설을")) : T("힌트를");
    const cont = continueBarHtml([c], cid);
    const jumpPlaceholder = test ? T("문제 번호나 제목 찾기 (예: ct1-01, 2.1)") : T("절 번호나 문제 제목 찾기 (예: 3.4)");
    const today = kstToday();
    const dp = c.daily ? c.byId[dailyPid(c, today)] : null;
    const dpDone = c.daily ? Store.dailyDone(cid, today) : false;
    const dailyModeCard = c.daily ? `<div class="card mode-card">
          <h2><span class="mode-icon daily" aria-hidden="true">☼</span>${T("오늘의 코딩 문제")}</h2>
          <p>${T("날마다 모두에게 같은 코딩 문제 1개가 열립니다. 시간 제한 없이 함수를 완성해 통과해 보세요.")}${dp ? `<br><span class="small muted"><code>${esc(dp.id)}</code> ${esc(dp.title)}${dpDone ? ` · ✓ ${T("풀었음")}` : ""}</span>` : ""}</p>
          <div class="actions"><a class="btn primary" href="${dailyHref(cid)}" data-daily-from="book">${dpDone ? T("다시 풀어 보기") : T("오늘의 코딩 문제 풀기")}</a>${dp && isTestCourse(c) ? `<button type="button" class="btn small ghost" data-daily-share="${esc(today)}">${shareIconSvg()} ${T("공유")}</button>` : ""}<a class="arena-sublink" href="${dailyHref(cid)}?board=1">${T("순위표 · 지난 기록판")} →</a></div>
        </div>` : "";
    main.innerHTML = `<div class="view">
      <div class="crumbs"><a href="${homeHref()}">← ${T("파이썬 코딩 테스트")}</a></div>
      <p class="eyebrow">${esc(c.eyebrow)}</p>
      <h1>${esc(c.title)}</h1>
      <p class="subtitle">${esc(c.subtitle)}</p>
      <p class="lead">${inl(c.lead)}</p>
      <div class="stats"><span>${T("문제 <b>{n}</b>개", { n: c.problems.length })}</span>${statsHtml}</div>
      ${cont}
      <div class="grid-2 section">
        <div class="card mode-card">
          <h2><span class="mode-icon practice">✎</span>${T("연습")}</h2>
          <p>${T("차례에서 장과 절을 골라 풀고 바로 채점합니다.")} ${T("막히면 {what} 함께 볼 수 있습니다.", { what: extras })}</p>
          <div class="actions"><a class="btn primary" href="#toc" data-scroll="toc">${T("차례 보기")}</a></div>
        </div>${secondMode}${dailyModeCard}${test ? `<div class="card mode-card">
          <h2><span class="mode-icon hunt" aria-hidden="true">⌖</span>${T("반례 찾기 연습")}</h2>
          <p>${T("예시는 통과하지만 틀린 풀이를 보고, 그 풀이가 틀리는 입력을 찾습니다.")}</p>
          <div class="actions"><a class="btn mint" href="#/${esc(cid)}/hunt">${T("반례 찾기 시작")}</a></div>
        </div>` : ""}
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
        <div class="quick-jump">
          <div class="quick-jump-row">
            <input type="search" data-jump-input placeholder="${esc(jumpPlaceholder)}" aria-label="${esc(jumpPlaceholder)}" autocomplete="off" spellcheck="false">
          </div>
          <ul class="quick-jump-hits" hidden></ul>
        </div>
        <div class="toc">${c.chapters.map((ch) => tocChapter(c, ch)).join("")}</div>
      </section>${test && c.sets.length ? mockSectionHtml(c) : ""}</div>`;
    if (c.daily && dp && isTestCourse(c)) bindDailyShareButtons(main, c, dp, today, null);
    const jumpIn = $("[data-jump-input]", main);
    const jumpHits = $(".quick-jump-hits", main);
    if (jumpIn && jumpHits) {
      const findMatches = (raw) => {
        const q = raw.trim().toLowerCase();
        if (!q) return [];
        const items = [];
        for (const ch of c.chapters) {
          for (const s of ch.sections) {
            if ((c.bySection[s.num] || []).length && (s.num.toLowerCase().startsWith(q) || s.title.toLowerCase().includes(q))) {
              items.push({ href: `#/${cid}/ch/${ch.num}/${s.num}`, label: `${s.num} ${s.title}`, sub: T("{n}문제", { n: c.bySection[s.num].length }) });
            }
          }
        }
        for (const p of c.problems) {
          if (p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)) {
            items.push({ href: `#/${cid}/p/${p.id}`, label: `${isTestCourse(c) ? `${p.id} · ` : ""}${p.title}`, sub: p.section || "" });
          }
          if (items.length >= 12) break;
        }
        return items.slice(0, 6);
      };
      jumpIn.addEventListener("input", () => {
        const hits = findMatches(jumpIn.value);
        if (!jumpIn.value.trim()) { jumpHits.hidden = true; jumpHits.innerHTML = ""; return; }
        jumpHits.hidden = false;
        jumpHits.innerHTML = hits.length ?
          hits.map((h) => `<li><a href="${esc(h.href)}"><span>${esc(h.label)}</span><span class="spacer"></span><span class="tiny muted">${esc(h.sub)}</span></a></li>`).join("") :
          `<li class="tiny muted" style="padding:6px 10px">${T("일치하는 문제나 절이 없습니다.")}</li>`;
      });
      jumpIn.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const first = $("a", jumpHits);
          if (first) { e.preventDefault(); location.hash = first.getAttribute("href"); }
        }
      });
    }
    $(".view", main).addEventListener("click", (e) => {
      const t = e.target.closest("[data-scroll]");
      if (!t) return;
      e.preventDefault();
      $(`#${t.dataset.scroll}`).scrollIntoView({ behavior: motion() });
    });
  }

  // ------------------------------------------------------------------ 반례 찾기(주관식 반례 확인) & 오늘의 순위표·별명 관리
  const huntCache = new Map();
  let HUNT = null;

  function huntHashSeed(str) {
    let h = 2166136261;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function huntRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function huntShuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 조합형 별명 선택 기본(실명·학번·욕설 원천 차단) & Supabase(서울 리전 ap-northeast-2) RPC + 로컬 미리보기 어댑터
  const SUPABASE_CONFIG = {
    url: "https://qvkzjtcgrloxfbialxma.supabase.co",
    anonKey: "sb_publishable_fUYDqQ4m5pdyS8WmvvWD9A_qta9sj2S",
    region: "ap-northeast-2",
    enabled: true,  // 장애·점검 시 false로 두면 보드만 숨기고 채점·연습은 그대로 동작한다
  };
  const SUPA_AUTH_KEY = "dhl-supabase-auth-v1";
  const ARENA_PID_KEY = "dhl-arena-pid-v1";
  const ARENA_COMBO_KEY = "dhl-arena-combo-v1";
  const ARENA_POSTED_KEY = "dhl-arena-posted-v1";
  const ARENA_PACE_FOLD_KEY = "dhl-arena-pace-folded";
  const ARENA_MSG_KEY = "dhl-arena-podium-msg-v1";
  const ARENA_LOCAL_DB_KEY = "dhl-arena-board-v1";

  const ARENA_ADJ_KO = ["침착한", "예리한", "기민한", "단단한", "꼼꼼한", "유쾌한", "집요한", "명쾌한", "담대한", "민첩한", "유연한", "묵직한", "반짝이는", "부지런한", "차분한", "끈기있는"];  // i18n:ok 영어판은 ARENA_ADJ_EN 대응표 사용
  const ARENA_ADJ_EN = [
    "Calm", "Sharp", "Swift", "Steady", "Careful", "Bright", "Focused", "Clear",
    "Bold", "Nimble", "Agile", "Solid", "Clever", "Diligent", "Quiet", "Patient",
  ];
  const ARENA_ITEM_KO = ["🍵 찻잔", "🧐 스카우터", "⚡ 번개띠", "🛡️ 방패", "👓 안경", "🕶️ 선글라스", "🔥 열정띠", "💡 전구", "🧣 머플러", "🪽 날개깃", "🌱 새싹", "🎩 모자", "✨ 별빛", "✏️ 연필", "🎧 헤드폰", "🎽 헤어밴드"];  // i18n:ok 영어판은 ARENA_ITEM_EN 대응표 사용
  const ARENA_ITEM_EN = [
    "🍵 Teacup", "🧐 Scouter", "⚡ Bolt Band", "🛡️ Shield", "👓 Glasses", "🕶️ Shades", "🔥 Flame Band", "💡 Bulb",
    "🧣 Scarf", "🪽 Wing Pin", "🌱 Sprout", "🎩 Top Hat", "✨ Sparkles", "✏️ Pencil", "🎧 Headphones", "🎽 Sweatband",
  ];
  const ARENA_MILE_DAYS = [3, 7, 14, 30];
  const ARENA_MILE_KO = ["📘 코딩 북", "🧥 완주 망토", "🛸 마법 발판", "✨ 마스터 오라"];  // i18n:ok 영어판은 ARENA_MILE_EN 대응표 사용
  const ARENA_MILE_EN = ["📘 Code Book", "🧥 Clear Cape", "🛸 Hover Pad", "✨ Master Aura"];
  const ARENA_MILE_SHORT_KO = ["📘 북", "🧥 망토", "🛸 발판", "✨ 오라"];  // i18n:ok 영어판은 ARENA_MILE_SHORT_EN 대응표 사용
  const ARENA_MILE_SHORT_EN = ["📘 Book", "🧥 Cape", "🛸 Pad", "✨ Aura"];
  const ARENA_PODIUM_MSGS_KO = ["", "경계값에서 잡았습니다!", "한 번에 통과!", "기록 깨러 오세요!", "오늘 문제 재밌네요!", "침착하게 조건 확인!", "파이썬 한 줄의 힘!", "어제보다 빨라졌어요!", "숨은 반례 완료!"];  // i18n:ok 영어판은 ARENA_PODIUM_MSGS_EN 대응표 사용
  const ARENA_PODIUM_MSGS_EN = [
    "", "Caught at the boundary!", "First-try clear!", "Come beat my time!", "Fun problem today!",
    "Checked every limit!", "Clean Python wins!", "Faster than yesterday!", "Hidden case cleared!",
  ];
  const ARENA_NOUN_KO = ["파이썬곰", "해시여우", "이분탐색매", "스택부엉이", "큐수달", "튜플다람쥐", "재귀토끼", "그리디호랑이", "그래프늑대", "정렬펭귄", "집합고래", "슬라이싱고양이", "포인터제비", "경계값고슴도치", "디버깅강아지", "인덱스거북이"];  // i18n:ok 영어판은 ARENA_NOUN_EN 대응표 사용
  const ARENA_NOUN_EN = [
    "PyBear", "HashFox", "BinaryHawk", "StackOwl", "QueueOtter", "TupleSquirrel", "RecurseHare", "GreedyTiger",
    "GraphWolf", "SortPenguin", "SetWhale", "SliceCat", "PointerSwallow", "EdgeHedgehog", "DebugHound", "IndexTurtle",
  ];
  let arenaMemPid = "";
  let arenaMemCombo = null;
  let arenaMemPosted = {};
  let arenaMemPaceFolded = false;
  let arenaMemMsgIdx = 0;
  const arenaBoardCache = new Map();
  const arenaChapterCache = new Map();

  function shareIconSvg() {
    return '<svg class="ico-share" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2h4v4"/><path d="M14 2L7.5 8.5"/><path d="M13 9.5v3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5v-8A1.5 1.5 0 0 1 3.5 3h3"/></svg>';
  }

  function validMsgIdx(n) {
    return Number.isInteger(n) && n >= 0 && n < ARENA_PODIUM_MSGS_KO.length;
  }

  function arenaItemLabel(adjIdx, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const idx = validComboIdx(adjIdx) ? adjIdx : 0;
    return (lang === "en" ? ARENA_ITEM_EN : ARENA_ITEM_KO)[idx];
  }

  function arenaPodiumMsgText(msgIdx, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const idx = Number(msgIdx);
    if (!validMsgIdx(idx) || idx === 0) return "";
    return (lang === "en" ? ARENA_PODIUM_MSGS_EN : ARENA_PODIUM_MSGS_KO)[idx] || "";
  }

  function resolveComboIndices(entryOrCombo) {
    if (entryOrCombo && validComboIdx(entryOrCombo.adjIdx) && validComboIdx(entryOrCombo.nounIdx)) {
      return { adjIdx: entryOrCombo.adjIdx, nounIdx: entryOrCombo.nounIdx };
    }
    const seed = huntHashSeed(`av:${(entryOrCombo && (entryOrCombo.playerId || entryOrCombo.nick)) || "0"}`);
    return { adjIdx: seed % 16, nounIdx: (seed >>> 4) % 16 };
  }

  function localClearDaysCount() {
    try {
      const courses = (typeof Store !== "undefined" && Store && Store.data && Store.data.courses) || {};
      const dSet = new Set([
        ...Object.keys((courses["coding-test"] && courses["coding-test"].daily) || {}),
        ...Object.keys((courses["coding-test-en"] && courses["coding-test-en"].daily) || {}),
      ]);
      return dSet.size;
    } catch (e) { return 0; }
  }

  function resolveClearDays(entryOrCombo, opts = {}) {
    const explicit = Number(opts && opts.clearDays) || 0;
    const tot = Number(entryOrCombo && entryOrCombo.totalDays) || 0;
    const stk = Number(entryOrCombo && entryOrCombo.streakDays) || 0;
    const isMine = Boolean(opts && opts.includeLocal) || Boolean(entryOrCombo && entryOrCombo.isMe);
    const loc = isMine ? localClearDaysCount() : 0;
    return Math.max(0, explicit, tot, stk, loc);
  }

  function arenaMilestoneState(days, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const d = Math.max(0, Number(days) || 0);
    const fullArr = lang === "en" ? ARENA_MILE_EN : ARENA_MILE_KO;
    const shortArr = lang === "en" ? ARENA_MILE_SHORT_EN : ARENA_MILE_SHORT_KO;
    const unlocked = [];
    let next = null;
    for (let i = 0; i < ARENA_MILE_DAYS.length; i++) {
      const req = ARENA_MILE_DAYS[i];
      const item = { days: req, label: fullArr[i], shortLabel: shortArr[i] };
      if (d >= req) unlocked.push(item);
      else if (!next) next = { ...item, remain: req - d };
    }
    return { days: d, unlocked, next };
  }

  function buildArenaPixelGrid(entryOrCombo, opts = {}) {
    const W = 18, H = 18;
    const grid = Array.from({ length: H }, () => Array(W).fill(""));
    const rect = (x0, y0, w, h, col) => {
      for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
        for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) grid[y][x] = col;
      }
    };
    const px = (x, y, col) => { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = col; };

    if (opts.empty) {
      rect(6, 5, 6, 6, "#cbd5e1");
      rect(5, 6, 8, 4, "#cbd5e1");
      rect(6, 12, 6, 4, "#cbd5e1");
      rect(8, 6, 2, 1, "#64748b");
      px(9, 7, "#64748b");
      px(8, 8, "#64748b");
      px(8, 10, "#64748b");
      return grid;
    }

    const { adjIdx, nounIdx } = resolveComboIndices(entryOrCombo);
    const rank = Number(opts.rank) || 0;
    const clearDays = resolveClearDays(entryOrCombo, opts);
    const SPECIES = [
      { c: "#b45309", m: "#fef3c7", b: "#fde68a", ear: "bear" },      // 0 파이썬곰
      { c: "#f97316", m: "#ffffff", b: "#ffedd5", ear: "fox" },       // 1 해시여우
      { c: "#2563eb", m: "#dbeafe", b: "#eff6ff", ear: "hawk" },      // 2 이분탐색매
      { c: "#7c3aed", m: "#f5f3ff", b: "#ede9fe", ear: "owl" },       // 3 스택부엉이
      { c: "#92400e", m: "#fef3c7", b: "#fde68a", ear: "otter" },     // 4 큐수달
      { c: "#d97706", m: "#fef3c7", b: "#fde68a", ear: "squirrel" },  // 5 튜플다람쥐
      { c: "#f8fafc", m: "#fce7f3", b: "#ffffff", ear: "hare" },      // 6 재귀토끼
      { c: "#f59e0b", m: "#ffffff", b: "#fef3c7", ear: "tiger" },     // 7 그리디호랑이
      { c: "#64748b", m: "#f1f5f9", b: "#e2e8f0", ear: "wolf" },      // 8 그래프늑대
      { c: "#334155", m: "#ffffff", b: "#ffffff", ear: "penguin" },   // 9 정렬펭귄
      { c: "#0ea5e9", m: "#e0f2fe", b: "#f0f9ff", ear: "whale" },     // 10 집합고래
      { c: "#fb923c", m: "#ffedd5", b: "#fff7ed", ear: "cat" },       // 11 슬라이싱고양이
      { c: "#3730a3", m: "#ef4444", b: "#ffffff", ear: "swallow" },   // 12 포인터제비
      { c: "#fde68a", m: "#fef3c7", b: "#fef9c3", ear: "hedgehog" },  // 13 경계값고슴도치
      { c: "#fcd34d", m: "#fffbeb", b: "#fef3c7", ear: "hound" },     // 14 디버깅강아지
      { c: "#22c55e", m: "#bbf7d0", b: "#fef08a", ear: "turtle" },    // 15 인덱스거북이
    ];
    const sp = SPECIES[nounIdx] || SPECIES[0];

    // 등껍질·꼬리·가시 뒤쪽 실루엣
    if (sp.ear === "hedgehog") {
      rect(4, 4, 10, 4, "#78350f");
      px(5, 3, "#78350f"); px(7, 3, "#78350f"); px(10, 3, "#78350f"); px(12, 3, "#78350f");
    } else if (sp.ear === "squirrel") {
      rect(13, 11, 2, 4, "#b45309"); rect(14, 10, 2, 3, "#f59e0b");
    } else if (sp.ear === "turtle") {
      rect(4, 11, 10, 4, "#15803d");
    }

    // 귀·벼슬·물줄기
    if (sp.ear === "bear" || sp.ear === "tiger") {
      rect(4, 4, 2, 2, sp.c); rect(12, 4, 2, 2, sp.c);
      px(5, 5, sp.m); px(12, 5, sp.m);
    } else if (sp.ear === "fox" || sp.ear === "cat" || sp.ear === "wolf") {
      rect(5, 3, 2, 3, sp.c); rect(11, 3, 2, 3, sp.c);
      px(5, 4, sp.ear === "cat" ? "#fda4af" : sp.m); px(12, 4, sp.ear === "cat" ? "#fda4af" : sp.m);
    } else if (sp.ear === "hare") {
      rect(6, 2, 2, 4, sp.c); rect(10, 2, 2, 4, sp.c);
      rect(6, 3, 1, 2, "#f472b6"); rect(11, 3, 1, 2, "#f472b6");
    } else if (sp.ear === "owl") {
      rect(4, 4, 2, 1, "#6d28d9"); rect(12, 4, 2, 1, "#6d28d9");
    } else if (sp.ear === "otter") {
      rect(4, 6, 1, 2, sp.c); rect(13, 6, 1, 2, sp.c);
    } else if (sp.ear === "hound") {
      rect(4, 6, 1, 4, "#92400e"); rect(13, 6, 1, 4, "#92400e");
    } else if (sp.ear === "hawk") {
      rect(8, 3, 2, 2, "#1d4ed8");
    }

    // 머리·몸통·손발
    rect(6, 5, 6, 7, sp.c);
    rect(5, 6, 8, 5, sp.c);
    rect(6, 12, 6, 4, sp.c);
    rect(7, 12, 4, 3, sp.b);
    px(5, 13, sp.c);
    if (rank === 1) { px(12, 11, sp.c); px(12, 12, sp.c); } else { px(12, 13, sp.c); }
    rect(6, 16, 2, 1, sp.ear === "penguin" ? "#facc15" : sp.c);
    rect(10, 16, 2, 1, sp.ear === "penguin" ? "#facc15" : sp.c);

    // 종별 얼굴 무늬
    if (sp.ear === "penguin") {
      rect(6, 7, 6, 4, "#ffffff");
      rect(8, 9, 2, 1, "#facc15");
    } else if (sp.ear === "hawk" || sp.ear === "owl" || sp.ear === "swallow") {
      if (sp.ear === "owl") { rect(6, 7, 2, 2, "#ffffff"); rect(10, 7, 2, 2, "#ffffff"); }
      if (sp.ear === "swallow") rect(7, 10, 4, 2, "#ef4444");
      rect(8, 9, 2, 1, "#f59e0b");
    } else if (sp.ear === "whale") {
      rect(6, 10, 6, 2, "#f0f9ff");
      px(4, 13, "#0284c7"); px(13, 13, "#0284c7");
    } else {
      rect(7, 9, 4, 2, sp.m);
      rect(8, 9, 2, 1, sp.ear === "hare" || sp.ear === "cat" ? "#f43f5e" : "#1e293b");
    }
    if (sp.ear === "bear") { rect(6, 12, 3, 1, "#2563eb"); rect(9, 12, 3, 1, "#facc15"); }
    if (sp.ear === "tiger") { rect(8, 5, 2, 1, "#1e293b"); px(5, 8, "#1e293b"); px(12, 8, "#1e293b"); }
    if (sp.ear === "hound") px(9, 11, "#fb7185");

    // 기본 눈
    px(6, 8, "#0f172a"); px(11, 8, "#0f172a");

    // 1px 도트 외곽선 자동 처리
    const baseSnap = grid.map((r) => r.slice());
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (baseSnap[y][x]) continue;
        if ((y > 0 && baseSnap[y - 1][x]) || (y + 1 < H && baseSnap[y + 1][x]) ||
            (x > 0 && baseSnap[y][x - 1]) || (x + 1 < W && baseSnap[y][x + 1])) {
          grid[y][x] = "#1e293b";
        }
      }
    }
    if (sp.ear === "whale" && rank === 0) {
      px(8, 2, "#38bdf8"); px(9, 2, "#38bdf8"); px(7, 1, "#7dd3fc"); px(10, 1, "#7dd3fc");
    }

    // 성격(수식어 0..15) 장착 도트 아이템 레이어
    switch (adjIdx) {
      case 0: // 침착한: 반눈 + 찻잔
        px(6, 7, sp.c); px(11, 7, sp.c);
        rect(13, 12, 3, 2, "#ffffff"); rect(13, 12, 3, 1, "#2dd4bf"); px(14, 10, "#99f6e4");
        break;
      case 1: // 예리한: 청록 스카우터
        rect(10, 7, 3, 2, "#06b6d4"); px(11, 8, "#ecfeff");
        break;
      case 2: // 기민한: 번개 머리띠
        rect(5, 6, 8, 1, "#fde047"); rect(8, 5, 2, 2, "#f97316");
        break;
      case 3: // 단단한: 기사 방패
        rect(12, 12, 4, 4, "#94a3b8"); rect(13, 13, 2, 2, "#2563eb");
        break;
      case 4: // 꼼꼼한: 뿔테 안경
        rect(5, 7, 4, 3, "#0f172a"); rect(9, 7, 4, 3, "#0f172a");
        rect(6, 8, 2, 1, "#bae6fd"); rect(10, 8, 2, 1, "#bae6fd");
        break;
      case 5: // 유쾌한: 선글라스
        rect(5, 7, 8, 1, "#0f172a"); rect(6, 8, 2, 1, "#0f172a"); rect(10, 8, 2, 1, "#0f172a");
        px(6, 7, "#ffffff"); px(10, 7, "#ffffff");
        break;
      case 6: // 집요한: 열정 머리띠
        rect(5, 6, 8, 1, "#ef4444"); px(13, 6, "#ef4444"); px(14, 7, "#ef4444");
        rect(8, 4, 2, 2, "#fb923c");
        break;
      case 7: // 명쾌한: 반짝 전구
        rect(14, 3, 2, 2, "#fde047"); rect(14, 5, 2, 1, "#94a3b8");
        break;
      case 8: // 담대한: 붉은 머플러
        rect(5, 11, 8, 1, "#ef4444"); rect(13, 11, 2, 3, "#dc2626");
        break;
      case 9: // 민첩한: 날개 깃
        rect(2, 6, 2, 2, "#e0f2fe"); rect(14, 6, 2, 2, "#e0f2fe");
        px(2, 6, "#38bdf8"); px(15, 6, "#38bdf8");
        break;
      case 10: // 유연한: 초록 새싹
        if (rank >= 1 && rank <= 3) {
          px(13, 2, "#22c55e"); px(12, 1, "#4ade80"); px(14, 1, "#4ade80");
        } else {
          rect(8, 3, 2, 2, "#16a34a"); px(7, 2, "#4ade80"); px(10, 2, "#4ade80");
        }
        break;
      case 11: // 묵직한: 마법/중절 모자
        rect(4, 4, 10, 1, "#1e3a8a");
        if (!rank) { rect(6, 2, 6, 2, "#1e3a8a"); rect(6, 3, 6, 1, "#fbbf24"); }
        break;
      case 12: // 반짝이는: 황금 별빛
        px(2, 4, "#facc15"); px(1, 5, "#fde047"); px(3, 5, "#fde047"); px(2, 6, "#facc15");
        px(15, 4, "#facc15"); px(14, 5, "#fde047"); px(16, 5, "#fde047"); px(15, 6, "#facc15");
        break;
      case 13: // 부지런한: 노란 연필
        px(13, 7, "#facc15"); px(14, 6, "#facc15"); px(15, 5, "#f472b6");
        break;
      case 14: // 차분한: 민트 헤드폰
        rect(5, 5, 8, 1, "#0f766e"); rect(3, 7, 2, 3, "#2dd4bf"); rect(13, 7, 2, 3, "#2dd4bf");
        break;
      case 15: // 끈기있는: 스포츠 헤어밴드
        rect(5, 6, 8, 1, "#ffffff"); rect(7, 6, 4, 1, "#10b981");
        break;
    }

    // 완주 일수 성장형 공통 도트 아이템 레이어(3일 코딩 북 · 7일 완주 망토 · 14일 마법 발판 · 30일 마스터 오라)
    if (clearDays >= 7) {
      for (let cy = 12; cy <= 15; cy++) {
        if (!grid[cy][4]) grid[cy][4] = cy === 15 ? "#2dd4bf" : "#0d9488";
        if (cy >= 13 && !grid[cy][13]) grid[cy][13] = cy === 15 ? "#2dd4bf" : "#0d9488";
      }
    }
    if (clearDays >= 3) {
      rect(1, 12, 3, 3, "#1d4ed8");
      rect(1, 11, 3, 1, "#f8fafc");
      px(2, 13, "#93c5fd");
    }
    if (clearDays >= 14) {
      rect(4, 17, 10, 1, "#0d9488");
      rect(6, 17, 6, 1, "#2dd4bf");
      rect(8, 17, 2, 1, "#fde047");
    }
    if (clearDays >= 30) {
      [[2, 2, "#fbbf24"], [1, 3, "#fde047"], [3, 3, "#38bdf8"], [15, 2, "#fbbf24"], [16, 3, "#fde047"], [14, 3, "#38bdf8"]].forEach(([ox, oy, ocol]) => {
        if (!grid[oy][ox]) grid[oy][ox] = ocol;
      });
    }

    // 1~3위 시상대 입상 왕관·메달 레이어
    if (rank === 1) {
      px(6, 0, "#f59e0b"); px(8, 0, "#f59e0b"); px(9, 0, "#f59e0b"); px(11, 0, "#f59e0b");
      rect(6, 1, 6, 2, "#fbbf24"); rect(8, 1, 2, 1, "#ef4444");
      rect(8, 13, 2, 2, "#fbbf24");
    } else if (rank === 2) {
      px(6, 1, "#94a3b8"); px(8, 0, "#cbd5e1"); px(9, 0, "#cbd5e1"); px(11, 1, "#94a3b8");
      rect(6, 1, 6, 2, "#e2e8f0"); rect(8, 1, 2, 1, "#0284c7");
      rect(8, 13, 2, 2, "#cbd5e1");
    } else if (rank === 3) {
      rect(7, 1, 4, 2, "#fb923c"); rect(8, 1, 2, 1, "#fef08a");
      rect(8, 13, 2, 2, "#ea580c");
    }
    return grid;
  }

  function arenaPixelAvatarSvg(entryOrCombo, opts = {}) {
    const grid = buildArenaPixelGrid(entryOrCombo, opts);
    const H = grid.length, W = grid[0].length;
    let rects = "";
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const col = grid[y][x];
        if (!col) { x += 1; continue; }
        let run = 1;
        while (x + run < W && grid[y][x + run] === col) run += 1;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${col}"/>`;
        x += run;
      }
    }
    return `<svg class="px-avatar" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
  }

  function arenaMilestoneChipHtml(entry, opts = {}) {
    const d = resolveClearDays(entry, opts);
    if (d < 3) return "";
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const st = arenaMilestoneState(d, lang);
    if (!st.unlocked.length) return "";
    const latest = st.unlocked[st.unlocked.length - 1];
    const allNames = st.unlocked.map((x) => x.label).join(" · ");
    return `<span class="mile-chip" title="${esc(T("완주 {d}일 공통 아이템: {items}", { d, items: allNames }))}">${esc(latest.shortLabel)}${st.unlocked.length > 1 ? `+${st.unlocked.length - 1}` : ""}</span>`;
  }

  function arenaMilestoneProgressHtml(clearDays) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const st = arenaMilestoneState(clearDays, lang);
    const fullArr = lang === "en" ? ARENA_MILE_EN : ARENA_MILE_KO;
    const sub = st.next ?
      T("완주 {d}일 · 다음 공통 아이템 '{item}'까지 {r}일", { d: st.days, item: st.next.label, r: st.next.remain }) :
      T("완주 {d}일 · 모든 공통 아이템 장착 완료!", { d: st.days });
    const stepsHtml = ARENA_MILE_DAYS.map((req, idx) => {
      const done = st.days >= req;
      return `<span class="mile-step${done ? " is-unlocked" : ""}">${done ? "✓ " : ""}${esc(T("{d}일 {item}", { d: req, item: fullArr[idx] }))}</span>`;
    }).join("");
    return `<div class="mile-progress-box" data-mile-progress>
      <div class="mile-progress-head">
        <span class="mile-progress-title">🎁 ${T("완주 성장 아이템")}</span>
        <span class="small muted">${esc(sub)}</span>
      </div>
      <div class="mile-step-list">${stepsHtml}</div>
    </div>`;
  }

  function arenaMedalChipHtml(entry) {
    if (!entry) return "";
    const gold = Number(entry.goldCount) || 0;
    const pod = Number(entry.podiumCount) || 0;
    if (gold > 0) {
      return `<span class="medal-chip" title="${esc(T("누적 1위 {g}회 · 입상 {p}회", { g: gold, p: Math.max(gold, pod) }))}">🥇×${gold}</span>`;
    }
    if (pod > 0) {
      return `<span class="medal-chip" title="${esc(T("누적 1~3위 입상 {p}회", { p: pod }))}">🏅×${pod}</span>`;
    }
    return "";
  }

  function arenaStreakChipHtml(entry, compact = false) {
    if (!entry) return "";
    const streak = Number(entry.streakDays) || 0;
    const total = Number(entry.totalDays) || 0;
    if (streak >= 3) {
      return `<span class="streak-chip is-hot" title="${esc(T("{n}일 연속 개근 중 (누적 {t}일)", { n: streak, t: Math.max(streak, total) }))}">🔥${compact ? `${streak}` : ` ${T("{n}일 개근", { n: streak })}`}</span>`;
    }
    if (streak === 2) {
      return `<span class="streak-chip" title="${esc(T("{n}일 연속 완주 중", { n: 2 }))}">🌱${compact ? "2" : ` ${T("{n}일 연속", { n: 2 })}`}</span>`;
    }
    if (total >= 2) {
      return `<span class="streak-chip" title="${esc(T("누적 {t}일 완주", { t: total }))}">📅${compact ? `${total}` : ` ${T("누적 {n}일", { n: total })}`}</span>`;
    }
    return "";
  }

  function arenaStreakLineHtml(streakers, cls = "board-streak-bar") {
    if (!Array.isArray(streakers) || !streakers.length) return "";
    const items = streakers.slice(0, 3).map((s) => {
      const st = Number(s.streakDays) || 0;
      const tot = Number(s.totalDays) || 0;
      const tag = st >= 3 ? T("{n}일 개근", { n: st }) : st === 2 ? T("{n}일 연속", { n: 2 }) : T("누적 {n}일", { n: tot });
      return `${esc(s.nick)} (${esc(tag)})`;
    }).join(" · ");
    return `<p class="${cls}"><span>🔥 <b>${T("개근 · 출석")}:</b> ${items}</span></p>`;
  }

  function cleanArenaNick(raw) {
    const s = String(raw ?? "").replace(/[\u0000-\u001f\u007f~<>`"']/g, "").replace(/\s+/g, " ").trim();
    return s.length >= 2 && s.length <= 24 ? s : "";
  }

  function validComboIdx(n) {
    return Number.isInteger(n) && n >= 0 && n < 16;
  }

  function arenaTagOf(pid) {
    return 10 + (huntHashSeed(`tag:${pid}`) % 90);
  }

  function formatComboNick(adjIdx, nounIdx, tag, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    if (!validComboIdx(adjIdx) || !validComboIdx(nounIdx)) return "";
    const adjs = lang === "en" ? ARENA_ADJ_EN : ARENA_ADJ_KO;
    const nouns = lang === "en" ? ARENA_NOUN_EN : ARENA_NOUN_KO;
    const cleanTag = Number.isInteger(tag) && tag >= 10 && tag <= 99 ? tag : 42;
    return `${adjs[adjIdx]}${nouns[nounIdx]}#${cleanTag}`;
  }

  function encodeComboCode(combo) {
    if (!combo || !validComboIdx(combo.adjIdx) || !validComboIdx(combo.nounIdx)) return "";
    const cleanTag = Number.isInteger(combo.tag) && combo.tag >= 10 && combo.tag <= 99 ? combo.tag : 42;
    return `c${combo.adjIdx}.${combo.nounIdx}.${cleanTag}`;
  }

  function decodeComboOrNick(token, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const m = /^c(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(String(token ?? "").trim());
    if (m) {
      const a = Number(m[1]), n = Number(m[2]), t = Number(m[3]);
      if (validComboIdx(a) && validComboIdx(n) && t >= 10 && t <= 99) {
        return formatComboNick(a, n, t, lang);
      }
    }
    const clean = cleanArenaNick(token);
    return lang === "en" && /[\uac00-\ud7a3\u3131-\u318e]/.test(clean) ? "" : clean;
  }

  function entryDisplayNick(entry, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    if (!entry) return "";
    if (validComboIdx(entry.adjIdx) && validComboIdx(entry.nounIdx)) {
      return formatComboNick(entry.adjIdx, entry.nounIdx, entry.tag || arenaTagOf(entry.playerId || ""), lang);
    }
    return cleanArenaNick(entry.nick || "");
  }

  // Supabase Anonymous Auth + RPC 경량 클라이언트(외부 SDK 무의존)
  const isSupabaseActive = () => Boolean(
    SUPABASE_CONFIG.enabled &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.anonKey &&
    !(typeof window !== "undefined" && window.__ARENA_FORCE_LOCAL)
  );

  function stampSessionExpiry(s) {
    if (s && !s.expires_at && Number.isFinite(Number(s.expires_in))) {
      s.expires_at = Math.floor(Date.now() / 1000) + Number(s.expires_in);
    }
    return s;
  }

  async function supaEnsureSession(allowCreate = true) {
    if (!isSupabaseActive() || typeof fetch === "undefined") return null;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SUPA_AUTH_KEY) || "null"); } catch (e) { saved = null; }
    const nowSec = Math.floor(Date.now() / 1000);
    if (saved && saved.access_token && saved.expires_at && saved.expires_at > nowSec + 60) {
      return saved;
    }
    const headers = { "Content-Type": "application/json", apikey: SUPABASE_CONFIG.anonKey };
    if (saved && saved.refresh_token) {
      try {
        const rr = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers,
          body: JSON.stringify({ refresh_token: saved.refresh_token }),
        });
        if (rr.ok) {
          const next = stampSessionExpiry(await rr.json());
          try { localStorage.setItem(SUPA_AUTH_KEY, JSON.stringify(next)); } catch (e) { /* 폴백 */ }
          return next;
        }
      } catch (e) { /* 폴백 */ }
    }
    if (!allowCreate) return null;
    const sr = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: {} }),
    });
    if (!sr.ok) return null;
    const session = stampSessionExpiry(await sr.json());
    try { localStorage.setItem(SUPA_AUTH_KEY, JSON.stringify(session)); } catch (e) { /* 폴백 */ }
    return session;
  }

  async function supaRpc(fnName, params = {}, requireAuth = false) {
    const session = await supaEnsureSession(requireAuth);
    if (requireAuth && (!session || !session.access_token)) throw new Error("supabase auth");
    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_CONFIG.anonKey,
    };
    if (session && session.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    } else if (SUPABASE_CONFIG.anonKey.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${SUPABASE_CONFIG.anonKey}`;
    }
    const r = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${fnName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error(`rpc ${fnName} ${r.status}`);
    return r.json();
  }

  function getArenaPid() {
    try {
      if (typeof localStorage !== "undefined") {
        const supa = JSON.parse(localStorage.getItem(SUPA_AUTH_KEY) || "null");
        if (supa && supa.user && supa.user.id) return String(supa.user.id);
        let v = localStorage.getItem(ARENA_PID_KEY);
        if (!v) {
          v = `p-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
          localStorage.setItem(ARENA_PID_KEY, v);
        }
        return v;
      }
    } catch (e) { /* 사생활 보호 창 폴백 */ }
    if (!arenaMemPid) arenaMemPid = `p-${Math.random().toString(36).slice(2, 10)}`;
    return arenaMemPid;
  }

  function getArenaCombo() {
    try {
      const fromStore = Store && Store.setting ? Store.setting("arenaCombo") : null;
      if (fromStore && validComboIdx(fromStore.adjIdx) && validComboIdx(fromStore.nounIdx)) {
        return { adjIdx: fromStore.adjIdx, nounIdx: fromStore.nounIdx, tag: fromStore.tag || arenaTagOf(getArenaPid()) };
      }
      if (typeof localStorage !== "undefined") {
        const raw = JSON.parse(localStorage.getItem(ARENA_COMBO_KEY) || "null");
        if (raw && validComboIdx(raw.adjIdx) && validComboIdx(raw.nounIdx)) {
          return { adjIdx: raw.adjIdx, nounIdx: raw.nounIdx, tag: raw.tag || arenaTagOf(getArenaPid()) };
        }
      }
    } catch (e) { /* 폴백 */ }
    return arenaMemCombo;
  }

  function getArenaNick(lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const combo = getArenaCombo();
    return combo ? formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang) : "";
  }

  function defaultDraftCombo() {
    const pid = getArenaPid();
    const h = huntHashSeed(`draft:${pid}`);
    return { adjIdx: h % 16, nounIdx: (h >>> 4) % 16, tag: arenaTagOf(pid) };
  }

  function randomComboPair(curAdj = -1, curNoun = -1) {
    let adjIdx = Math.floor(Math.random() * 16);
    let nounIdx = Math.floor(Math.random() * 16);
    if (adjIdx === curAdj && nounIdx === curNoun) nounIdx = (nounIdx + 1) % 16;
    return { adjIdx, nounIdx, tag: arenaTagOf(getArenaPid()) };
  }

  function readArenaPosted() {
    try {
      if (typeof localStorage !== "undefined") {
        const d = JSON.parse(localStorage.getItem(ARENA_POSTED_KEY) || "{}");
        if (d && typeof d === "object") return d;
      }
    } catch (e) { /* 폴백 */ }
    return arenaMemPosted;
  }

  function isArenaPosted(kind, dateStr = kstToday()) {
    if (!kind || !dateStr) return false;
    const d = readArenaPosted();
    return Boolean(d[`${dateStr}:${kind}`] && getArenaCombo());
  }

  function markArenaPosted(kind, dateStr = kstToday()) {
    if (!kind || !dateStr) return;
    const d = { ...readArenaPosted(), [`${dateStr}:${kind}`]: 1 };
    arenaMemPosted = d;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(ARENA_POSTED_KEY, JSON.stringify(d));
    } catch (e) { /* 폴백 */ }
  }

  function sortHuntBoard(list) {
    return list.slice().sort((a, b) => (b.score - a.score) || (a.sec - b.sec) || ((a.at || 0) - (b.at || 0)));
  }

  function sortCodeBoard(list) {
    return list.slice().sort((a, b) => (a.sec - b.sec) || ((a.tries || 1) - (b.tries || 1)) || ((a.at || 0) - (b.at || 0)));
  }

  function pickDailyPacemaker(entries, myPlayerId) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const idx = entries.findIndex((e) => e.playerId === myPlayerId || e.isMe);
    if (idx > 0) return entries[idx - 1];
    if (idx === 0) return entries.length > 1 ? entries[1] : null;
    return entries[Math.floor(entries.length / 2)];
  }

  function isPaceFolded() {
    try {
      if (typeof localStorage !== "undefined") return localStorage.getItem(ARENA_PACE_FOLD_KEY) === "1";
    } catch (e) { /* 폴백 */ }
    return arenaMemPaceFolded;
  }

  function setPaceFolded(folded) {
    arenaMemPaceFolded = Boolean(folded);
    try {
      if (typeof localStorage !== "undefined") {
        if (folded) localStorage.setItem(ARENA_PACE_FOLD_KEY, "1");
        else localStorage.removeItem(ARENA_PACE_FOLD_KEY);
      }
    } catch (e) { /* 폴백 */ }
  }

  function paceEmptyBannerHtml(dateStr, total) {
    if (!dateStr) return "";
    const isToday = dateStr === kstToday();
    const msg = total > 0 ?
      T("현재 단독 1위 · 내 최고 기록 경신에 도전해 보세요") :
      isToday ? T("아직 오늘 완주자 0명 · 지금 풀면 첫 1위") : T("아직 #{d} 완주자 0명 · 지금 풀면 첫 1위", { d: dateStr.slice(5) });
    return `<div class="pace-empty-line" role="note"><span>🏆 ${esc(msg)}</span></div>`;
  }

  function pacemakerBarHtml(opts) {
    const folded = isPaceFolded();
    const pfx = opts.prefix || "ghost";
    const initStatus = opts.initStatus || "";
    const running = opts.oppRunning !== false;
    return `<div class="ghost-bar${folded ? " is-folded" : ""}" data-pace-bar aria-live="off">
      <button type="button" class="ghost-bar-head" data-pace-toggle aria-expanded="${!folded}">
        <span class="ghost-tag">${opts.icon || "🎯"} ${esc(opts.title)}</span>
        <span class="ghost-head-right">
          <span class="ghost-status-text" id="${pfx}-status" data-active-text="${esc(initStatus)}">${esc(folded ? T("페이스메이커 접힘") : initStatus)}</span>
          <span class="ghost-fold-pill" data-fold-pill>${folded ? `${T("펼치기")} ▾` : `${T("접기")} ▴`}</span>
        </span>
      </button>
      <div class="ghost-tracks" data-pace-tracks ${folded ? "hidden" : ""}>
        <div class="ghost-track-row"><span class="ghost-runner-label" title="${esc(opts.myLabel)}">${opts.myAvatar || ""}${esc(opts.myLabel)}</span><div class="ghost-meter"><span id="${pfx}-my-bar" style="width:${opts.myWidth || "0%"}"></span></div><span id="${pfx}-my-count">${esc(opts.myCount)}</span></div>
        <div class="ghost-track-row"><span class="ghost-runner-label" title="${esc(opts.oppLabel)}">${opts.oppAvatar || ""}${esc(opts.oppLabel)}</span><div class="ghost-meter is-opp${running ? " is-running" : ""}" data-opp-meter><span id="${pfx}-opp-bar" style="width:${opts.oppWidth || "0%"}"></span></div><span id="${pfx}-opp-count">${esc(opts.oppCount)}</span></div>
      </div>
    </div>`;
  }

  function bindPacemakerToggle(root, onSync) {
    if (!root) return;
    const btn = $("[data-pace-toggle]", root);
    const bar = $("[data-pace-bar]", root);
    const tracks = $("[data-pace-tracks]", root);
    const pill = $("[data-fold-pill]", root);
    const statusEl = $(".ghost-status-text", root);
    if (!btn || !bar || !tracks) return;
    btn.addEventListener("click", () => {
      const nextFolded = !bar.classList.contains("is-folded");
      setPaceFolded(nextFolded);
      bar.classList.toggle("is-folded", nextFolded);
      btn.setAttribute("aria-expanded", String(!nextFolded));
      tracks.hidden = nextFolded;
      if (pill) pill.textContent = nextFolded ? `${T("펼치기")} ▾` : `${T("접기")} ▴`;
      if (nextFolded && statusEl) {
        statusEl.textContent = T("페이스메이커 접힘");
      } else if (onSync) {
        onSync();
      } else if (statusEl && statusEl.dataset.activeText) {
        statusEl.textContent = statusEl.dataset.activeText;
      }
    });
  }

  function dailyPaceHtml(dateStr, rival, codeTotal, alreadyDone, existingTime) {
    if (!rival) return paceEmptyBannerHtml(dateStr, codeTotal);
    const isToday = dateStr === kstToday();
    const title = isToday ? T("오늘 기준 기록 비교") : T("#{d} 기준 기록 비교", { d: dateStr.slice(5) });
    const myLabel = getArenaNick() || T("나");
    const oppLabel = rival.nick || T("도전자");
    const oppSec = Math.max(1, rival.sec || 60);
    const mySec = existingTime ? existingTime.sec : 0;
    const initStatus = alreadyDone && mySec > 0 ?
      (mySec < oppSec ?
        T("기준 기록 {name}({ot})보다 빨리 풀었습니다!", { name: oppLabel, ot: fmtDuration(oppSec) }) :
        T("내 통과 시간 {mt} · 기준 기록 {name}({ot})", { mt: fmtDuration(mySec), name: oppLabel, ot: fmtDuration(oppSec) })) :
      T("기준 기록 {name} ({t})", { name: oppLabel, t: fmtDuration(oppSec) });
    const myCombo = getArenaCombo() || defaultDraftCombo();
    return pacemakerBarHtml({
      prefix: "code-ghost",
      icon: "🎯",
      title,
      myLabel,
      oppLabel,
      myAvatar: arenaPixelAvatarSvg(myCombo),
      oppAvatar: arenaPixelAvatarSvg(rival, { rank: rival.rank && rival.rank <= 3 ? rival.rank : 0 }),
      myWidth: alreadyDone ? "100%" : "0%",
      oppWidth: alreadyDone ? "100%" : "0%",
      oppRunning: !alreadyDone,
      myCount: alreadyDone ? (mySec ? `✓ ${fmtDuration(mySec)}` : `✓ ${T("풀었음")}`) : T("풀이 중"),
      oppCount: alreadyDone ? T("{t} 완주", { t: fmtDuration(oppSec) }) : `${fmtDuration(0)} / ${fmtDuration(oppSec)}`,
      initStatus,
    });
  }

  function updateDailyPaceDom(rival, sec, isDone) {
    if (!rival) return;
    const oppLabel = rival.nick || T("도전자");
    const oppSec = Math.max(1, rival.sec || 60);
    const barRoot = $("#daily-pace-mount .ghost-bar", main);
    const myBar = $("#code-ghost-my-bar", main);
    const oppBar = $("#code-ghost-opp-bar", main);
    const oppMeter = $("#daily-pace-mount [data-opp-meter]", main);
    const myCount = $("#code-ghost-my-count", main);
    const oppCount = $("#code-ghost-opp-count", main);
    const statusEl = $("#code-ghost-status", main);
    const oppFinished = isDone || sec >= oppSec;
    if (myBar) myBar.style.width = isDone ? "100%" : "0%";
    if (oppBar) oppBar.style.width = `${isDone ? 100 : Math.min(100, Math.round((sec / oppSec) * 100))}%`;
    if (oppMeter) oppMeter.classList.toggle("is-running", !oppFinished);
    if (myCount) myCount.textContent = isDone ? `✓ ${fmtDuration(sec)}` : T("풀이 중");
    if (oppCount) {
      oppCount.textContent = oppFinished ?
        T("{t} 완주", { t: fmtDuration(oppSec) }) :
        `${fmtDuration(sec)} / ${fmtDuration(oppSec)}`;
    }
    const activeText = isDone ?
      (sec < oppSec ?
        T("기준 기록 {name}({ot})보다 빨리 풀었습니다!", { name: oppLabel, ot: fmtDuration(oppSec) }) :
        T("내 통과 시간 {mt} · 기준 기록 {name}({ot})", { mt: fmtDuration(sec), name: oppLabel, ot: fmtDuration(oppSec) })) :
      oppFinished ?
        T("{name} 완주 ({t}) · 내 속도로 끝까지 풀어 보세요", { name: oppLabel, t: fmtDuration(oppSec) }) :
        T("기준 기록 {name} ({t})", { name: oppLabel, t: fmtDuration(oppSec) });
    if (statusEl) {
      statusEl.dataset.activeText = activeText;
      if (!barRoot || !barRoot.classList.contains("is-folded")) statusEl.textContent = activeText;
    }
  }

  function readLocalArenaDb() {
    try {
      if (typeof localStorage !== "undefined") {
        const d = JSON.parse(localStorage.getItem(ARENA_LOCAL_DB_KEY) || "{}");
        return d && typeof d === "object" ? d : {};
      }
    } catch (e) { /* 폴백 */ }
    return {};
  }

  function writeLocalArenaDb(db) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(ARENA_LOCAL_DB_KEY, JSON.stringify(db));
    } catch (e) { /* 폴백 */ }
  }

  function normalizeBoardEntries(board, lang = "ko") {
    const dateStr = (board && board.date) || kstToday();
    const hunt = sortHuntBoard(((board && board.hunt) || []).filter((x) => x && x.playerId).map((x) => ({
      ...x,
      nick: entryDisplayNick(x, lang),
    })));
    const code = sortCodeBoard(((board && board.code) || []).filter((x) => x && x.playerId).map((x) => ({
      ...x,
      nick: entryDisplayNick(x, lang),
    })));
    const streakers = ((board && board.streakers) || []).filter((x) => x && x.playerId).map((x) => ({
      ...x,
      nick: entryDisplayNick(x, lang),
    }));
    const prevRaw = board && board.prevChampion;
    const prevChampion = prevRaw && prevRaw.playerId ? {
      ...prevRaw,
      nick: entryDisplayNick(prevRaw, lang),
    } : null;
    return {
      date: dateStr,
      hunt,
      code,
      huntTotal: Math.max(Number(board && board.huntTotal) || 0, hunt.length),
      codeTotal: Math.max(Number(board && board.codeTotal) || 0, code.length),
      weekTotal: Math.max(Number(board && board.weekTotal) || 0, code.length),
      streakers,
      prevChampion,
    };
  }

  function getArenaPodiumMsg() {
    try {
      const fromStore = Store && Store.setting ? Store.setting("arenaMsgIdx") : null;
      if (validMsgIdx(fromStore)) return fromStore;
      if (typeof localStorage !== "undefined") {
        const raw = Number(localStorage.getItem(ARENA_MSG_KEY) || "0");
        if (validMsgIdx(raw)) return raw;
      }
    } catch (e) { /* 폴백 */ }
    return arenaMemMsgIdx;
  }

  async function setArenaPodiumMsg(msgIdx, dateStr = kstToday()) {
    const clean = validMsgIdx(Number(msgIdx)) ? Number(msgIdx) : 0;
    arenaMemMsgIdx = clean;
    try {
      if (typeof localStorage !== "undefined") {
        if (clean > 0) localStorage.setItem(ARENA_MSG_KEY, String(clean));
        else localStorage.removeItem(ARENA_MSG_KEY);
      }
      if (Store && Store.setting) Store.setting("arenaMsgIdx", clean);
    } catch (e) { /* 폴백 */ }

    const pid = getArenaPid();
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const db = readLocalArenaDb();
    for (const d of Object.values(db)) {
      if (d && d.hunt && d.hunt[pid]) d.hunt[pid].msgIdx = clean;
      if (d && d.code && d.code[pid]) d.code[pid].msgIdx = clean;
    }
    writeLocalArenaDb(db);
    arenaBoardCache.clear();

    if (isSupabaseActive()) {
      try { await supaRpc("rpc_set_arena_podium_msg", { p_msg: clean }, true); } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "podium_msg", date: dateStr, lang, playerId: pid, msgIdx: clean }),
        });
        if (r.ok) {
          const data = normalizeBoardEntries(await r.json(), lang);
          arenaBoardCache.set(`${dateStr}:${lang}`, data);
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    return clean;
  }

  function buildLocalDailyBoard(dateStr, lang = "ko") {
    const db = readLocalArenaDb();
    const targetNum = dayNum(dateStr);
    const goldByPid = {};
    const podByPid = {};
    const daysByPid = {};
    const profileByPid = {};
    let weekTotal = 0;
    let prevChampRaw = null;
    let prevChampNum = -1;

    for (const [dKey, dVal] of Object.entries(db)) {
      const dNum = dayNum(dKey);
      const hArr = sortHuntBoard(Object.values((dVal && dVal.hunt) || {}));
      hArr.slice(0, 3).forEach((rec, i) => {
        podByPid[rec.playerId] = (podByPid[rec.playerId] || 0) + 1;
        if (i === 0) goldByPid[rec.playerId] = (goldByPid[rec.playerId] || 0) + 1;
      });
      const cArr = sortCodeBoard(Object.values((dVal && dVal.code) || {}));
      cArr.slice(0, 3).forEach((rec, i) => {
        podByPid[rec.playerId] = (podByPid[rec.playerId] || 0) + 1;
        if (i === 0) goldByPid[rec.playerId] = (goldByPid[rec.playerId] || 0) + 1;
      });
      if (dNum <= targetNum) {
        const dayPids = new Set([...hArr.map((r) => r.playerId), ...cArr.map((r) => r.playerId)]);
        if (dNum >= targetNum - 6) weekTotal += dayPids.size;
        for (const rec of [...cArr, ...hArr]) {
          profileByPid[rec.playerId] = rec;
          if (!daysByPid[rec.playerId]) daysByPid[rec.playerId] = new Set();
          daysByPid[rec.playerId].add(dNum);
        }
        if (dNum < targetNum && dNum >= targetNum - 7 && cArr.length && dNum > prevChampNum) {
          prevChampNum = dNum;
          prevChampRaw = { ...cArr[0], date: dKey };
        }
      }
    }

    const totalDaysByPid = {};
    const streakByPid = {};
    for (const [pid, dSet] of Object.entries(daysByPid)) {
      totalDaysByPid[pid] = dSet.size;
      let cur = dSet.has(targetNum) ? targetNum : dSet.has(targetNum - 1) ? targetNum - 1 : -99;
      let run = 0;
      while (cur >= 0 && dSet.has(cur)) { run += 1; cur -= 1; }
      streakByPid[pid] = run;
    }

    const streakers = Object.keys(daysByPid)
      .filter((pid) => (streakByPid[pid] || 0) >= 2 || (totalDaysByPid[pid] || 0) >= 2)
      .sort((a, b) => (streakByPid[b] - streakByPid[a]) || (totalDaysByPid[b] - totalDaysByPid[a]))
      .slice(0, 3)
      .map((pid) => ({
        ...profileByPid[pid],
        playerId: pid,
        nick: entryDisplayNick(profileByPid[pid], lang),
        streakDays: streakByPid[pid] || 0,
        totalDays: totalDaysByPid[pid] || 0,
      }));

    const day = db[dateStr] || { hunt: {}, code: {} };
    const hunt = sortHuntBoard(Object.values(day.hunt || {}).map((rec) => ({
      ...rec,
      nick: entryDisplayNick(rec, lang),
      goldCount: goldByPid[rec.playerId] || 0,
      podiumCount: podByPid[rec.playerId] || 0,
      streakDays: streakByPid[rec.playerId] || 1,
      totalDays: totalDaysByPid[rec.playerId] || 1,
    }))).map((rec, idx) => ({ ...rec, rank: idx + 1, msgIdx: idx < 3 ? (rec.msgIdx || 0) : 0 }));
    const code = sortCodeBoard(Object.values(day.code || {}).map((rec) => ({
      ...rec,
      nick: entryDisplayNick(rec, lang),
      goldCount: goldByPid[rec.playerId] || 0,
      podiumCount: podByPid[rec.playerId] || 0,
      streakDays: streakByPid[rec.playerId] || 1,
      totalDays: totalDaysByPid[rec.playerId] || 1,
    }))).map((rec, idx) => ({ ...rec, rank: idx + 1, msgIdx: idx < 3 ? (rec.msgIdx || 0) : 0 }));
    return {
      date: dateStr,
      hunt,
      code,
      huntTotal: hunt.length,
      codeTotal: code.length,
      weekTotal,
      streakers,
      prevChampion: prevChampRaw ? { ...prevChampRaw, nick: entryDisplayNick(prevChampRaw, lang) } : null,
    };
  }

  async function setArenaCombo(adjIdx, nounIdx, dateStr = kstToday()) {
    if (!validComboIdx(adjIdx) || !validComboIdx(nounIdx)) return null;
    let tag = arenaTagOf(getArenaPid());
    if (isSupabaseActive()) {
      try {
        const res = await supaRpc("rpc_register_arena_nick", { p_adj: adjIdx, p_noun: nounIdx }, true);
        if (res && Number.isInteger(res.tag)) tag = res.tag;
      } catch (e) { /* 오프라인 폴백 */ }
    }
    const combo = { adjIdx, nounIdx, tag };
    arenaMemCombo = combo;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(ARENA_COMBO_KEY, JSON.stringify(combo));
      if (Store && Store.setting) Store.setting("arenaCombo", combo);
    } catch (e) { /* 폴백 */ }

    const pid = getArenaPid();
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const nick = formatComboNick(adjIdx, nounIdx, tag, lang);
    const db = readLocalArenaDb();
    for (const d of Object.values(db)) {
      if (d && d.hunt && d.hunt[pid]) Object.assign(d.hunt[pid], { adjIdx, nounIdx, tag, nick });
      if (d && d.code && d.code[pid]) Object.assign(d.code[pid], { adjIdx, nounIdx, tag, nick });
    }
    writeLocalArenaDb(db);

    if (!isSupabaseActive() && typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "rename", date: dateStr, lang, playerId: pid, adjIdx, nounIdx, tag, nick }),
        });
        if (r.ok) {
          const data = normalizeBoardEntries(await r.json(), lang);
          arenaBoardCache.set(`${dateStr}:${lang}`, data);
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    return combo;
  }

  const arenaArchiveCache = new Map();

  function localizeTopRec(top, lang) {
    if (!top || typeof top !== "object") return null;
    if (validComboIdx(top.adjIdx) && validComboIdx(top.nounIdx)) {
      return { ...top, nick: formatComboNick(top.adjIdx, top.nounIdx, top.tag, lang) };
    }
    return { ...top, nick: cleanArenaNick(top.nick) || "Player" };
  }

  function buildLocalArchive(days = 10, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const today = kstToday();
    const tNum = dayNum(today);
    const minNum = Math.max(dayNum("2026-10-21"), tNum - (days - 1));
    const myPid = getArenaPid();
    const out = [];
    for (let n = tNum; n >= minNum; n--) {
      const d = dayStr(n);
      const b = buildLocalDailyBoard(d, lang);
      const hMeIdx = b.hunt.findIndex((e) => e.playerId === myPid || e.isMe);
      const cMeIdx = b.code.findIndex((e) => e.playerId === myPid || e.isMe);
      out.push({
        date: d,
        huntTotal: b.huntTotal ?? b.hunt.length,
        huntTop: b.hunt[0] ? { ...b.hunt[0] } : null,
        huntMe: hMeIdx >= 0 ? { rank: hMeIdx + 1, score: b.hunt[hMeIdx].score, sec: b.hunt[hMeIdx].sec } : null,
        codeTotal: b.codeTotal ?? b.code.length,
        codeTop: b.code[0] ? { ...b.code[0] } : null,
        codeMe: cMeIdx >= 0 ? { rank: cMeIdx + 1, sec: b.code[cMeIdx].sec, tries: b.code[cMeIdx].tries || 1 } : null,
      });
    }
    return { today, days: out };
  }

  function normalizeArchivePayload(raw, days = 10, lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    if (!raw || !Array.isArray(raw.days)) return buildLocalArchive(days, lang);
    return {
      today: raw.today || kstToday(),
      days: raw.days.map((item) => ({
        date: item.date,
        huntTotal: Number(item.huntTotal) || 0,
        huntTop: localizeTopRec(item.huntTop, lang),
        huntMe: item.huntMe || null,
        codeTotal: Number(item.codeTotal) || 0,
        codeTop: localizeTopRec(item.codeTop, lang),
        codeMe: item.codeMe || null,
      })),
    };
  }

  async function fetchArenaArchive(days = 10) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const key = `${days}:${lang}`;
    if (arenaArchiveCache.has(key)) return arenaArchiveCache.get(key);
    if (isSupabaseActive()) {
      try {
        const data = normalizeArchivePayload(await supaRpc("rpc_get_arena_archive", { p_days: days }), days, lang);
        arenaArchiveCache.set(key, data);
        return data;
      } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch(`api/arena/archive?days=${encodeURIComponent(days)}&lang=${encodeURIComponent(lang)}`);
        if (r.ok) {
          const data = normalizeArchivePayload(await r.json(), days, lang);
          arenaArchiveCache.set(key, data);
          return data;
        }
      } catch (e) { /* 폴백 */ }
    }
    const local = buildLocalArchive(days, lang);
    arenaArchiveCache.set(key, local);
    return local;
  }

  async function deleteArenaData(dateStr = kstToday()) {
    const pid = getArenaPid();
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    arenaMemCombo = null;
    arenaMemPosted = {};
    arenaMemMsgIdx = 0;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(ARENA_COMBO_KEY);
        localStorage.removeItem(ARENA_POSTED_KEY);
        localStorage.removeItem(ARENA_MSG_KEY);
      }
      if (Store && Store.setting) {
        Store.setting("arenaCombo", null);
        Store.setting("arenaMsgIdx", null);
      }
    } catch (e) { /* 폴백 */ }
    const db = readLocalArenaDb();
    for (const [k, d] of Object.entries(db)) {
      if (k === "__chapters" && d && typeof d === "object") {
        for (const bucket of Object.values(d)) {
          if (bucket && typeof bucket === "object") delete bucket[pid];
        }
        continue;
      }
      if (d && d.hunt) delete d.hunt[pid];
      if (d && d.code) delete d.code[pid];
    }
    writeLocalArenaDb(db);
    arenaBoardCache.clear();
    arenaArchiveCache.clear();
    arenaChapterCache.clear();

    if (isSupabaseActive()) {
      try { await supaRpc("rpc_delete_my_arena_data", {}, true); } catch (e) { /* 무시 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "delete", date: dateStr, lang, playerId: pid }),
        });
        if (r.ok) {
          const data = normalizeBoardEntries(await r.json(), lang);
          arenaBoardCache.set(`${dateStr}:${lang}`, data);
        }
      } catch (e) { /* 폴백 */ }
    }
  }

  async function fetchArenaDaily(dateStr = kstToday()) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const key = `${dateStr}:${lang}`;
    if (isSupabaseActive()) {
      try {
        const data = normalizeBoardEntries(await supaRpc("rpc_get_daily_board", { p_date: dateStr }), lang);
        arenaBoardCache.set(key, data);
        return data;
      } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch(`api/arena/daily?date=${encodeURIComponent(dateStr)}&lang=${encodeURIComponent(lang)}`);
        if (r.ok) {
          const data = normalizeBoardEntries(await r.json(), lang);
          arenaBoardCache.set(key, data);
          return data;
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    const local = buildLocalDailyBoard(dateStr, lang);
    arenaBoardCache.set(key, local);
    return local;
  }

  function getCachedOrSeededDaily(dateStr = kstToday()) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    return arenaBoardCache.get(`${dateStr}:${lang}`) || buildLocalDailyBoard(dateStr, lang);
  }

  function huntSplits(run) {
    let prev = 1;
    return run.items.map((it, idx) => {
      const raw = Number.isFinite(it.cumSec) && it.cumSec > 0 ? Math.round(it.cumSec) : prev + (idx + 1) * 8;
      prev = Math.max(prev, Math.min(3600, raw));
      return prev;
    });
  }

  async function submitArenaHunt(cid, dateStr, run) {
    const combo = getArenaCombo();
    if (!combo || !dateStr) return fetchArenaDaily(dateStr);
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const pid = getArenaPid();
    const nick = formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang);
    const score = huntScore(run);
    const sec = run.totalSec || huntElapsedSec(run);
    const splits = huntSplits(run);
    const tiles = huntTileCodes(run);

    const db = readLocalArenaDb();
    if (!db[dateStr]) db[dateStr] = { hunt: {}, code: {} };
    const prev = db[dateStr].hunt[pid];
    if (!prev || score > prev.score || (score === prev.score && sec < prev.sec)) {
      db[dateStr].hunt[pid] = { playerId: pid, adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick, score, sec, splits, tiles, at: Date.now() };
    } else {
      Object.assign(prev, { adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick });
    }
    writeLocalArenaDb(db);

    arenaArchiveCache.clear();
    if (isSupabaseActive()) {
      try {
        await supaRpc("rpc_register_arena_nick", { p_adj: combo.adjIdx, p_noun: combo.nounIdx }, true);
        const data = normalizeBoardEntries(
          await supaRpc("rpc_submit_daily_hunt", { p_cid: cid, p_score: score, p_sec: sec, p_splits: splits, p_tiles: tiles, p_date: dateStr }, true),
          lang,
        );
        arenaBoardCache.set(`${dateStr}:${lang}`, data);
        return data;
      } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "hunt", cid, date: dateStr, lang, playerId: pid,
            adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick, score, sec, splits, tiles,
          }),
        });
        if (r.ok) {
          const data = normalizeBoardEntries(await r.json(), lang);
          arenaBoardCache.set(`${dateStr}:${lang}`, data);
          return data;
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    const local = buildLocalDailyBoard(dateStr, lang);
    arenaBoardCache.set(`${dateStr}:${lang}`, local);
    return local;
  }

  async function submitArenaCode(cid, dateStr, problemId, sec, tries = 1) {
    const combo = getArenaCombo();
    if (!combo || !dateStr) return fetchArenaDaily(dateStr);
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const pid = getArenaPid();
    const nick = formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang);
    const cleanSec = Math.max(1, Math.min(7200, Math.round(sec || 1)));
    const cleanTries = Math.max(1, Math.round(tries || 1));

    const db = readLocalArenaDb();
    if (!db[dateStr]) db[dateStr] = { hunt: {}, code: {} };
    const prev = db[dateStr].code[pid];
    if (!prev || cleanSec < prev.sec || (cleanSec === prev.sec && cleanTries < prev.tries)) {
      db[dateStr].code[pid] = { playerId: pid, adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick, sec: cleanSec, tries: cleanTries, at: Date.now() };
    } else {
      Object.assign(prev, { adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick });
    }
    writeLocalArenaDb(db);

    arenaArchiveCache.clear();
    if (isSupabaseActive()) {
      try {
        await supaRpc("rpc_register_arena_nick", { p_adj: combo.adjIdx, p_noun: combo.nounIdx }, true);
        const data = normalizeBoardEntries(
          await supaRpc("rpc_submit_daily_code", { p_cid: cid, p_pid: problemId, p_sec: cleanSec, p_tries: cleanTries, p_date: dateStr }, true),
          lang,
        );
        arenaBoardCache.set(`${dateStr}:${lang}`, data);
        return data;
      } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "code", cid, date: dateStr, lang, pid: problemId, playerId: pid,
            adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick, sec: cleanSec, tries: cleanTries,
          }),
        });
        if (r.ok) {
          const data = normalizeBoardEntries(await r.json(), lang);
          arenaBoardCache.set(`${dateStr}:${lang}`, data);
          return data;
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    const local = buildLocalDailyBoard(dateStr, lang);
    arenaBoardCache.set(`${dateStr}:${lang}`, local);
    return local;
  }

  function arenaNickBarHtml(prefix, opts = {}) {
    if (!SUPABASE_CONFIG.enabled) return "";
    const cfg = typeof opts === "string" ? { promptMsg: opts, postMode: Boolean(opts), posted: false } : (opts || {});
    const saved = getArenaCombo();
    // 문제를 풀기 전 화면(postMode가 아닐 때)에는 이미 등록한 별명이 있을 때만 관리 막대를 보여 준다
    if (!cfg.postMode && !saved) return "";
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const adjs = lang === "en" ? ARENA_ADJ_EN : ARENA_ADJ_KO;
    const nouns = lang === "en" ? ARENA_NOUN_EN : ARENA_NOUN_KO;
    const draft = saved || defaultDraftCombo();
    const nick = saved ? formatComboNick(saved.adjIdx, saved.nounIdx, saved.tag, lang) : "";
    const askPost = Boolean(cfg.postMode && !cfg.posted);
    const adjOpts = adjs.map((w, i) => `<option value="${i}"${i === draft.adjIdx ? " selected" : ""}>${esc(w)}</option>`).join("");
    const nounOpts = nouns.map((w, i) => `<option value="${i}"${i === draft.nounIdx ? " selected" : ""}>${esc(w)}</option>`).join("");
    const itemTxt = arenaItemLabel(draft.adjIdx, lang);
    const mileChip = arenaMilestoneChipHtml(draft, { includeLocal: true });
    return `<div class="arena-nick-bar${askPost ? " is-prompt" : ""}" data-nick-box="${esc(prefix)}">
      <div class="arena-nick-left">
        <span class="nick-char-preview" data-nick-preview>
          <span data-nick-avatar>${arenaPixelAvatarSvg(draft, { includeLocal: true })}</span>
          <span class="nick-item-chip" data-nick-item>${esc(T("아이템 {item}", { item: itemTxt }))}</span>${mileChip}
        </span>
        <span class="arena-nick-label">${askPost ? esc(cfg.promptMsg || T("방금 기록을 오늘 순위표에 등록할까요?")) : T("내 순위표 별명")}</span>
        ${askPost ? "" : `<span class="arena-nick-badge" data-nick-current>${esc(nick)}</span>`}
      </div>
      <div class="arena-nick-form" data-nick-editor ${askPost ? "" : "hidden"}>
        <select class="arena-nick-select" data-nick-adj aria-label="${T("수식어 고르기")}">${adjOpts}</select>
        <select class="arena-nick-select" data-nick-noun aria-label="${T("별명 명사 고르기")}">${nounOpts}</select>
        <span class="arena-tag-pill" title="${T("익명 구분 번호")}">#${draft.tag}</span>
        <button type="button" class="btn small ghost" data-nick-rand title="${T("무작위 별명 조합")}">🎲 ${T("섞기")}</button>
        <button type="button" class="btn small mint" data-nick-save>${askPost ? T("순위표에 등록하기") : T("변경 저장")}</button>
      </div>
      ${askPost ? "" : `<div class="arena-nick-actions"><button type="button" class="btn small ghost" data-nick-edit>${T("별명 바꾸기")}</button><button type="button" class="btn small danger-ghost" data-nick-delete>${T("보드 기록 삭제")}</button></div>`}
    </div>`;
  }

  function bindArenaNickBar(root, prefix, onSaved, targetDate = kstToday()) {
    const box = $(`[data-nick-box="${prefix}"]`, root);
    if (!box) return;
    const adjSel = $("[data-nick-adj]", box);
    const nounSel = $("[data-nick-noun]", box);
    const avWrap = $("[data-nick-avatar]", box);
    const itemWrap = $("[data-nick-item]", box);
    const editBtn = $("[data-nick-edit]", box);
    const delBtn = $("[data-nick-delete]", box);
    const editor = $("[data-nick-editor]", box);
    const actionsWrap = $(".arena-nick-actions", box);
    const randBtn = $("[data-nick-rand]", box);
    const saveBtn = $("[data-nick-save]", box);
    const refreshCharPreview = () => {
      if (!adjSel || !nounSel) return;
      const a = Number(adjSel.value);
      const n = Number(nounSel.value);
      if (avWrap) avWrap.innerHTML = arenaPixelAvatarSvg({ adjIdx: a, nounIdx: n }, { includeLocal: true });
      if (itemWrap) itemWrap.textContent = T("아이템 {item}", { item: arenaItemLabel(a) });
    };
    if (adjSel) adjSel.addEventListener("change", refreshCharPreview);
    if (nounSel) nounSel.addEventListener("change", refreshCharPreview);
    if (editBtn && editor) {
      editBtn.addEventListener("click", () => {
        editor.hidden = false;
        if (actionsWrap) actionsWrap.hidden = true;
        if (adjSel) adjSel.focus();
      });
    }
    if (randBtn && adjSel && nounSel) {
      randBtn.addEventListener("click", () => {
        const next = randomComboPair(Number(adjSel.value), Number(nounSel.value));
        adjSel.value = String(next.adjIdx);
        nounSel.value = String(next.nounIdx);
        refreshCharPreview();
      });
    }
    if (saveBtn && adjSel && nounSel) {
      saveBtn.addEventListener("click", async () => {
        const wasPrompt = box.classList.contains("is-prompt");
        const dateForOp = targetDate || kstToday();
        const combo = await setArenaCombo(Number(adjSel.value), Number(nounSel.value), dateForOp);
        if (!combo) return;
        arenaArchiveCache.clear();
        arenaChapterCache.clear();
        const label = getArenaNick();
        const msg = wasPrompt ?
          (prefix === "ch-board" ?
            T("'{name}' 별명으로 단원 순위표에 등록했습니다.", { name: label }) :
            dateForOp === kstToday() ?
              T("'{name}' 별명으로 오늘 순위표에 등록했습니다.", { name: label }) :
              T("'{name}' 별명으로 #{d} 순위표에 등록했습니다.", { name: label, d: dateForOp.slice(5) })) :
          T("순위표 별명을 '{name}'(으)로 바꿨습니다.", { name: label });
        toast(msg);
        if (onSaved) await onSaved(label, "save");
      });
    }
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(T("오늘 순위표에서 내 별명과 기록을 바로 삭제할까요? 내 연습 기록은 그대로 남습니다."))) return;
        await deleteArenaData(targetDate || kstToday());
        toast(T("순위표에서 내 별명과 기록을 삭제했습니다."));
        if (onSaved) await onSaved("", "delete");
      });
    }
  }

  function visibleBoardRows(entries, myPid, topN = 8, explicitTotal = 0) {
    const out = [];
    const myIdx = entries.findIndex((e) => e.playerId === myPid || e.isMe);
    entries.forEach((entry, idx) => {
      if (idx < topN || (myIdx >= 0 && Math.abs(idx - myIdx) <= 1)) {
        out.push({ entry, rank: Number.isInteger(entry.rank) ? entry.rank : idx + 1 });
      }
    });
    const myEntry = myIdx >= 0 ? entries[myIdx] : null;
    const myRank = myEntry ? (Number.isInteger(myEntry.rank) ? myEntry.rank : myIdx + 1) : 0;
    return { rows: out, myRank, total: Math.max(Number(explicitTotal) || 0, entries.length) };
  }

  function arenaPodiumStageHtml(entries, myPid, myRank, isCode, prevChamp = null) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const medals = ["", "🥇", "🥈", "🥉"];
    const cols = [1, 2, 3].map((r) => {
      const entry = entries[r - 1] || null;
      if (!entry) {
        if (r === 1 && entries.length === 0 && prevChamp) {
          return `<div class="podium-col rank-1 is-defending">
            <div class="podium-speech">👑 ${esc(T("지난 1위 · 오늘 왕좌 비어 있음"))}</div>
            ${arenaPixelAvatarSvg(prevChamp, { rank: 1 })}
            <div class="podium-nick"><span class="defend-badge">${T("지난 1위")}</span> ${esc(prevChamp.nick)}</div>
            <div class="podium-meta">${esc(fmtDuration(prevChamp.sec))}</div>
            <div class="podium-step"><span>${medals[1]} ${esc(T("{r}위", { r: 1 }))}</span></div>
          </div>`;
        }
        return `<div class="podium-col rank-${r} is-empty">
          ${arenaPixelAvatarSvg(null, { empty: true })}
          <div class="podium-empty-txt">${T("빈 단상")}</div>
          <div class="podium-step"><span>${medals[r]} ${esc(T("{r}위", { r }))}</span></div>
        </div>`;
      }
      const isMe = entry.playerId === myPid || Boolean(entry.isMe);
      const quote = arenaPodiumMsgText(isMe && entry.msgIdx == null ? getArenaPodiumMsg() : entry.msgIdx, lang);
      const val = isCode ?
        `${T("{n}회", { n: entry.tries || 1 })} · ${esc(fmtDuration(entry.sec))}` :
        `${T("{n}점", { n: entry.score })} · ${esc(fmtDuration(entry.sec))}`;
      return `<div class="podium-col rank-${r}${isMe ? " is-me" : ""}">
        ${quote ? `<div class="podium-speech">💬 ${esc(quote)}</div>` : ""}
        ${arenaPixelAvatarSvg(entry, { rank: r, includeLocal: isMe })}
        <div class="podium-nick">${esc(entry.nick)}${isMe ? `<span class="me-tag">${T("나")}</span>` : ""}${arenaMedalChipHtml(entry)}${arenaStreakChipHtml(entry)}${arenaMilestoneChipHtml(entry, { includeLocal: isMe })}</div>
        <div class="podium-meta">${val}</div>
        <div class="podium-step"><span>${medals[r]} ${esc(T("{r}위", { r }))}</span></div>
      </div>`;
    }).join("");

    let perkBar = "";
    if (myRank >= 1 && myRank <= 3) {
      const myEntry = entries[myRank - 1];
      const curMsg = myEntry && validMsgIdx(Number(myEntry.msgIdx)) ? Number(myEntry.msgIdx) : getArenaPodiumMsg();
      const quotes = lang === "en" ? ARENA_PODIUM_MSGS_EN : ARENA_PODIUM_MSGS_KO;
      const optsHtml = quotes.map((q, i) =>
        `<option value="${i}"${i === curMsg ? " selected" : ""}>${i === 0 ? esc(T("말풍선 숨김")) : `💬 ${esc(q)}`}</option>`).join("");
      perkBar = `<div class="podium-msg-bar" data-podium-msg-bar>
        <span class="podium-msg-title">🎖️ ${T("1~3위 입상 베니핏 · 시상대 말풍선")}</span>
        <div class="podium-msg-controls">
          <select class="podium-msg-select" data-podium-msg-sel aria-label="${T("시상대 말풍선 고르기")}">${optsHtml}</select>
          <button type="button" class="btn small mint" data-podium-msg-save>${T("말풍선 적용")}</button>
        </div>
      </div>`;
    }
    return `<div class="arena-podium-stage" role="region" aria-label="Top 3 Podium">${cols}</div>${perkBar}`;
  }

  function bindPodiumMsgBar(root, dateStr, onSaved) {
    if (!root) return;
    $$("[data-podium-msg-bar]", root).forEach((bar) => {
      if (bar.dataset.bound === "1") return;
      bar.dataset.bound = "1";
      const sel = $("[data-podium-msg-sel]", bar);
      const btn = $("[data-podium-msg-save]", bar);
      if (!sel || !btn) return;
      btn.addEventListener("click", async () => {
        const chosen = Number(sel.value) || 0;
        await setArenaPodiumMsg(chosen, dateStr || kstToday());
        toast(chosen > 0 ? T("시상대 말풍선을 업데이트했습니다.") : T("시상대 말풍선을 숨겼습니다."));
        if (onSaved) await onSaved(chosen);
      });
    });
  }

  function codeBoardHtml(board, dateStr, opts = {}) {
    const entries = (board && board.code) || [];
    const weekTotal = board ? (Number(board.weekTotal) || 0) : 0;
    const prevChamp = board && board.prevChampion ? board.prevChampion : null;
    const streakers = (board && Array.isArray(board.streakers)) ? board.streakers : [];
    const myPid = getArenaPid();
    const isToday = dateStr === kstToday();
    const { rows, myRank, total } = visibleBoardRows(entries, myPid, 8, board && board.codeTotal);
    const baseRankSummary = myRank ? T("내 순위 {r}위 / {n}명", { r: myRank, n: total }) :
      isToday ? T("오늘 등록 {n}명", { n: total }) : T("등록 {n}명", { n: total });
    const rankSummary = weekTotal > 0 && isToday ? `${baseRankSummary} · ${T("최근 7일 완주 {w}회", { w: weekTotal })}` : baseRankSummary;
    const title = isToday ? T("오늘의 코딩 문제 순위표") : T("#{d} 코딩 문제 순위표", { d: dateStr.slice(5) });
    const showTopShare = opts.showShare !== false;
    return `<section class="card arena-board-card" aria-label="${esc(title)}">
      <div class="arena-board-head">
        <div>
          <p class="eyebrow">DAILY CODING LEADERBOARD · #${esc(dateStr.slice(5))}</p>
          <h2>${esc(title)}</h2>
        </div>
        <div class="arena-board-head-right">
          <span class="small muted">${esc(rankSummary)}</span>
          ${showTopShare ? `<button type="button" class="btn small" data-daily-share="${esc(dateStr)}">${shareIconSvg()} ${T("공유")}</button>` : ""}
        </div>
      </div>
      ${arenaPodiumStageHtml(entries, myPid, myRank, true, prevChamp)}
      ${arenaStreakLineHtml(streakers, "board-streak-bar")}
      ${rows.length ? `<div class="arena-board-wrap">
        <table class="arena-board-table">
          <thead><tr>
            <th>${T("순위")}</th><th>${T("이름")}</th><th class="c-hide-sm num">${T("제출 횟수")}</th><th class="num">${T("풀이 시간")}</th><th class="num" aria-label="${esc(T("공유"))}"></th>
          </tr></thead>
          <tbody>${rows.map(({ entry, rank }) => {
            const isMe = entry.playerId === myPid || Boolean(entry.isMe);
            return `<tr class="${rank <= 3 ? "is-top " : ""}${isMe ? "is-me" : ""}">
              <td class="c-rank">${rank}</td>
              <td><span class="row-nick-wrap">${arenaPixelAvatarSvg(entry, { rank: rank <= 3 ? rank : 0, includeLocal: isMe })}<b>${esc(entry.nick)}</b>${isMe ? `<span class="me-tag">${T("나")}</span>` : ""}${arenaMedalChipHtml(entry)}${arenaStreakChipHtml(entry)}${arenaMilestoneChipHtml(entry, { includeLocal: isMe })}</span></td>
              <td class="c-hide-sm num">${T("{n}회", { n: entry.tries || 1 })}</td>
              <td class="num">${esc(fmtDuration(entry.sec))}</td>
              <td class="num c-share"><button type="button" class="row-share-btn" data-daily-share="${esc(dateStr)}" data-share-pid="${esc(entry.playerId || "")}" data-share-rank="${rank}" aria-label="${esc(T("{name} 기록 카드", { name: entry.nick }))}" title="${esc(T("{name} 기록 카드", { name: entry.nick }))}">${shareIconSvg()}</button></td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>` : `<p class="small muted arena-board-empty">${isToday ? T("아직 오늘 등록된 기록이 없습니다. 문제를 풀고 첫 기록을 등록해 보세요.") : T("아직 이 날짜에 등록된 기록이 없습니다. 문제를 풀고 첫 기록을 등록해 보세요.")}</p>`}
      ${opts && opts.solveHref ? `<div class="actions" style="margin-top:12px"><a class="btn small primary" href="${esc(opts.solveHref)}">${isToday ? T("오늘의 코딩 문제 풀기") : T("#{d} 코딩 문제 풀기", { d: dateStr.slice(5) })}</a></div>` : ""}
    </section>`;
  }

  function encodeDailyRival(info) {
    if (!info || !/^\d{4}-\d{2}-\d{2}$/.test(info.date || "")) return "";
    const sec = Math.max(1, Math.min(7200, Math.round(Number(info.sec) || 1)));
    const tries = Math.max(1, Math.min(99, Math.round(Number(info.tries) || 1)));
    const rank = Math.max(0, Math.min(9999, Math.round(Number(info.rank) || 0)));
    const who = encodeComboCode(info.combo) || cleanArenaNick(info.nick) || "anon";
    const days = Math.max(1, Math.min(3650, Math.round(Number(info.clearDays) || 1)));
    return `${info.date}~${sec}~${tries}~${rank}~${who}~${days}`;
  }

  function parseDailyRival(rawToken, minDate = "2026-10-21", lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const raw = String(rawToken ?? "").trim();
    if (!raw || raw.length > 140 || /[\u0000-\u001f\u007f<>`"']/.test(raw)) return null;
    const parts = raw.split("~");
    if (parts.length < 5 || parts.length > 6) return null;
    const [date, secStr, triesStr, rankStr, whoRaw, daysStr] = parts;
    const dateOk = typeof validArenaDate === "function" ? validArenaDate(date, minDate) : /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!dateOk) return null;
    if (!/^\d+$/.test(secStr) || !/^\d+$/.test(triesStr) || !/^\d+$/.test(rankStr)) return null;
    if (daysStr !== undefined && !/^\d+$/.test(daysStr)) return null;
    const sec = Number(secStr);
    const tries = Number(triesStr);
    const rank = Number(rankStr);
    const totalDays = daysStr !== undefined ? Number(daysStr) : 1;
    if (sec < 1 || sec > 7200 || tries < 1 || tries > 99 || rank < 0 || rank > 9999 || totalDays < 0 || totalDays > 3650) return null;
    let adjIdx = null, nounIdx = null, tag = null, nick = "";
    const cm = /^c(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(whoRaw);
    if (cm) {
      const a = Number(cm[1]), n = Number(cm[2]), t = Number(cm[3]);
      if (!validComboIdx(a) || !validComboIdx(n) || t < 10 || t > 99) return null;
      adjIdx = a; nounIdx = n; tag = t;
      nick = formatComboNick(a, n, t, lang);
    } else if (whoRaw !== "anon") {
      nick = decodeComboOrNick(whoRaw, lang);
      if (!nick) return null;
    }
    return {
      date, sec, tries, rank, adjIdx, nounIdx, tag,
      nick: nick || T("도전자"),
      totalDays,
      fromLink: true,
    };
  }

  function buildDailyShareUrl(info) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const arenaPath = lang === "en" ? "/en/arena/" : "/arena/";
    const origin = (typeof location !== "undefined" && location.origin && /^https?:/i.test(location.origin)) ?
      location.origin : "https://donghyunlee.kr";
    if (info && (info.kind === "board" || info.kind === "cumulative")) {
      const qs = info.date ? `?d=${encodeURIComponent(info.date)}` : "";
      return `${origin}${arenaPath}${qs}`;
    }
    const token = encodeDailyRival(info);
    const qs = token ? `?d=${encodeURIComponent(info.date)}&r=${encodeURIComponent(token)}` : "";
    return `${origin}${arenaPath}${qs}`;
  }

  function buildMyDailyShareInfo(c, p, dateStr, board) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const entries = (board && Array.isArray(board.code)) ? board.code : [];
    const myPid = getArenaPid();
    const myIdx = entries.findIndex((e) => e.playerId === myPid || e.isMe);
    const myEntry = myIdx >= 0 ? entries[myIdx] : null;
    const rank = myEntry ? (Number.isInteger(myEntry.rank) ? myEntry.rank : myIdx + 1) : 0;
    const totalPlayers = board ? Math.max(Number(board.codeTotal) || 0, entries.length) : 0;
    const savedTime = (c && Store && Store.course(c.id).dailyTime && Store.course(c.id).dailyTime[dateStr]) || null;
    const sec = Math.max(1, (myEntry && myEntry.sec) || (savedTime && savedTime.sec) || 1);
    const tries = Math.max(1, (myEntry && myEntry.tries) || (savedTime && savedTime.tries) || 1);
    const combo = (myEntry && validComboIdx(myEntry.adjIdx) && validComboIdx(myEntry.nounIdx)) ?
      { adjIdx: myEntry.adjIdx, nounIdx: myEntry.nounIdx, tag: myEntry.tag || arenaTagOf(myEntry.playerId || myPid) } :
      (getArenaCombo() || defaultDraftCombo());
    const nick = (myEntry && myEntry.nick) ? myEntry.nick : formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang);
    const clearDays = Math.max(1, resolveClearDays(myEntry, { includeLocal: true }));
    const streakDays = Math.max(Number(myEntry && myEntry.streakDays) || 0, 1);
    const mile = arenaMilestoneState(clearDays, lang);
    const quote = rank >= 1 && rank <= 3 ?
      arenaPodiumMsgText(myEntry && myEntry.msgIdx != null ? myEntry.msgIdx : getArenaPodiumMsg(), lang) : "";
    return {
      kind: "me",
      cid: c ? c.id : "coding-test",
      date: dateStr,
      pid: p ? p.id : "",
      problemTitle: p ? p.title : "",
      levelLabel: p && typeof levelName === "function" ? levelName(p.level) : "",
      rank,
      totalPlayers,
      sec,
      tries,
      combo,
      nick,
      clearDays,
      streakDays,
      itemLabel: arenaItemLabel(combo.adjIdx, lang),
      unlockedLabels: mile.unlocked.map((x) => x.label),
      nextMilestone: mile.next,
      quote,
      entries: entries.slice(0, 3),
    };
  }

  function buildEntryDailyShareInfo(c, p, dateStr, board, entry, fallbackRank = 1) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const entries = (board && Array.isArray(board.code)) ? board.code : [];
    const idx = entries.findIndex((e) => e.playerId === (entry && entry.playerId));
    const rank = Number.isInteger(entry && entry.rank) && entry.rank > 0 ? entry.rank : (idx >= 0 ? idx + 1 : Math.max(1, fallbackRank));
    const totalPlayers = board ? Math.max(Number(board.codeTotal) || 0, entries.length) : 0;
    const resolved = resolveComboIndices(entry);
    const combo = {
      adjIdx: resolved.adjIdx,
      nounIdx: resolved.nounIdx,
      tag: (entry && entry.tag) || arenaTagOf((entry && entry.playerId) || "anon"),
    };
    const nick = (entry && entry.nick) ? entry.nick : formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang);
    const clearDays = Math.max(1, resolveClearDays(entry, { includeLocal: false }));
    const streakDays = Math.max(Number(entry && entry.streakDays) || 0, 1);
    const mile = arenaMilestoneState(clearDays, lang);
    const quote = rank >= 1 && rank <= 3 ? arenaPodiumMsgText(entry && entry.msgIdx, lang) : "";
    return {
      kind: "entry",
      cid: c ? c.id : "coding-test",
      date: dateStr,
      pid: p ? p.id : "",
      problemTitle: p ? p.title : "",
      levelLabel: p && typeof levelName === "function" ? levelName(p.level) : "",
      rank,
      totalPlayers,
      sec: Math.max(1, Number(entry && entry.sec) || 1),
      tries: Math.max(1, Number(entry && entry.tries) || 1),
      combo,
      nick,
      clearDays,
      streakDays,
      itemLabel: arenaItemLabel(combo.adjIdx, lang),
      unlockedLabels: mile.unlocked.map((x) => x.label),
      nextMilestone: mile.next,
      quote,
      entries: entries.slice(0, 3),
    };
  }

  function buildCumulativeShareInfo(c, p, dateStr, board, totalDays) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const entries = (board && Array.isArray(board.code)) ? board.code : [];
    const totalPlayers = board ? Math.max(Number(board.codeTotal) || 0, entries.length) : 0;
    const combo = getArenaCombo() || defaultDraftCombo();
    const nick = formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang);
    const clearDays = Math.max(1, Number(totalDays) || 1);
    const mile = arenaMilestoneState(clearDays, lang);
    return {
      kind: "cumulative",
      cid: c ? c.id : "coding-test",
      date: dateStr,
      pid: p ? p.id : "",
      problemTitle: p ? p.title : "",
      levelLabel: p && typeof levelName === "function" ? levelName(p.level) : "",
      rank: 0,
      totalPlayers,
      sec: 0,
      tries: 0,
      combo,
      nick,
      clearDays,
      streakDays: 0,
      itemLabel: arenaItemLabel(combo.adjIdx, lang),
      unlockedLabels: mile.unlocked.map((x) => x.label),
      nextMilestone: mile.next,
      quote: "",
      entries: entries.slice(0, 3),
    };
  }

  function buildBoardShareInfo(c, p, dateStr, board) {
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const entries = (board && Array.isArray(board.code)) ? board.code : [];
    const totalPlayers = board ? Math.max(Number(board.codeTotal) || 0, entries.length) : 0;
    const combo = getArenaCombo() || defaultDraftCombo();
    const clearDays = localClearDaysCount();
    const mile = arenaMilestoneState(clearDays, lang);
    return {
      kind: "board",
      cid: c ? c.id : "coding-test",
      date: dateStr,
      pid: p ? p.id : "",
      problemTitle: p ? p.title : "",
      levelLabel: p && typeof levelName === "function" ? levelName(p.level) : "",
      rank: 0,
      totalPlayers,
      sec: entries[0] ? Math.max(1, Number(entries[0].sec) || 1) : 0,
      tries: entries[0] ? Math.max(1, Number(entries[0].tries) || 1) : 0,
      combo,
      nick: entries[0] ? entries[0].nick : "",
      clearDays,
      streakDays: 0,
      itemLabel: arenaItemLabel(combo.adjIdx, lang),
      unlockedLabels: mile.unlocked.map((x) => x.label),
      nextMilestone: mile.next,
      quote: entries[0] ? arenaPodiumMsgText(entries[0].msgIdx, lang) : "",
      entries: entries.slice(0, 3),
      prevChampion: board && board.prevChampion ? board.prevChampion : null,
    };
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function fitCanvasText(ctx, text, maxW) {
    const raw = String(text || "");
    if (ctx.measureText(raw).width <= maxW) return raw;
    let lo = 0, hi = raw.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(`${raw.slice(0, mid)}…`).width <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return `${raw.slice(0, Math.max(1, lo))}…`;
  }

  function drawPixelGridOnCanvas(ctx, grid, leftX, topY, scale) {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        if (!row[x]) continue;
        ctx.fillStyle = row[x];
        ctx.fillRect(Math.round(leftX + x * scale), Math.round(topY + y * scale), scale, scale);
      }
    }
  }

  function stripLeadingIcon(s) {
    return String(s || "").replace(/^[^\p{L}\p{N}#]+/u, "").trim();
  }

  function renderDailyShareCanvas(info, ratio = "1:1", theme = "light") {
    const isStory = ratio === "9:16";
    const isDark = theme === "dark";
    const isBoardCard = info.kind === "board";
    const isCumCard = info.kind === "cumulative";
    const W = 1080, H = isStory ? 1920 : 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const fontSans = 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const fontMono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

    // 절제된 스튜디오 배경 및 에디토리얼 시트
    const pal = isDark ? {
      outer: "#0b0f17",
      sheet: "#121824",
      border: "#222c3f",
      rule: "#1e293b",
      ink: "#f1f5f9",
      sub: "#94a3b8",
      muted: "#64748b",
      accent: "#5eead4",
      tileBg: "#182132",
      tileBorder: "#263349",
      hiBg: "rgba(94, 234, 212, 0.08)",
      hiBorder: "rgba(94, 234, 212, 0.28)",
      dotOff: "#293548",
    } : {
      outer: "#eef2f6",
      sheet: "#ffffff",
      border: "#dde4ee",
      rule: "#e2e8f0",
      ink: "#0f172a",
      sub: "#475569",
      muted: "#64748b",
      accent: "#0f766e",
      tileBg: "#f8fafc",
      tileBorder: "#e2e8f0",
      hiBg: "#f0fdfa",
      hiBorder: "#99f6e4",
      dotOff: "#cbd5e1",
    };

    ctx.fillStyle = pal.outer;
    ctx.fillRect(0, 0, W, H);

    const cx = isStory ? 64 : 56;
    const cy = isStory ? 236 : 56;
    const cw = W - cx * 2;
    const ch = isStory ? 1448 : 968;

    ctx.save();
    if (!isDark) {
      ctx.shadowColor = "rgba(15, 23, 42, 0.06)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 10;
    }
    roundRectPath(ctx, cx, cy, cw, ch, isStory ? 34 : 28);
    ctx.fillStyle = pal.sheet;
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = pal.border;
    roundRectPath(ctx, cx, cy, cw, ch, isStory ? 34 : 28);
    ctx.stroke();

    const px = cx + 68;
    const rx = cx + cw - 68;
    const iw = rx - px;
    const drawRule = (y) => {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(rx, y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = pal.rule;
      ctx.stroke();
    };

    // 1) 상단 에디토리얼 메타 바
    const metaY = cy + 64;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `700 20px ${fontMono}`;
    ctx.fillStyle = pal.accent;
    ctx.fillText(`DAILY PYTHON  ·  ${info.date.replace(/-/g, ".")}`, px, metaY);

    ctx.textAlign = "right";
    ctx.font = `600 20px ${fontMono}`;
    ctx.fillStyle = pal.muted;
    ctx.fillText(`${info.pid}${info.levelLabel ? ` · ${info.levelLabel}` : ""}`, rx, metaY);
    drawRule(cy + 100);

    // 2) 본문 영역
    const statTop = cy + ch - (isStory ? 244 : 194);
    const statH = isStory ? 132 : 112;

    const drawTopThreeList = (startY, rowH, highlightRank = 0) => {
      for (let r = 1; r <= 3; r++) {
        const ry = startY + (r - 1) * rowH;
        const mate = info.entries && info.entries[r - 1];
        const defend = !mate && r === 1 && info.totalPlayers === 0 && info.prevChampion ? info.prevChampion : null;
        const isHi = highlightRank === r;
        if (isHi) {
          roundRectPath(ctx, px - 14, ry + 4, iw + 28, rowH - 8, 14);
          ctx.fillStyle = pal.hiBg;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = pal.hiBorder;
          ctx.stroke();
        } else if (r < 3) {
          drawRule(ry + rowH);
        }
        const midY = ry + rowH / 2;
        ctx.textAlign = "left";
        ctx.font = `700 21px ${fontMono}`;
        ctx.fillStyle = isHi || (r === 1 && mate) ? pal.accent : pal.muted;
        ctx.fillText(`0${r}`, px + 4, midY);

        const avSc = 3;
        const mGrid = mate ? buildArenaPixelGrid(mate, { rank: r }) :
          defend ? buildArenaPixelGrid(defend, { rank: 1 }) : buildArenaPixelGrid(null, { empty: true });
        ctx.save();
        ctx.globalAlpha = mate ? 1 : defend ? 0.72 : 0.35;
        drawPixelGridOnCanvas(ctx, mGrid, px + 56, midY - 9 * avSc, avSc);
        ctx.restore();

        ctx.font = `${mate ? 600 : 500} 23px ${fontSans}`;
        ctx.fillStyle = mate ? pal.ink : defend ? pal.sub : pal.muted;
        const label = mate ? mate.nick : defend ? `${T("지난 1위")} · ${defend.nick}` : T("비어 있음");
        ctx.fillText(fitCanvasText(ctx, label, iw - 230), px + 124, midY);

        ctx.textAlign = "right";
        ctx.font = `600 23px ${fontMono}`;
        ctx.fillStyle = mate ? pal.ink : pal.muted;
        ctx.fillText(mate ? fmtDuration(mate.sec) : "—", rx - 4, midY);
      }
    };

    const drawMilestoneTrack = (trackY) => {
      const steps = [3, 7, 14, 30];
      const names = LANG === "en" ? ARENA_MILE_SHORT_EN : ARENA_MILE_SHORT_KO;
      const trackX = px + 36;
      const trackW = iw - 72;
      const segW = trackW / (steps.length - 1);

      ctx.beginPath();
      ctx.moveTo(trackX, trackY);
      ctx.lineTo(trackX + trackW, trackY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = pal.rule;
      ctx.stroke();

      let activeRatio = 0;
      if (info.clearDays >= 30) activeRatio = 1;
      else if (info.clearDays >= 14) activeRatio = (2 + (info.clearDays - 14) / 16) / 3;
      else if (info.clearDays >= 7) activeRatio = (1 + (info.clearDays - 7) / 7) / 3;
      else if (info.clearDays >= 3) activeRatio = ((info.clearDays - 3) / 4) / 3;
      if (activeRatio > 0) {
        ctx.beginPath();
        ctx.moveTo(trackX, trackY);
        ctx.lineTo(trackX + trackW * activeRatio, trackY);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = pal.accent;
        ctx.stroke();
      }

      steps.forEach((d, idx) => {
        const dx = trackX + idx * segW;
        const on = info.clearDays >= d;
        ctx.beginPath();
        ctx.arc(dx, trackY, 7, 0, Math.PI * 2);
        ctx.fillStyle = on ? pal.accent : pal.sheet;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = on ? pal.accent : pal.dotOff;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.font = `${on ? 700 : 500} 18px ${fontSans}`;
        ctx.fillStyle = on ? pal.ink : pal.muted;
        ctx.fillText(`${T("{n}일", { n: d })} · ${stripLeadingIcon(names[idx])}`, dx, trackY + 30);
      });
    };

    if (isBoardCard) {
      const eyebrowY = cy + (isStory ? 168 : 148);
      ctx.textAlign = "left";
      ctx.font = `600 22px ${fontSans}`;
      ctx.fillStyle = pal.accent;
      ctx.fillText(T("오늘의 코딩 문제"), px, eyebrowY);

      const titleY = eyebrowY + (isStory ? 58 : 50);
      ctx.font = `800 ${isStory ? 50 : 44}px ${fontSans}`;
      ctx.fillStyle = pal.ink;
      ctx.fillText(fitCanvasText(ctx, info.problemTitle, iw), px, titleY);

      const listStart = titleY + (isStory ? 88 : 62);
      const rowH = isStory ? 116 : 96;
      drawRule(listStart);
      drawTopThreeList(listStart, rowH, 0);
      if (isStory) drawMilestoneTrack(listStart + rowH * 3 + 130);
    } else {
      const titleY = cy + (isStory ? 162 : 148);
      ctx.textAlign = "left";
      ctx.font = `600 ${isStory ? 32 : 29}px ${fontSans}`;
      ctx.fillStyle = pal.sub;
      ctx.fillText(fitCanvasText(ctx, info.problemTitle, iw), px, titleY);

      const heroTop = titleY + (isStory ? 64 : 46);
      const tileS = isStory ? 204 : 176;
      roundRectPath(ctx, px, heroTop, tileS, tileS, 24);
      ctx.fillStyle = pal.tileBg;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = pal.tileBorder;
      ctx.stroke();

      const avatarGrid = buildArenaPixelGrid(
        { ...info.combo, totalDays: info.clearDays, streakDays: info.streakDays },
        { rank: info.rank >= 1 && info.rank <= 3 ? info.rank : 0, clearDays: info.clearDays },
      );
      const sc = isStory ? 8 : 7;
      drawPixelGridOnCanvas(ctx, avatarGrid, px + (tileS - 18 * sc) / 2, heroTop + (tileS - 18 * sc) / 2, sc);

      const hx = px + tileS + 38;
      const maxHW = rx - hx;
      const statusTxt = isCumCard ? T("누적 풀이 기록") :
        info.rank >= 1 ? T("오늘의 {r}위 기록", { r: info.rank }) : T("오늘의 문제 통과");
      ctx.textAlign = "left";
      ctx.font = `700 22px ${fontSans}`;
      ctx.fillStyle = pal.accent;
      ctx.fillText(statusTxt, hx, heroTop + (isStory ? 34 : 28));

      const bigVal = isCumCard ? T("{n}일 완주", { n: info.clearDays }) : fmtDuration(info.sec);
      ctx.font = `800 ${isStory ? 80 : 70}px ${fontSans}`;
      ctx.fillStyle = pal.ink;
      ctx.fillText(fitCanvasText(ctx, bigVal, maxHW), hx, heroTop + (isStory ? 112 : 98));

      const whoLine = info.quote ? `${info.nick}  ·  “${info.quote}”` : info.nick;
      ctx.font = `500 23px ${fontSans}`;
      ctx.fillStyle = pal.sub;
      ctx.fillText(fitCanvasText(ctx, whoLine, maxHW), hx, heroTop + (isStory ? 172 : 152));

      const cleanGear = [stripLeadingIcon(info.itemLabel), ...info.unlockedLabels.map(stripLeadingIcon)].filter(Boolean).join(" · ");
      const streakClean = info.streakDays >= 3 ? T("{n}일 개근", { n: info.streakDays }) :
        info.streakDays === 2 ? T("{n}일 연속", { n: 2 }) : T("누적 {n}일", { n: info.clearDays });
      const traitY = heroTop + tileS + (isStory ? 54 : 38);
      ctx.font = `500 20px ${fontSans}`;
      ctx.fillStyle = pal.muted;
      ctx.fillText(fitCanvasText(ctx, `${T("장착 도트")}  ${cleanGear}    ·    ${streakClean}`, iw), px, traitY);

      if (isStory) {
        if (info.entries && info.entries.length > 0) {
          const lTop = traitY + 56;
          drawRule(lTop);
          drawTopThreeList(lTop, 98, info.rank >= 1 && info.rank <= 3 ? info.rank : 0);
          drawMilestoneTrack(lTop + 98 * 3 + 104);
        } else {
          drawMilestoneTrack(traitY + 140);
        }
      } else if (info.rank >= 1 && info.rank <= 3 && info.entries && info.entries.length > 0) {
        const lTop = traitY + 38;
        drawRule(lTop);
        drawTopThreeList(lTop, 74, info.rank);
      } else {
        drawMilestoneTrack(traitY + 106);
      }
    }

    // 3) 3칸 헤어라인 지표 요약 바
    drawRule(statTop);
    drawRule(statTop + statH);
    const colW = iw / 3;
    for (let cIdx = 1; cIdx <= 2; cIdx++) {
      ctx.beginPath();
      ctx.moveTo(px + colW * cIdx, statTop + 22);
      ctx.lineTo(px + colW * cIdx, statTop + statH - 22);
      ctx.lineWidth = 1;
      ctx.strokeStyle = pal.rule;
      ctx.stroke();
    }

    const stats = isBoardCard ? [
      { k: T("참여"), v: info.totalPlayers > 0 ? T("등록 {n}명", { n: info.totalPlayers }) : T("대기 중") },
      { k: T("현재 1위"), v: info.entries[0] ? fmtDuration(info.entries[0].sec) : "—" },
      { k: T("난이도"), v: info.levelLabel || "—" },
    ] : isCumCard ? [
      { k: T("누적 완주"), v: T("{n}일", { n: info.clearDays }) },
      { k: T("장착 도트"), v: T("{n}종", { n: 1 + info.unlockedLabels.length }) },
      { k: T("오늘 문제"), v: info.pid || "—" },
    ] : [
      { k: T("기록"), v: info.rank >= 1 ? T("{r}위", { r: info.rank }) : T("통과") },
      { k: T("제출"), v: T("{n}회", { n: info.tries }) },
      { k: T("누적 완주"), v: T("{n}일", { n: info.clearDays }) },
    ];
    stats.forEach((st, idx) => {
      const bx = px + idx * colW + (idx === 0 ? 2 : 28);
      ctx.textAlign = "left";
      ctx.font = `500 19px ${fontSans}`;
      ctx.fillStyle = pal.muted;
      ctx.fillText(st.k, bx, statTop + (isStory ? 44 : 36));
      ctx.font = `700 30px ${fontSans}`;
      ctx.fillStyle = pal.ink;
      ctx.fillText(fitCanvasText(ctx, st.v, colW - 36), bx, statTop + (isStory ? 90 : 76));
    });

    // 4) 하단 조용한 출처 표기(광고 문구 없음)
    const footY = cy + ch - (isStory ? 52 : 40);
    ctx.textAlign = "left";
    ctx.font = `500 19px ${fontSans}`;
    ctx.fillStyle = pal.muted;
    ctx.fillText("Donghyun Lee · AI Coding", px, footY);

    ctx.textAlign = "right";
    ctx.font = `500 19px ${fontMono}`;
    ctx.fillStyle = pal.muted;
    ctx.fillText("donghyunlee.kr/arena", rx, footY);

    return canvas;
  }

  function buildDailyShareText(info, shareUrl) {
    const head = `${T("오늘의 파이썬")} #${info.date.slice(5)} · ${info.problemTitle} (${info.pid})`;
    if (info.kind === "board") {
      if (info.entries && info.entries[0]) {
        const sub = T("현재 1위 {t} · 등록 {n}명", { t: fmtDuration(info.entries[0].sec), n: info.totalPlayers });
        return `${head}\n${sub}\n${shareUrl}`;
      }
      return `${head}\n${shareUrl}`;
    }
    if (info.kind === "cumulative") {
      return `${head}\n${T("누적 {t}일 완주", { t: info.clearDays })} · ${info.nick}\n${shareUrl}`;
    }
    const status = info.rank >= 1 ? T("{r}위", { r: info.rank }) : T("통과");
    return `${head}\n${status} · ${fmtDuration(info.sec)} (${T("{n}회", { n: info.tries })})\n${shareUrl}`;
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve) => {
      if (canvas.toBlob) {
        canvas.toBlob((b) => resolve(b), "image/png");
      } else {
        resolve(null);
      }
    });
  }

  function openDailyShareModal(c, p, dateStr, board, initialTarget = null) {
    const prev = $("#arena-share-modal", document.body);
    if (prev) prev.remove();
    const entries = (board && Array.isArray(board.code)) ? board.code : [];
    const myPid = getArenaPid();
    const myIdx = entries.findIndex((e) => e.playerId === myPid || e.isMe);
    const myEntry = myIdx >= 0 ? entries[myIdx] : null;
    const localSolvedDate = Boolean(c && Store && Store.dailyDone(c.id, dateStr));
    const hasMyDateSolve = Boolean(myEntry || localSolvedDate);
    const totalMyDays = localClearDaysCount();

    const targets = [];
    const clickedOtherEntry = initialTarget && initialTarget.entry &&
      (!myEntry || initialTarget.entry.playerId !== myEntry.playerId);
    if (clickedOtherEntry) {
      targets.push({
        id: "entry",
        label: T("#{r}위 {name}", { r: initialTarget.rank, name: initialTarget.entry.nick }),
        info: buildEntryDailyShareInfo(c, p, dateStr, board, initialTarget.entry, initialTarget.rank),
      });
    }
    if (hasMyDateSolve) {
      targets.push({
        id: "me",
        label: myEntry ? T("내 기록 · {r}위", { r: myIdx + 1 }) : T("내 완주 기록"),
        info: buildMyDailyShareInfo(c, p, dateStr, board),
      });
    } else if (totalMyDays > 0) {
      targets.push({
        id: "cumulative",
        label: T("누적 기록 · {n}일", { n: totalMyDays }),
        info: buildCumulativeShareInfo(c, p, dateStr, board, totalMyDays),
      });
    }
    targets.push({
      id: "board",
      label: T("오늘의 순위표"),
      info: buildBoardShareInfo(c, p, dateStr, board),
    });

    let curTargetIdx = 0;
    if (!clickedOtherEntry) {
      const mePos = targets.findIndex((t) => t.id === "me");
      const cumPos = targets.findIndex((t) => t.id === "cumulative");
      const boardPos = targets.findIndex((t) => t.id === "board");
      curTargetIdx = mePos >= 0 ? mePos : cumPos >= 0 ? cumPos : Math.max(0, boardPos);
    }
    let curRatio = "1:1";
    const siteIsDark = typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") && typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches));
    let curTheme = siteIsDark ? "dark" : "light";
    let curCanvas = null;

    const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const targetTabsHtml = targets.length > 1 ? `<div class="arena-share-targets" role="group" aria-label="${esc(T("카드 종류"))}">
      ${targets.map((t, idx) => `<button type="button" class="btn small" data-share-target="${idx}" aria-pressed="${idx === curTargetIdx}">${esc(t.label)}</button>`).join("")}
    </div>` : "";
    const unsolvedNoteHtml = !hasMyDateSolve ?
      `<p class="arena-share-note">${esc(T("문제를 통과하면 내 풀이 시간이 담긴 개인 기록 카드로 바뀝니다."))}</p>` : "";

    const modal = document.createElement("div");
    modal.id = "arena-share-modal";
    modal.className = "arena-share-backdrop";
    modal.innerHTML = `<div class="arena-share-dialog" role="dialog" aria-modal="true" aria-label="${esc(T("오늘의 기록 카드"))}">
      <div class="arena-share-head">
        <h3>${T("오늘의 기록 카드")}</h3>
        <button type="button" class="btn small ghost" data-share-close aria-label="${esc(T("창 닫기"))}">✕</button>
      </div>
      ${targetTabsHtml}
      <div class="arena-share-bar">
        <div class="seg-mini arena-share-ratios" role="group">
          <button type="button" data-share-ratio="1:1" aria-pressed="true">${T("1:1 정사각")}</button>
          <button type="button" data-share-ratio="9:16" aria-pressed="false">${T("9:16 세로")}</button>
        </div>
        <div class="seg-mini arena-share-themes" role="group">
          <button type="button" data-share-theme="light" aria-pressed="${curTheme === "light"}">${T("밝게")}</button>
          <button type="button" data-share-theme="dark" aria-pressed="${curTheme === "dark"}">${T("어둡게")}</button>
        </div>
      </div>
      <div class="arena-share-preview-wrap">
        <img id="arena-share-preview-img" class="arena-share-preview-img" alt="${esc(T("오늘의 기록 카드"))}">
      </div>
      ${unsolvedNoteHtml}
      <div class="arena-share-actions">
        ${canNativeShare ? `<button type="button" class="btn" id="arena-share-native">${T("공유하기")}</button>` : ""}
        <button type="button" class="btn primary" id="arena-share-download">${T("이미지 저장")}</button>
        <button type="button" class="btn" id="arena-share-copy-link">${T("링크 복사")}</button>
      </div>
    </div>`;
    document.body.appendChild(modal);

    const imgEl = $("#arena-share-preview-img", modal);
    const copyBtn = $("#arena-share-copy-link", modal);
    const curInfo = () => targets[curTargetIdx].info;

    const syncPreview = () => {
      const info = curInfo();
      curCanvas = renderDailyShareCanvas(info, curRatio, curTheme);
      imgEl.src = curCanvas.toDataURL("image/png");
      imgEl.dataset.ratio = curRatio;
      $$("[data-share-ratio]", modal).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.shareRatio === curRatio)));
      $$("[data-share-theme]", modal).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.shareTheme === curTheme)));
      $$("[data-share-target]", modal).forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.shareTarget) === curTargetIdx)));
    };
    syncPreview();

    const close = () => {
      document.removeEventListener("keydown", onEsc);
      modal.remove();
    };
    const onEsc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onEsc);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    $("[data-share-close]", modal).addEventListener("click", close);

    $$("[data-share-target]", modal).forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.shareTarget);
        if (idx >= 0 && idx < targets.length) {
          curTargetIdx = idx;
          syncPreview();
        }
      });
    });

    $$("[data-share-ratio]", modal).forEach((btn) => {
      btn.addEventListener("click", () => {
        curRatio = btn.dataset.shareRatio || "1:1";
        syncPreview();
      });
    });

    $$("[data-share-theme]", modal).forEach((btn) => {
      btn.addEventListener("click", () => {
        curTheme = btn.dataset.shareTheme === "dark" ? "dark" : "light";
        syncPreview();
      });
    });

    $("#arena-share-download", modal).addEventListener("click", () => {
      const info = curInfo();
      const a = document.createElement("a");
      a.href = curCanvas.toDataURL("image/png");
      a.download = `python-daily-${info.date}-${curRatio === "9:16" ? "9x16" : "1x1"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast(T("기록 카드 이미지를 저장했습니다."));
    });

    copyBtn.addEventListener("click", () => {
      const info = curInfo();
      const shareUrl = buildDailyShareUrl(info);
      copyText(buildDailyShareText(info, shareUrl), T("링크를 복사했습니다."));
    });

    const nativeBtn = $("#arena-share-native", modal);
    if (nativeBtn) {
      nativeBtn.addEventListener("click", async () => {
        const info = curInfo();
        const shareUrl = buildDailyShareUrl(info);
        const text = buildDailyShareText(info, shareUrl);
        try {
          const blob = await canvasToPngBlob(curCanvas);
          if (blob && typeof File === "function") {
            const file = new File([blob], `python-daily-${info.date}.png`, { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: T("오늘의 코딩 문제"), text, url: shareUrl });
              return;
            }
          }
          await navigator.share({ title: T("오늘의 코딩 문제"), text, url: shareUrl });
        } catch (err) {
          if (err && err.name !== "AbortError") {
            copyText(text, T("링크를 복사했습니다."));
          }
        }
      });
    }
  }

  function bindDailyShareButtons(root, c, p, dateStr, boardOrGetter) {
    if (!root) return;
    $$("[data-daily-share]", root).forEach((btn) => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async () => {
        const d = btn.dataset.dailyShare || dateStr || kstToday();
        const prob = (c && c.byId && c.byId[dailyPid(c, d)]) || p;
        let b = typeof boardOrGetter === "function" ? boardOrGetter() : boardOrGetter;
        if (!b) b = await fetchArenaDaily(d).catch(() => getCachedOrSeededDaily(d));
        const sharePid = btn.dataset.sharePid || "";
        const shareRank = Number(btn.dataset.shareRank) || 0;
        let target = null;
        if (sharePid || shareRank >= 1) {
          const entries = (b && Array.isArray(b.code)) ? b.code : [];
          const idx = sharePid ? entries.findIndex((e) => e.playerId === sharePid) : (shareRank - 1);
          const entry = idx >= 0 ? entries[idx] : entries[shareRank - 1];
          if (entry) target = { entry, rank: shareRank || (idx + 1) };
        }
        openDailyShareModal(c, prob, d, b, target);
      });
    });
  }

  function arenaArchiveHtml(c, archive, curDate) {
    const days = (archive && Array.isArray(archive.days)) ? archive.days : [];
    if (!days.length) return "";
    const today = kstToday();
    const yesterday = kstYesterday();
    return `<section class="card arena-board-card" id="arena-archive-board" aria-label="${T("날짜별 문제 · 순위 기록판")}">
      <div class="arena-board-head">
        <div>
          <p class="eyebrow">DAILY ARCHIVE &amp; RECORD BOARD</p>
          <h2>${T("날짜별 문제 · 순위 기록판")}</h2>
        </div>
        <span class="small muted">${T("최근 {n}일", { n: days.length })}</span>
      </div>
      <p class="small muted" style="margin:0 0 10px">${T("지난 날짜의 오늘의 코딩 문제를 다시 풀고 그날 순위표에 기록을 남길 수 있습니다.")}</p>
      <div class="arena-board-wrap">
        <table class="arena-board-table arena-archive-table">
          <thead><tr>
            <th>${T("날짜")}</th><th>${T("오늘의 코딩 문제")}</th><th>${T("순위 · 참여")}</th>
          </tr></thead>
          <tbody>${days.map((item) => {
            const d = item.date;
            const cp = c.daily ? c.byId[dailyPid(c, d)] : null;
            const myLocalC = c.daily ? Store.dailyDone(c.id, d) : false;
            const dayBadge = d === today ? `<span class="me-tag">${T("오늘")}</span>` :
              d === yesterday ? `<span class="archive-tag">${T("어제")}</span>` : "";
            const cMeta = item.codeTop ?
              `🥇 ${esc(item.codeTop.nick)} (${esc(fmtDuration(item.codeTop.sec))}) · ${T("등록 {n}명", { n: item.codeTotal })}` :
              T("등록 {n}명", { n: item.codeTotal || 0 });
            const cMeTag = item.codeMe ? `<span class="me-tag">${T("내 {r}위", { r: item.codeMe.rank })}</span>` :
              myLocalC ? `<span class="me-tag">✓ ${T("풀었음")}</span>` : "";
            return `<tr class="${d === curDate ? "is-cur" : ""}" data-archive-date="${esc(d)}">
              <td style="white-space:nowrap"><b>${esc(d.slice(5).replace("-", "/"))} (${esc(dayLetter(d))})</b>${dayBadge}</td>
              <td>${cp ? `<a class="archive-link" href="${dailyHref(c.id, d)}"><code>${esc(cp.id)}</code> ${esc(cp.title)}</a> <span class="badge lv${cp.level}">${levelName(cp.level)}</span>${cMeTag}` : `<span class="muted">-</span>`}</td>
              <td><a class="archive-link" href="${dailyHref(c.id, d)}?board=1">${T("순위")} →</a><span class="archive-sub">${cMeta}</span></td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    </section>`;
  }

  // 주관식 반례 입력 정규화 및 채점(서버 판정 API 우선 → 오프라인 카드·로컬 폴백)
  function normalizeSubjArgs(rawInputs, exampleArgs = [], fnName = "solution") {
    const cleaned = rawInputs.map((v) => String(v ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim());
    if (cleaned.length === 1 && cleaned[0]) {
      const m = new RegExp(`^${fnName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\(([\\s\\S]*)\\)$`).exec(cleaned[0]);
      if (m) cleaned[0] = m[1].trim();
    }
    const strMask = cleaned.map((_, i) => {
      const ex = String(exampleArgs[i] ?? "").trim();
      return ex.startsWith("'") || ex.startsWith('"');
    });
    return {
      empty: cleaned.some((x) => !x),
      args: cleaned,
      strMask,
    };
  }

  function canonSimplePyCall(fnName, args, strMask) {
    const parts = [];
    for (let i = 0; i < args.length; i++) {
      const raw = args[i];
      if (/^-?\d+$/.test(raw)) { parts.push(String(BigInt(raw))); continue; }
      if (raw === "True" || raw === "False" || raw === "None") { parts.push(raw); continue; }
      if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
        const inner = raw.slice(1, -1).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        parts.push(`'${inner}'`);
        continue;
      }
      if (strMask[i]) {
        const inner = raw.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        parts.push(`'${inner}'`);
        continue;
      }
      parts.push(raw.replace(/,\s*/g, ", "));
    }
    return `${fnName}(${parts.join(", ")})`;
  }

  function hasBalancedPyDelims(raw, isStr) {
    if (isStr) return true;
    const stack = [];
    const pairs = { ")": "(", "]": "[", "}": "{" };
    let quote = "";
    let escNext = false;
    for (const ch of raw) {
      if (escNext) { escNext = false; continue; }
      if (quote) {
        if (ch === "\\") escNext = true;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; continue; }
      if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
      else if (pairs[ch]) {
        if (stack.pop() !== pairs[ch]) return false;
      }
    }
    return !quote && stack.length === 0;
  }

  async function judgeSubjectiveHunt(c, round, p, rawInputs) {
    const fnName = (p.entry || "solution()").split("(", 1)[0].trim();
    const exArgs = (p.examples && p.examples[0] && p.examples[0].args) || [];
    const normArgs = normalizeSubjArgs(rawInputs, exArgs, fnName);
    if (normArgs.empty) return { status: "empty" };
    if (normArgs.args.some((a, i) => !hasBalancedPyDelims(a, normArgs.strMask[i]))) {
      return { status: "syntax_error" };
    }
    const guessCall = canonSimplePyCall(fnName, normArgs.args, normArgs.strMask);

    // 1) Supabase 서울 리전 RPC 판정표 조회(모범 코드 비노출)
    if (isSupabaseActive()) {
      try {
        const sr = await supaRpc("rpc_judge_hunt", { p_cid: c.id, p_rid: round.id, p_call: guessCall });
        if (sr && sr.status === "ok") return sr;
      } catch (e) { /* 폴백 */ }
    }

    // 2) 로컬 미리보기 서버 판정 API (로컬 미리보기에서 시드 밖 임의 입력까지 실시간 대조)
    if ((!isSupabaseActive() || onLocal) && typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/judge-hunt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cid: c.id,
            rid: round.id,
            pid: p.id,
            args: normArgs.args,
            strMask: normArgs.strMask,
          }),
        });
        if (r.ok) return await r.json();
      } catch (e) { /* 정적 오프라인 폴백 */ }
    }

    // 3) 정적 폴백: 빌드 카드 일치 확인
    const hit = round.cards.find((card) => card.call === guessCall);
    if (hit) {
      return {
        status: "ok",
        call: hit.call,
        caught: hit.caught,
        expected: hit.expected,
        actual: hit.actual,
        error: hit.error || null,
      };
    }
    return { status: "offline_unknown", call: guessCall };
  }

  async function getHunt(cid) {
    if (!huntCache.has(cid)) {
      const request = fetch(`data/${encodeURIComponent(cid)}-hunt.json?v=${VERSION}`).then((r) => {
        if (!r.ok) throw new Error(`hunt ${r.status}`);
        return r.json();
      }).then((data) => {
        if (data.schema !== 1 || data.course !== cid || typeof data.revision !== "string" || !Array.isArray(data.rounds)) throw new Error("hunt schema");
        const ids = new Set();
        for (const r of data.rounds) {
          if (!r || typeof r.id !== "string" || ids.has(r.id) || typeof r.pid !== "string" || typeof r.code !== "string" ||
              !Array.isArray(r.cards) || r.cards.length < 3 || r.cards.length > 4 || r.cards.filter((x) => x.caught === true).length !== 1 ||
              new Set(r.cards.map((x) => x.id)).size !== r.cards.length || new Set(r.cards.map((x) => x.call)).size !== r.cards.length ||
              r.cards.some((x) => typeof x.id !== "string" || typeof x.call !== "string" || typeof x.caught !== "boolean")) throw new Error("hunt round");
          ids.add(r.id);
        }
        return data;
      }).catch((err) => { huntCache.delete(cid); throw err; });
      huntCache.set(cid, request);
    }
    return huntCache.get(cid);
  }

  function huntRecord(cid, revision) {
    const c = Store.course(cid);
    const saved = c.hunt && typeof c.hunt === "object" && !Array.isArray(c.hunt) ? c.hunt : {};
    const out = {
      rev: revision,
      caught: saved.caught && typeof saved.caught === "object" && !Array.isArray(saved.caught) ? { ...saved.caught } : {},
      best: Number.isFinite(saved.best) ? Math.max(0, saved.best) : 0,
      plays: Number.isFinite(saved.plays) ? Math.max(0, saved.plays) : 0,
      recent: Array.isArray(saved.recent) ? saved.recent.slice(0, 20) : [],
    };
    if (saved.daily && typeof saved.daily === "object" && !Array.isArray(saved.daily)) out.daily = { ...saved.daily };
    return out;
  }

  function huntPool(c, data, scope) {
    return data.rounds.filter((r) => c.byId[r.pid] && !c.byId[r.pid].set &&
      (scope === "all" || Number(r.chapter) === 1 || Store.prob(c.id, r.pid).s === 2));
  }

  function huntDaySerial(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
    if (!m) return huntHashSeed(`daily-hunt:${dateStr}`);
    let y = Number(m[1]), mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo <= 2) { y -= 1; mo += 12; }
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + d - 1524;
  }

  function dailyHuntRounds(c, data, dateStr = kstToday()) {
    const valid = data.rounds.filter((r) => c.byId[r.pid] && !c.byId[r.pid].set);
    if (!valid.length) return [];
    const serial = Math.abs(huntDaySerial(dateStr));
    const order = huntShuffle(valid, huntRng(huntHashSeed(`daily-hunt-order:${valid.length}`)));
    const picked = order[serial % order.length];
    const cardRand = huntRng(huntHashSeed(`daily-hunt-cards:${dateStr}:${picked.id}`));
    return [{ ...picked, cards: huntShuffle(picked.cards, cardRand) }];
  }

  function huntElapsedSec(run) {
    if (!run || !run.startedAt) return 1;
    return Math.max(1, Math.min(3600, Math.round((Date.now() - run.startedAt) / 1000)));
  }

  function huntTileCodes(run) {
    return run.items.map((it) => (!it.caught ? "0" : it.score >= 100 ? "2" : "1")).join("");
  }

  function huntTileEmojis(codes) {
    return String(codes || "").split("").map((ch) => (ch === "2" ? "🟢" : ch === "1" ? "🟡" : "⚪")).join("");
  }

  function encodeHuntDuel(run, nickOrCombo = "") {
    if (!run || !Array.isArray(run.rounds) || run.rounds.length < 1 || run.rounds.length > 3) return "";
    const ids = run.rounds.map((r) => r.id).join(",");
    const score = huntScore(run);
    let prev = 1;
    const secs = run.items.map((it, idx) => {
      const raw = Number.isFinite(it.cumSec) && it.cumSec > 0 ? Math.round(it.cumSec) : prev + (idx + 1) * 10;
      prev = Math.max(prev, Math.min(3600, raw));
      return prev;
    });
    const tiles = huntTileCodes(run);
    const tag = run.dailyDate && /^\d{4}-\d{2}-\d{2}$/.test(run.dailyDate) ? run.dailyDate.slice(5) : "duel";
    const nickPart = typeof nickOrCombo === "object" && nickOrCombo ? encodeComboCode(nickOrCombo) : cleanArenaNick(nickOrCombo);
    return nickPart ? `${ids}~${score}~${secs.join(".")}~${tiles}~${tag}~${nickPart}` : `${ids}~${score}~${secs.join(".")}~${tiles}~${tag}`;
  }

  function parseHuntDuel(raw, c, data) {
    if (typeof raw !== "string" || !raw || raw.length > 260) return null;
    const parts = raw.split("~");
    if (parts.length < 4) return null;
    const idList = parts[0].split(",");
    if (idList.length < 1 || idList.length > 3) return null;
    const byRoundId = new Map(data.rounds.map((r) => [r.id, r]));
    const rounds = [];
    const pids = new Set();
    for (const rid of idList) {
      const r = byRoundId.get(rid);
      if (!r || !c.byId[r.pid] || c.byId[r.pid].set || pids.has(r.pid)) return null;
      pids.add(r.pid);
      const rand = huntRng(huntHashSeed(`duel-cards:${rid}:${parts[2]}`));
      rounds.push({ ...r, cards: huntShuffle(r.cards, rand) });
    }
    const score = Number(parts[1]);
    const maxScore = idList.length * 100;
    if (!Number.isFinite(score) || score < 0 || score > maxScore) return null;
    const secs = parts[2].split(".").map((x) => Number(x));
    if (secs.length !== idList.length || secs.some((n) => !Number.isFinite(n) || n < 1 || n > 3600)) return null;
    for (let i = 1; i < secs.length; i++) secs[i] = Math.max(secs[i - 1], Math.round(secs[i]));
    secs[0] = Math.round(secs[0]);
    const tiles = /^[012]{1,3}$/.test(parts[3]) && parts[3].length === idList.length ? parts[3] : "1".repeat(idList.length);
    const tag = parts[4] && /^\d{2}-\d{2}$/.test(parts[4]) ? parts[4] : "duel";
    const nick = parts[5] ? decodeComboOrNick(parts[5]) : "";
    const cm = parts[5] ? /^c(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(parts[5]) : null;
    const adjIdx = cm && validComboIdx(Number(cm[1])) ? Number(cm[1]) : undefined;
    const nounIdx = cm && validComboIdx(Number(cm[2])) ? Number(cm[2]) : undefined;
    return { ids: idList, rounds, score: Math.round(score), secs, tiles, tag, nick, adjIdx, nounIdx };
  }

  function huntVerdict(myScore, mySec, ghost) {
    if (!ghost || !Array.isArray(ghost.secs) || !ghost.secs.length) return null;
    const oppSec = ghost.secs[ghost.secs.length - 1];
    if (myScore > ghost.score || (myScore === ghost.score && mySec < oppSec)) return "win";
    if (myScore === ghost.score && mySec === oppSec) return "tie";
    return "lose";
  }

  function newHuntItem() {
    return { picked: [], tried: [], hint: false, usedCards: false, done: false, caught: false, score: 0, answerCard: null };
  }

  function startHunt(c, data, scope) {
    if (!Store.saveFailed) Store.load();
    const history = huntRecord(c.id, data.revision);
    const pool = shuffle(huntPool(c, data, scope), Math.random).sort((a, b) => Number(!!history.caught[a.id]) - Number(!!history.caught[b.id]));
    if (!pool.length) return false;
    const picked = pool[0];
    HUNT = {
      cid: c.id, revision: data.revision, scope, index: 0, done: false, saved: false, startedAt: Date.now(),
      rounds: [{ ...picked, cards: shuffle(picked.cards, Math.random) }],
      items: [newHuntItem()],
    };
    location.hash = `#/${c.id}/hunt/run`;
    return true;
  }

  function startDailyHunt(c, data, dateStr = kstToday(), rivalEntry = null) {
    if (!Store.saveFailed) Store.load();
    const rounds = dailyHuntRounds(c, data, dateStr);
    if (!rounds.length) return false;
    const board = getCachedOrSeededDaily(dateStr);
    const chosenRival = rivalEntry || pickDailyPacemaker(board.hunt, getArenaPid());
    const ghost = chosenRival ? {
      nick: chosenRival.nick || "",
      adjIdx: chosenRival.adjIdx,
      nounIdx: chosenRival.nounIdx,
      rank: chosenRival.rank || 0,
      score: chosenRival.score,
      secs: Array.isArray(chosenRival.splits) && chosenRival.splits.length ? chosenRival.splits.slice() : [chosenRival.sec || 25],
      tiles: chosenRival.tiles || "1",
      tag: dateStr.slice(5),
      fromBoard: true,
    } : null;
    HUNT = {
      cid: c.id, revision: data.revision, scope: "daily", dailyDate: dateStr, ghost,
      boardLoaded: arenaBoardCache.has(dateStr),
      boardTotal: board ? (board.huntTotal ?? (board.hunt || []).length) : 0,
      autoMatched: !rivalEntry,
      index: 0, done: false, saved: false, startedAt: Date.now(),
      rounds,
      items: rounds.map(newHuntItem),
    };
    location.hash = `#/${c.id}/hunt/run`;
    return true;
  }

  function startDuelHunt(c, data, ghost) {
    if (!ghost || !Array.isArray(ghost.rounds) || !ghost.rounds.length) return false;
    if (!Store.saveFailed) Store.load();
    HUNT = {
      cid: c.id, revision: data.revision, scope: "duel", ghost,
      dailyDate: /^\d{2}-\d{2}$/.test(ghost.tag) ? `${kstToday().slice(0, 5)}${ghost.tag}` : null,
      index: 0, done: false, saved: false, startedAt: Date.now(),
      rounds: ghost.rounds.map((r) => ({ ...r, cards: r.cards.slice() })),
      items: ghost.rounds.map(newHuntItem),
    };
    location.hash = `#/${c.id}/hunt/run`;
    return true;
  }

  const huntScore = (run) => run.items.reduce((total, item) => total + item.score, 0);
  const huntCaught = (run) => run.items.filter((item) => item.caught).length;
  const huntName = (round) => round.name || round.hint || T("반례");
  const huntCrumb = (c) => `<div class="crumbs"><a href="#/${esc(c.id)}">← ${esc(c.title)}</a></div>`;

  async function huntContext(cid) {
    const hash = location.hash;
    try {
      const c = await getCourse(cid);
      if (hash !== location.hash) return null;
      if (!isTestCourse(c)) { location.replace(`#/${cid}`); return null; }
      const data = await getHunt(cid);
      if (hash !== location.hash) return null;
      if (HUNT && (HUNT.cid !== cid || HUNT.revision !== data.revision)) HUNT = null;
      return { c, data };
    } catch (error) {
      if (hash !== location.hash) return null;
      throw error;
    }
  }

  function parseHashParams(query) {
    const out = {};
    if (!query) return out;
    for (const seg of String(query).split("&")) {
      if (!seg) continue;
      const eq = seg.indexOf("=");
      const k = eq >= 0 ? seg.slice(0, eq) : seg;
      const v = eq >= 0 ? seg.slice(eq + 1) : "";
      try { out[decodeURIComponent(k)] = decodeURIComponent(v); } catch (e) { out[k] = v; }
    }
    return out;
  }

  async function viewHunt(cid, query = "") {
    const context = await huntContext(cid);
    if (!context) return "keep";
    const { c, data } = context;
    const params = parseHashParams(query);
    if (params.mode === "daily") {
      if (startHunt(c, data, "solved") || startHunt(c, data, "all")) return "keep";
    }
    const ghostInvite = params.duel ? parseHuntDuel(params.duel, c, data) : null;
    HUNT = null;
    document.title = `${T("반례 찾기 연습")} · ${c.title}`;
    const record = huntRecord(cid, data.revision);
    const available = new Set(data.rounds.filter((r) => c.byId[r.pid]).map((r) => r.id));
    const caught = Object.keys(record.caught).filter((id) => available.has(id)).length;
    let scope = "solved";
    const oppTitle = ghostInvite && ghostInvite.nick ?
      T("{name}님의 1:1 고스트 도전장이 도착했습니다", { name: ghostInvite.nick }) :
      T("1:1 고스트 도전장이 도착했습니다");
    const inviteSec = ghostInvite ? ghostInvite.secs[ghostInvite.secs.length - 1] : 0;
    const inviteHtml = ghostInvite ? `<section class="duel-invite" role="region" aria-label="${T("1:1 고스트 도전장")}">
      <p class="eyebrow">1:1 GHOST DUEL${ghostInvite.tag !== "duel" ? ` · #${esc(ghostInvite.tag)}` : ""}</p>
      <h2>${esc(oppTitle)}</h2>
      <div class="duel-invite-meta">
        <span>${huntTileEmojis(ghostInvite.tiles)}</span>
        <span>${ghostInvite.nick ? esc(T("{name} 기록 {n}점 · {t}", { name: ghostInvite.nick, n: ghostInvite.score, t: fmtDuration(inviteSec) })) : esc(T("도전자 기록 {n}점 · {t}", { n: ghostInvite.score, t: fmtDuration(inviteSec) }))}</span>
      </div>
      <p class="small muted">${T("같은 함정 풀이에 직접 반례 입력을 넣어 도전자의 통과 기록과 겨룹니다.")}</p>
      <div class="hunt-actions actions">
        <button type="button" class="btn mint" id="hunt-accept-duel">${T("이 기록에 도전하기")}</button>
      </div>
    </section>` : "";
    main.innerHTML = `<div class="view hunt-shell">${huntCrumb(c)}
      ${inviteHtml}
      <section class="hunt-hero" style="margin-top:14px">
        <span class="hunt-mark" aria-hidden="true">⌖</span>
        <p class="eyebrow">COUNTEREXAMPLE PRACTICE</p>
        <h1>${T("반례 찾기 연습")}</h1>
        <p class="lead">${T("예시는 통과하지만 틀린 풀이 1개를 읽고, 그 풀이가 틀리는 입력값을 직접 넣어 찾아냅니다.")}</p>
      </section>
      <div class="hunt-stats">
        <div class="hunt-stat"><strong>${Math.min(100, record.best)}<small> / 100</small></strong><span>${T("최고 점수")}</span></div>
        <div class="hunt-stat"><strong>${caught}<small> / ${available.size}</small></strong><span>${T("찾은 반례")}</span></div>
        <div class="hunt-stat"><strong>${record.plays}</strong><span>${T("완료한 문제")}</span></div>
      </div>
      <section class="card section">
        <h2>${T("반례 문제 고르기")}</h2>
        <div class="hunt-scope" role="group" aria-label="${T("연습 범위")}">
          <button type="button" class="btn" data-hunt-scope="solved" aria-pressed="true">${T("푼 문제와 1장")}</button>
          <button type="button" class="btn" data-hunt-scope="all" aria-pressed="false">${T("모든 장")}</button>
        </div>
        <p class="small muted" id="hunt-scope-note">${T("이미 푼 문제와 1장에서 고릅니다.")}</p>
        <div class="hunt-rules">
          <p class="hunt-rule">${T("주관식으로 반례 인자를 직접 입력해 확인합니다(기회 3번, 제한 사항 밖 입력은 차감 없음).")}</p>
          <p class="hunt-rule">${T("직접 찾으면 최대 100점, 막힐 때는 보기 카드 4장(-20점)이나 힌트(-10점)를 열 수 있습니다.")}</p>
        </div>
        <div class="hunt-actions actions"><button type="button" class="btn primary" id="hunt-start">${T("1문제 연습 시작")}</button>
          <span class="small muted" id="hunt-pool-note" role="status"></span></div>
      </section>
      ${c.daily ? `<p class="small muted section">${T("일일 순위 경쟁은 오늘의 코딩 문제에서 진행됩니다.")} <a href="${dailyHref(c.id)}?board=1">${T("오늘의 코딩 문제 순위표")} →</a></p>` : ""}
    </div>`;
    const refresh = () => {
      const ready = huntPool(c, data, scope).length >= 1;
      $("#hunt-start").disabled = !ready;
      $("#hunt-pool-note").textContent = ready ? T("안 찾은 반례부터 한 문제씩 고릅니다.") : T("이 범위에는 문제가 부족합니다. 모든 장을 골라 주세요.");
      $("#hunt-scope-note").textContent = scope === "all" ? T("아직 풀지 않은 문제의 풀이 코드도 보게 됩니다.") : T("이미 푼 문제와 1장에서 고릅니다.");
      $$("[data-hunt-scope]", main).forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.huntScope === scope)));
    };
    $$("[data-hunt-scope]", main).forEach((button) => button.addEventListener("click", () => { scope = button.dataset.huntScope; refresh(); }));
    $("#hunt-start").addEventListener("click", () => { if (!startHunt(c, data, scope)) refresh(); });
    const acceptBtn = $("#hunt-accept-duel");
    if (acceptBtn && ghostInvite) acceptBtn.addEventListener("click", () => startDuelHunt(c, data, ghostInvite));
    refresh();
  }

  function saveHuntCatch(run, round, item) {
    Store.update(() => {
      const record = huntRecord(run.cid, run.revision);
      const triesCount = Math.max(1, (item.tried ? item.tried.length : 0) + (item.picked ? item.picked.length : 0));
      const old = record.caught[round.id];
      if (!old || triesCount < old.t || (triesCount === old.t && Number(item.hint) < old.h)) {
        record.caught[round.id] = { t: triesCount, h: Number(item.hint), d: kstToday() };
      }
      Store.course(run.cid).hunt = record;
    });
  }

  function finishHunt(run) {
    if (run.saved) return;
    run.done = true;
    if (run.startedAt) run.totalSec = huntElapsedSec(run);
    Store.update(() => {
      const record = huntRecord(run.cid, run.revision);
      const score = huntScore(run);
      const today = kstToday();
      record.best = Math.max(record.best, score);
      record.plays += 1;
      record.recent.unshift({ d: today, score, ids: run.rounds.map((r) => r.id) });
      record.recent = record.recent.slice(0, 20);
      if (run.dailyDate) {
        if (!record.daily) record.daily = {};
        const prev = record.daily[run.dailyDate];
        const sec = run.totalSec || 1;
        if (!prev || score > prev.score || (score === prev.score && sec < prev.sec)) {
          record.daily[run.dailyDate] = { score, sec, tiles: huntTileCodes(run) };
        }
      }
      Store.course(run.cid).hunt = record;
    });
    run.saved = true;
  }

  function huntPaceHtml(run) {
    if (!run) return "";
    if (!run.ghost) {
      if (run.dailyDate && run.boardLoaded) return paceEmptyBannerHtml(run.dailyDate, run.boardTotal || 0);
      return "";
    }
    const single = run.rounds.length === 1;
    const myLabel = getArenaNick() || T("나");
    const oppLabel = run.ghost.nick || T("도전자");
    const oppTargetSec = run.ghost.secs && run.ghost.secs.length ? run.ghost.secs[run.ghost.secs.length - 1] : 25;
    const isToday = !run.dailyDate || run.dailyDate === kstToday();
    const title = run.ghost.fromBoard ?
      (isToday ? T("오늘 기준 기록 비교") : T("#{d} 기준 기록 비교", { d: run.dailyDate.slice(5) })) :
      T("1:1 고스트 페이스메이커");
    const initStatus = T("{name} 목표: {n}점 · {t}", { name: oppLabel, n: run.ghost.score, t: fmtDuration(oppTargetSec) });
    const myCombo = getArenaCombo() || defaultDraftCombo();
    return pacemakerBarHtml({
      prefix: "ghost",
      icon: run.ghost.fromBoard ? "🎯" : "👻",
      title,
      myLabel,
      oppLabel,
      myAvatar: arenaPixelAvatarSvg(myCombo),
      oppAvatar: arenaPixelAvatarSvg(run.ghost, { rank: run.ghost.rank && run.ghost.rank <= 3 ? run.ghost.rank : 0 }),
      myWidth: "0%",
      oppWidth: "0%",
      oppRunning: true,
      myCount: single ? T("풀이 중") : `0 / ${run.rounds.length}`,
      oppCount: single ? `${fmtDuration(0)} / ${fmtDuration(oppTargetSec)}` : `0 / ${run.rounds.length}`,
      initStatus,
    });
  }

  function updateGhostDom(run) {
    const timerEl = $("#hunt-elapsed", main);
    const sec = huntElapsedSec(run);
    if (timerEl) timerEl.textContent = `⏱ ${fmtClock(sec)}`;
    if (!run.ghost || !Array.isArray(run.ghost.secs) || !run.ghost.secs.length) return;
    const total = run.rounds.length;
    const oppTargetSec = Math.max(1, run.ghost.secs[run.ghost.secs.length - 1] || 25);
    const myDone = run.items.filter((x) => x.done).length;
    const barRoot = $("#hunt-pace-mount .ghost-bar", main);
    const myBar = $("#ghost-my-bar", main);
    const oppBar = $("#ghost-opp-bar", main);
    const oppMeter = $("#hunt-pace-mount [data-opp-meter]", main);
    const myCount = $("#ghost-my-count", main);
    const oppCount = $("#ghost-opp-count", main);
    const statusEl = $("#ghost-status", main);
    const oppFinished = sec >= oppTargetSec;
    if (total === 1) {
      const doneItem = run.items[0];
      const myIsDone = Boolean(doneItem && doneItem.done);
      const myFinishSec = myIsDone ? (doneItem.cumSec || sec) : sec;
      if (myBar) myBar.style.width = myIsDone ? "100%" : "0%";
      if (oppBar) oppBar.style.width = `${Math.min(100, Math.round((sec / oppTargetSec) * 100))}%`;
      if (oppMeter) oppMeter.classList.toggle("is-running", !oppFinished && !myIsDone);
      if (myCount) myCount.textContent = myIsDone ? fmtDuration(myFinishSec) : T("풀이 중");
      if (oppCount) {
        oppCount.textContent = oppFinished ?
          T("{t} 완주", { t: fmtDuration(oppTargetSec) }) :
          `${fmtDuration(sec)} / ${fmtDuration(oppTargetSec)}`;
      }
    } else {
      const oppDone = run.ghost.secs.filter((s) => sec >= s).length;
      if (myBar) myBar.style.width = `${Math.round((myDone / total) * 100)}%`;
      if (oppBar) oppBar.style.width = `${Math.round((oppDone / total) * 100)}%`;
      if (oppMeter) oppMeter.classList.toggle("is-running", !oppFinished && myDone < total);
      if (myCount) myCount.textContent = `${myDone} / ${total}`;
      if (oppCount) oppCount.textContent = `${oppDone} / ${total}`;
    }
    if (statusEl) {
      const oppLabel = run.ghost.nick || T("도전자");
      const activeText = oppFinished ?
        T("{name} 완주 ({n}점 · {t}) · 내 속도로 끝까지 풀어 보세요", { name: oppLabel, n: run.ghost.score, t: fmtDuration(oppTargetSec) }) :
        T("{name} 목표: {n}점 · {t}", { name: oppLabel, n: run.ghost.score, t: fmtDuration(oppTargetSec) });
      statusEl.dataset.activeText = activeText;
      if (!barRoot || !barRoot.classList.contains("is-folded")) statusEl.textContent = activeText;
    }
  }

  function paintHuntRound(c, run) {
    const round = run.rounds[run.index];
    const p = c.byId[round.pid];
    const item = run.items[run.index];
    if (!item.tried) item.tried = [];
    const single = run.rounds.length === 1;
    const fallbackAnswer = round.cards.find((card) => card.caught);
    const fnName = (p.entry || "solution()").split("(", 1)[0].trim();
    const params = p.params && p.params.length ? p.params : ["x"];
    const exArgs = (p.examples && p.examples[0] && p.examples[0].args) || [];
    document.title = single ? `${T("반례 찾기")} · ${c.title}` : `${T("반례 찾기")} ${run.index + 1}/${run.rounds.length} · ${c.title}`;
    const modeEyebrow = run.ghost ?
      (run.ghost.fromBoard ? `${T("오늘의 반례 찾기")} · #${esc((run.dailyDate || kstToday()).slice(5))}` : T("1:1 고스트 대결")) :
      run.dailyDate ? `${T("오늘의 반례 찾기")} · #${esc(run.dailyDate.slice(5))}` : T("반례 찾기 연습");
    const headTitle = single ?
      (run.dailyDate ? T("오늘의 반례 찾기") : run.scope === "duel" ? T("1:1 고스트 대결") : T("반례 찾기 연습")) :
      T("{n}번째 문제", { n: run.index + 1 });
    const ghostHtml = `<div id="hunt-pace-mount">${huntPaceHtml(run)}</div>`;
    const subjInputsHtml = params.length === 1 ? `<div class="hunt-subj-row">
        <div class="hunt-subj-call">
          <span class="hunt-fn">${esc(fnName)}(</span>
          <input type="text" class="hunt-arg-input" data-arg-idx="0" placeholder="${esc(exArgs[0] != null ? `${params[0]} · ${T("예: {ex}", { ex: exArgs[0] })}` : params[0])}" aria-label="${esc(params[0])}" spellcheck="false" autocomplete="off">
          <span class="hunt-fn">)</span>
        </div>
        <button type="button" class="btn mint" id="hunt-submit-arg">${T("반례 확인")} <span class="kbd">↵</span></button>
      </div>` : `<div class="hunt-subj-multi">
        ${params.map((nm, idx) => `<label class="hunt-arg-field">
          <span class="hunt-arg-name">${esc(nm)}</span>
          <input type="text" class="hunt-arg-input" data-arg-idx="${idx}" placeholder="${esc(exArgs[idx] != null ? T("예: {ex}", { ex: exArgs[idx] }) : nm)}" spellcheck="false" autocomplete="off">
        </label>`).join("")}
      </div>
      <div class="hunt-subj-row">
        <code class="hunt-call-preview" id="hunt-call-preview">${esc(fnName)}(${params.map((nm) => nm).join(", ")})</code>
        <span class="spacer"></span>
        <button type="button" class="btn mint" id="hunt-submit-arg">${T("반례 확인")} <span class="kbd">↵</span></button>
      </div>`;

    main.innerHTML = `<div class="view hunt-shell">${huntCrumb(c)}
      <div class="hunt-progress">
        <div><p class="eyebrow">${modeEyebrow}</p><h1>${headTitle}</h1></div>
        ${single ? "" : `<div class="hunt-progress-dots" aria-label="${T("진행 {n} / {total}", { n: run.index + 1, total: run.rounds.length })}">
          ${run.items.map((x, i) => `<span class="${i === run.index ? "is-current" : x.done ? "is-done" : ""} ${x.caught ? "is-caught" : ""}" aria-hidden="true">${x.done ? (x.caught ? "✓" : "×") : i + 1}</span>`).join("")}
        </div>`}
        <div class="row" style="gap:12px"><span class="hunt-timer" id="hunt-elapsed">⏱ 00:00</span><span class="hunt-score">${T("{n}점", { n: huntScore(run) })}</span></div>
      </div>
      ${ghostHtml}
      <div class="hunt-round">
        <section class="card hunt-context">
          <p class="eyebrow">${esc(p.id)} · ${T("{n}장", { n: p.chapter })}</p><h2>${esc(p.title)}</h2>
          <details class="hunt-problem" ${matchMedia("(min-width: 721px)").matches ? "open" : ""}>
            <summary>${T("문제 설명과 예시")}</summary>
            <div class="prompt">${md(p.prompt)}</div>
            <h3 class="ct-h">${T("제한 사항")}</h3><ul class="ct-list">${(p.constraints || []).map((x) => `<li>${inl(x)}</li>`).join("")}</ul>
            <h3 class="ct-h">${T("입출력 예")}</h3>${ioTableHtml(p)}
          </details>
        </section>
        <section class="hunt-play">
          <div class="card hunt-code"><p class="hunt-code-note"><span class="hunt-badge">${T("예시는 통과하지만 틀린 풀이")}</span></p>${codeBlock(hl(round.code.replace(/\n+$/, "")))}</div>
          <div class="card section">
            <div class="row"><h2 id="hunt-question">${item.usedCards ? T("이 풀이가 틀리는 입력은?") : T("이 풀이가 틀리는 입력값을 직접 넣어 보세요")}</h2><span class="spacer"></span>
              <span class="hunt-attempts" id="hunt-attempts"></span></div>
            <div class="hunt-subj-box" id="hunt-subj-box" ${item.usedCards ? "hidden" : ""}>
              ${subjInputsHtml}
              <p class="tiny muted" style="margin:0">${T("파이썬 값 표기로 적습니다(예: 정수 0, 문자열 'a', 리스트 [1, 0]). 제한 사항 밖 입력은 기회가 줄지 않습니다.")}</p>
              <div class="hunt-try-log" id="hunt-try-log"></div>
            </div>
            <div class="hunt-cards" id="hunt-cards-box" role="group" aria-labelledby="hunt-question" ${item.usedCards ? "" : "hidden"}>${round.cards.map((card, i) => `<button type="button" class="hunt-card" data-hunt-card="${esc(card.id)}"><span class="hunt-card-key" aria-hidden="true">${i + 1}</span><code>${esc(card.call)}</code><span class="hunt-card-state"></span></button>`).join("")}</div>
            <div class="hunt-actions actions">
              <span class="small muted" id="hunt-mode-help">${item.usedCards ? T("숫자 키 1~4로도 고를 수 있습니다.") : T("직접 찾으면 최대 100점입니다.")}</span>
              <span class="spacer"></span>
              <button type="button" class="btn small ghost" id="hunt-use-cards" ${item.usedCards || item.done ? "hidden" : ""}>${T("보기 카드 4장 열기 (-20점)")}</button>
              <button type="button" class="btn ghost" id="hunt-hint">${T("힌트")}</button>
            </div>
            <p class="hunt-hint small" id="hunt-hint-text" hidden></p>
            <div class="hunt-feedback" id="hunt-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
            <div class="hunt-actions actions" id="hunt-next-wrap" hidden><button type="button" class="btn primary" id="hunt-next">${run.index + 1 === run.rounds.length ? T("결과 보기") : T("다음 문제")} <span class="kbd">↵</span></button></div>
          </div>
        </section>
      </div>
    </div>`;
    const feedback = $("#hunt-feedback");
    const argInputs = $$(".hunt-arg-input", main);
    const submitArgBtn = $("#hunt-submit-arg");
    const previewEl = $("#hunt-call-preview");
    let judging = false;

    const updatePreview = () => {
      if (!previewEl) return;
      const vals = argInputs.map((inp, idx) => inp.value.trim() || params[idx]);
      previewEl.textContent = `${fnName}(${vals.join(", ")})`;
    };
    argInputs.forEach((inp) => inp.addEventListener("input", updatePreview));

    const refresh = (message = "") => {
      const answer = item.answerCard || fallbackAnswer;
      $(".hunt-score", main).textContent = T("{n}점", { n: huntScore(run) });
      $("#hunt-question").textContent = item.usedCards ? T("이 풀이가 틀리는 입력은?") : T("이 풀이가 틀리는 입력값을 직접 넣어 보세요");
      $("#hunt-subj-box").hidden = !!item.usedCards;
      $("#hunt-cards-box").hidden = !item.usedCards;
      $("#hunt-use-cards").hidden = !!(item.usedCards || item.done);
      $("#hunt-mode-help").textContent = item.usedCards ? T("숫자 키 1~4로도 고를 수 있습니다.") : T("직접 찾으면 최대 100점입니다.");
      $("#hunt-attempts").textContent = item.usedCards ?
        T("남은 기회 {n} / 2", { n: item.done ? 0 : Math.max(0, 2 - item.picked.length) }) :
        T("남은 기회 {n} / 3", { n: item.done ? 0 : Math.max(0, 3 - item.tried.length) });
      argInputs.forEach((inp) => { inp.disabled = item.done || judging; });
      if (submitArgBtn) submitArgBtn.disabled = item.done || judging;
      const tryLog = $("#hunt-try-log");
      if (tryLog) {
        tryLog.innerHTML = item.tried.filter((x) => !x.caught).map((x) =>
          `<span class="hunt-try-chip">× ${esc(x.call)} → ${esc(x.actual ?? "")}</span>`).join("");
      }
      $$("[data-hunt-card]", main).forEach((button) => {
        const card = round.cards.find((x) => x.id === button.dataset.huntCard);
        const picked = item.picked.includes(card.id);
        button.disabled = item.done || picked;
        button.classList.toggle("is-miss", picked && !card.caught);
        button.classList.toggle("is-caught", item.done && item.caught && card.caught);
        button.classList.toggle("is-revealed", item.done && !item.caught && card.caught);
        $(".hunt-card-state", button).textContent = item.done && card.caught ? `✓ ${T("반례")}` : picked ? `× ${T("통과")}` : "";
      });
      $("#hunt-hint").disabled = item.hint || item.done;
      $("#hunt-hint-text").hidden = !item.hint;
      $("#hunt-hint-text").textContent = item.hint ? T("이런 경우를 떠올려 보세요: {hint}", { hint: round.hint }) : "";
      $("#hunt-next-wrap").hidden = !item.done;
      feedback.classList.toggle("is-success", item.done && item.caught);
      feedback.classList.toggle("is-failure", item.done && !item.caught);
      if (item.done) {
        const explanation = answer.error ? T("찾았습니다. 이 풀이는 {err} 오류로 멈춥니다.", { err: answer.error }) :
          T("찾았습니다. 정답은 {e}인데 이 풀이는 {a}를 냅니다.", { e: answer.expected, a: answer.actual });
        feedback.innerHTML = `<h3>${item.caught ? `✓ ${T("반례를 찾았습니다")}` : `× ${T("이 입력이 반례였습니다.")}`}</h3>` +
          `<p><code>${esc(answer.call)}</code></p><p>${esc(item.caught ? explanation : answer.error ? T("이 풀이는 {err} 오류로 멈춥니다.", { err: answer.error }) :
            T("정답은 {e}인데 이 풀이는 {a}를 냅니다.", { e: answer.expected, a: answer.actual }))}</p>` +
          `<p>${esc(huntName(round))}</p><p class="small">${esc(item.caught ? T("획득 점수 {n}점", { n: item.score }) : T("다음에는 가장 작은 값이나 빠뜨린 경우를 떠올려 보세요."))}</p>`;
      } else if (message) feedback.textContent = message;
      updateGhostDom(run);
    };

    const submitSubjective = async () => {
      if (judging || run !== HUNT || run.done || item.done || item.usedCards) return;
      const rawValues = argInputs.map((inp) => inp.value);
      judging = true;
      refresh();
      const res = await judgeSubjectiveHunt(c, round, p, rawValues);
      judging = false;
      if (run !== HUNT || item.done) return;
      if (res.status === "empty") {
        refresh(T("반례로 넣을 인자 값을 모두 적어 주세요."));
        const emptyIn = argInputs.find((x) => !x.value.trim()) || argInputs[0];
        if (emptyIn) emptyIn.focus();
        return;
      }
      if (res.status === "syntax_error") {
        refresh(T("파이썬 값 표기로 적어 주세요(예: 0, 'a', [1, 2]). 기회는 줄지 않습니다."));
        if (argInputs[0]) argInputs[0].focus();
        return;
      }
      if (res.status === "out_of_range") {
        refresh(T("제한 사항을 벗어난 입력입니다. 문제의 제한 사항 안으로 다시 넣어 보세요(기회 차감 없음)."));
        if (argInputs[0]) argInputs[0].focus();
        return;
      }
      if (res.status === "limit") {
        refresh(T("실행 한도를 넘는 큰 입력입니다. 더 작은 경계값으로 확인해 보세요(기회 차감 없음)."));
        return;
      }
      if (res.status === "offline_unknown") {
        refresh(T("오프라인 판정표에 없는 입력입니다. 가장 작은 경계값을 넣거나 '보기 카드 4장 열기'를 이용해 보세요(기회 차감 없음)."));
        return;
      }
      if (item.tried.some((x) => x.call === res.call)) {
        refresh(T("이미 확인한 입력({call})입니다. 다른 경계값을 넣어 보세요.", { call: res.call }));
        return;
      }
      item.tried.push(res);
      if (res.caught) {
        item.caught = true;
        item.done = true;
        item.answerCard = res;
        item.score = Math.max(50, 100 - (item.tried.length - 1) * 10 - (item.hint ? 10 : 0));
        item.cumSec = huntElapsedSec(run);
        saveHuntCatch(run, round, item);
      } else if (item.tried.length >= 3) {
        item.done = true;
        item.cumSec = huntElapsedSec(run);
      }
      refresh(res.caught ? "" : T("{call}에서는 맞게 나옵니다({a}). 다른 경계값을 넣어 보세요.", { call: res.call, a: res.actual }));
      if (item.done) {
        const nextBtn = $("#hunt-next");
        if (nextBtn) nextBtn.focus({ preventScroll: true });
        reveal(feedback);
      } else if (argInputs[0]) {
        argInputs[0].focus();
        argInputs[0].select();
      }
    };

    const pick = (id) => {
      if (run !== HUNT || run.done || item.done || !item.usedCards || item.picked.includes(id)) return;
      const card = round.cards.find((x) => x.id === id);
      if (!card) return;
      item.picked.push(id);
      if (card.caught) {
        item.caught = true; item.done = true;
        item.answerCard = card;
        item.score = Math.max(40, 80 - (item.picked.length - 1) * 20 - (item.hint ? 10 : 0));
        item.cumSec = huntElapsedSec(run);
        saveHuntCatch(run, round, item);
      } else if (item.picked.length === 2) {
        item.done = true;
        item.cumSec = huntElapsedSec(run);
      }
      refresh(card.caught ? "" : T("이 입력에서는 맞게 나옵니다({a}). 한 번 더 고릅니다.", { a: card.actual }));
      const focus = item.done ? $("#hunt-next") : $("[data-hunt-card]:not(:disabled)");
      if (focus) focus.focus({ preventScroll: true });
      if (item.done) reveal(feedback);
    };

    if (submitArgBtn) submitArgBtn.addEventListener("click", submitSubjective);
    argInputs.forEach((inp) => inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitSubjective(); }
    }));
    $("#hunt-use-cards").addEventListener("click", () => {
      if (item.done || item.usedCards) return;
      item.usedCards = true;
      refresh(T("보기 카드 4장으로 전환했습니다. 이 중 반례 입력을 골라 보세요."));
    });
    $$("[data-hunt-card]", main).forEach((button) => button.addEventListener("click", () => pick(button.dataset.huntCard)));
    $("#hunt-hint").addEventListener("click", () => {
      if (item.done || item.hint) return;
      item.hint = true;
      refresh();
      feedback.textContent = T("이런 경우를 떠올려 보세요: {hint}", { hint: round.hint });
    });
    $("#hunt-next").addEventListener("click", () => {
      if (!item.done || HUNT !== run) return;
      if (run.index + 1 === run.rounds.length) {
        finishHunt(run);
        location.hash = `#/${c.id}/hunt/result`;
      } else {
        run.index += 1;
        paintHuntRound(c, run);
        const firstArg = $(".hunt-arg-input", main);
        if (firstArg && !run.items[run.index].usedCards) firstArg.focus({ preventScroll: true });
        else {
          $("#hunt-question").setAttribute("tabindex", "-1");
          $("#hunt-question").focus({ preventScroll: true });
        }
        window.scrollTo({ top: 0, behavior: motion() });
      }
    });
    bindPacemakerToggle($("#hunt-pace-mount", main), () => updateGhostDom(run));
    refresh();
    updateGhostDom(run);
    if (!item.done && !item.usedCards && argInputs[0]) argInputs[0].focus({ preventScroll: true });
  }

  async function viewHuntRun(cid) {
    const context = await huntContext(cid);
    if (!context) return "keep";
    if (!HUNT || HUNT.cid !== cid || HUNT.done) { location.replace(`#/${cid}/hunt`); return "keep"; }
    const run = HUNT;
    if (run.dailyDate && (run.autoMatched || !run.boardLoaded)) {
      fetchArenaDaily(run.dailyDate).then((board) => {
        if (HUNT !== run || run.done || run.index !== 0) return;
        run.boardLoaded = true;
        run.boardTotal = board ? (board.huntTotal ?? (board.hunt || []).length) : 0;
        if (run.autoMatched) {
          const rival = pickDailyPacemaker(board.hunt, getArenaPid());
          if (rival) {
            run.ghost = {
              nick: rival.nick || "",
              adjIdx: rival.adjIdx,
              nounIdx: rival.nounIdx,
              rank: rival.rank || 0,
              score: rival.score,
              secs: Array.isArray(rival.splits) && rival.splits.length ? rival.splits.slice() : [rival.sec || 25],
              tiles: rival.tiles || "1",
              tag: run.dailyDate.slice(5),
              fromBoard: true,
            };
          }
        }
        const mount = $("#hunt-pace-mount", main);
        if (mount) {
          mount.innerHTML = huntPaceHtml(run);
          bindPacemakerToggle(mount, () => updateGhostDom(run));
          updateGhostDom(run);
        }
      }).catch(() => {});
    }
    paintHuntRound(context.c, run);
    const tick = setInterval(() => { if (HUNT === run && !run.done) updateGhostDom(run); }, 1000);
    const onKey = (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const curItem = run.items[run.index];
      if (!curItem) return;
      if (event.key === "Enter" && curItem.done) {
        const nextBtn = $("#hunt-next", main);
        if (nextBtn && document.activeElement !== nextBtn) { event.preventDefault(); nextBtn.click(); }
        return;
      }
      if (!curItem.usedCards || !/^[1-4]$/.test(event.key) ||
          (event.target.closest && event.target.closest("input, textarea, select, [contenteditable=true]"))) return;
      const button = $$("[data-hunt-card]", main)[Number(event.key) - 1];
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
    };
    document.addEventListener("keydown", onKey);
    setCleanup(() => { clearInterval(tick); document.removeEventListener("keydown", onKey); });
  }

  function huntInsightText(run) {
    const score = huntScore(run);
    const caught = huntCaught(run);
    const maxPts = run.rounds.length * 100;
    if (score === maxPts) return T("예시는 통과하는 함정을 주관식 첫 시도에 힌트 없이 바로 찾아냈습니다. 실전 숨은 테스트 방어 감각이 날카롭습니다.");
    if (caught === run.rounds.length) return T("숨은 반례를 정확히 찾아냈습니다. 첫 시도에 바로 간파하는 연습을 더하면 디버깅 시간이 줄어듭니다.");
    return T("예시만 통과하면 안심하기 쉽습니다. 제한 사항의 가장 작은 값(0, 1, 빈 목록)부터 먼저 넣어 보는 습관으로 시작해 보세요.");
  }

  async function viewHuntResult(cid) {
    const context = await huntContext(cid);
    if (!context) return "keep";
    if (!HUNT || HUNT.cid !== cid || !HUNT.done) { location.replace(`#/${cid}/hunt`); return "keep"; }
    const { c } = context;
    const run = HUNT;
    const score = huntScore(run);
    const maxPts = run.rounds.length * 100;
    const totalSec = run.totalSec || huntElapsedSec(run);
    const tileCodes = huntTileCodes(run);
    const emojis = huntTileEmojis(tileCodes);
    const tagLabel = run.scope === "duel" ? T("1:1 고스트 대결") : T("연습 문제");

    const buildDuelUrl = () => {
      const duelToken = encodeHuntDuel(run, getArenaCombo() || getArenaNick());
      return `${location.origin}${location.pathname}#/${cid}/hunt?duel=${encodeURIComponent(duelToken)}`;
    };

    const verdict = huntVerdict(score, totalSec, run.ghost);
    let verdictHtml = "";
    if (verdict && run.ghost) {
      const oppSec = run.ghost.secs[run.ghost.secs.length - 1];
      const oppName = run.ghost.nick || T("도전자");
      const title = verdict === "win" ?
        `🏆 ${esc(T("{name}님 기록보다 앞섰습니다!", { name: oppName }))}` :
        verdict === "tie" ? `🤝 ${T("기록 동점 무승부!")}` :
        `⚡ ${esc(T("{name}님에게 아까운 패배 — 다시 도전해 보세요", { name: oppName }))}`;
      const detail = T("내 기록 {ms}점 · {mt}  vs  {name} {os}점 · {ot}", {
        ms: score, mt: fmtDuration(totalSec), name: oppName, os: run.ghost.score, ot: fmtDuration(oppSec),
      });
      verdictHtml = `<section class="duel-verdict is-${verdict}" role="status">
        <h2>${title}</h2>
        <p class="small">${esc(detail)}</p>
        ${verdict === "lose" ? `<div class="hunt-actions actions" style="margin-top:10px"><button type="button" class="btn small mint" id="hunt-rematch">${T("같은 문제로 다시 도전")}</button></div>` : ""}
      </section>`;
    }
    document.title = `${T("반례 찾기 결과")} · ${c.title}`;
    const leadSummary = run.rounds.length === 1 ?
      (huntCaught(run) === 1 ? T("숨은 반례를 정확히 찾아냈습니다.") : T("아쉽게 놓쳤습니다. 아래에서 반례 입력을 확인해 보세요.")) :
      T("{n}개 가운데 {k}개를 찾았습니다.", { n: run.rounds.length, k: huntCaught(run) });
    main.innerHTML = `<div class="view hunt-shell">${huntCrumb(c)}
      <section class="hunt-hero"><span class="hunt-mark" aria-hidden="true">${huntCaught(run) === run.rounds.length ? "✓" : "⌖"}</span><p class="eyebrow">${T("반례 찾기 결과")} · ${esc(tagLabel)}</p>
        <h1>${T("{n}점", { n: score })}<span class="small muted"> / ${maxPts} · ${esc(fmtDuration(totalSec))}</span></h1>
        <p class="lead">${leadSummary}</p></section>
      ${verdictHtml}
      <section class="hunt-share-card">
        <p class="eyebrow">SHARE &amp; 1:1 GHOST DUEL</p>
        <div class="hunt-tiles-line"><span>${emojis}</span><span>${T("{n}점 · {t}", { n: score, t: fmtDuration(totalSec) })}</span></div>
        <p class="hunt-insight">${esc(huntInsightText(run))}</p>
        <div class="hunt-actions actions">
          <button type="button" class="btn mint" id="hunt-copy-duel">${run.ghost ? T("내 이름으로 맞도전장 복사") : T("내 이름으로 1:1 도전장 복사")}</button>
          <button type="button" class="btn" id="hunt-copy-tile">${T("결과 타일만 복사")}</button>
        </div>
      </section>
      <div class="hunt-results">${run.rounds.map((round, i) => {
        const item = run.items[i]; const answer = item.answerCard || round.cards.find((card) => card.caught); const p = c.byId[round.pid];
        return `<article class="card hunt-result-card ${item.caught ? "is-caught" : ""}"><div class="row"><span class="hunt-badge">${item.caught ? `✓ ${T("찾았습니다")}` : `× ${T("놓쳤습니다")}`}</span><span class="spacer"></span><span>${T("{n}점", { n: item.score })}</span></div>
          <h2>${esc(p.title)}</h2><p>${esc(huntName(round))}</p><p class="hunt-result-call"><code>${esc(answer.call)}</code></p>
          <p class="small muted">${esc(answer.error ? T("기대한 값 {e} · 오류 {err}", { e: answer.expected, err: answer.error }) : T("기대한 값 {e} · 오답 결과 {a}", { e: answer.expected, a: answer.actual }))}</p>
          <a href="#/${esc(cid)}/p/${esc(round.pid)}">${T("이 문제 풀어 보기")} →</a></article>`;
      }).join("")}</div>
      <aside class="hub-bridge-card">
        <p class="eyebrow">FURTHER READING · DONGHYUNLEE.KR</p>
        <h2>${T("왜 예시는 통과한 코드가 실전에서 무너질까요?")}</h2>
        <ul class="hub-bridge-links">
          <li><a href="${siteUrl("essayQuiet")}">${T("칼럼 읽기: AI가 짠 파이썬 코드, 돌아가는데 틀렸습니다 — 조용한 오류가 숨는 세 자리")} →</a></li>
          <li><a href="${siteUrl("essayTimed")}">${T("칼럼 읽기: 파이썬 코딩테스트 연습, 제한 시간을 두면 실력이 는다")} →</a></li>
          <li><a href="${siteUrl("books")}" data-book="hunt-result" data-course="${esc(cid)}">${T("도서 안내: AI ERA SERIES 전자책·예제 코드 보기")} →</a></li>
        </ul>
      </aside>
      <div class="hunt-actions actions section"><button type="button" class="btn primary" id="hunt-again">${T("다른 문제 더 풀기")}</button><a class="btn" href="#/${esc(cid)}/hunt">${T("반례 찾기로 돌아가기")}</a></div>
    </div>`;
    $("#hunt-copy-duel").addEventListener("click", () => {
      const myNick = getArenaNick();
      const head = `⌖ ${T("파이썬 반례 찾기")} ${tagLabel}${myNick ? ` · ${myNick}` : ""}`;
      const line2 = `${emojis} ${T("{n}/{max}점 · {t}", { n: score, max: maxPts, t: fmtDuration(totalSec) })}`;
      const line3 = myNick ? T("{name}님의 기록에 1:1로 도전하기 →", { name: myNick }) : T("내 기록에 1:1 고스트로 도전하기 →");
      copyText(`${head}\n${line2}\n${line3} ${buildDuelUrl()}`, T("1:1 고스트 도전장 링크를 복사했습니다. 단톡방이나 스터디에 붙여 넣어 보세요."));
    });
    $("#hunt-copy-tile").addEventListener("click", () => {
      const myNick = getArenaNick();
      const head = `⌖ ${T("파이썬 반례 찾기")} ${tagLabel}${myNick ? ` · ${myNick}` : ""}`;
      const line2 = `${emojis} ${T("{n}/{max}점 · {t}", { n: score, max: maxPts, t: fmtDuration(totalSec) })}`;
      copyText(`${head}\n${line2}`, T("결과 타일을 복사했습니다."));
    });
    const rematchBtn = $("#hunt-rematch");
    if (rematchBtn && run.ghost) rematchBtn.addEventListener("click", () => startDuelHunt(c, context.data, run.ghost));
    $("#hunt-again").addEventListener("click", () => {
      const nextScope = run.scope === "all" ? "all" : "solved";
      if (!startHunt(c, context.data, nextScope)) startHunt(c, context.data, "all");
    });
  }

  function canonChapterCid(cid) {
    if (cid === "basics" || cid === "basics-en") return "basics";
    if (cid === "vis" || cid === "vis-en") return "vis";
    if (cid === "coding-test" || cid === "coding-test-en") return "coding-test";
    return "";
  }

  function fmtMonthShort(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ""));
    if (!m) return String(ym || "");
    const idx = Math.max(1, Math.min(12, Number(m[2])));
    if (typeof LANG !== "undefined" && LANG === "en") {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][idx - 1];
    }
    return String(idx);
  }

  function isCleanProbRec(rec) {
    return Boolean(rec && rec.s === 2 && (rec.clean === 1 || (rec.clean === undefined && !rec.rev)));
  }

  function computeChapterStats(c, chNum, ym = kstToday().slice(0, 7)) {
    const baseCid = canonChapterCid(c && c.id);
    const list = (c && c.byChapter && c.byChapter[chNum]) || [];
    const pairCid = (c && c.pair) || "";
    let mSolved = 0, mTries = 0, mSec = 0;
    let aSolved = 0, aTries = 0, aSec = 0;
    for (const p of list) {
      const r1 = Store.prob(c.id, p.id);
      const r2 = pairCid ? Store.prob(pairCid, p.id) : null;
      const rec = isCleanProbRec(r1) ? r1 : isCleanProbRec(r2) ? r2 : null;
      if (!rec) continue;
      aSolved += 1;
      aTries += Math.max(1, Number(rec.ft || rec.n) || 1);
      aSec += Math.max(1, Number(rec.fsec) || 15);
      const recYm = rec.mYm || (rec.at ? new Date(rec.at + 9 * 3600000).toISOString().slice(0, 7) : "");
      if (recYm === ym) {
        mSolved += 1;
        mTries += Math.max(1, Number(rec.mft || rec.ft || rec.n) || 1);
        mSec += Math.max(1, Number(rec.msec || rec.fsec) || 15);
      }
    }
    return { cid: baseCid, ch: chNum, ym, total: list.length, mSolved, mTries, mSec, aSolved, aTries, aSec };
  }

  function isChapterPosted(baseCid, chNum, ym = kstToday().slice(0, 7)) {
    return isArenaPosted(`ch:${baseCid}:${chNum}`, ym) || isArenaPosted(`ch:${baseCid}:${chNum}`, "ALL");
  }

  function markChapterPosted(baseCid, chNum, ym = kstToday().slice(0, 7)) {
    markArenaPosted(`ch:${baseCid}:${chNum}`, ym);
    markArenaPosted(`ch:${baseCid}:${chNum}`, "ALL");
  }

  function sortChapterRows(rows) {
    return rows.slice().sort((a, b) =>
      (b.solved - a.solved) ||
      ((a.tries || 1) - (b.tries || 1)) ||
      ((a.sec || 1) - (b.sec || 1)) ||
      ((a.at || 0) - (b.at || 0))
    );
  }

  function buildLocalChapterBoard(baseCid, chNum, ym = kstToday().slice(0, 7), lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    const db = readLocalArenaDb();
    const chDb = (db.__chapters && typeof db.__chapters === "object") ? db.__chapters : {};
    const mRaw = Object.values(chDb[`${ym}:${baseCid}:${chNum}`] || {});
    const aRaw = Object.values(chDb[`ALL:${baseCid}:${chNum}`] || {});
    const mapRow = (x, idx) => ({
      ...x,
      rank: idx + 1,
      nick: entryDisplayNick(x, lang),
    });
    const month = sortChapterRows(mRaw.filter((x) => x && x.playerId && x.solved > 0)).map(mapRow);
    const all = sortChapterRows(aRaw.filter((x) => x && x.playerId && x.solved > 0)).map(mapRow);
    return { cid: baseCid, ch: chNum, ym, month, monthTotal: month.length, all, allTotal: all.length };
  }

  function normalizeChapterBoard(raw, baseCid, chNum, ym = kstToday().slice(0, 7), lang = (typeof LANG !== "undefined" ? LANG : "ko")) {
    if (!raw || typeof raw !== "object") return buildLocalChapterBoard(baseCid, chNum, ym, lang);
    const mapRow = (x, idx) => ({
      ...x,
      rank: Number.isInteger(x.rank) && x.rank > 0 ? x.rank : idx + 1,
      nick: entryDisplayNick(x, lang),
    });
    const month = Array.isArray(raw.month) ? raw.month.filter((x) => x && x.playerId).map(mapRow) : [];
    const all = Array.isArray(raw.all) ? raw.all.filter((x) => x && x.playerId).map(mapRow) : [];
    return {
      cid: raw.cid || baseCid,
      ch: Number(raw.ch) || chNum,
      ym: raw.ym || ym,
      month,
      monthTotal: Math.max(Number(raw.monthTotal) || 0, month.length),
      all,
      allTotal: Math.max(Number(raw.allTotal) || 0, all.length),
    };
  }

  async function fetchArenaChapter(cid, chNum, ym = kstToday().slice(0, 7)) {
    const baseCid = canonChapterCid(cid);
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    if (!baseCid || !chNum) return { cid: "", ch: chNum, ym, month: [], monthTotal: 0, all: [], allTotal: 0 };
    const key = `${baseCid}:${chNum}:${ym}:${lang}`;
    if (isSupabaseActive()) {
      try {
        const data = normalizeChapterBoard(await supaRpc("rpc_get_chapter_board", { p_cid: baseCid, p_ch: chNum, p_ym: ym }), baseCid, chNum, ym, lang);
        arenaChapterCache.set(key, data);
        return data;
      } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch(`api/arena/chapter?cid=${encodeURIComponent(baseCid)}&ch=${encodeURIComponent(chNum)}&ym=${encodeURIComponent(ym)}&lang=${encodeURIComponent(lang)}`);
        if (r.ok) {
          const data = normalizeChapterBoard(await r.json(), baseCid, chNum, ym, lang);
          arenaChapterCache.set(key, data);
          return data;
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    const local = buildLocalChapterBoard(baseCid, chNum, ym, lang);
    arenaChapterCache.set(key, local);
    return local;
  }

  async function submitArenaChapter(c, chNum) {
    const combo = getArenaCombo();
    const stats = computeChapterStats(c, chNum);
    if (!combo || !stats.cid || stats.aSolved < 1) return fetchArenaChapter(c.id, chNum, stats.ym);
    const lang = typeof LANG !== "undefined" ? LANG : "ko";
    const pid = getArenaPid();
    const nick = formatComboNick(combo.adjIdx, combo.nounIdx, combo.tag, lang);

    const db = readLocalArenaDb();
    if (!db.__chapters || typeof db.__chapters !== "object") db.__chapters = {};
    const better = (cand, prev) => !prev ||
      cand.solved > prev.solved ||
      (cand.solved === prev.solved && cand.tries < prev.tries) ||
      (cand.solved === prev.solved && cand.tries === prev.tries && cand.sec < prev.sec);
    if (stats.mSolved >= 1) {
      const mk = `${stats.ym}:${stats.cid}:${chNum}`;
      if (!db.__chapters[mk]) db.__chapters[mk] = {};
      const cand = { playerId: pid, adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick, solved: stats.mSolved, total: stats.total, tries: stats.mTries, sec: stats.mSec, at: Date.now() };
      if (better(cand, db.__chapters[mk][pid])) db.__chapters[mk][pid] = cand;
      else Object.assign(db.__chapters[mk][pid], { adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick });
    }
    if (stats.aSolved >= 1) {
      const ak = `ALL:${stats.cid}:${chNum}`;
      if (!db.__chapters[ak]) db.__chapters[ak] = {};
      const cand = { playerId: pid, adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick, solved: stats.aSolved, total: stats.total, tries: stats.aTries, sec: stats.aSec, at: Date.now() };
      if (better(cand, db.__chapters[ak][pid])) db.__chapters[ak][pid] = cand;
      else Object.assign(db.__chapters[ak][pid], { adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick });
    }
    writeLocalArenaDb(db);

    const key = `${stats.cid}:${chNum}:${stats.ym}:${lang}`;
    if (isSupabaseActive()) {
      try {
        await supaRpc("rpc_register_arena_nick", { p_adj: combo.adjIdx, p_noun: combo.nounIdx }, true);
        const data = normalizeChapterBoard(
          await supaRpc("rpc_submit_chapter_record", {
            p_cid: stats.cid, p_ch: chNum, p_total: stats.total,
            p_m_solved: stats.mSolved, p_m_tries: stats.mTries, p_m_sec: stats.mSec,
            p_a_solved: stats.aSolved, p_a_tries: stats.aTries, p_a_sec: stats.aSec,
          }, true),
          stats.cid, chNum, stats.ym, lang,
        );
        arenaChapterCache.set(key, data);
        return data;
      } catch (e) { /* 폴백 */ }
    } else if (typeof fetch !== "undefined") {
      try {
        const r = await fetch("api/arena/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cid: stats.cid, ch: chNum, ym: stats.ym, lang, playerId: pid,
            adjIdx: combo.adjIdx, nounIdx: combo.nounIdx, tag: combo.tag, nick,
            total: stats.total, mSolved: stats.mSolved, mTries: stats.mTries, mSec: stats.mSec,
            aSolved: stats.aSolved, aTries: stats.aTries, aSec: stats.aSec,
          }),
        });
        if (r.ok) {
          const data = normalizeChapterBoard(await r.json(), stats.cid, chNum, stats.ym, lang);
          arenaChapterCache.set(key, data);
          return data;
        }
      } catch (e) { /* 정적 폴백 */ }
    }
    const local = buildLocalChapterBoard(stats.cid, chNum, stats.ym, lang);
    arenaChapterCache.set(key, local);
    return local;
  }

  function chapterBoardHtml(c, chNum, board, stats, opts = {}) {
    const open = Boolean(opts.open);
    const scope = opts.scope === "all" ? "all" : "month";
    const ym = (board && board.ym) || kstToday().slice(0, 7);
    const mShort = fmtMonthShort(ym);
    const myPid = getArenaPid();
    const mVis = visibleBoardRows((board && board.month) || [], myPid, 10, board && board.monthTotal);
    const aVis = visibleBoardRows((board && board.all) || [], myPid, 10, board && board.allTotal);
    const curVis = scope === "all" ? aVis : mVis;
    const topM = (board && board.month && board.month[0]) || null;
    const summaryTxt = mVis.myRank ?
      T("{m}월 내 순위 {r}위 / {n}명 · 1위 {name} ({s}/{tot})", { m: mShort, r: mVis.myRank, n: mVis.total, name: topM ? topM.nick : "-", s: topM ? topM.solved : 0, tot: stats.total }) :
      mVis.total > 0 && topM ?
        T("{m}월 1위 {name} ({s}/{tot}) · 참여 {n}명", { m: mShort, name: topM.nick, s: topM.solved, tot: stats.total, n: mVis.total }) :
      aVis.total > 0 ?
        T("이번 달 참여 대기 · 누적 참여 {n}명", { n: aVis.total }) :
        T("이번 달 첫 단원 기록이 비어 있습니다");
    const toggleLabel = open ?
      `${T("순위 접기")} ▴` :
      mVis.myRank ? `${T("내 {r}위 · 순위 보기", { r: mVis.myRank })} ▾` : `${T("순위 보기")} ▾`;
    const posted = isChapterPosted(stats.cid, chNum, ym) || Boolean(mVis.myRank || aVis.myRank);
    const promptMsg = stats.mSolved >= 1 ?
      T("자력 통과 {k}/{tot}문제 · 단원 순위표에 등록할까요?", { k: stats.mSolved, tot: stats.total }) :
      T("누적 자력 통과 {k}/{tot}문제 · 누적 순위표에 등록할까요?", { k: stats.aSolved, tot: stats.total });
    const nickHtml = stats.aSolved >= 1 ?
      arenaNickBarHtml("ch-board", { promptMsg, postMode: true, posted }) :
      arenaNickBarHtml("ch-board", {});

    const tableHtml = curVis.rows.length ? `<div class="arena-board-wrap">
      <table class="arena-board-table">
        <thead><tr>
          <th>${T("순위")}</th><th>${T("이름")}</th><th class="num">${T("자력 통과")}</th><th class="c-hide-sm num">${T("시도 · 시간")}</th>
        </tr></thead>
        <tbody>${curVis.rows.map(({ entry, rank }) => {
          const isMe = entry.playerId === myPid || Boolean(entry.isMe);
          const tot = entry.total || stats.total;
          const isComplete = entry.solved >= tot && tot > 0;
          return `<tr class="${rank <= 3 ? "is-top " : ""}${isMe ? "is-me" : ""}">
            <td class="c-rank">${rank}</td>
            <td><span class="row-nick-wrap">${arenaPixelAvatarSvg(entry, { rank: rank <= 3 ? rank : 0, includeLocal: isMe })}<b>${esc(entry.nick)}</b>${isMe ? `<span class="me-tag">${T("나")}</span>` : ""}${isComplete ? `<span class="ch-done-chip">${T("완주")}</span>` : ""}</span></td>
            <td class="num"><b>${entry.solved}</b> / ${tot}</td>
            <td class="c-hide-sm num">${T("{n}회", { n: entry.tries || 1 })} · ${esc(fmtDuration(entry.sec || 1))}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>` : `<p class="small muted arena-board-empty">${T("아직 등록된 단원 기록이 없습니다. 해설을 열지 않고 문제를 통과하면 등록할 수 있습니다.")}</p>`;

    return `<div class="ch-board-bar">
        <div class="ch-board-bar-left">
          <span class="ch-board-pill">${T("단원 순위")}</span>
          <span>${esc(summaryTxt)}</span>
        </div>
        <button type="button" class="btn small ghost" data-ch-board-toggle aria-expanded="${open}">${esc(toggleLabel)}</button>
      </div>
      <section class="ch-board-panel" data-ch-board-panel ${open ? "" : "hidden"}>
        <div class="ch-board-head">
          <div class="seg-mini" role="group">
            <button type="button" data-ch-scope="month" aria-pressed="${scope === "month"}">${esc(T("{m}월 순위 ({n})", { m: mShort, n: mVis.total }))}</button>
            <button type="button" data-ch-scope="all" aria-pressed="${scope === "all"}">${esc(T("누적 순위 ({n})", { n: aVis.total }))}</button>
          </div>
          <span class="tiny muted">${esc(T("매월 1일 새 월간 순위가 열립니다"))}</span>
        </div>
        ${nickHtml}
        ${tableHtml}
        <p class="ch-board-foot">${esc(T("정답·해설을 열지 않고 통과한 문항 수 → 총 시도 횟수 → 풀이 시간 순으로 집계합니다."))}</p>
      </section>`;
  }

  async function mountChapterBoard(mountEl, c, chNum, startOpen = false) {
    if (!mountEl || !c || !canonChapterCid(c.id)) return;
    let isOpen = Boolean(startOpen);
    let curScope = "month";
    const ym = kstToday().slice(0, 7);
    let stats = computeChapterStats(c, chNum, ym);
    let board = null;
    if (isChapterPosted(stats.cid, chNum, ym) && getArenaCombo() && stats.aSolved >= 1) {
      board = await submitArenaChapter(c, chNum);
    } else {
      board = await fetchArenaChapter(c.id, chNum, ym);
    }
    const paint = () => {
      if (!document.body.contains(mountEl)) return;
      stats = computeChapterStats(c, chNum, ym);
      mountEl.innerHTML = chapterBoardHtml(c, chNum, board, stats, { open: isOpen, scope: curScope });
      const toggleBtn = $("[data-ch-board-toggle]", mountEl);
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          isOpen = !isOpen;
          paint();
        });
      }
      $$("[data-ch-scope]", mountEl).forEach((btn) => {
        btn.addEventListener("click", () => {
          curScope = btn.dataset.chScope === "all" ? "all" : "month";
          paint();
        });
      });
      bindArenaNickBar(mountEl, "ch-board", async (_label, action) => {
        stats = computeChapterStats(c, chNum, ym);
        if (action === "save" && stats.aSolved >= 1) {
          markChapterPosted(stats.cid, chNum, ym);
          board = await submitArenaChapter(c, chNum);
        } else {
          board = await fetchArenaChapter(c.id, chNum, ym);
        }
        isOpen = true;
        paint();
      }, kstToday());
    };
    paint();
  }

  // ------------------------------------------------------------------ 화면: 장
  function rowHtml(cid, p, test) {
    const st = statusOf(cid, p.id);
    const stLabel = statusLabel(st);
    let badge = `<span class="badge ${p.type}">${typeName(p.type)}</span>`;
    let meta = levelName(p.level) || "";
    let pid = "";
    if (test) {  // 코딩 테스트는 모두 작성형이므로 난이도를 꼬리표로, 최고 점수와 효율성을 뒤에 쓴다
      const r = Store.prob(cid, p.id);
      badge = `<span class="badge lv${p.level}">${levelName(p.level) || ""}</span>`;
      meta = [r.n ? T("최고 {n}점", { n: r.best || 0 }) : "", hasPerf(p) ? T("효율성 테스트") : ""].filter(Boolean).join(" · ");
      pid = `<span class="pid">${esc(p.id)}</span>`;  // 책이 문제를 아이디(ct1-07)로 가리킨다(2026-10-20 책 세션 P4-1)
    }
    return `<li><a href="#/${esc(cid)}/p/${esc(p.id)}">
      <span class="status-dot ${st}" title="${stLabel}" aria-label="${stLabel}"></span>
      ${badge}
      <span class="t">${pid}${esc(p.title)}</span>
      <span class="meta">${meta}</span></a></li>`;
  }

  async function viewChapter(cid, num, secNum, query = "") {
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
    const openBoard = parseHashParams(query).board === "1";
    // 쪽 번호는 한국어 책의 것이라 영어 화면에서는 보이지 않는다(조정자 결정, SPEC 1절)
    const pagesText = (x) => (x.pages && LANG === "ko" ? `${T("교재 {a}~{b}쪽", { a: x.pages[0], b: x.pages[1] })} · ` : "");
    main.innerHTML = `<div class="view">
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <p class="eyebrow">${T("{n}장", { n: ch.num })}</p>
      <h1>${esc(ch.title)}${ch.sub ? `<span class="h1sub">${esc(ch.sub)}</span>` : ""}</h1>
      <p class="small muted">${pagesText(ch)}${T("문제 {n}개", { n: list.length })} · ${T("푼 문제 {k}", { k: solved })}</p>
      <div class="progress" style="margin:6px 0 4px"><span style="width:${list.length ? (100 * solved) / list.length : 0}%"></span></div>
      ${list.length ? `<div id="ch-board-mount" class="ch-board-mount"></div>` : ""}
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
    if (list.length) mountChapterBoard($("#ch-board-mount", main), c, ch.num, openBoard);
    if (secNum) {
      const el = document.getElementById(secAnchor(secNum));
      if (el) { el.scrollIntoView(); return "keep"; }
    }
    return null;
  }

  // ------------------------------------------------------------------ 화면: 문제
  // 모의고사 세트(2026-10-20 책 세션 P3) ----------------------------------------------------------
  // 시작 화면의 세트 카드
  function setCardHtml(cid, x, on) {
    const at = (Store.course(cid).sets || {})[x.id];
    return `<button type="button" class="set-card" data-set="${esc(x.id)}" aria-pressed="${on}">
      <b>${esc(x.title)}</b><span class="small">${T("{n}문항 · {m}분", { n: x.problems.length, m: x.minutes })}</span>
      <span class="small muted">${esc(x.desc)}</span>${at ? `<span class="tiny muted">${T("치른 적 있음 · {date}", { date: fmtDate(at) })}</span>` : ""}</button>`;
  }

  // 차례의 '모의고사': 세트마다 문항 수, 시간, 꼴. 치른 세트만 문제 목록을 보인다
  function mockSectionHtml(c) {
    const cid = c.id;
    return `<section class="section" id="mock">
      <h2>${T("모의고사")}</h2>
      <p class="small muted">${T("시험 형식대로 시간을 재고 치르는 세트입니다. 세트를 한 번 치르면 그 문제가 여기에 나타나 다시 풀 수 있습니다.")}</p>
      <div class="stack">${c.sets.map((x) => {
        const taken = setTaken(cid, x.id);
        return `<div class="card mock-card">
          <div class="mock-head"><h3>${esc(x.title)}</h3><span class="small muted">${T("{n}문항 · {m}분", { n: x.problems.length, m: x.minutes })} · ${esc(x.desc)}</span></div>
          ${taken ? `<ul class="plist">${x.items.map((p) => rowHtml(cid, p, true)).join("")}</ul>` :
            `<p class="small muted">${T("치르기 전에는 문제를 보이지 않습니다.")}</p>`}
          <div class="actions"><a class="btn mint" href="#/${esc(cid)}/exam?set=${esc(x.id)}">${taken ? T("다시 치르기") : T("세트 치르기")}</a></div>
        </div>`;
      }).join("")}</div>
    </section>`;
  }

  // 세트 문제의 연습 화면. 세트를 치르기 전에는 문제를 보이지 않고 세트로 안내한다
  function viewSetProblem(c, p) {
    const cid = c.id;
    const x = c.setById[p.set];
    if (!x || !setTaken(cid, x.id)) {
      document.title = `${T("모의고사 문제")} · ${c.title}`;
      main.innerHTML = `<div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
        <div class="card"><h1>${T("모의고사 문제")}</h1>
          <p>${T("이 문제는 모의고사 '{title}'에 있습니다. 세트를 한 번 치르면 여기서 다시 풀 수 있습니다.", { title: esc(x ? x.title : p.set) })}</p>
          ${x ? `<div class="actions"><a class="btn mint" href="#/${esc(cid)}/exam?set=${esc(x.id)}">${T("세트 치르기")}</a></div>` : ""}</div>`;
      return;
    }
    const ids = x.problems;
    const at = ids.indexOf(p.id);
    const prev = ids[at - 1];
    const next = ids[at + 1];
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("모의고사")}</a><span>${esc(x.title)}</span><span>${at + 1} / ${ids.length}</span></div>
      <div id="problem"></div>
      <nav class="pnav">
        ${prev ? `<a class="btn" href="#/${esc(cid)}/p/${esc(prev)}">← ${T("이전 문제")}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#/${esc(cid)}/p/${esc(next)}">${T("다음 문제")} →</a>` : `<a class="btn" href="#/${esc(cid)}">${T("차례로")}</a>`}
      </nav>`;
    mountCodeTest($("#problem"), c, p, { mode: "practice" });
  }

  async function viewProblem(cid, pid) {
    const c = await getCourse(cid);
    const p = c.byId[pid];
    if (!p) { main.innerHTML = `<p>${T("문제를 찾을 수 없습니다.")} <a href="#/${esc(cid)}">${T("차례로")}</a></p>`; return; }
    document.title = `${p.title} · ${c.title}`;
    if (p.set) { viewSetProblem(c, p); return; }
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
      <div id="ch-pass-slot"></div>
      <nav class="pnav">
        ${prev ? `<a class="btn" href="#/${esc(cid)}/p/${esc(prev)}">← ${T("이전 문제")}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#/${esc(cid)}/p/${esc(next)}">${T("다음 문제")} →</a>` : `<a class="btn" href="#/${esc(cid)}/ch/${ch.num}">${T("{n}장 목록으로", { n: ch.num })}</a>`}
      </nav>`;
    const showChapterPassBar = async (ok) => {
      const slot = $("#ch-pass-slot", main);
      if (!slot || !ok || !canonChapterCid(cid)) return;
      const rec = Store.prob(cid, p.id);
      if (!isCleanProbRec(rec)) return;
      const stats = computeChapterStats(c, ch.num);
      if (stats.aSolved < 1) return;
      const chBoardHref = `#/${esc(cid)}/ch/${ch.num}?board=1`;
      const doneSuffix = stats.aSolved >= stats.total ? ` · ${T("단원 완주!")}` : "";
      if (isChapterPosted(stats.cid, ch.num, stats.ym) && getArenaCombo()) {
        const b = await submitArenaChapter(c, ch.num);
        if (!document.body.contains(slot)) return;
        const mVis = visibleBoardRows((b && b.month) || [], getArenaPid(), 10, b && b.monthTotal);
        const left = mVis.myRank ?
          T("{n}장 자력 통과 {k}/{tot} · 이번 달 단원 {r}위", { n: ch.num, k: stats.mSolved || stats.aSolved, tot: stats.total, r: mVis.myRank }) :
          `${T("{n}장 자력 통과 {k}/{tot}", { n: ch.num, k: stats.aSolved, tot: stats.total })}${doneSuffix}`;
        slot.innerHTML = `<div class="ch-pass-bar"><span>✓ ${esc(left)}</span><a href="${chBoardHref}">${esc(T("단원 순위표 보기"))} →</a></div>`;
      } else {
        const left = `${T("{n}장 자력 통과 {k}/{tot}", { n: ch.num, k: stats.mSolved || stats.aSolved, tot: stats.total })}${doneSuffix}`;
        slot.innerHTML = `<div class="ch-pass-bar"><span>✓ ${esc(left)}</span><a href="${chBoardHref}">${esc(T("단원 순위 등록 · 보기"))} →</a></div>`;
      }
    };
    if (test) {
      mountCodeTest($("#problem"), c, p, { mode: "practice", onGraded: showChapterPassBar });
      return;
    }
    const view = mountProblem($("#problem"), c, p, { mode: "practice", onGraded: showChapterPassBar });
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
  // 모의고사 세트의 이름은 기록에 저장된 이름이 아니라 지금 과목 데이터의 이름으로 보인다. 세트 이름을 바꿔도(2026-10-21 시험 이름을 뺌)
  // 지난 기록과 진행 중인 시험이 새 이름으로 보이게 하려는 것이다. 아이디(set)는 그대로다
  const setTitle = (c, e) => (c && c.setById && c.setById[e.set] ? c.setById[e.set].title : e.title || e.set);
  const setLabel = (o, c) => (o.how === "pick" ? T("직접 고른 문제") : o.how === "set" ? `<b>${esc(setTitle(c, o))}</b>` :
    T("뽑기 코드 {code}", { code: `<b>${esc(o.code)}</b>` }));
  // 모의고사 세트(2026-10-20 책 세션 P3): 치렀는지(처음 결과를 낸 때)와 1,000점 환산(문항 배점 × 점수 / 100)
  const setTaken = (cid, sid) => !!(Store.course(cid).sets || {})[sid];
  const setPoints = (c, e) => (c.setById[e.set] ? c.setById[e.set].points : 1000 / e.items.length);
  const setScore = (c, e) => Math.round(e.items.reduce((a, it) => a + (it.score * setPoints(c, e)) / 100, 0));
  // 모의고사 문항의 꼴(빈칸 채우기, 디버깅)과, 문항이 어느 장 유형인지(책 1~10장)
  const formName = (f) => ({ blank: T("빈칸 채우기"), debug: T("디버깅") })[f] || "";
  const topicText = (c, p) => (p.topic || []).map((n) => T("{n}장 {title}", { n, title: esc((c.chapterByNum[n] || {}).title || "") })).join(" · ");
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
    if (kind === "exam" && c.sets.length) {  // 모의고사 세트: 링크의 set=, 없으면 첫 세트를 골라 둔다
      const x = c.setById[q.get("set")];
      o.set = x ? x.id : c.sets[0].id;
      if (x) o.how = "set";
    }
    if (kind === "ta") {
      o.t = (q.get("t") ? q.get("t").split(",") : saved.t || conf.def.t).filter((x) => TYPE_NAMES[x]);
      if (!o.t.length) o.t = conf.def.t.slice();
      o.run = q.has("run") ? q.get("run") !== "0" : saved.run ?? conf.def.run;
    }
    return o;
  }

  function setupQuery(kind, o) {
    if (o.how === "set") return `set=${o.set}`;  // 세트의 문제와 제한 시간은 세트가 정한다
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

  const pickIds = (c, kind, o) => (o.how === "set" ? c.setById[o.set].problems.slice() : o.how === "pick" ? o.p.slice() :
    kind === "ta" ? taPick(c, o) : examPick(c, o));

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
    // 문제가 더 받는 패키지(Plotly, 약 10MB)는 시작을 막지 않고 뒤에서 받는다. 그 문제를 열 때 아직이면 그때 기다린다
    const extra = [...new Set(c.problems.flatMap((q) => q.packages || []))];
    if (pkgJob && extra.length) pkgJob.then(() => Py.load([...pkgs, ...extra])).catch(() => {});
    document.title = T("{title} · 파이썬 코딩 테스트", { title: modeName(kind) });
    if (!ta || setupOptions(c, kind, query).t.some((t) => t !== "predict")) Py.start().catch(() => {});
    const live = liveRun(kind, cid);
    const left = live ? (live.end ? (live.end - Date.now()) / 1000 : Infinity) : 0;
    const o = setupOptions(c, kind, query);
    const groups = filledChapters(c);
    let how = o.how;
    const chip = (name, value, label, on) => `<button type="button" class="chip" data-${name}="${value}" aria-pressed="${on}">${label}</button>`;
    const sets = !ta && c.sets.length > 0;
    const liveText = !live ? "" : !live.end ? `${T("제한 없음")} · ${T("걸린 시간 {t}", { t: runClock(live) })}` :
      left > 0 ? T("남은 시간 {t}", { t: fmtClock(left) }) : T("시간이 끝났습니다");
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <h1>${modeName(kind)}</h1>
      <p class="lead">${ta ? T("제한 시간 안에, 또는 제한 없이 여러 문제를 풉니다. 문제마다 한 번만 제출하고, 답과 해설은 끝난 뒤에 한꺼번에 봅니다.") :
        T("시간을 재고 코딩 테스트처럼 풉니다. 예시 실행과 제출은 몇 번이든 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다. 힌트는 끝난 뒤 연습 화면에서 봅니다.")}</p>
      ${live ? `<div class="warnbox section"><b>${ta ? T("진행 중인 타임어택이 있습니다.") : T("진행 중인 모의 시험이 있습니다.")}</b> ${setLabel(live.o, c)} · ${T("{n}문제", { n: live.ids.length })} · ${liveText}
        <div class="actions"><a class="btn primary" href="#/${esc(cid)}/${kind}/run">${left > 0 ? T("이어서 풀기") : T("결과 보기")}</a>
          <button class="btn ghost" type="button" id="su-drop">${T("그만두기")}</button></div></div>` : ""}
      <form class="card section setup" id="su-form">
        <div class="seg" role="group" aria-label="${T("문제 정하기")}">
          <button type="button" data-how="rand">${T("무작위로 뽑기")}</button><button type="button" data-how="pick">${T("직접 고르기")}</button>${sets ? `<button type="button" data-how="set">${T("모의고사 세트")}</button>` : ""}
        </div>
        ${sets ? `<div class="set-cards" id="su-sets" data-only="set">${c.sets.map((x) => setCardHtml(cid, x, o.set === x.id)).join("")}</div>` : ""}
        <div class="form-grid" data-only="rand">
          <label>${T("범위")}</label>
          <div class="chips" id="su-g">${chip("all", 1, T("모두"), false)}${groups.map((n) => chip("g", n, T("{n}장 {title}", { n, title: esc(c.chapterByNum[n].title) }), o.g.includes(n))).join("")}</div>
          ${ta ? `<label>${T("유형")}</label><div class="chips" id="su-t">${TYPE_ORDER.map((t) => chip("t", t, typeName(t), o.t.includes(t))).join("")}</div>` : ""}
          <label>${T("문제 수")}</label><div class="chips" id="su-n">${M.counts.map((n) => chip("n", n, T("{n}문제", { n }), o.n === n)).join("")}</div>
        </div>
        <div id="su-pick" data-only="pick"></div>
        <div class="form-grid su-more">
          <label data-noset>${T("제한 시간")}</label><div class="chips" id="su-m" data-noset>${M.times.map((m) => chip("m", m, limitText(m), o.m === m)).join("")}</div>
          ${ta ? `<label>${T("실행")}</label><div><div class="chips" id="su-run">${chip("run", 1, runLabelText(true), o.run)}${chip("run", 0, runLabelText(false), !o.run)}</div>
            <p class="tiny muted su-help">${T("실행해 보기를 고르면 빈칸 완성, 작성, 코드 리뷰에서 제출하기 전에 실행해 볼 수 있습니다. 출력 예측은 언제나 실행 없이 풉니다.")}</p></div>` : ""}
          <label for="su-code" data-only="rand">${T("뽑기 코드")}</label>
          <div class="row" data-only="rand"><input id="su-code" class="code-field" maxlength="8" value="${esc(o.code)}" placeholder="${T("자동")}" autocomplete="off" spellcheck="false">
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
        T("효율성 테스트의 시간 초과는 시험 점수에 넣지 않습니다. 큰 입력에서 값이 틀리거나 오류가 나면 정확성 실패로 셉니다.")} ${T("풀다가 창을 닫거나 새로 고쳐도 쓰던 답과 남은 시간으로 이어서 풉니다.")}</p>`;

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
      if (how === "set") {
        const b = $("#su-sets .set-card[aria-pressed='true']") || $("#su-sets .set-card");
        const x = c.setById[b.dataset.set];
        Object.assign(r, { set: x.id, title: x.title, p: x.problems.slice(), n: x.problems.length, m: x.minutes });
      }
      if (ta) {
        r.t = pressed("su-t").map((b) => b.dataset.t);
        r.run = pressedValue("su-run", "run", 1) === "1";
      }
      return r;
    };
    const update = () => {
      $$("[data-only]", main).forEach((el) => { el.hidden = el.dataset.only !== how; });
      $$("[data-noset]", main).forEach((el) => { el.hidden = how === "set"; });
      $$("[data-how]", main).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.how === how)));
      // 아래 막대(시작 단추)는 목록이 긴 '직접 고르기'에서만 화면 아래에 붙인다. 늘 붙이면 첫 화면에서 뽑기 코드 칸을 가렸다(2026-10-21 UI 검토)
      $("#su-form").classList.toggle("picking", how === "pick");
      const r = read();
      $("#su-g [data-all]").setAttribute("aria-pressed", String(r.g.length === groups.length));
      // 출력 예측만 고르면 실행 버튼이 나올 문제가 없으므로 요약에 쓰지 않는다
      const runnable = ta && (how === "pick" ? r.p.some((id) => c.byId[id].type !== "predict") : r.t.some((t) => t !== "predict"));
      const runText = runnable ? ` · ${runLabelText(r.run)}` : "";
      let ok = false;
      let sum = "";
      let sub = "";
      if (how === "set") {
        const x = c.setById[r.set];
        ok = true;
        sum = `${x.title} · ${T("{n}문제", { n: x.problems.length })} · ${limitText(x.minutes)}`;
        sub = `${x.desc}. ${T("문항 배점은 {p}점씩이고 결과에 1,000점 환산을 보입니다. 세트를 치르면 문제가 차례의 '모의고사'에 나타납니다.", { p: x.points })}`;
      } else if (how === "pick") {
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
      const card = e.target.closest(".set-card");
      if (card) {
        $$("#su-sets .set-card").forEach((x) => x.setAttribute("aria-pressed", String(x === card)));
        update();
        return;
      }
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
      if (r.how !== "set") Store.setting(conf.setting, ta ? { n: r.n, m: r.m, t: r.t, run: r.run } : { n: r.n, m: r.m });  // 세트의 시간은 세트가 정한다
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
    document.title = T("타임어택 진행 중 · 파이썬 코딩 테스트");
    main.innerHTML = `
      <div class="ta-bar">
        <span class="ta-time" id="ta-time" title="${TA.end ? T("남은 시간") : T("걸린 시간")}">${runClock(TA)}</span>
        <span class="ta-meta"><b id="ta-pos"></b> · ${T("맞힌 문제 {n}", { n: `<b id="ta-ok">0</b>` })} · ${setLabel(TA.o, c)}${TA.o.run ? "" : ` · ${T("실행 없이")}`}${TA.end ? "" : ` · ${T("제한 없음")}`}</span>
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
      $$(".actions", $("#ta-problem")).forEach((a) => { a.hidden = true; });  // 흐린 단추가 남아 시선을 끌었다(2026-10-21 UI 검토)
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
          TA.res[at] = { ok: !!r.ok, answer: r.answer, timeout: !!r.timeout, why: (p.plot || p.plotly || p.app) && !r.ok ? plotWhy(r.report) : undefined };
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
    document.title = T("타임어택 결과 · 파이썬 코딩 테스트");
    const wrong = e.items.filter((it) => !it.ok && c.byId[it.id]).map((it) => it.id);
    const link = `${location.origin}${location.pathname}#/${cid}/ta?${e.q}`;
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <h1>${T("타임어택 결과")}</h1>
      <div class="card">
        <div class="score">${e.ok}<small> / ${T("{n}문제", { n: e.n })}</small></div>
        <p class="muted" style="margin-top:6px">${resultMeta(e, c)} · ${runLabelText(e.run)} · ${fmtDate(e.at)}</p>
        <div class="actions">
          ${wrong.length ? `<a class="btn primary" href="${esc(retryHref(cid, "ta", e, wrong))}">${T("못 푼 문제만 다시 ({n})", { n: wrong.length })}</a>` : ""}
          <a class="btn mint" href="#/${esc(cid)}/ta?${esc(e.q)}">${T("같은 문제 다시")}</a>
          ${e.how === "pick" ? "" : `<a class="btn" href="#/${esc(cid)}/ta?${esc(e.q.replace(/code=[A-Z0-9]*/, "code="))}">${T("새로 뽑기")}</a>`}
          <button class="btn ghost" id="ta-copy">${T("링크 복사")}</button>
        </div>
      </div>
      ${bookReviewHtml(c, wrong.map((id) => c.byId[id]), "result")}
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
        <div style="margin-top:12px">${p.type === "predict" ? codeBlock(hl(p.code)) : ""}${targetHtml(p, p.app ? T("목표 화면") : isReport(p) ? T("목표 리포트") : T("목표 그림"))}${myAnswerHtml(p, it.a)}${whyHtml(it.why)}${solutionHtml(p)}</div>
      </details>`;
    }).join("");
    $("#ta-copy").addEventListener("click", () => copyText(link, T("링크를 복사했습니다. 이 링크로 시작하면 같은 문제가 나옵니다.")));
  }

  // 결과 화면의 요약 줄 앞부분: 걸린 시간 · 제한 · 세트(타임어택과 모의 시험이 같이 쓴다)
  const resultMeta = (e, c) => `${T("걸린 시간 {t}", { t: fmtDuration(e.sec) })} · ${e.m ? T("제한 {m}분", { m: e.m }) : T("제한 없음")} · ` +
    (e.how === "set" ? `<b>${esc(setTitle(c, e))}</b>` : e.how === "pick" ? T("직접 고른 문제") : T("뽑기 코드 {code}", { code: `<b>${esc(e.code)}</b>` }));

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
    document.title = T("모의 시험 진행 중 · 파이썬 코딩 테스트");
    main.innerHTML = `
      <div class="ta-bar exam-bar">
        <span class="ta-time" id="ex-time" title="${EXAM.end ? T("남은 시간") : T("걸린 시간")}">${runClock(EXAM)}</span>
        <div class="exam-tabs" id="ex-tabs" aria-label="${T("문제")}"></div>
        <span class="spacer"></span>
        <span class="ta-meta">${setLabel(EXAM.o, c)}${EXAM.end ? "" : ` · ${T("제한 없음")}`}</span>
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
      items.forEach((it) => {
        if (it.none) return;
        Store.record(cid, it.id, it.ok);
        // 시험 점수도 최고 점수에 넣는다(전에는 연습에서 낸 것만 넣어, 시험에서 100점을 받아도 목록에 '최고 0점'으로 보였다)
        Store.patch(cid, it.id, { best: Math.max(Store.prob(cid, it.id).best || 0, it.score || 0) });
      });
      Store.update((d) => {
        const st = Store.course(cid);
        st.exam = [{ at: Date.now(), code: x.o.code, how: x.o.how, ...(x.o.how === "set" ? { set: x.o.set, title: x.o.title } : {}),
          q: setupQuery("exam", x.o), m: x.o.m, sec: Math.round(x.used), items }, ...(st.exam || [])].slice(0, 20);
        if (x.o.how === "set") st.sets = { ...(st.sets || {}), [x.o.set]: (st.sets || {})[x.o.set] || Date.now() };  // 처음 치른 때
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
    const set = e.how === "set" ? `${setTitle(c, e)} | ` : e.how === "pick" ? `${T("직접 고름 {ids}", { ids: e.items.map((it) => it.id).join("·") })} | ` :
      `${T("뽑기 코드 {code}", { code: e.code })} | ${g.length ? `${chapterRange(g)} ` : ""}`;
    const conv = e.how === "set" ? ` | ${T("1,000점 환산 {x}점", { x: fmtNum(setScore(c, e)) })}` : "";
    return `${T("코딩 테스트 모의 시험")} | ${set}${T("{n}문제", { n: e.items.length })} ${limitText(e.m)} | ` +
      e.items.map((it, i) => T("{i}번 {n}점", { i: i + 1, n: it.score })).join(", ") + ` | ${T("합계 {sum}/{max}", { sum, max: e.items.length * 100 })}${conv} | ${fmtDuration(e.sec)}`;
  }

  async function viewExamResult(cid, query) {
    const c = await getCourse(cid);
    const e = (Store.course(cid).exam || [])[+(new URLSearchParams(query || "").get("i") || 0)];
    if (!e) { location.replace(`#/${cid}/exam`); return; }
    document.title = T("모의 시험 결과 · 파이썬 코딩 테스트");
    const sum = e.items.reduce((a, it) => a + it.score, 0);
    const line = examLine(c, e);
    const isSet = e.how === "set";
    // 세트 문제는 직접 고르기 목록에 없으므로 '못 푼 문제만 다시' 대신 차례의 모의고사에서 다시 푼다
    const retry = isSet ? [] : e.items.filter((it) => it.score < 100 && c.byId[it.id]).map((it) => it.id);
    const missed = e.items.filter((it) => !it.ok && c.byId[it.id]).map((it) => c.byId[it.id]);
    main.innerHTML = `
      <div class="crumbs"><a href="#/${esc(cid)}">← ${T("차례")}</a><span>${esc(c.title)}</span></div>
      <h1>${T("모의 시험 결과")}</h1>
      <div class="card">
        ${isSet ? `<div class="score">${fmtNum(setScore(c, e))}<small> / ${T("1,000점")}</small></div>
          <p class="small muted">${T("1,000점 환산은 이 사이트가 보이는 값입니다(문항마다 {p}점 × 통과한 테스트의 비율). 공식 시험의 점수나 등급과 같지 않습니다.", { p: setPoints(c, e) })} ${T("문항 합계 {sum} / {max}", { sum, max: e.items.length * 100 })}</p>` :
          `<div class="score">${sum}<small> / ${T("{n}점", { n: e.items.length * 100 })}</small></div>`}
        <p class="muted" style="margin-top:6px">${resultMeta(e, c)} · ${fmtDate(e.at)}</p>
        <p class="small" style="margin:12px 0 6px"><b>${T("결과 줄")}</b> <span class="muted">${T("수업에서 결과를 낼 때 이 줄을 복사해 붙입니다. 이름이나 코드는 들어 있지 않습니다.")}</span></p>
        <div class="result-line" id="ex-line">${esc(line)}</div>
        <div class="actions">
          <button class="btn" id="ex-copy">${T("결과 줄 복사")}</button>
          ${retry.length ? `<a class="btn primary" href="${esc(retryHref(cid, "exam", e, retry))}">${T("못 푼 문제만 다시 ({n})", { n: retry.length })}</a>` : ""}
          <a class="btn mint" href="#/${esc(cid)}/exam?${esc(e.q)}">${isSet ? T("같은 세트 다시") : T("같은 문제 다시")}</a>
          ${isSet ? `<a class="btn" href="#/${esc(cid)}">${T("차례의 모의고사로")}</a>` : e.how === "pick" ? "" :
            `<a class="btn" href="#/${esc(cid)}/exam?${esc(e.q.replace(/code=[A-Z0-9]*/, "code="))}">${T("새로 뽑기")}</a>`}
        </div>
      </div>
      ${ctBookReviewHtml(c, missed, "exam-result")}
      <h2 class="section">${c.problems.some((p) => p.solution) ? T("문제별 점수와 모범 코드") : T("문제별 점수")}</h2>
      <div class="stack" id="ex-review"></div>`;
    $("#ex-review").innerHTML = e.items.map((it, i) => {
      const p = c.byId[it.id];
      if (!p) return "";
      const state = it.none ? T("안 냄") : it.failed ? T("채점하지 못함") : `${T("{n}점", { n: it.score })} · ${T("정확성 {k}/{n}", { k: it.passed, n: it.total })}`;
      const perf = it.perf && it.perf.total ? ` · ${T("효율성 {k}/{n}", { k: it.perf.passed, n: it.perf.total })}` : "";
      return `<details class="card" ${it.ok ? "" : "open"}>
        <summary class="row"><b>${i + 1}. ${esc(p.title)}</b><span class="badge lv${p.level}">${levelName(p.level)}</span>${p.form ? `<span class="small muted">${formName(p.form)}</span>` : ""}${isSet && p.topic ? `<span class="small muted">${T("유형 {list}", { list: topicText(c, p) })}</span>` : ""}
          <span class="${it.ok ? "" : "muted"}">${it.ok ? "✓" : "✗"} ${esc(state + perf)}</span><span class="spacer"></span>
          <a class="small" href="#/${esc(cid)}/p/${esc(p.id)}">${T("연습에서 다시 풀기")}</a></summary>
        <div style="margin-top:12px">
          ${it.none ? `<p class="small muted">${T("제출한 코드가 없습니다.")}</p>` : `<h3>${T("내 코드")}</h3>${codeBlock(hl(String(it.code).replace(/\n+$/, "")))}`}
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
  // ------------------------------------------------------------------ 화면: 파이썬 바로 실행(2026-11-16)
  // 사용자 "문제 없이 파이썬 인터프리터를 바로 쓰고 결과 확인할 수 있는 곳(코랩도 로그인 귀찮고 깔기는 더 귀찮을 때)". 검토는 검토-실행기-20261116.
  // 문제 화면의 실행기(Py, harness.py)를 그대로 쓰고 run 요청에 free를 붙인다: 줄 수는 세지 않고, 출력 100,000자, 제한 시간 60초,
  // 마지막 줄이 식이면 그 값을 보이고, 그림은 보인 차례로 모두 돌려준다(harness._free_run). '멈추기'는 Worker를 끈다(Py.stop).
  // 그래프 도구는 코드의 import 줄을 보고 실행할 때 받는다. 진짜 주소는 /practice/python/(영어 /practice/en/python/)이고
  // tools/static_pages.py가 index.html로 만든다. 앱 안 주소는 #/run, #/en/run이다.
  // 코드는 이 브라우저(localStorage RUN_KEY)에만 둔다. 주소에 코드를 담아 나누는 기능은 두지 않는다(GA4가 쪽 주소를 보내므로).
  const RUN_KEY = "dhl-practice-run-v1";
  const RUN_MS = 60000;
  const RUN_PKGS = { numpy: ["numpy"], pandas: ["pandas"], matplotlib: ["matplotlib"], seaborn: ["matplotlib", "pandas", "seaborn"], plotly: ["plotly"] };
  const RUN_PKG_NAMES = "numpy, pandas, matplotlib, seaborn, plotly";
  const runHref = () => (LANG === "en" ? "en/python/" : "python/");  // 앱의 기준 주소(/practice/)에서 본 실행기 쪽
  function runPackages(code) {
    const need = new Set();
    const re = /^[ \t]*(?:import[ \t]+([\w., \t]+)|from[ \t]+(\w+))/gm;
    let m;
    while ((m = re.exec(code))) {
      const names = m[1] ? m[1].split(",").map((x) => x.trim().split(/[\s.]/)[0]) : [m[2]];
      names.forEach((n) => (RUN_PKGS[n] || []).forEach((k) => need.add(k)));
    }
    if (need.has("pandas") && /\.(plot|hist|boxplot)\b/.test(code)) need.add("matplotlib");  // pandas의 그림은 matplotlib이 그린다
    return [...need];
  }
  const runSample = () => (LANG === "en" ?
    '# Write Python code here and press Run.\nname = "Python"\nprint(f"Hello, {name}!")\n\nnums = [5, 3, 8, 1]\nsorted(nums)\n' :
    '# 여기에 파이썬 코드를 쓰고 \'실행\'을 누릅니다.\nname = "파이썬"\nprint(f"안녕하세요, {name}!")\n\nnums = [5, 3, 8, 1]\nsorted(nums)\n');  // i18n:ok 한국어 화면의 보기 코드
  const runStore = {
    get() { try { return JSON.parse(localStorage.getItem(RUN_KEY) || "null"); } catch (e) { return null; } },
    set(d) { try { localStorage.setItem(RUN_KEY, JSON.stringify(d)); } catch (e) { /* 저장할 수 없는 브라우저: 이 화면에서만 쓴다 */ } },
  };

  function runResultHtml(r, ms) {
    let text = r.screen || "";
    if (r.last != null) text += (text && !text.endsWith("\n") ? "\n" : "") + r.last;
    const shown = (r.images || []).length + (r.figs || []).length;
    const imgs = (r.images || []).map((src, i) => figureHtml(src, shown > 1 ? T("그림 {n}", { n: i + 1 }) : T("그림"))).join("");
    const figs = (r.figs || []).map((f) => plotlyHtml(f, "")).join("");
    const more = r.more_figures ? `<p class="tiny muted">${T("그림이 많아 앞의 {n}장만 보입니다.", { n: shown })}</p>` : "";
    const err = !r.error ? "" : errorHtml(r.error) + (r.error.type === "ModuleNotFoundError" ?
      `<div class="errko">${T("이 실행기에서 쓸 수 있는 패키지는 {names}와 표준 라이브러리입니다.", { names: RUN_PKG_NAMES })}</div>` : "");
    return `<span class="label">${T("실행 결과")} <span class="tiny muted run-time">${ms < 10 ? T("0.01초 미만") : T("{s}초", { s: (ms / 1000).toFixed(2) })}</span></span>` +
      `<pre class="out">${esc(text) || `<span class="muted">${T("(출력 없음)")}</span>`}</pre>${err}${imgs}${figs}${more}`;
  }

  function viewRun() {
    document.title = T("파이썬 바로 실행 · 설치와 로그인 없이");
    const saved = runStore.get() || {};
    const help = `eh${++editorSeq}`;
    main.innerHTML = `<div class="view run-view">
      <h1>${T("파이썬 바로 실행")}</h1>
      <p class="lead">${T("설치와 로그인 없이 브라우저에서 파이썬 코드를 바로 실행합니다.")}</p>
      <div class="card run-card section">
        <div class="editor"><pre class="gutter" aria-hidden="true"></pre>
          <textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"
            aria-label="${T("코드 입력")}" aria-describedby="${help}"></textarea></div>${editorHelpHtml(help)}
        <div class="run-stdin" hidden>
          <label class="label" for="run-stdin">${T("실행할 때 input()이 읽을 값")} <span class="muted small">(${T("한 줄에 하나")})</span></label>
          <textarea id="run-stdin" class="stdin-input" rows="2" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
        </div>
        <div class="actions">
          <button class="btn primary" data-act="run">${T("실행")} <span class="kbd">${SUBMIT_KEY}</span></button>
          <button class="btn" data-act="stop" hidden>${T("멈추기")}</button>
          <button class="btn" data-act="download" title="${T(".py 파일로 내려받습니다")}">${T("코드 내려받기")}</button>
          <span class="spacer"></span>
          <button class="btn ghost" data-act="clear">${T("비우기")}</button>
        </div>
        <div class="console" hidden aria-live="polite"></div>
      </div>
      <div class="card section run-notes">
        <h2>${T("되는 것과 안 되는 것")}</h2>
        <ul>
          <li>${T("파이썬 3.12와 표준 라이브러리를 씁니다. numpy, pandas, matplotlib, seaborn, plotly는 import하면 처음 한 번 내려받습니다.")}</li>
          <li>${T("마지막 줄이 식이면 코랩처럼 그 값을 보여 줍니다. 그림은 plt.show()를 부른 차례로 모두 보입니다.")}</li>
          <li>${T("input()이 읽을 값은 실행하기 전에 칸에 한 줄에 하나씩 적습니다. 실행하는 중에 값을 묻지는 않습니다.")}</li>
          <li>${T("한 번 실행은 60초까지입니다. 그 전에 끝내려면 '멈추기'를 누릅니다.")}</li>
          <li>${T("pip install, 파일 올리기, 위에 적지 않은 패키지는 쓸 수 없습니다. 그림 글자(제목, 라벨)는 영어로 씁니다. 한글은 네모로 보입니다.")}</li>
          <li>${T("다른 기기에서 이어 쓰려면 '코드 내려받기'로 .py 파일을 받아 둡니다.")}</li>
        </ul>
      </div>
    </div>`;
    const root = $(".run-view", main);
    const stdinBox = $(".run-stdin", root);
    const stdinEl = $("#run-stdin", root);
    const runBtn = $('[data-act="run"]', root);
    const stopBtn = $('[data-act="stop"]', root);
    const consoleEl = $(".console", root);
    let saveTimer = null;
    let ta = null;
    const flush = () => {
      clearTimeout(saveTimer);
      if (pendingDraft === flush) pendingDraft = null;
      if (ta) runStore.set({ code: ta.value, stdin: stdinEl.value });
    };
    const saveSoon = () => { clearTimeout(saveTimer); pendingDraft = flush; saveTimer = setTimeout(flush, 400); };
    const toggleStdin = () => { stdinBox.hidden = !/\binput\s*\(/.test(ta.value); };
    ta = makeEditor($(".editor", root), {
      value: typeof saved.code === "string" ? saved.code : runSample(),
      onChange: () => { toggleStdin(); saveSoon(); },
      onSubmit: () => run(),
      minRows: 12,
    });
    stdinEl.value = typeof saved.stdin === "string" ? saved.stdin : "";
    toggleStdin();
    stdinEl.addEventListener("input", saveSoon);
    stdinEl.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); } });
    setCleanup(() => { if (pendingDraft === flush) flush(); });

    let busy = false;
    // 실행하는 동안은 문제 화면처럼 주 단추 이름이 진행 상황(파이썬 준비 중, 실행 중)으로 바뀌고, 그동안만 '멈추기'가 보인다
    const setBusy = (on, label) => {
      busy = on;
      runBtn.disabled = on;
      runBtn.firstChild.textContent = on ? `${label} ` : `${T("실행")} `;
      stopBtn.hidden = !on;
    };
    async function run() {
      if (busy) return;
      flush();
      const code = ta.value;
      const stdin = stdinEl.value.split("\n").filter((x, i, arr) => x !== "" || i < arr.length - 1);
      const pkgs = runPackages(code);
      try {
        if (Py.state !== "ready") { setBusy(true, T("파이썬 준비 중")); await Py.start(); }
        if (pkgs.length && !Py.ready(pkgs)) {
          const graph = pkgs.some((n) => ["matplotlib", "seaborn", "plotly"].includes(n));  // 문제 화면과 같은 이름. numpy·pandas만이면 그 이름
          setBusy(true, graph ? T("그래프 도구 준비 중") : T("{names} 준비 중", { names: pkgs.join(", ") }));
          await Py.load(pkgs);
        }
        setBusy(true, T("실행 중"));
        const started = performance.now();
        const r = await Py.call("run", { code, stdin, free: true, lang: LANG }, RUN_MS);
        consoleEl.innerHTML = runResultHtml(r, performance.now() - started);
      } catch (err) {
        consoleEl.innerHTML = `<span class="label">${T("실행 결과")}</span>` + (err.stopped ?
          `<div class="errline">${T("멈췄습니다.")}</div><div class="errko">${T("파이썬을 다시 준비합니다. 다시 실행하면 처음부터 돕니다.")}</div>` :
          err.timeout ? errorHtml({ type: "Timeout" }) : `<div class="warnbox">${esc(pyErrorText(err))}</div>`);
      } finally {
        const fromStop = document.activeElement === stopBtn;  // 멈추기 단추가 숨으므로 초점을 실행 단추로 옮긴다
        setBusy(false);
        if (fromStop) runBtn.focus();
        consoleEl.hidden = false;
        reveal(consoleEl);
      }
    }
    runBtn.addEventListener("click", run);
    stopBtn.addEventListener("click", () => { Py.stop(); Py.start().catch(() => {}); });
    $('[data-act="download"]', root).addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([ta.value], { type: "text/x-python;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "main.py";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $('[data-act="clear"]', root).addEventListener("click", () => {
      if (ta.value.trim() && !confirm(T("코드를 모두 지울까요? 지운 코드는 되돌릴 수 없습니다."))) return;
      ta.value = "";
      ta.dispatchEvent(new Event("input"));
      consoleEl.hidden = true;
      consoleEl.innerHTML = "";
      ta.focus();
    });
    Py.start().catch(() => {});  // 코드를 쓰는 동안 파이썬을 미리 띄운다(그래프 도구는 실행할 때 받는다)
  }

  function viewTerms() {
    document.title = T("{title} · 파이썬 코딩 테스트", { title: T("이용 안내와 저작권") });
    main.innerHTML = `<div class="view prose">
      <div class="crumbs"><a href="${homeHref()}">← ${T("파이썬 코딩 테스트")}</a></div>
      <h1>${T("이용 안내와 저작권")}</h1>
      <p class="lead">${T("이 사이트의 문제와 코드를 어디까지 쓸 수 있는지, 사이트가 쓰는 오픈소스는 무엇인지 적었습니다.")}</p>
      <div class="card section">
        <h2>${T("저작권")}</h2>
        <p>${T("이 사이트의 문제(지문, 시작 코드, 정답 코드, 힌트, 해설), 목표 그림, 화면 문구와 프로그램 코드(채점기 포함)의 저작권은 이동현에게 있습니다. © 2026 이동현. 모든 권리는 저작권자에게 있습니다.")}</p>
      </div>
      <div class="card section">
        <h2>${T("자유롭게 할 수 있는 것")}</h2>
        <ul>
          <li>${T("혼자 공부하며 문제를 푸는 것")}</li>
          <li>${T("수업이나 스터디에서 이 사이트와 문제의 주소(링크)를 나누는 것")}</li>
          <li>${T("파이썬 바로 실행에서 내 코드를 쓰고 실행하는 것(작성한 코드의 권리는 작성자에게 있습니다)")}</li>
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
          <li>${T("Plotly 6.7.0(plotly.py)과 그 안의 plotly.js 3.5.0: MIT License, Copyright (c) Plotly Technologies Inc. 휠 파일과 그 안의 plotly.js를 바꾸지 않고 사이트에 둡니다.")}</li>
          <li>${T("narwhals: MIT License. Pyodide와 함께 받아 씁니다.")}</li>
          <li>${T("Pretendard 글꼴: SIL Open Font License 1.1. jsDelivr에서 받아 씁니다.")}</li>
        </ul>
        <p class="small muted">${T("그 밖에 Pyodide가 함께 불러오는 패키지(pyparsing, cycler, kiwisolver 등)는 각자의 라이선스를 따릅니다.")}</p>
        <p class="small muted">${T("Plotly는 Plotly Technologies Inc.의, Streamlit은 Snowflake Inc.의 상표입니다. 이 사이트는 두 회사와 관계가 없습니다. Streamlit 문제는 Streamlit을 쓰지 않고, 이 사이트가 만든 작은 대역(함수 이름과 쓰는 법만 같음)으로 채점합니다.")}</p>
      </div>
    </div>`;
  }

  async function viewMe() {
    document.title = T("{title} · 파이썬 코딩 테스트", { title: T("내 기록") });
    // 이 언어의 과목만 보인다. 숨긴 과목은 기록이 있을 때만(주소로 열어 풀어 본 경우) 보인다
    const hasRecord = (id) => { const s = Store.data.courses[id]; return !!s && (Object.keys(s.p || {}).length > 0 || (s.ta || []).length > 0 || (s.exam || []).length > 0 || (s.hunt && s.hunt.plays > 0)); };
    const index = (await getIndex()).filter((m) => langOfMeta(m) === LANG && (listedMeta(m) || hasRecord(m.id)));
    await Promise.all(index.map((m) => getCourse(m.id)));
    let html = `<h1>${T("내 기록")}</h1>
      <p class="lead">${T("풀이 기록은 현재 브라우저에 보관됩니다. 다른 기기에서 이어 하려면 기록 파일을 내보낸 뒤 가져오세요.")}</p>`;
    const thead = `<thead><tr><th>${T("날짜")}</th><th>${T("고른 문제")}</th><th>${T("점수")}</th><th>${T("시간")}</th></tr></thead>`;
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
          ${exams.slice(0, 10).map((e, i) => `<tr><td>${fmtDate(e.at)}</td><td><a href="#/${esc(meta.id)}/exam/result?i=${i}">${e.how === "set" ? esc(setTitle(c, e)) : e.how === "pick" ? T("직접 고름") : esc(e.code)}</a></td>
            <td>${e.how === "set" ? `${fmtNum(setScore(c, e))} / 1,000` : `${e.items.reduce((a, it) => a + it.score, 0)} / ${e.items.length * 100}`}</td><td>${fmtDuration(e.sec)}</td></tr>`).join("")}</tbody></table>` :
          `<p class="small muted">${T("아직 기록이 없습니다.")}</p>`}` :
        `<h3 style="margin-top:14px">${T("타임어택")}</h3>
        ${st.ta.length ? `<table class="records">${thead}<tbody>
          ${st.ta.slice(0, 10).map((t, i) => `<tr><td>${fmtDate(t.at)}</td><td><a href="#/${esc(meta.id)}/${t.items ? `ta/result?i=${i}` : `ta?${esc(t.q)}`}">${t.how === "pick" ? T("직접 고름") : esc(t.code)}</a></td>
            <td>${t.ok} / ${t.n}</td><td>${fmtDuration(t.sec)}</td></tr>`).join("")}</tbody></table>` :
          `<p class="small muted">${T("아직 기록이 없습니다.")}</p>`}`;
      const solved = c.problems.filter((p) => statusOf(meta.id, p.id) === "solved").length;
      const tried = c.problems.filter((p) => statusOf(meta.id, p.id) === "tried");
      const chChips = c.chapters.filter((ch) => c.byChapter[ch.num].length).map((ch) => {
        const k = solvedIn(meta.id, c.byChapter[ch.num]);
        const m = c.byChapter[ch.num].length;
        return `<a class="ch-chip ${k === m && m > 0 ? "done" : ""}" href="#/${esc(meta.id)}/ch/${ch.num}">${T("{n}장 {k}/{m}", { n: ch.num, k, m })}</a>`;
      }).join("");
      html += `<div class="card section">
        <p class="eyebrow">${esc(c.eyebrow)}</p><h2>${esc(c.title)}</h2>
        <div class="row small"><b>${T("푼 문제 {k} / {n}", { k: solved, n: c.problems.length })}</b></div>
        <div class="ch-chips">${chChips}</div>
        <p class="tiny muted" style="margin:2px 0 0">${by.join(" · ")}</p>
        <div class="progress" style="margin:6px 0 14px"><span style="width:${c.problems.length ? (100 * solved) / c.problems.length : 0}%"></span></div>
        ${c.daily ? dailyMeHtml(c) : ""}
        ${tried.length ? `<p class="small">${T("아직 못 푼 문제: {list}", { list: tried.map((p) => `<a href="#/${esc(meta.id)}/p/${esc(p.id)}">${esc(p.title)}</a>`).join(", ") })}</p>` : ""}
        ${test ? ctBookReviewHtml(c, tried, "me") : bookReviewHtml(c, tried, "me")}
        ${history}
        ${test && st.hunt ? `<p class="small"><a href="#/${esc(meta.id)}/hunt">${T("반례 찾기")}</a>: ${T("찾은 반례 {n}개 · 최고 점수 {m}점", { n: Object.keys(st.hunt.caught || {}).length, m: Math.min(100, st.hunt.best || 0) })}</p>` : ""}
      </div>`;
    }
    const lastExp = Store.setting("exportedAt");
    html += `<div class="card section"><h2>${T("기록 파일")}</h2>
      ${lastExp ? `<p class="tiny muted" style="margin:0 0 8px">${T("마지막으로 내보낸 날: {date}", { date: fmtDate(lastExp) })}</p>` : ""}
      <div class="actions" style="margin-top:4px">
        <button class="btn" id="export">${T("기록 내보내기")}</button>
        <button class="btn" type="button" id="import-btn">${T("기록 가져오기")}</button><input type="file" id="import" accept="application/json,.json" hidden>
        <span class="spacer"></span><button class="btn ghost" id="wipe">${T("기록 모두 지우기")}</button>
      </div></div>`;
    main.innerHTML = html;
    $$("[data-me-daily-share]", main).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cid = btn.dataset.meDailyShare;
        const c = await getCourse(cid);
        const today = kstToday();
        const doneDates = Object.keys(Store.course(cid).daily || {}).filter((d) => validArenaDate(d, c.daily.start)).sort();
        const targetDate = Store.dailyDone(cid, today) ? today : (doneDates[doneDates.length - 1] || today);
        const p = c.byId[dailyPid(c, targetDate)] || c.byId[dailyPid(c, today)];
        const b = await fetchArenaDaily(targetDate).catch(() => getCachedOrSeededDaily(targetDate));
        openDailyShareModal(c, p, targetDate, b);
      });
    });
    function mergeStoreData(cur, inc) {
      const out = { v: 1, idv: ID_VERSION, courses: {}, set: { ...(inc.set || {}), ...(cur.set || {}) } };
      const allIds = new Set([...Object.keys(cur.courses || {}), ...Object.keys(inc.courses || {})]);
      for (const cid of allIds) {
        const a = (cur.courses || {})[cid] || { p: {}, ta: [], exam: [] };
        const b = (inc.courses || {})[cid] || { p: {}, ta: [], exam: [] };
        const p = { ...(b.p || {}) };
        for (const [pid, ar] of Object.entries(a.p || {})) {
          const br = p[pid];
          if (!br) { p[pid] = ar; continue; }
          p[pid] = {
            ...br, ...ar,
            s: Math.max(ar.s || 0, br.s || 0),
            n: Math.max(ar.n || 0, br.n || 0),
            best: Math.max(ar.best || 0, br.best || 0) || undefined,
            at: Math.max(ar.at || 0, br.at || 0) || undefined,
            d: (ar.at || 0) >= (br.at || 0) ? (ar.d || br.d) : (br.d || ar.d),
          };
        }
        const dedup = (arr1, arr2) => {
          const seen = new Set();
          return [...(arr1 || []), ...(arr2 || [])].filter((x) => x && x.at && !seen.has(x.at) && seen.add(x.at)).sort((x, y) => y.at - x.at);
        };
        out.courses[cid] = {
          p,
          ta: dedup(a.ta, b.ta),
          exam: dedup(a.exam, b.exam),
          daily: { ...(b.daily || {}), ...(a.daily || {}) },
          sets: { ...(b.sets || {}), ...(a.sets || {}) },
        };
      }
      return out;
    }
    $("#export").addEventListener("click", () => {
      Store.setting("exportedAt", Date.now());
      const blob = new Blob([JSON.stringify(Store.data, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      const d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = `python-practice-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      render();
    });
    $("#import-btn").addEventListener("click", () => $("#import").click());  // 숨긴 파일 칸은 Tab으로 닿지 않아 단추가 연다
    $("#import").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        if (!d || d.v !== 1 || typeof d.courses !== "object") throw new Error("형식");  // i18n:ok 화면에 보이지 않는 오류 이름
        const migrated = migrateIds({ set: {}, ...d });
        const hasAny = Object.keys(Store.data.courses || {}).some(hasRecord);
        if (hasAny) {
          if (!confirm(T("가져온 기록을 지금 기록과 합칠까요? 이미 푼 문제와 시험 기록은 모두 보존됩니다."))) return;
          Store.data = mergeStoreData(Store.data, migrated);
        } else {
          Store.data = migrated;
        }
        if (Store.save()) toast(T("기록을 가져왔습니다"));
        else alert(T("가져온 기록을 저장하지 못했습니다. 창을 닫으면 사라집니다."));
        render();
      } catch (err) { alert(T("기록 파일을 읽지 못했습니다. 이 사이트에서 내보낸 파일인지 확인해 주세요.")); }
    });
    $("#wipe").addEventListener("click", () => {
      if (!confirm(T("풀이 기록을 모두 지울까요? 되돌릴 수 없습니다."))) return;
      Store.data = { v: 1, idv: ID_VERSION, courses: {}, set: {} };
      toast(Store.save() ? T("기록을 지웠습니다") : T("기록을 지우지 못했습니다"));
      render();
    });
  }

  // ------------------------------------------------------------------ 화면: 자체 점검(링크 없음, #/selftest)
  // 개발 도구라 한국어 그대로 둔다(SPEC 2절). 아래 i18n:ko-only부터 i18n:end까지는 tools/check_i18n.py가 보지 않는다
  // i18n:ko-only
  async function viewSelftest(only) {  // only: 과목 아이디(#/selftest/vis-en)면 그 과목만 돈다(2026-11-02)
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
    // 채점 하나가 시간 한도를 넘거나 실패해도 점검 전체를 멈추지 않고 그 줄을 실패로 적는다(2026-11-02, 숨긴 창에서 한 번 넘음)
    const g = (p, answer) => Py.call("grade", { problem: wire(p), answer }, p.plot || p.plotly || p.app ? 60000 : 15000)
      .catch((err) => ({ ok: false, score: 0, tests: [], blocked: `${err && err.message ? err.message : err}` }));
    // 코딩 테스트의 모범 코드는 공개 데이터에 없다. 로컬에서는 build.py가 만든 local-solutions.json으로 돌려 본다.
    // 영어 과목의 항목은 열쇠가 '<과목>/<문제>'이고, 없으면 같은 아이디의 한국어판 항목을 쓴다(SPEC 5절)
    const local = onLocal ? await fetch(`data/local-solutions.json?v=${VERSION}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : {};
    let skipped = 0;
    for (const meta of (await getIndex()).filter((m) => !only || m.id === only)) {
      const c = await getCourse(meta.id);
      if (c.daily) {  // 오늘의 문제 표: 모두 장 문제이고, 첫날 앞은 없고, 표가 끝난 뒤에는 요일을 맞춰 처음부터 다시 도는지
        const ids = c.daily.ids;
        const loop = ids.length - (ids.length % 7) || ids.length;
        const s = dayNum(c.daily.start);
        add(meta.id, "오늘의 문제 표", ids.length > 0 && ids.every((id) => c.byId[id] && !c.byId[id].set) &&
          dailyPid(c, c.daily.start) === ids[0] && dailyPid(c, dayStr(s - 1)) === null &&
          dailyPid(c, dayStr(s + ids.length + 3)) === ids[(ids.length + 3) % loop], `${c.daily.start}부터 ${ids.length}일`);
      }
      if ((c.packages || []).length) {
        const t1 = performance.now();
        await Py.load(c.packages);
        add(meta.id, "그래프 도구 불러오기", true, `${c.packages.join(", ")} ${Math.round(performance.now() - t1)}ms`);
      }
      for (const p of [...c.problems, ...c.setProblems]) {  // 모의고사 세트 문제도 점검한다
        const name = langOfMeta(meta) === "ko" ? p.id : `${c.id}/${p.id}`;  // 영어판은 문제 아이디가 같아 과목을 붙여 가른다
        const loc = local[`${c.id}/${p.id}`] || local[p.id];
        if ((p.packages || []).length) await Py.load(needPackages(c, p));  // Plotly 문제(2026-11-02)
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
          const r = await Py.call("run", { code: p.code, stdin: p.stdin || [], files: p.files || null, plot: !!(c.packages || []).length })
            .catch((err) => ({ stdout: "", error: { type: `${err && err.message ? err.message : err}` } }));
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
  let chromeLang = document.documentElement.lang === "en" ? "en" : "ko";  // 영어 실행기 쪽(/practice/en/python/)은 머리가 처음부터 영어다
  let chromeKo = null;
  const footerHtml = () => `
      <p>${T("문제, 해설, 그림과 사이트 코드의 저작권은 이동현에게 있습니다. 복제·재배포·판매는 허락을 받아야 합니다.")}</p>
      <p class="footer-links"><a href="${siteUrl("home")}">donghyunlee.kr</a> · <a href="${siteUrl("privacy")}">${T("개인정보 처리방침")}</a> · <a href="${termsHref()}">${T("이용 안내와 저작권")}</a> · ${T("© 2026 이동현")}</p>
    `;
  function setLang(lang) {
    LANG = lang === "en" ? "en" : "ko";
    if (LANG === chromeLang) return;
    const nav = $(".topnav");
    const links = $$("[data-nav]", nav);
    if (!chromeKo) {
      chromeKo = {
        skip: $(".skip").textContent, brandHref: $(".brand").getAttribute("href"), theme: $("#theme-toggle").getAttribute("aria-label"),
        nav: nav.getAttribute("aria-label"), links: links.map((a) => [a.getAttribute("href"), a.textContent]),
        footer: $(".footer .wrap").innerHTML,
      };
    }
    chromeLang = LANG;
    document.documentElement.lang = LANG;
    if (LANG === "ko") {
      $(".skip").textContent = chromeKo.skip;
      $(".brand").setAttribute("href", chromeKo.brandHref);
      ["aria-label", "title"].forEach((k) => $("#theme-toggle").setAttribute(k, chromeKo.theme));
      nav.setAttribute("aria-label", chromeKo.nav);
      links.forEach((a, i) => { a.setAttribute("href", chromeKo.links[i][0]); a.textContent = chromeKo.links[i][1]; });
      $(".footer .wrap").innerHTML = chromeKo.footer;
    } else {
      $(".skip").textContent = T("본문으로 건너뛰기");
      $(".brand").setAttribute("href", homeHref());
      ["aria-label", "title"].forEach((k) => $("#theme-toggle").setAttribute(k, T("밝은 화면과 어두운 화면 바꾸기")));
      nav.setAttribute("aria-label", T("주 메뉴"));
      const en = { practice: [homeHref(), T("실습 홈")], run: [runHref(), T("바로 실행")],
        me: [meHref(), T("내 기록")], books: [siteUrl("books"), T("도서")], hub: [siteUrl("home"), T("← donghyunlee.kr")] };
      links.forEach((a) => { const item = en[a.dataset.nav]; if (item) { a.setAttribute("href", item[0]); a.textContent = item[1]; } });
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
              href = `#/${pair.id}${rest.replace(/^\/hunt\/(?:run|result).*$/, "/hunt").replace(/^\/(ta|exam)\/(run|result).*$/, "/$1")}`;  // 진행과 결과는 그 과목의 기록이라 시작 화면으로(duel 도전장 쿼리는 유지)
            }
          }
        } else if (other === "ko" || anyOpen) href = other === "en" ? "#/en" : "#/";
      } else if (page && (other === "ko" || anyOpen)) {
        href = { home: ["#/", "#/en"], me: ["#/me", "#/en/me"], terms: ["#/terms", "#/en/terms"],
          run: ["python/", "en/python/"] }[page][other === "en" ? 1 : 0];  // 실행기는 진짜 주소의 쪽으로(기준 주소 /practice/에서)
      }
    } catch (err) { href = null; }
    if (seq !== switchSeq) return;
    a.hidden = !href;
    if (!href) return;
    a.setAttribute("href", href);
    a.textContent = other === "en" ? "English" : "한국어";  // i18n:ok 언어 이름은 그 언어로 쓴다
    a.dataset.short = other === "en" ? "EN" : "KO";  // 360px 아래 화면에서 줄여 쓰는 이름(style.css)
    a.setAttribute("aria-label", a.textContent);  // 줄여 쓴 화면에서도 낭독기는 전체 이름만 읽게(EN을 겹쳐 읽지 않게)
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
  // 실행기 쪽(/practice/python/, /practice/en/python/, 2026-11-16)은 body의 data-start 화면(#/run, #/en/run)부터 연다.
  // 그 쪽의 머리와 고지는 한 언어로 고정돼 있어, 다른 화면의 주소는 앱 첫 쪽(/practice/)의 그 주소로 보낸다
  const START = document.body.dataset.start || "";

  async function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const hash = !location.hash || location.hash === "#main" ? START || "#/" : location.hash;  // #main은 건너뛰기 링크의 자리(스크립트 전)
    if (START && hash !== START) { location.replace(new URL(hash, document.baseURI).href); return; }
    if (HUNT && !hash.startsWith(`#/${HUNT.cid}/hunt`)) HUNT = null;
    const moved = newIds(hash);  // 옛 모의고사 주소(세트 링크와 문제 주소)는 새 아이디로 넘긴다(2026-10-24)
    if (moved !== hash) { location.replace(moved); return; }
    // [주소, 화면, 언어(과목 주소는 과목의 lang을 따르므로 비운다), 언어 바꾸기에 쓰는 화면 이름]
    const routes = [
      [/^#\/?$/, viewHome, "ko", "home"],
      [/^#\/en\/?$/, viewHome, "en", "home"],
      [/^#\/me$/, viewMe, "ko", "me"],
      [/^#\/en\/me$/, viewMe, "en", "me"],
      [/^#\/terms$/, viewTerms, "ko", "terms"],
      [/^#\/en\/terms$/, viewTerms, "en", "terms"],
      [/^#\/run$/, viewRun, "ko", "run"],  // 과목 주소(#/<과목>)보다 앞에 둔다
      [/^#\/en\/run$/, viewRun, "en", "run"],
      [/^#\/selftest(?:\/([a-z0-9-]+))?$/, (m) => viewSelftest(m[1]), "ko", null],
      [/^#\/([a-z0-9-]+)$/, (m) => viewBook(m[1])],
      [/^#\/([a-z0-9-]+)\/ch\/(\d+)(?:\/(\d+\.\d+))?(?:\?(.*))?$/, (m) => viewChapter(m[1], +m[2], m[3], m[4])],
      [/^#\/([a-z0-9-]+)\/p\/([\w-]+)$/, (m) => viewProblem(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/daily(?:\/(\d{4}-\d{2}-\d{2}))?(?:\?(.*))?$/, (m) => viewDaily(m[1], m[2], m[3])],
      [/^#\/([a-z0-9-]+)\/ta\/run$/, (m) => viewTARun(m[1])],
      [/^#\/([a-z0-9-]+)\/ta\/result(?:\?(.*))?$/, (m) => viewTAResult(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/ta(?:\?(.*))?$/, (m) => viewSetup(m[1], "ta", m[2])],
      [/^#\/([a-z0-9-]+)\/hunt(?:\?(.*))?$/, (m) => viewHunt(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/hunt\/run$/, (m) => viewHuntRun(m[1])],
      [/^#\/([a-z0-9-]+)\/hunt\/result$/, (m) => viewHuntResult(m[1])],
      [/^#\/([a-z0-9-]+)\/exam\/run$/, (m) => viewExamRun(m[1])],
      [/^#\/([a-z0-9-]+)\/exam\/result(?:\?(.*))?$/, (m) => viewExamResult(m[1], m[2])],
      [/^#\/([a-z0-9-]+)\/exam(?:\?(.*))?$/, (m) => viewSetup(m[1], "exam", m[2])],
    ];
    if (hash === "#toc") return;
    const syncNav = (active) => $$(".topnav [data-nav]").forEach((a) => {
      if (a.dataset.nav === active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const notFound = () => `<p>${T("없는 페이지입니다.")} <a href="${homeHref()}">${T("처음으로")}</a></p>`;
    for (const [re, fn, fixed, page] of routes) {
      const m = hash.match(re);
      if (m) {
        let keep = null;
        try {
          setLang(fixed || await courseLang(m[1]));
          syncNav(page === "terms" ? "" : page === "me" ? "me" : page === "run" ? "run" : "practice");
          updateLangSwitch(hash, page, fixed ? null : m[1]);
          keep = await fn(m);
        } catch (err) {
          if (err.notFound) { main.innerHTML = notFound(); syncNav(""); updateLangSwitch(hash, null, null); }
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
    syncNav("");
    updateLangSwitch(hash, null, null);
  }

  // ------------------------------------------------------------------ 영어 표(T의 열쇠 → 영어)
  // 짧고 쉬운 미국 영어로 쓴다. 용어는 SPEC-i18n 2절의 표를 따른다(채점하기 Check, 제출 Submit, 숨은 테스트 hidden tests,
  // 내 기록 My progress, 목표 그림 Target figure, 그래프 도구 plotting libraries, 장 Chapter, 차례 Contents 등).
  // 같은 뜻의 한국어 문장은 같은 영어로 쓴다. {n|problem|problems}는 n이 1이면 앞의 낱말, 아니면 뒤의 낱말이다.
  // 열쇠를 더하거나 고치면 python3 tools/check_i18n.py로 빠진 것과 한글이 남은 것을 본다.
  const EN = {
    // 반례 찾기
    "반례 찾기": "Counterexample",
    "예시는 통과하지만 틀린 풀이를 보고, 그 풀이가 틀리는 입력을 찾습니다.": "Read a solution that passes the examples but is wrong, and find an input that breaks it.",
    "반례 찾기 시작": "Find counterexample",
    "반례": "Counterexample",
    "최고 점수": "Best score",
    "찾은 반례": "Counterexamples found",
    "완료한 문제": "Problems completed",
    "연습 범위": "Practice range",
    "푼 문제와 1장": "Solved problems and chapter 1",
    "모든 장": "All chapters",
    "이미 푼 문제와 1장에서 고릅니다.": "Draw from problems you have solved and chapter 1.",
    "주관식으로 반례 인자를 직접 입력해 확인합니다(기회 3번, 제한 사항 밖 입력은 차감 없음).": "Type counterexample arguments directly (3 tries; out-of-range inputs do not use a try).",
    "직접 찾으면 최대 100점, 막힐 때는 보기 카드 4장(-20점)이나 힌트(-10점)를 열 수 있습니다.": "Up to 100 points when found directly, or open 4 choice cards (-20 pts) or a hint (-10 pts) when stuck.",
    "1문제 연습 시작": "Practice 1 problem",
    "안 찾은 반례부터 한 문제씩 고릅니다.": "Picks one unvisited counterexample at a time.",
    "이 범위에는 문제가 부족합니다. 모든 장을 골라 주세요.": "This range has too few problems. Choose all chapters.",
    "아직 풀지 않은 문제의 풀이 코드도 보게 됩니다.": "You will also see code for problems you have not solved yet.",
    "방금 기록을 오늘 순위표에 등록할까요?": "Post your result on today's leaderboard?",
    "방금 통과 기록({t})을 오늘 순위표에 등록할까요?": "Post your solve time ({t}) on today's leaderboard?",
    "방금 통과 기록({t})을 #{d} 순위표에 등록할까요?": "Post your solve time ({t}) on the #{d} leaderboard?",
    "내 순위표 별명": "My leaderboard nickname",
    "수식어 고르기": "Choose adjective",
    "별명 명사 고르기": "Choose noun",
    "익명 구분 번호": "Anonymous tag",
    "무작위 별명 조합": "Randomize nickname combo",
    "섞기": "Shuffle",
    "순위표에 등록하기": "Post to leaderboard",
    "변경 저장": "Save",
    "별명 바꾸기": "Change nickname",
    "보드 기록 삭제": "Delete board records",
    "'{name}' 별명으로 오늘 순위표에 등록했습니다.": "Posted to today's leaderboard as '{name}'.",
    "'{name}' 별명으로 #{d} 순위표에 등록했습니다.": "Posted to the #{d} leaderboard as '{name}'.",
    "순위표 별명을 '{name}'(으)로 바꿨습니다.": "Updated your leaderboard nickname to '{name}'.",
    "오늘 순위표에서 내 별명과 기록을 바로 삭제할까요? 내 연습 기록은 그대로 남습니다.": "Delete your nickname and entries from the leaderboard right away? Your local practice progress will stay intact.",
    "순위표에서 내 별명과 기록을 삭제했습니다.": "Deleted your nickname and entries from the leaderboard.",
    "내 순위 {r}위 / {n}명": "Rank #{r} of {n}",
    "오늘 등록 {n}명": "{n} posted today",
    "등록 {n}명": "{n} posted",
    "최근 7일 완주 {w}회": "{w} clears in 7 days",
    "지난 1위": "Prev #1",
    "지난 1위 · 오늘 왕좌 비어 있음": "Prev #1 · Today's #1 spot is open",
    "{n}일 연속 개근 중 (누적 {t}일)": "{n}-day streak ({t} total days)",
    "{n}일 개근": "{n}-day streak",
    "{n}일 연속 완주 중": "{n}-day streak",
    "{n}일 연속": "{n}d streak",
    "누적 {t}일 완주": "{t} total days solved",
    "누적 {n}일": "{n}d total",
    "개근 · 출석": "Streaks",
    "아직 오늘 등록된 기록이 없습니다. 문제를 풀고 첫 기록을 등록해 보세요.": "No records posted yet today. Solve today's problem and post the first record.",
    "아직 이 날짜에 등록된 기록이 없습니다. 문제를 풀고 첫 기록을 등록해 보세요.": "No records posted for this date yet. Solve the problem and post the first record.",
    "오늘의 순위": "Today's Leaderboard",
    "첫 1위 도전": "Claim #1",
    "{r}위": "#{r}",
    "{r}위 도전": "Claim #{r}",
    "빈 단상": "Open spot",
    "1~3위 입상 베니핏 · 시상대 말풍선": "Top 3 Perk · Podium Bubble",
    "시상대 말풍선 고르기": "Choose podium bubble",
    "말풍선 숨김": "Hide bubble",
    "말풍선 적용": "Apply",
    "시상대 말풍선을 업데이트했습니다.": "Updated your podium speech bubble.",
    "시상대 말풍선을 숨겼습니다.": "Hid your podium speech bubble.",
    "누적 1위 {g}회 · 입상 {p}회": "Total #1 finishes: {g} · Top 3: {p}",
    "누적 1~3위 입상 {p}회": "Total Top-3 finishes: {p}",
    "아이템 {item}": "Gear {item}",
    "완주 {d}일 공통 아이템: {items}": "Clear-day gear ({d}d): {items}",
    "완주 성장 아이템": "Clear-Day Milestone Gear",
    "완주 {d}일 · 모든 공통 아이템 장착 완료!": "{d}d cleared · All milestone gear unlocked!",
    "완주 {d}일 · 다음 공통 아이템 '{item}'까지 {r}일": "{d}d cleared · {r} more {r|day|days} to unlock '{item}'",
    "{d}일 {item}": "{d}d {item}",
    "공유": "Share",
    "기록 카드": "Record card",
    "{name} 기록 카드": "{name}'s record card",
    "오늘의 기록 카드": "Daily Record Card",
    "창 닫기": "Close",
    "카드 종류": "Card type",
    "#{r}위 {name}": "#{r} {name}",
    "내 기록 · {r}위": "My record · #{r}",
    "내 완주 기록": "My solve record",
    "누적 기록 · {n}일": "Cumulative · {n}d",
    "오늘의 순위표": "Today's board",
    "1:1 정사각": "1:1 Square",
    "9:16 세로": "9:16 Vertical",
    "밝게": "Light",
    "어둡게": "Dark",
    "문제를 통과하면 내 풀이 시간이 담긴 개인 기록 카드로 바뀝니다.": "Solve the problem to switch to your personal solve-time card.",
    "공유하기": "Share",
    "이미지 저장": "Save image",
    "기록 카드 이미지를 저장했습니다.": "Saved record card image.",
    "링크를 복사했습니다.": "Copied link.",
    "누적 풀이 기록": "Cumulative Practice",
    "오늘의 {r}위 기록": "Ranked #{r} Today",
    "오늘의 문제 통과": "Solved Today",
    "{n}일 완주": "{n}d cleared",
    "장착 도트": "Gear",
    "비어 있음": "Open",
    "참여": "Entries",
    "대기 중": "Open",
    "현재 1위": "Best time",
    "난이도": "Level",
    "누적 완주": "Total days",
    "{n}일": "{n}d",
    "{n}종": "{n}",
    "오늘 문제": "Problem",
    "기록": "Result",
    "오늘의 파이썬": "Daily Python",
    "현재 1위 {t} · 등록 {n}명": "Best time {t} · {n} posted",
    "단원 순위": "Chapter Rank",
    "{m}월 내 순위 {r}위 / {n}명 · 1위 {name} ({s}/{tot})": "{m} rank #{r} / {n} · #1 {name} ({s}/{tot})",
    "{m}월 1위 {name} ({s}/{tot}) · 참여 {n}명": "{m} #1 {name} ({s}/{tot}) · {n} posted",
    "이번 달 참여 대기 · 누적 참여 {n}명": "Open this month · {n} all-time",
    "이번 달 첫 단원 기록이 비어 있습니다": "No chapter records yet this month",
    "내 {r}위 · 순위 보기": "Rank #{r} · View board",
    "순위 보기": "View board",
    "순위 접기": "Hide board",
    "{m}월 순위 ({n})": "{m} ({n})",
    "누적 순위 ({n})": "All-time ({n})",
    "매월 1일 새 월간 순위가 열립니다": "Monthly rankings reset on the 1st of each month",
    "자력 통과 {k}/{tot}문제 · 단원 순위표에 등록할까요?": "Solved {k}/{tot} unaided · Post to chapter leaderboard?",
    "누적 자력 통과 {k}/{tot}문제 · 누적 순위표에 등록할까요?": "Solved {k}/{tot} unaided overall · Post to all-time board?",
    "자력 통과": "Unaided",
    "시도 · 시간": "Tries · Time",
    "완주": "Complete",
    "아직 등록된 단원 기록이 없습니다. 해설을 열지 않고 문제를 통과하면 등록할 수 있습니다.": "No chapter records posted yet. Solve problems without opening solutions to post yours.",
    "정답·해설을 열지 않고 통과한 문항 수 → 총 시도 횟수 → 풀이 시간 순으로 집계합니다.": "Ranked by unaided problems solved, then total tries, then solve time.",
    "{n}장 자력 통과 {k}/{tot} · 이번 달 단원 {r}위": "Ch. {n} unaided {k}/{tot} · Monthly rank #{r}",
    "{n}장 자력 통과 {k}/{tot}": "Ch. {n} unaided {k}/{tot}",
    "단원 완주!": "Chapter complete!",
    "단원 순위표 보기": "View chapter board",
    "단원 순위 등록 · 보기": "Post / view chapter rank",
    "'{name}' 별명으로 단원 순위표에 등록했습니다.": "Posted to the chapter leaderboard as '{name}'.",
    "기록 도전장": "Record Challenge",
    "{name}님의 #{r}위 기록({t})에 도전합니다!": "Challenging {name}'s #{r} record ({t})!",
    "{name}님의 완주 기록({t})에 도전합니다!": "Challenging {name}'s clear time ({t})!",
    "전체 순위 · 기록판": "Full board · Archive",
    "순위": "Rank",
    "순위 · 참여": "Board · Entries",
    "이름": "Name",
    "풀이 시간": "Solve time",
    "오늘의 코딩 문제 순위표": "Today's Coding Problem Leaderboard",
    "#{d} 코딩 문제 순위표": "#{d} Coding Problem Leaderboard",
    "#{d} 코딩 문제 풀기": "Solve #{d} coding problem",
    "제출 횟수": "Tries",
    "{n}회": "{n}",
    "날짜별 문제 · 순위 기록판": "Daily Archive and Record Board",
    "최근 {n}일": "Last {n} days",
    "지난 날짜의 오늘의 코딩 문제를 다시 풀고 그날 순위표에 기록을 남길 수 있습니다.": "Solve past daily coding problems any time and post your record to each date's leaderboard.",
    "오늘": "Today",
    "어제": "Yesterday",
    "어제 (#{d})": "Yesterday (#{d})",
    "오늘 (#{d})": "Today (#{d})",
    "내 {r}위": "Rank #{r}",
    "1:1 고스트 도전장": "1:1 Ghost Duel",
    "1:1 고스트 도전장이 도착했습니다": "A 1:1 Ghost Duel challenge has arrived",
    "{name}님의 1:1 고스트 도전장이 도착했습니다": "{name} sent you a 1:1 Ghost Duel challenge",
    "도전자 기록 {n}점 · {t}": "Challenger: {n} pts · {t}",
    "{name} 기록 {n}점 · {t}": "{name}: {n} pts · {t}",
    "같은 함정 풀이에 직접 반례 입력을 넣어 도전자의 통과 기록과 겨룹니다.": "Type a counterexample input for the same buggy solution and compare against the challenger's record.",
    "이 기록에 도전하기": "Accept this challenge",
    "예시는 통과하지만 틀린 풀이 1개를 읽고, 그 풀이가 틀리는 입력값을 직접 넣어 찾아냅니다.": "Read 1 solution that passes the examples, and type an input that breaks it.",
    "반례 문제 고르기": "Choose counterexample scope",
    "일일 순위 경쟁은 오늘의 코딩 문제에서 진행됩니다.": "Daily leaderboard competition runs on Today's Coding Problem.",
    "풀이 중": "Solving",
    "{t} 완주": "{t} done",
    "{name} 완주 ({n}점 · {t}) · 내 속도로 끝까지 풀어 보세요": "{name} finished ({n} pts · {t}) · Keep going at your own pace",
    "{name} 완주 ({t}) · 내 속도로 끝까지 풀어 보세요": "{name} finished ({t}) · Keep going at your own pace",
    "{name} 목표: {n}점 · {t}": "{name} target: {n} pts · {t}",
    "오늘 기준 기록 비교": "Pace comparison",
    "#{d} 기준 기록 비교": "#{d} Pace comparison",
    "페이스메이커 접힘": "Pacemaker hidden",
    "접기": "Hide",
    "펼치기": "Show",
    "아직 오늘 완주자 0명 · 지금 풀면 첫 1위": "0 finishers today · Solve now to claim #1",
    "아직 #{d} 완주자 0명 · 지금 풀면 첫 1위": "0 finishers on #{d} · Solve now to claim #1",
    "현재 단독 1위 · 내 최고 기록 경신에 도전해 보세요": "Currently solo #1 · Try beating your own best time",
    "1:1 고스트 대결": "1:1 Ghost Duel",
    "반례 찾기 연습": "Counterexample Practice",
    "1:1 고스트 페이스메이커": "1:1 Ghost Pacemaker",
    "나": "You",
    "도전자": "Ghost",
    "{n}번째 문제": "Problem {n}",
    "진행 {n} / {total}": "Progress {n} / {total}",
    "문제 설명과 예시": "Problem and examples",
    "예시는 통과하지만 틀린 풀이": "Passes the examples, but wrong",
    "이 풀이가 틀리는 입력은?": "Which input breaks this solution?",
    "이 풀이가 틀리는 입력값을 직접 넣어 보세요": "Type an input that breaks this solution",
    "예: {ex}": "e.g., {ex}",
    "반례 확인": "Check input",
    "파이썬 값 표기로 적습니다(예: 정수 0, 문자열 'a', 리스트 [1, 0]). 제한 사항 밖 입력은 기회가 줄지 않습니다.": "Write Python literals (e.g., 0, 'a', [1, 0]). Out-of-range inputs do not use a try.",
    "직접 찾으면 최대 100점입니다.": "Up to 100 points when found directly.",
    "보기 카드 4장 열기 (-20점)": "Show 4 choice cards (-20 pts)",
    "숫자 키 1~4로도 고를 수 있습니다.": "You can also choose with number keys 1–4.",
    "남은 기회 {n} / 2": "Choices left: {n} / 2",
    "남은 기회 {n} / 3": "Tries left: {n} / 3",
    "반례로 넣을 인자 값을 모두 적어 주세요.": "Please fill in every argument to test.",
    "파이썬 값 표기로 적어 주세요(예: 0, 'a', [1, 2]). 기회는 줄지 않습니다.": "Write valid Python literals (e.g., 0, 'a', [1, 2]). No try was used.",
    "제한 사항을 벗어난 입력입니다. 문제의 제한 사항 안으로 다시 넣어 보세요(기회 차감 없음).": "Input is outside the problem constraints. Try values within the constraints (no try used).",
    "실행 한도를 넘는 큰 입력입니다. 더 작은 경계값으로 확인해 보세요(기회 차감 없음).": "Input exceeds the execution limit. Try a smaller edge case (no try used).",
    "오프라인 판정표에 없는 입력입니다. 가장 작은 경계값을 넣거나 '보기 카드 4장 열기'를 이용해 보세요(기회 차감 없음).": "Not in the offline table. Try a minimal boundary value or open the 4 choice cards (no try used).",
    "이미 확인한 입력({call})입니다. 다른 경계값을 넣어 보세요.": "You already tested {call}. Try a different edge case.",
    "{call}에서는 맞게 나옵니다({a}). 다른 경계값을 넣어 보세요.": "{call} returns the right answer ({a}). Try another edge case.",
    "보기 카드 4장으로 전환했습니다. 이 중 반례 입력을 골라 보세요.": "Switched to 4 choice cards. Pick the counterexample input below.",
    "통과": "Passes",
    "이런 경우를 떠올려 보세요: {hint}": "Think about this case: {hint}",
    "찾았습니다. 이 풀이는 {err} 오류로 멈춥니다.": "Found it. This solution stops with {err}.",
    "찾았습니다. 정답은 {e}인데 이 풀이는 {a}를 냅니다.": "Found it. The answer is {e}, but this solution returns {a}.",
    "반례를 찾았습니다": "Counterexample found",
    "이 입력이 반례였습니다.": "This was the counterexample.",
    "이 풀이는 {err} 오류로 멈춥니다.": "This solution stops with {err}.",
    "정답은 {e}인데 이 풀이는 {a}를 냅니다.": "The answer is {e}, but this solution returns {a}.",
    "획득 점수 {n}점": "{n} points earned",
    "다음에는 가장 작은 값이나 빠뜨린 경우를 떠올려 보세요.": "Next time, think about the smallest input or a case the code missed.",
    "이 입력에서는 맞게 나옵니다({a}). 한 번 더 고릅니다.": "This input gives the right answer ({a}). Try once more.",
    "예시는 통과하는 함정을 주관식 첫 시도에 힌트 없이 바로 찾아냈습니다. 실전 숨은 테스트 방어 감각이 날카롭습니다.": "You found the hidden counterexample on your first try without hints. Your edge-case defense is sharp.",
    "숨은 반례를 정확히 찾아냈습니다. 첫 시도에 바로 간파하는 연습을 더하면 디버깅 시간이 줄어듭니다.": "You found the hidden counterexample. Spotting it on the first try will cut debugging time even further.",
    "예시만 통과하면 안심하기 쉽습니다. 제한 사항의 가장 작은 값(0, 1, 빈 목록)부터 먼저 넣어 보는 습관으로 시작해 보세요.": "Passing examples can feel deceptive. Start by testing the smallest allowed inputs (0, 1, or an empty list) first.",
    "연습 문제": "Practice",
    "{name}님 기록보다 앞섰습니다!": "Ahead of {name}'s record!",
    "기록 동점 무승부!": "Tied record!",
    "{name}님에게 아까운 패배 — 다시 도전해 보세요": "Close behind {name} — try again",
    "내 기록 {ms}점 · {mt}  vs  {name} {os}점 · {ot}": "You: {ms} pts · {mt}  vs  {name}: {os} pts · {ot}",
    "같은 문제로 다시 도전": "Retry same problem",
    "{n}점 · {t}": "{n} pts · {t}",
    "내 이름으로 맞도전장 복사": "Copy named counter-duel link",
    "내 이름으로 1:1 도전장 복사": "Copy named 1:1 duel link",
    "결과 타일만 복사": "Copy result tiles",
    "왜 예시는 통과한 코드가 실전에서 무너질까요?": "Why does code that passes examples fail in practice?",
    "칼럼 읽기: AI가 짠 파이썬 코드, 돌아가는데 틀렸습니다 — 조용한 오류가 숨는 세 자리": "Essay: AI-written Python runs, yet it is wrong — three places silent bugs hide",
    "칼럼 읽기: 파이썬 코딩테스트 연습, 제한 시간을 두면 실력이 는다": "Essay: Why practicing Python coding tests with a time limit builds real skill",
    "도서 안내: AI ERA SERIES 전자책·예제 코드 보기": "Books: AI ERA SERIES ebooks and sample code",
    "파이썬 반례 찾기": "Python Counterexample",
    "{n}/{max}점 · {t}": "{n}/{max} pts · {t}",
    "{name}님의 기록에 1:1로 도전하기 →": "Challenge {name}'s 1:1 record →",
    "내 기록에 1:1 고스트로 도전하기 →": "Challenge my 1:1 ghost record →",
    "1:1 고스트 도전장 링크를 복사했습니다. 단톡방이나 스터디에 붙여 넣어 보세요.": "1:1 ghost duel link copied. Paste it into your chat or study group.",
    "결과 타일을 복사했습니다.": "Result tiles copied.",
    "반례 찾기 결과": "Counterexample result",
    "숨은 반례를 정확히 찾아냈습니다.": "You found the hidden counterexample.",
    "아쉽게 놓쳤습니다. 아래에서 반례 입력을 확인해 보세요.": "Missed it this time. Check the counterexample input below.",
    "{n}개 가운데 {k}개를 찾았습니다.": "You found {k} of {n}.",
    "찾았습니다": "Found",
    "놓쳤습니다": "Missed",
    "기대한 값 {e} · 오류 {err}": "Expected {e} · error {err}",
    "기대한 값 {e} · 오답 결과 {a}": "Expected {e} · wrong result {a}",
    "이 문제 풀어 보기": "Try this problem",
    "다른 문제 더 풀기": "Try another problem",
    "반례 찾기로 돌아가기": "Back to Counterexample",
    "찾은 반례 {n}개 · 최고 점수 {m}점": "Found: {n} · best score: {m}",
    // 파이썬 바로 실행(2026-11-16)
    "파이썬 바로 실행": "Run Python",
    "파이썬 바로 실행 · 설치와 로그인 없이": "Run Python Online · No Install, No Login",
    "설치와 로그인 없이 브라우저에서 파이썬 코드를 바로 실행합니다.": "Run Python code right in your browser, with no install and no login.",
    "멈추기": "Stop",
    "코드 내려받기": "Download code",
    ".py 파일로 내려받습니다": "Downloads a .py file",
    "되는 것과 안 되는 것": "What works and what does not",
    "파이썬 3.12와 표준 라이브러리를 씁니다. numpy, pandas, matplotlib, seaborn, plotly는 import하면 처음 한 번 내려받습니다.": "You can use Python 3.12 and its standard library. numpy, pandas, matplotlib, seaborn, and plotly are downloaded once, the first time you import them.",
    "마지막 줄이 식이면 코랩처럼 그 값을 보여 줍니다. 그림은 plt.show()를 부른 차례로 모두 보입니다.": "If the last line is an expression, its value is shown, as in Colab. Figures are all shown in the order you call plt.show().",
    "input()이 읽을 값은 실행하기 전에 칸에 한 줄에 하나씩 적습니다. 실행하는 중에 값을 묻지는 않습니다.": "Before you run, type the values for input() in the box, one per line. The code does not ask for values while it runs.",
    "한 번 실행은 60초까지입니다. 그 전에 끝내려면 '멈추기'를 누릅니다.": "Each run can take up to 60 seconds. To end it sooner, press Stop.",
    "pip install, 파일 올리기, 위에 적지 않은 패키지는 쓸 수 없습니다. 그림 글자(제목, 라벨)는 영어로 씁니다. 한글은 네모로 보입니다.": "pip install, file uploads, and packages not listed above are not available. Write figure text (titles, labels) in English. Korean shows up as boxes.",
    "다른 기기에서 이어 쓰려면 '코드 내려받기'로 .py 파일을 받아 둡니다.": "To keep working on another device, use Download code to save a .py file.",
    "{names} 준비 중": "Loading {names}",
    "0.01초 미만": "under 0.01 s",
    "멈췄습니다.": "Stopped.",
    "파이썬을 다시 준비합니다. 다시 실행하면 처음부터 돕니다.": "Python is restarting. When you run again, the code starts from the beginning.",
    "그림 {n}": "Figure {n}",
    "그림이 많아 앞의 {n}장만 보입니다.": "There are too many figures, so only the first {n} are shown.",
    "이 실행기에서 쓸 수 있는 패키지는 {names}와 표준 라이브러리입니다.": "This runner can use {names}, and the standard library.",
    "코드를 모두 지울까요? 지운 코드는 되돌릴 수 없습니다.": "Clear all the code? You cannot undo this.",
    "문제와 상관없는 코드는 {link}에서 따로 돌려 봅니다.": "To try code that is not part of this problem, use {link}.",
    "파이썬 바로 실행에서 내 코드를 쓰고 실행하는 것(작성한 코드의 권리는 작성자에게 있습니다)": "Writing and running your own code in Run Python (the code you write belongs to you)",
    // 나란히 보기(2026-11-12)
    "나란히 보기": "Side by side",
    "위아래로 보기": "Stacked",
    // UI 검토 1차(2026-10-21)
    "한 번 채점하면 열립니다": "Opens after your first check",
    "제출한 코드가 없습니다.": "No code was submitted.",
    "Tab은 들여쓰기입니다. 칸을 나가려면 Esc를 누른 뒤 Tab을 누릅니다.": "Tab indents. To leave the box, press Esc and then Tab.",
    "기록을 저장하지 못했습니다. 창을 닫기 전에 {me}에서 기록 파일을 내보내 두세요.": "Your progress could not be saved. Before you close this window, export a progress file from {me}.",
    "닫기": "Close",
    "가져온 기록을 저장하지 못했습니다. 창을 닫으면 사라집니다.": "The imported progress could not be saved. It will be lost when you close this window.",
    "기록을 지우지 못했습니다": "Your progress could not be cleared",
    // 오늘의 코딩 문제(2026-10-21, 2026-11-22 통합)
    "오늘의 코딩 문제 · {title}": "Today's Coding Problem · {title}",
    "오늘의 코딩 문제 풀기": "Solve today's coding problem",
    "오늘의 코딩 문제로": "Go to today's coding problem",
    "{date}의 코딩 문제": "Coding problem for {date}",
    "오늘의 코딩 문제는 {date}에 시작합니다.": "Today's coding problem starts on {date}.",
    "날짜는 한국 시각 자정에 바뀝니다.": "The day changes at midnight Korea time.",
    "아직 열리지 않은 날입니다.": "This day has not opened yet.",
    "이날의 문제가 없습니다.": "There is no problem for this day.",
    "최근 7일": "Last 7 days",
    "풀었음": "Solved",
    "안 풂": "Not solved",
    "푼 날 {n}일": "{n} {n|day|days} solved",
    "오늘의 코딩 문제를 풀었습니다": "You solved today's coding problem",
    "이날의 코딩 문제를 풀었습니다": "You solved this day's coding problem",
    "여기서 마쳐도 좋습니다.": "You can stop here.",
    "요점": "Key points",
    "전에 푼 문제입니다. 시작 코드에서 다시 풀어 봅니다.": "You solved this problem before. Try it again from the starting code.",
    "전에 쓴 코드 불러오기": "Load my earlier code",
    "지금 쓴 코드를 지우고 전에 쓴 코드를 불러올까요?": "Replace the code you have now with your earlier code?",
    "휴대폰에서는 코드 칸을 누르거나 실행할 때 파이썬(약 13MB)을 받습니다.": "On a phone, Python (about 13 MB) loads when you tap the code box or run your code.",
    // 모의고사 세트(2026-10-20)
    "모의고사 세트": "Mock sets",
    "{n}문항 · {m}분": "{n} problems · {m} min",
    "치른 적 있음 · {date}": "Taken · {date}",
    "문항 배점은 {p}점씩이고 결과에 1,000점 환산을 보입니다. 세트를 치르면 문제가 차례의 '모의고사'에 나타납니다.": "Each problem is worth {p} points, and the result shows a score out of 1,000. After you take the set, its problems appear under 'Mock exams' in the contents.",
    "1,000점 환산 {x}점": "{x} of 1,000 points",
    "1,000점": "1,000 points",
    "1,000점 환산은 이 사이트가 보이는 값입니다(문항마다 {p}점 × 통과한 테스트의 비율). 공식 시험의 점수나 등급과 같지 않습니다.": "The score out of 1,000 is this site's own conversion ({p} points × the share of tests passed, for each problem). It is not the same as an official exam score or level.",
    "문항 합계 {sum} / {max}": "Problem total {sum} / {max}",
    "같은 세트 다시": "Retake this set",
    "차례의 모의고사로": "Go to mock exams",
    "시험 형식대로 만든 모의고사 세트도 있습니다.": "There are also mock exam sets in the exam formats.",
    "모의고사": "Mock exams",
    "시험 형식대로 시간을 재고 치르는 세트입니다. 세트를 한 번 치르면 그 문제가 여기에 나타나 다시 풀 수 있습니다.": "Timed sets in the exam formats. After you take a set once, its problems appear here so you can solve them again.",
    "치르기 전에는 문제를 보이지 않습니다.": "The problems stay hidden until you take the set.",
    "다시 치르기": "Take it again",
    "세트 치르기": "Take the set",
    "모의고사 문제": "Mock exam problem",
    "이 문제는 모의고사 '{title}'에 있습니다. 세트를 한 번 치르면 여기서 다시 풀 수 있습니다.": "This problem is in the mock exam set '{title}'. After you take the set once, you can solve it again here.",
    "유형 {list}": "Topic: {list}",
    "빈칸 채우기": "Fill in the blanks",
    "디버깅": "Debugging",
    "빈칸 ____을 채워 {entry} 함수를 완성합니다": "Fill in the blanks (____) to complete the function {entry}",
    "한 줄을 고쳐 {entry} 함수를 완성합니다": "Fix one line to complete the function {entry}",

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
    "파이썬 다시 받기": "Retry Python",
    "파이썬 {python} 준비됨 (Pyodide {pyodide})": "Python {python} ready (Pyodide {pyodide})",
    "처음 한 번 실행 환경을 준비합니다": "Setting up the Python runtime for the first time",
    "눌러서 다시 불러옵니다": "Click to try again",
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
    "목표 리포트": "Target report",
    "목표 리포트 · 주어진 값 그대로 만들었을 때": "Target report · made with the given values",
    "이 테스트에서 만든 내 리포트": "Your report from this test",
    "내 리포트": "Your report",
    "리포트": "Report",
    "목표 리포트처럼 만듭니다.": "Make a report like the target report.",
    "채점할 때 내 코드가 저장한 HTML 파일에서 {fields}{obj} 읽어 비교합니다.": "Grading reads these from the HTML file your code saves and compares them: {fields}.",
    "리포트 안 차트의 값과 꾸밈, 글꼴은 보지 않습니다.": "The values and styling of the charts inside the report and the fonts are not checked.",

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
    "정확성 {k}/{n} · {s}점": "Correctness {k}/{n} · {s} {s|point|points}",
    "효율성 대기 · 정확성 통과 후 측정": "Efficiency pending · measured after correctness passes",
    "효율성 {k}/{n} · 시간 초과 (점수 밖)": "Efficiency {k}/{n} · timed out (not scored)",
    "효율성 {k}/{n} 통과 (점수 밖)": "Efficiency {k}/{n} passed (not scored)",
    "통과한 숨은 테스트 {n}개 보기": "Show {n} passed hidden {n|test|tests}",
    "답을 고쳤습니다. 다시 채점해 주세요.": "Answer edited — check again to update the result.",
    "코드 기호 입력": "Code symbols",
    "풀던 문제": "In progress",
    "문제 번호나 제목 찾기 (예: ct1-01, 2.1)": "Jump to problem ID or title (e.g., ct1-01, 2.1)",
    "절 번호나 문제 제목 찾기 (예: 3.4)": "Jump to section or problem title (e.g., 3.4)",
    "일치하는 문제나 절이 없습니다.": "No matching problem or section.",
    "마지막으로 내보낸 날: {date}": "Last exported: {date}",
    "가져온 기록을 지금 기록과 합칠까요? 이미 푼 문제와 시험 기록은 모두 보존됩니다.": "Merge the imported progress with your current progress? Solved problems and exam records will both be kept.",
    "효율성 테스트 {k}개는 시간 안에 끝났지만 틀려서 정확성 실패로 셈": "{k} efficiency {k|test|tests} finished in time but gave a wrong answer, so {k|it counts as a correctness failure|they count as correctness failures}",
    "숨은 테스트": "Hidden tests",
    "입력은 보이지 않고 어떤 경우인지만 보입니다": "Inputs are hidden; you see only what kind of case each test is",
    "효율성": "Efficiency",
    "시간 초과는 점수에 넣지 않음 · 실행한 줄 수로 잽니다": "Timeouts do not affect the score · measured by lines run",
    "예시 {n}개 중 {k}개 맞음": "{k} of {n} {n|example|examples} correct",
    "예시만 돌렸습니다. 제출하면 숨은 테스트까지 채점합니다.": "Only the examples were run. Submit to grade the hidden tests too.",
    "모범 코드": "Model solution",
    "다른 방법으로 풀어도 숨은 테스트를 모두 통과하면 정답입니다.": "A different approach is also correct if it passes all hidden tests.",
    "효율성 {k}/{n}": "Efficiency {k}/{n}",
    "{s}초 안에 끝나지 않았습니다. 반복 대신 셈으로 바로 구하거나 같은 일을 덜 되풀이하는 방법을 찾아봅니다.": "Did not finish within {s} seconds. Try computing the answer directly with arithmetic instead of a loop, or find a way to repeat less work.",
    "큰 입력에서 오류가 났습니다. 제한 사항의 가장 큰 값까지 맞게 도는지 봅니다. 이 테스트는 정확성 실패로 셉니다.": "An error occurred on a large input. Check that your code works up to the largest values in the constraints. This test counts as a correctness failure.",
    "시간 안에 끝났지만 값이 틀렸습니다. 큰 값에서만 틀리는 까닭(실수 나눗셈 등)을 찾아봅니다. 이 테스트는 정확성 실패로 셉니다.": "It finished in time, but the value is wrong. Find out why it fails only for large values (float division, for example). This test counts as a correctness failure.",
    "효율성 테스트 {n}개": "{n} efficiency {n|test|tests}",
    "효율성 테스트가 있는 문제": "With efficiency tests",
    "효율성 테스트": "Efficiency tests",
    "문제 설명": "Description",
    "제한 사항": "Constraints",
    "입출력 예": "Examples",
    "풀이": "Your code",
    "{entry} 함수를 완성합니다": "Complete the function {entry}",
    "예시 실행": "Run examples",
    "한 번 제출한 뒤에 열 수 있습니다": "Available after you submit once",
    "모범 코드와 해설": "Model solution and explanation",
    "예시 실행은 보이는 예시만 돌립니다. 제출하면 숨은 테스트까지 채점하고, 점수는 통과한 정확성 테스트의 비율입니다.": "Run examples tests only the visible examples. Submit also grades the hidden tests; your score is the share of correctness tests you pass.",
    "효율성은 정확성을 모두 통과한 뒤에 실행한 줄 수로 잽니다.": "Efficiency is measured by the number of lines run, after all correctness tests pass.",
    "제출은 여러 번 할 수 있고, 시험이 끝날 때의 코드로 점수를 매깁니다.": "You can submit many times; your score uses your code when the exam ends.",
    "시작 코드 그대로입니다. 함수를 완성한 뒤 제출합니다.": "This is still the starting code. Complete the function, then submit.",

    // 첫 화면, 과목, 장
    "파이썬 코딩 테스트": "Python Coding Test",
    "실습 홈": "Practice",
    "바로 실행": "Run Python",
    "← donghyunlee.kr": "← donghyunlee.kr",
    "밝은 화면과 어두운 화면 바꾸기": "Switch between light and dark mode",
    "파이썬 코딩 테스트 · 오늘의 코딩 문제": "Python Coding Test · Today's Coding Problem",
    "{title} · 파이썬 코딩 테스트": "{title} · Python Coding Test",
    "설치·가입 없이 하루 1문제 오늘의 코딩 문제로 실력을 확인하고, 기본기·데이터 시각화·코딩 테스트 문제를 바로 채점합니다.": "Check your skills with one daily coding problem—no install or sign-up—and grade Python basics, data visualization, and coding test problems right away.",
    "하루 1문제": "1 problem daily",
    "오늘의 반례 찾기": "Today's Counterexample",
    "날마다 모두에게 같은 코딩 문제 1개를 시간 제한 없이 풉니다.": "Complete the daily coding problem at your own pace with no time limit.",
    "다시 풀어 보기": "Try again",
    "순위표 · 지난 기록판": "Leaderboard · Archive",
    "오늘의 코딩 문제": "Today's Coding Problem",
    "날마다 모두에게 같은 코딩 문제 1개가 열립니다. 시간 제한 없이 함수를 완성해 통과해 보세요.": "Everyone gets the same coding problem each day. Complete the function at your own pace.",
    "하루 1문제 코딩 도전을 마쳤습니다. 내일 새 문제가 열립니다.": "You completed today's coding problem. A new problem opens tomorrow.",
    "기준 기록 {name}({ot})보다 빨리 풀었습니다!": "You solved faster than {name} ({ot})!",
    "내 통과 시간 {mt} · 기준 기록 {name}({ot})": "Your time {mt} · Pace record {name} ({ot})",
    "기준 기록 {name} ({t})": "Pace record {name} ({t})",
    "체계적 실습 과정 · {n}문제": "Structured Practice · {n} {n|Problem|Problems}",
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
    "차례 보기": "Table of contents",
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
    "지문과 목표 그림을 먼저 보고 무엇을 그릴지 정합니다. 실행하면 내 그림이 나오니 목표 그림과 비교한 뒤 채점합니다. 채점은 그림에서 값과 라벨을 읽어 비교합니다.": "Read the prompt and look at the target figure first to decide what to draw. When you run your code, your figure appears, so compare it with the target figure before you check. Grading reads the values and labels from your figure and compares them.",
    "예시를 먼저 실행해 보고, 제한 사항에서 가장 작은 값과 가장 큰 값을 떠올린 뒤 제출합니다. 숨은 테스트는 입력을 보여 주지 않고 어떤 경우였는지만 알려 줍니다.": "Run the examples first. Think of the smallest and largest values in the constraints, and then submit. Hidden tests do not show their inputs; they only tell you what kind of case each one was.",
    "막히면 문제 아래 '필요한 기초'에서 {book}의 해당 절로 갑니다.": "If you get stuck, follow the 'Basics you need' links below each problem to the matching section of {book}.",
    "출력 예측과 빈칸 문제는 실행하기 전에 먼저 답을 적고, 채점한 뒤에 실행해서 대조합니다. 교재 1장의 예측, 실행, 대조 순서입니다.": "For Predict the output and Fill in the blanks problems, write your answer before you run the code, and run it after you check to compare. This is the predict, run, compare routine from Chapter 1.",
    "힌트와 모범 코드를": "hints and model solutions",
    "힌트와 해설을": "hints and explanations",
    "힌트를": "hints",
    "연습": "Practice",
    "차례에서 장과 절을 골라 풀고 바로 채점합니다.": "Pick a chapter and section from the contents, solve the problems, and check them right away.",
    "막히면 {what} 함께 볼 수 있습니다.": "You can check {what} along the way.",
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
    "뽑기 코드": "Draw code",
    "자동": "Auto",
    "비워 두면 새로 만듭니다. 같은 코드를 넣으면 같은 문제가 나옵니다.": "Leave it empty to make a new one. The same code gives the same problems.",
    "시작": "Start",
    "같은 문제로 시작하는 링크를 복사합니다": "Copies a link that starts with the same problems",
    "링크 복사": "Copy link",
    "출력 예측과 빈칸 완성은 코드를 읽는 연습이라 빨리 풀 수 있고, 작성과 코드 리뷰는 문제마다 시간이 더 걸립니다.": "Predict the output and Fill in the blanks are code-reading practice, so they go quickly. Write code and Code review take more time per problem.",
    "효율성 테스트의 시간 초과는 시험 점수에 넣지 않습니다. 큰 입력에서 값이 틀리거나 오류가 나면 정확성 실패로 셉니다.": "Efficiency timeouts do not count toward the exam score. A wrong value or an error on a large input counts as a correctness failure.",
    "풀다가 창을 닫거나 새로 고쳐도 쓰던 답과 남은 시간으로 이어서 풉니다.": "If you close or reload the page while solving, you pick up where you left off with your remaining time.",
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
    "타임어택 진행 중 · 파이썬 코딩 테스트": "Time attack in progress · Python Coding Test",
    "남은 시간": "Time left",
    "걸린 시간": "Time used",
    "맞힌 문제 {n}": "Correct {n}",
    "그만하기": "Finish",
    "맞았습니다": "Correct",
    "틀렸습니다": "Wrong",
    "실행이 너무 오래 걸렸습니다.": "It ran too long.",
    "답과 해설은 끝난 뒤에 봅니다.": "You will see the answer and explanation at the end.",
    "여기서 끝낼까요? 지금까지 낸 답으로 결과를 봅니다.": "Finish now? Your results will use the answers you have submitted so far.",
    "타임어택 결과 · 파이썬 코딩 테스트": "Time attack results · Python Coding Test",
    "타임어택 결과": "Time attack results",
    "못 푼 문제만 다시 ({n})": "Retry missed problems ({n})",
    "같은 문제 다시": "Same problems again",
    "새로 뽑기": "Draw again",
    "문제별 답과 해설": "Answers and explanations",
    "안 냄": "Not submitted",
    "맞음": "Correct",
    "틀림 · 시간 초과": "Wrong · timed out",
    "틀림": "Wrong",
    "연습에서 다시 풀기": "Try again in practice",
    "제한 {m}분": "Limit {m} min",
    "뽑기 코드 {code}": "Draw code {code}",
    "틀린 까닭": "Why it was wrong",
    "오류: {name}": "Error: {name}",
    "이름 고르지 않음": "no name chosen",
    "빈칸 {n}: {v}": "Blank {n}: {v}",
    "(비움)": "(empty)",
    "내 답": "Your answer",
    "모의 시험 진행 중 · 파이썬 코딩 테스트": "Mock exam in progress · Python Coding Test",
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
    "모의 시험 결과 · 파이썬 코딩 테스트": "Mock exam results · Python Coding Test",
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
    "풀이 기록은 현재 브라우저에 보관됩니다. 다른 기기에서 이어 하려면 기록 파일을 내보낸 뒤 가져오세요.": "Your progress is kept in this browser. To continue on another device, export a progress file and import it there.",
    "날짜": "Date",
    "고른 문제": "Problems",
    "점수": "Score",
    "시간": "Time",
    "직접 고름": "Picked",
    "아직 기록이 없습니다.": "No records yet.",
    "{n}장 {k}/{m}": "Ch. {n}: {k}/{m}",
    "아직 못 푼 문제: {list}": "Not solved yet: {list}",
    "기록 파일": "Progress file",
    "기록 내보내기": "Export progress",
    "기록 가져오기": "Import progress",
    "기록 모두 지우기": "Clear all progress",
    "기록을 가져왔습니다": "Progress imported",
    "기록 파일을 읽지 못했습니다. 이 사이트에서 내보낸 파일인지 확인해 주세요.": "Could not read the progress file. Make sure it was exported from this site.",
    "풀이 기록을 모두 지울까요? 되돌릴 수 없습니다.": "Delete all progress? This cannot be undone.",
    "기록을 지웠습니다": "Progress deleted",

    // 이용 안내와 저작권(web/LICENSE.txt의 영어 부분과 같은 뜻)
    "이용 안내와 저작권": "Terms and copyright",
    "이 사이트의 문제와 코드를 어디까지 쓸 수 있는지, 사이트가 쓰는 오픈소스는 무엇인지 적었습니다.": "What you may do with the problems and code on this site, and which open-source software the site uses.",
    "저작권": "Copyright",
    "이 사이트의 문제(지문, 시작 코드, 정답 코드, 힌트, 해설), 목표 그림, 화면 문구와 프로그램 코드(채점기 포함)의 저작권은 이동현에게 있습니다. © 2026 이동현. 모든 권리는 저작권자에게 있습니다.": "The problems on this site (prompts, starter code, solutions, hints, explanations), target figures, interface text, and program code (including the grader) are protected by copyright and belong to Donghyun Lee. © 2026 Donghyun Lee. All rights reserved.",
    "자유롭게 할 수 있는 것": "What you may do freely",
    "혼자 공부하며 문제를 푸는 것": "Solve the problems for personal study",
    "수업이나 스터디에서 이 사이트와 문제의 주소(링크)를 나누는 것": "Share links to this site and its problems in classes and study groups",
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
    "Plotly 6.7.0(plotly.py)과 그 안의 plotly.js 3.5.0: MIT License, Copyright (c) Plotly Technologies Inc. 휠 파일과 그 안의 plotly.js를 바꾸지 않고 사이트에 둡니다.":
      "Plotly 6.7.0 (plotly.py) and the plotly.js 3.5.0 inside it: MIT License, Copyright (c) Plotly Technologies Inc. The wheel file and the plotly.js inside it are hosted on this site unmodified.",
    "narwhals: MIT License. Pyodide와 함께 받아 씁니다.": "narwhals: MIT License. Loaded with Pyodide.",
    "Plotly는 Plotly Technologies Inc.의, Streamlit은 Snowflake Inc.의 상표입니다. 이 사이트는 두 회사와 관계가 없습니다. Streamlit 문제는 Streamlit을 쓰지 않고, 이 사이트가 만든 작은 대역(함수 이름과 쓰는 법만 같음)으로 채점합니다.":
      "Plotly is a trademark of Plotly Technologies Inc., and Streamlit is a trademark of Snowflake Inc. This site is not affiliated with either company. The Streamlit problems do not use Streamlit; they are graded with a small stand-in written for this site that only shares function names and usage.",
    "그림을 그리지 못했습니다. 인터넷 연결을 확인하고 다시 엽니다.": "Could not draw the figure. Check your internet connection and open it again.",
    "Plotly를 쓰는 문제는 처음 열 때 Plotly(약 10MB)를 한 번 더 받습니다.": "Problems that use Plotly download Plotly (about 10 MB) once more the first time you open one.",
    "앱 화면을 그리지 못했습니다.": "Could not draw the app screen.",
    "켬": "on",
    "끔": "off",
    "모두 {n}행 가운데 앞 {k}행": "First {k} of {n} rows",
    "Matplotlib 그림": "Matplotlib figure",
    "{n}줄": "{n} lines",
    "여기서 st.stop()으로 멈췄습니다.": "The app stopped here with st.stop().",
    "(화면에 놓인 것 없음)": "(nothing on the screen)",
    "목표 그림과 내 그림 위에 마우스를 올리면 값이 보입니다.": "Hover over the target figure and your figure to see the values.",
    "앱": "App",
    "목표 화면처럼 만듭니다.": "Build an app like the target screen.",
    "채점할 때 위젯 값을 바꿔 가며 앱을 처음부터 다시 실행하고, 화면의 {fields}{obj} 비교합니다.": "Grading runs the app from the top again with different widget values and compares these on the screen: {fields}.",
    "st.stop()으로 멈추는지도 봅니다. 배치와 글꼴은 보지 않습니다.": "It also checks whether the app stops with st.stop(). Layout and fonts are not checked.",
    "위젯 값": "Widget values",
    "채점할 때 쓰는 위젯 값: {cases}": "Widget values used in grading: {cases}",
    "st.stop()으로 멈추는지도 봅니다. 칸의 너비와 글꼴은 보지 않습니다.": "It also checks whether the app stops with st.stop(). Column widths and fonts are not checked.",
    "처음 값": "starting values",
    "주어진 줄({lines})은 그대로 둡니다. 채점할 때 이 값을 바꿔 다시 실행합니다.": "Keep the given lines ({lines}) as they are. Grading changes these values and runs the app again.",
    "이 테스트의 위젯 값: {values}": "Widget values in this test: {values}",
    "이 테스트의 내 앱 화면": "Your app screen in this test",
    "내 앱 화면 · 위젯은 처음 값": "Your app screen · widgets at their starting values",
    "목표 화면 · 처음 화면": "Target screen · starting screen",
    "목표 화면": "Target screen",
    "선 굵기": "line width",
    "툴팁": "tooltips",
    "그 밖에 Pyodide가 함께 불러오는 패키지(pyparsing, cycler, kiwisolver 등)는 각자의 라이선스를 따릅니다.": "Other packages that Pyodide loads with these (pyparsing, cycler, kiwisolver, and others) follow their own licenses.",

    // 위쪽 막대와 아래쪽 고지, 길 찾기
    "본문으로 건너뛰기": "Skip to main content",
    "주 메뉴": "Main menu",
    "도서": "Books",
    "불러오는 중입니다.": "Loading...",
    "개인정보 처리방침": "Privacy policy",
    "문제, 해설, 그림과 사이트 코드의 저작권은 이동현에게 있습니다. 복제·재배포·판매는 허락을 받아야 합니다.": "The problems, explanations, figures, and site code are copyrighted by Donghyun Lee. Copying, redistributing, or selling them requires permission.",
    "© 2026 이동현": "© 2026 Donghyun Lee",
    "없는 페이지입니다.": "Page not found.",
    "처음으로": "Go to the start page",
    "페이지를 불러오지 못했습니다. 새로 고침해 보세요.": "Could not load the page. Try reloading it.",
  };

  Store.load();
  Py.setState("idle");
  $("#py-status").addEventListener("click", () => { if (Py.state === "error") Py.start().catch(() => {}); });
  // 본문으로 건너뛰기: 주소(#main)를 바꾸면 길 찾기가 '없는 페이지'를 그리므로, 주소는 두고 본문에 초점만 옮긴다(2026-10-21 UI 검토)
  const skip = $(".skip");
  if (skip) skip.addEventListener("click", (e) => { e.preventDefault(); main.focus(); });
  const pyStat = $("#py-status");
  if (pyStat) {
    const retryPy = () => { if (Py.state === "error") Py.start().catch(() => {}); };
    pyStat.addEventListener("click", retryPy);
    pyStat.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); retryPy(); } });
  }
  if ($("#lang-switch")) $("#lang-switch").addEventListener("click", onLangSwitchClick);
  window.addEventListener("hashchange", render);
  // 밝은 화면·어두운 화면(2026-11-02, 홈페이지와 테마를 맞춤). 홈페이지(Blowfish appearance.js)와 같은 localStorage 'appearance'에
  // 'dark'나 'light'를 적는다. 고른 적이 없으면 기기 설정을 따르고, 단추를 오른쪽 눌러(contextmenu) 고른 것을 지우면 다시 기기 설정을 따른다
  (() => {
    const btn = $("#theme-toggle");
    if (!btn) return;
    const root = document.documentElement;
    const dark = () => (root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
    const mark = () => btn.setAttribute("aria-pressed", String(dark()));
    mark();
    btn.addEventListener("click", () => {
      const next = dark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("appearance", next); } catch (e) { /* 저장할 수 없는 브라우저: 이 화면에서만 바꾼다 */ }
      mark();
    });
    btn.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      root.removeAttribute("data-theme");
      try { localStorage.removeItem("appearance"); } catch (e) { /* 위와 같다 */ }
      mark();
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", mark);
  })();
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
