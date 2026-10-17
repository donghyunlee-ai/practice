/* © 2026 이동현. 이용 조건은 LICENSE.txt와 화면의 '이용 안내와 저작권'(#/terms).
   파이썬 실행기. Pyodide를 이 작업 공간(Web Worker)에서 띄워, 오래 걸리는 코드가 화면을 멈추지 않게 한다.
   학생 코드는 이 브라우저 안에서만 실행되고 어디로도 보내지 않는다.
   배포할 때는 Pyodide 파일을 사이트에 함께 올리고 PYODIDE_URL을 그 경로로 바꾼다(README 참고). */
"use strict";

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.8/full/";
importScripts(PYODIDE_URL + "pyodide.js");

let booting = null;

// 시각화 과목의 패키지. matplotlib, pandas는 Pyodide가 jsDelivr에서 받고, Pyodide에 없는 seaborn(순수 파이썬)은
// 사이트에 올려 둔 휠로 깐다(2026-10-14 사용자 결정: PyPI에 접속하지 않게). 휠은 PyPI의 SHA-256과 대조했다(README).
const WHEELS = { seaborn: "wheels/seaborn-0.13.2-py3-none-any.whl" };
const loaded = new Set();

async function loadPackages(pyodide, names) {
  const need = names.filter((n) => !loaded.has(n));
  if (!need.length) return;
  const quiet = { messageCallback: () => {} };
  const builtin = need.filter((n) => !WHEELS[n]);
  if (builtin.length) await pyodide.loadPackage(builtin, quiet);
  const extra = need.filter((n) => WHEELS[n]);
  if (extra.length) {
    await pyodide.loadPackage("micropip", quiet);
    const micropip = pyodide.pyimport("micropip");
    // 의존 패키지(numpy, pandas, matplotlib)는 위에서 불러 두었으므로 deps=False로 PyPI를 찾지 않게 한다
    for (const n of extra) await micropip.install.callKwargs(new URL(WHEELS[n], self.location.href).href, { deps: false });
  }
  // 첫 실행이 느리지 않게 그래프 도구를 미리 불러 둔다(harness.pyplot은 화면 없이 그리는 Agg로 맞춘다)
  pyodide.runPython(["pyplot()", ...need.filter((n) => n !== "matplotlib").map((n) => `import ${n}`)].join("\n"));
  need.forEach((n) => loaded.add(n));
}

async function boot(harnessUrl) {
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL, stdout: () => {}, stderr: () => {} });
  const source = await (await fetch(harnessUrl, { cache: "no-cache" })).text();
  pyodide.runPython(source);
  const handle = pyodide.globals.get("handle");
  const info = JSON.parse(handle(JSON.stringify({ op: "version" })));
  return { pyodide, handle, python: info.python };
}

self.onmessage = async (event) => {
  const { id, op, payload } = event.data;
  try {
    if (op === "boot") {
      booting = booting || boot(payload.harnessUrl);
      const r = await booting;
      self.postMessage({ id, ok: true, result: { python: r.python, pyodide: r.pyodide.version } });
      return;
    }
    const r = await booting;
    if (op === "load") {
      await loadPackages(r.pyodide, payload.packages || []);
      self.postMessage({ id, ok: true, result: { packages: [...loaded] } });
      return;
    }
    const out = r.handle(JSON.stringify({ op, ...payload }));
    self.postMessage({ id, ok: true, result: JSON.parse(out) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
