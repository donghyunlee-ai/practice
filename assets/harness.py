"""파이썬 연습 채점기. © 2026 이동현. 이용 조건은 LICENSE.txt와 화면의 '이용 안내와 저작권'(#/terms).

같은 파일을 두 곳에서 쓴다.
- 빌드(tools/build.py, CPython 3.12): 기대 출력을 만들고, 정답 풀이는 통과하고 틀린 코드는 걸러지는지 확인한다.
- 브라우저(assets/worker.js, Pyodide 0.27.8 = Python 3.12.7): 학생 답안을 실행하고 채점한다.

입구는 handle(request_json) 하나이고, JSON 문자열을 받아 JSON 문자열을 돌려준다.
  {"op": "run", "code": ..., "stdin": [...], "lang": "en"}  코드를 그대로 실행(lang이 없으면 한국어 메시지)
  {"op": "grade", "problem": {...}, "answer": {...}}       테스트를 돌려 채점(메시지 언어는 problem의 lang)
"""
import ast
import builtins
import difflib
import io
import json
import math
import os
import re
import shutil
import sys
import tempfile
import tokenize
import traceback
import types

CODE_FILE = "<code>"   # 학생 코드
TEST_FILE = "<test>"   # 채점용으로 덧붙이는 코드
MAX_OUTPUT = 20_000     # 출력 글자 수 한도
MAX_STEPS = 1_000_000   # 실행한 줄 수 한도(끝나지 않는 반복을 멈춘다)
TOTAL_STEPS = 8_000_000  # 한 번 채점할 때 모든 테스트를 합친 줄 수 한도. 넘으면 남은 테스트는 건너뛴다
# 학생 코드가 matplotlib을 불러도 화면 창을 띄우지 않게 한다(빌드에서 plt.show()가 창을 열고 멈추지 않게)
os.environ["MPLBACKEND"] = "Agg"

# 학생에게 보이는 문장의 언어(2026-10-17 영어판). grade()는 문제의 lang, handle의 run은 요청의 lang으로 정하고
# 끝나면 그 전 값으로 되돌린다(브라우저에서는 늘 "ko". 빌드는 영어 과목을 만드는 동안 "en"으로 둔다). 한국어 문장은 영어판 전과 글자 하나 다르지 않다. 영어 쪽은 tools/check_harness_i18n.py가 점검한다.
_LANG = "ko"


def L(ko, en):
    """학생에게 보이는 문장 하나. 영어 과목이면 en, 아니면 ko를 돌려준다. 두 인자는 늘 함께 계산된다."""
    return en if _LANG == "en" else ko


# 영어 문장 도우미. 한국어 조사 도우미(_iga, given_lines)는 L()의 한국어 쪽에서만 쓴다.
def _n(count, word, plural=None):
    """개수와 낱말: 1 bar, 3 bars."""
    return f"{count} {word if count == 1 else plural or word + 's'}"


def _and(items, word="and"):
    """목록: a, a and b, a, b, and c."""
    items = [str(x) for x in items]
    return f" {word} ".join(items) if len(items) <= 2 else ", ".join(items[:-1]) + f", {word} " + items[-1]


def _ordinal(n):
    """서수: 1st, 2nd, 3rd, 4th, 11th, 21st."""
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def _head(head, text):
    """Axes 이름(head, 'Left Axes: ') 뒤에 문장을 붙인다. 이름 뒤에서는 문장의 첫 글자를 소문자로 쓴다."""
    return head + text[:1].lower() + text[1:] if head else text


# 줄은 sys.monitoring(3.12)으로 센다. sys.settrace는 추적 함수가 예외를 내면 추적을 꺼서, 반복 안의 맨 except가
# 한도 예외를 한 번 삼키면 그 뒤로 줄을 세지 못하고 끝나지 않았다(2026-10-14 13장 검토). 세는 규칙은 settrace와 같다.
MON = sys.monitoring
TOOL = 4  # 비어 있는 도구 번호(0 디버거, 1 커버리지, 2 프로파일러, 5 최적화기는 정해져 있다)
TOOL_NAME = "practice-harness"
if MON.get_tool(TOOL) != TOOL_NAME:
    MON.use_tool_id(TOOL, TOOL_NAME)


# 한도 예외는 BaseException에서 갈라 낸다. 학생 코드의 `except Exception:`이 잡아 한도를 넘기지 못하게 하려는 것이다.
# 맨 except로 잡아도 학생 코드의 다음 줄(그 except 줄)에서 다시 내므로 결국 빠져나간다.
class StepLimit(BaseException):
    pass


class BudgetLimit(StepLimit):
    """효율성 테스트에서 정해 둔 줄 수(max_steps)를 넘었다."""


class OutputLimit(BaseException):
    pass


# 채점용 식(setup, expr)은 학생 코드와 다른 이름 공간에서 돌린다. 학생이 내장 이름을 가린 것(sum = 0)은 빼고 넘긴다.
BUILTIN_NAMES = {n for n in dir(builtins) if not n.startswith("__")}


def norm(text):
    """줄 끝 공백과 앞뒤 빈 줄을 무시하고 비교한다(app.js의 norm과 같다)."""
    return "\n".join(line.rstrip() for line in str(text).strip("\n").splitlines())


def code_objects(code_obj):
    """모듈 코드와 그 안에 든 코드 객체(함수, 메서드, 클래스 몸통, 람다, 제너레이터 식) 전부."""
    found = [code_obj]
    for const in code_obj.co_consts:
        if isinstance(const, types.CodeType):
            found.extend(code_objects(const))
    return found


def line_at(code_obj, offset):
    """바이트코드 위치(바이트 단위)의 줄 번호. 줄이 없는 명령은 -1."""
    for start, end, line in code_obj.co_lines():
        if start <= offset < end:
            return -1 if line is None else line
    return -1


# ------------------------------------------------------------------ 실행

def execute(code, stdin=None, setup=None, expr=None, budget=None, isolate=False, files=None, plot=False, image=False,
            plotly=False, app=None, report=None):
    """code를 새 이름 공간에서 실행한다. expr이 있으면 이어서 그 값을 구한다.

    plot이면 그래프 문제다. 실행 전에 그림과 rc 설정을 되돌리고, 실행한 뒤 그린 그림을 읽어 result["plot"]에 담는다.
    image가 참이면 PNG도 base64로 result["image"]에 담는다. image가 함수면 그림 요약을 받아 참일 때만 그린다
    (채점에서 틀린 테스트만 그림을 보이려고). 경고(plt.show()의 안내 등)는 채점과 상관없어 끈다.
    plotly이면 Plotly 그림 문제다(2026-11-02). result["plotly"]에 Figure 요약을, image면 result["fig"]에 Figure JSON을 담는다.
    app(위젯 이름 → 값 사전)이 있으면 Streamlit 앱 문제다(2026-11-02). st 대역으로 실행하고 result["app"]에 화면 요약을,
    image면 result["app_view"]에 화면이 그릴 목록을 담는다.
    """
    # Plotly를 불러온 뒤에는 그림 문제가 아닌 실행(10장 검수의 출력 채점, 출력 예측)도 앞 실행의 show() 기록과 px 설정을 비운다.
    # 비우지 않으면 show() 기록이 쌓여 여러 번 실행한 뒤 50번 한도에 걸린다(2026-11-02 채점기 독립 검토 H1)
    if "plotly" in sys.modules:
        plotly_reset()
    # 그래프 문제가 아니어도 matplotlib을 쓰는 코드(시각화 과목의 출력 예측 등)는 앞 실행의 그림과 설정을 지우고 돈다
    uses_mpl = "matplotlib.pyplot" in sys.modules and any(w in code for w in ("matplotlib", "seaborn", "pandas", "plt"))
    if not plot and not uses_mpl and not plotly and app is None:
        return _execute(code, stdin, setup, expr, budget, isolate, files)
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        if plot or uses_mpl or app is not None:
            plot_reset()
        if plotly or app is not None:
            plotly_reset()
        result = _execute(code, stdin, setup, expr, budget, isolate, files, collect=plot or plotly, app=app,
                          peek=_peek_figures if plotly else None, reports=plotly)
        try:
            if plot:
                result["plot"] = figure_summary(result.pop("saved", []))
                if image is True or (callable(image) and image(result["plot"])):
                    result["image"] = figure_png()
            if plotly:
                reports, views = result.pop("reports", None) or ({}, {})
                result["plotly"] = plotly_summary(result.pop("saved", []), reports)
                if image is True or (callable(image) and image(result["plotly"])):
                    result["fig"] = plotly_json()
                    if views and report:  # HTML 리포트 문제(10장)만: 화면이 앱 화면처럼 그릴 목록(제목, 문단, 차트).
                        # report가 파일 이름이면 그 파일(정답이 저장한 리포트), 아니면 이름 차례로 첫 파일
                        result["report_view"] = views.get(report) if isinstance(report, str) and report in views else views[sorted(views)[0]]
            if app is not None:
                state, stopped = result.pop("app"), result.pop("stopped", False)
                result["app"] = app_summary(state, stopped)
                if image is True or (callable(image) and image(result["app"])):
                    result["app_view"] = app_view(state, stopped)
        except Exception as e:  # noqa: BLE001 - 그림을 읽다 난 오류(학생이 만든 눈금 함수 등)
            result["plot"] = None
            result["plot_error"] = f"{type(e).__name__}: {e}"
        finally:
            if "plt" in _mpl:
                _mpl["close"]("all")
                _mpl["done"] = []
    return result


def _execute(code, stdin=None, setup=None, expr=None, budget=None, isolate=False, files=None, collect=False, app=None, peek=None,
             reports=False):
    """code를 새 이름 공간에서 실행한다. expr이 있으면 이어서 그 값을 구한다.

    stdout은 print가 찍은 것만, screen은 Colab 화면처럼 input의 안내문과 친 값까지 담는다.
    줄은 학생 코드(CODE_FILE)에서 실행한 것만 센다. 줄이 바뀔 때마다 하나, 같은 줄로 되돌아갈 때(한 줄짜리 반복,
    컴프리헨션의 한 바퀴)마다 하나를 센다(sys.settrace의 line 이벤트와 같은 수). steps는 전체, call_steps는 setup과 expr을 실행하는 동안
    센 줄 수다. 학생 코드와 setup·expr은 한도를 따로 받는다(맨 아래에 남긴 확인용 호출이 채점할 몫을 먹지 않게).
    budget이 있으면 setup과 expr이 budget줄을 넘을 때 멈춘다(효율성 테스트).
    isolate이면 setup과 expr을 학생 코드의 이름 공간을 베낀 곳에서 돌린다(함수를 부르는 테스트).
    exit()나 sys.exit()로 학생 코드가 끝나면 정상 종료로 본다.
    실행마다 새 임시 폴더에서 돌린다. files({이름: 내용})는 그 폴더에 미리 만들어 두는 파일이다(9장 파일 문제).
    학생 코드가 쓴 파일과 그 폴더에서 불러온 모듈은 실행이 끝나면 지운다(빌드 폴더를 더럽히지 않고, 실행끼리 섞이지 않게).
    app이 있으면 import streamlit이 st 대역을 받게 하고, st.stop()으로 멈추면 result["stopped"]를 참으로 둔다.
    앱 파일처럼 __file__은 실행 폴더의 app.py다(Path(__file__).parent로 옆의 CSV를 읽게). peek은 학생 코드가 끝난 뒤
    이름 공간을 받아 본다(Plotly 그림 문제).
    """
    printed, screen = [], []
    size = [0]
    queue = [str(v) for v in (stdin or [])]
    tripped = []  # 걸린 한도. 학생 코드가 한도 예외를 잡아 삼켜도 결과에는 남긴다

    class Out:
        def write(self, s):
            s = str(s)
            size[0] += len(s)
            if size[0] > MAX_OUTPUT:
                if not tripped:
                    tripped.append(OutputLimit)
                raise OutputLimit()
            printed.append(s)
            screen.append(s)
            return len(s)

        def flush(self):
            pass

    def fake_input(prompt=""):
        prompt = str(prompt)
        screen.append(prompt)
        if not queue:
            raise EOFError(L("input()이 읽을 값이 없습니다", "input() has no value to read"))
        value = queue.pop(0)
        screen.append(value + "\n")
        return value

    steps = [0]
    limit = [MAX_STEPS, StepLimit]
    counting = {}  # 점프 위치 → 그 자리에 같은 줄로 되돌아가는 점프가 있다고 마지막으로 확인한 코드 객체

    def stop():
        # 한도를 한 번 넘으면 학생 코드의 줄마다 그 한도 예외를 다시 낸다(맨 except가 잡아도 빠져나가게)
        if not tripped:
            tripped.append(limit[1])
        raise tripped[0]()

    def on_line(code_obj, line):
        steps[0] += 1
        if tripped or steps[0] > limit[0]:
            stop()

    def on_jump(code_obj, src, dst):
        # settrace처럼 같은 줄로 되돌아가는 점프도 한 줄로 센다. 나머지 점프는 줄이 바뀌므로 on_line이 센다
        if counting.get(src) is not code_obj:  # 처음 보는 자리만 줄 번호를 확인한다(반복마다 확인하면 느리다)
            if not (dst <= src and 0 <= line_at(code_obj, dst) == line_at(code_obj, src)):
                return MON.DISABLE  # 그 자리의 점프는 다시 부르지 않는다
            counting[src] = code_obj
        steps[0] += 1
        if tripped or steps[0] > limit[0]:
            stop()

    ns = {"__name__": "__main__", "__builtins__": builtins, "input": fake_input}
    result = {"stdout": "", "screen": "", "error": None}
    mark = None
    old_out = sys.stdout
    old_depth = sys.getrecursionlimit()
    saved = dict(vars(builtins))  # 학생 코드가 내장 함수를 바꿔도 다음 실행에 남지 않게 되돌린다
    old_cwd, old_path, old_mods = os.getcwd(), sys.path[:], set(sys.modules)
    work = tempfile.mkdtemp(prefix="practice-")
    old_st = sys.modules.get("streamlit")
    if app is not None:
        st_mod, result["app"] = _make_streamlit(app)
        sys.modules["streamlit"] = st_mod
        ns["__file__"] = os.path.join(work, "app.py")
    os.chdir(work)
    sys.path.insert(0, work)  # 그 폴더에 만든 .py를 import할 수 있게(12장 모듈 문제)
    sys.stdout = Out()
    try:
        for name, content in (files or {}).items():  # 'pkg/__init__.py'처럼 하위 폴더도 만든다(12장 패키지 문제)
            path = os.path.join(work, name)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(content)
        compiled = compile(code, CODE_FILE, "exec")
        watched = code_objects(compiled)  # 학생 코드만 센다(채점용 식과 불러온 모듈은 세지 않는다)
        MON.register_callback(TOOL, MON.events.LINE, on_line)
        MON.register_callback(TOOL, MON.events.JUMP, on_jump)
        for code_obj in watched:
            MON.set_local_events(TOOL, code_obj, MON.events.LINE | MON.events.JUMP)
        try:
            try:
                exec(compiled, ns)
            except SystemExit:
                pass  # exit()로 끝낸 프로그램도 그때까지의 출력과 변수로 채점한다
            except _StopApp:
                result["stopped"] = True  # st.stop(): 그때까지 화면에 놓인 것으로 채점한다
            if app is not None and result["app"]["stopping"]:  # except로 삼킨 st.stop()도 멈춘 것으로 본다
                result["stopped"] = True
            if peek:
                peek(ns)
            mark = len(printed)
            mark_steps = steps[0]
            result["phase"] = "test"  # 여기부터는 채점용 식을 실행한다
            limit[:] = [steps[0] + budget, BudgetLimit] if budget is not None else [steps[0] + MAX_STEPS, StepLimit]
            env = ns
            if isolate:
                env = {k: v for k, v in ns.items() if k not in BUILTIN_NAMES}
                env["__builtins__"] = builtins
            if setup:
                exec(compile(setup, TEST_FILE, "exec"), env)
            if expr is not None:
                value = eval(compile(expr, TEST_FILE, "eval"), env)
                result["value"] = value
        finally:
            for code_obj in watched:
                MON.set_local_events(TOOL, code_obj, 0)
            MON.register_callback(TOOL, MON.events.LINE, None)
            MON.register_callback(TOOL, MON.events.JUMP, None)
    except BaseException as e:  # noqa: BLE001 - 학생 코드의 오류는 모두 결과로 돌려준다
        result["error"] = describe(e)
        for root in (os.path.realpath(work), work):  # 오류 문구에 임시 폴더 경로가 보이지 않게
            result["error"]["message"] = result["error"]["message"].replace(root + os.sep, "")
    finally:
        sys.stdout = old_out
        sys.setrecursionlimit(old_depth)
        if app is not None:  # 빌드(CPython)에 진짜 streamlit이 있어도 다음 실행에는 원래 모듈을 돌려준다
            if old_st is None:
                sys.modules.pop("streamlit", None)
            else:
                sys.modules["streamlit"] = old_st
        current = vars(builtins)
        if current != saved:  # 더한 이름은 지우고 바꾼 이름은 되돌린다(내장 이름 공간을 비우지 않고)
            for name in [n for n in current if n not in saved]:
                del current[name]
            current.update(saved)
        os.chdir(old_cwd)
        sys.path[:] = old_path
        roots = (work, os.path.realpath(work))  # macOS는 /var가 /private/var로 이어져 두 경로가 다르다
        for name in set(sys.modules) - old_mods:  # 임시 폴더에서 불러온 모듈은 다음 실행에 남기지 않는다
            if (getattr(sys.modules.get(name), "__file__", None) or "").startswith(roots):
                del sys.modules[name]
        for key in [k for k in sys.path_importer_cache if str(k).startswith(roots)]:  # 패키지 하위 폴더까지, 쌓이지 않게
            del sys.path_importer_cache[key]
        if collect or reports:  # 닫지 않은 파일(f = open(...); f.write(...))에 남은 글을 써 넣은 뒤 읽는다(2026-11-02 검토 M10)
            for v in list(ns.values()):
                if hasattr(v, "flush") and hasattr(v, "closed") and not isinstance(v, type):
                    try:
                        if not v.closed:
                            v.flush()
                    except Exception:  # noqa: BLE001
                        pass
        if collect:  # 그래프 문제: 학생 코드가 저장한 파일(그림)의 이름과 PNG의 픽셀 크기
            result["saved"] = saved_files(work, files or {})
        if reports:  # Plotly 문제: 저장한 HTML 리포트의 차트 수, Plotly.js 수, 제목과 문단(10장)
            result["reports"] = html_reports(work, files or {})
        shutil.rmtree(work, ignore_errors=True)
    if tripped and not result["error"]:  # 한도 예외를 학생 코드가 잡아 삼켰다
        result["error"] = describe(tripped[0]())
    result["stdout"] = "".join(printed)
    result["screen"] = "".join(screen)
    result["steps"] = steps[0]
    if mark is not None:
        result["call_stdout"] = "".join(printed[mark:])  # 채점용 식을 실행하는 동안 찍은 것
        result["call_steps"] = steps[0] - mark_steps
    return result


def describe(e):
    if isinstance(e, BudgetLimit):
        return {"type": "TimeLimit", "message": L("효율성 기준보다 줄을 많이 실행해 멈췄습니다",
                                                  "Stopped after running more lines than the efficiency limit allows"), "line": None}
    if isinstance(e, StepLimit):
        return {"type": "StepLimit", "message": L(f"실행한 줄이 {MAX_STEPS:,}줄을 넘어 멈췄습니다",
                                                  f"Stopped after running more than {MAX_STEPS:,} lines"), "line": None}
    if isinstance(e, OutputLimit):
        return {"type": "OutputLimit", "message": L("출력이 너무 많아 멈췄습니다", "Stopped because of too much output"), "line": None}
    name = type(e).__name__
    if isinstance(e, SyntaxError):
        line = e.lineno if e.filename == CODE_FILE else None
        return {"type": name, "message": e.msg or "", "line": line}
    line = None
    for frame, lineno in traceback.walk_tb(e.__traceback__):
        if frame.f_code.co_filename == CODE_FILE:
            line = lineno
    message = str(e)
    if len(message) > 1500:  # Plotly의 잘못된 속성 오류는 쓸 수 있는 속성 목록까지 수만 자다(2026-11-02)
        message = message.split("Valid properties:")[0].rstrip()[:1500] + " …"
    return {"type": name, "message": message, "line": line}


# ------------------------------------------------------------------ 값 비교

def same(got, want):
    if isinstance(want, bool) or isinstance(got, bool):
        return type(got) is type(want) and got == want
    if isinstance(want, float) and isinstance(got, float):
        return math.isclose(got, want, rel_tol=1e-9, abs_tol=1e-12)
    if type(got) is not type(want):
        return False
    if isinstance(want, (list, tuple)):
        return len(got) == len(want) and all(same(a, b) for a, b in zip(got, want))
    if isinstance(want, dict):
        return got.keys() == want.keys() and all(same(got[k], want[k]) for k in want)
    return got == want


def show(value, limit=300):
    text = repr(value)
    return text if len(text) <= limit else text[:limit] + " …"


# ------------------------------------------------------------------ 코드 모양 검사

def calls_in(code):
    """코드에서 부른 함수 이름, 메서드 이름, 직접 만든 함수 이름. 문법 오류면 None."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None
    funcs, methods, defined = set(), set(), set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                funcs.add(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                methods.add(node.func.attr)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            defined.add(node.name)
    return funcs, methods, defined


def without_comments(code):
    """require 검사용 코드. 주석은 지우고 문자열 안은 공백으로 바꾼다(접두사 f와 따옴표는 남긴다).

    `# while`처럼 주석에 적은 낱말이나 문자열 안의 글자가 검사를 통과시키지 않게 하려는 것이다.
    """
    lines = code.splitlines(keepends=True)

    def blank(start, end):
        (r0, c0), (r1, c1) = start, end
        for r in range(r0, r1 + 1):
            line = lines[r - 1]
            body = len(line.rstrip("\r\n"))
            a = c0 if r == r0 else 0
            b = min(c1 if r == r1 else body, body)
            if b > a:
                lines[r - 1] = line[:a] + " " * (b - a) + line[b:]

    middle = getattr(tokenize, "FSTRING_MIDDLE", None)
    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type == tokenize.COMMENT or (middle is not None and tok.type == middle):
                blank(tok.start, tok.end)
            elif tok.type == tokenize.STRING:
                text = tok.string
                q = len(text) - len(text.lstrip("rRbBuUfF"))
                k = 3 if text[q:q + 3] in ('"""', "'''") else 1
                (r0, c0), (r1, c1) = tok.start, tok.end
                blank((r0, c0 + q + k), (r1, c1 - k))
    except (tokenize.TokenError, SyntaxError):
        return code
    return "".join(lines)


def changed_lines(before, after):
    """줄 단위로 바뀐 줄 수. 줄을 옮기면 지운 줄 하나와 넣은 줄 하나로 2가 된다. 빈 줄과 주석만 있는 줄은 세지 않는다."""
    def code_lines(text):
        return [l.rstrip() for l in text.strip("\n").splitlines() if l.strip() and not l.strip().startswith("#")]
    a = code_lines(before)
    b = code_lines(after)
    count = 0
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "replace":
            count += max(i2 - i1, j2 - j1)
        elif tag in ("delete", "insert"):
            count += (i2 - i1) + (j2 - j1)
    return count


def fill_code(parts, blanks):
    code = parts[0]
    for i, text in enumerate(blanks):
        code += text + parts[i + 1]
    return code


def _blank_syntax_note(parts, blanks, lineno):
    """문법 오류가 난 줄에 있는 빈칸을 찾아 '빈칸 2번에 …'로 알린다. 그 줄 빈칸들의 끝 쉼표를 지워 문법이 맞으면 쉼표 탓이라고 알린다.
    오류 줄에 빈칸이 없으면 None(그때는 줄 번호만 보인다)."""
    where, line = [], 1
    for i, text in enumerate(blanks):
        line += parts[i].count("\n")
        if line <= (lineno or 0) <= line + text.count("\n"):
            where.append(i + 1)
        line += text.count("\n")
    if not where:
        return None
    commas = [n for n in where if blanks[n - 1].rstrip().endswith(",")]
    if commas:
        fixed = [b.rstrip()[:-1].rstrip() if i + 1 in commas else b for i, b in enumerate(blanks)]
        try:
            compile(fill_code(parts, fixed), CODE_FILE, "exec")
            nums, s = [str(n) for n in commas], "s" if len(commas) > 1 else ""
            return L(f"빈칸 {', '.join(nums)}번 끝에 쉼표(,)를 붙여 문법 오류가 났습니다. 쉼표는 코드에 이미 있으니 빈칸에서 지웁니다.",
                     f"Blank{s} {_and(nums)} end{'' if s else 's'} with a comma, which causes a syntax error. "
                     f"The code already has the comma, so delete it from the blank{s}.")
        except SyntaxError:
            pass
    nums = [str(n) for n in where]
    if len(where) == 1:
        return L(f"빈칸 {nums[0]}번에 문법 오류가 있어 실행하지 못했습니다.",
                 f"Could not run the code because of a syntax error in blank {nums[0]}.")
    return L(f"빈칸 {', '.join(nums)}번이 있는 줄에 문법 오류가 있어 실행하지 못했습니다.",
             f"Could not run the code because of a syntax error on the line with blanks {_and(nums)}.")


def apply_replace(code, pairs):
    """주어진 줄을 바꿔 다른 값으로 실행한다. 줄 전체가 같아야 한다.

    띄어쓰기와 줄 나눔, 줄 끝이나 사이의 주석, 따옴표 종류, 닫는 괄호 앞의 쉼표는 달라도 된다.
    주어진 줄을 함수나 if 블록 안으로 옮겼으면 바꿔 넣는 줄도 같은 만큼 들여 쓴다.
    """
    gap = r"(?:\s|#[^\n]*)*+"  # 띄어쓰기, 줄바꿈, 주석. 되짚지 않게 해서(*+) #이 긴 주석에서도 바로 끝난다
    for old, new in pairs:
        parts = []
        tokens = re.findall(r"\w+|\"[^\"\n]*\"|'[^'\n]*'|\S", old)
        for i, t in enumerate(tokens):
            if t == "," and i + 1 < len(tokens) and tokens[i + 1] in ")]}":
                continue  # 닫는 괄호 앞의 쉼표는 있어도 없어도 된다(닫는 괄호 쪽에서 받는다)
            if t[0] in "\"'" and len(t) > 1:
                body = re.escape(t[1:-1])
                parts.append(f"(?:\"{body}\"|'{body}')")
            elif t in ")]}":
                parts.append(f"(?:,{gap})?" + re.escape(t))
            else:
                parts.append(re.escape(t))
        m = re.search(r"(?m)^([ \t]*)" + gap.join(parts) + r"[ \t]*(?:#[^\n]*)?$", code)
        if not m:
            return None, old
        indent = m.group(1)
        new_text = "\n".join(indent + line if line.strip() else line for line in new.split("\n"))
        code = code[:m.start()] + new_text + code[m.end():]
    return code, None


def given_lines(text):
    """찾지 못한 주어진 줄을 안내 문구에 넣을 모양으로 줄인다(한국어 문장용)."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if len(lines) <= 2:
        return ", ".join(f"`{l}`" for l in lines) + " 줄은"
    return f"`{lines[0]}`부터 `{lines[-1]}`까지의 줄은"


def _given_lines_en(text):
    """given_lines의 영어 문장용: ('the line `n = 3`', 여러 줄인가)."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if len(lines) <= 2:
        return ("the lines " if len(lines) > 1 else "the line ") + _and(f"`{l}`" for l in lines), len(lines) > 1
    return f"the lines from `{lines[0]}` to `{lines[-1]}`", True


def _missing_note(missing):
    """채점할 때 값을 바꿔 넣는 주어진 줄(missing)을 학생 코드에서 찾지 못했을 때의 안내."""
    lines, many = _given_lines_en(missing)
    return L(f"채점할 때 값을 바꿔 넣는 줄이 코드에 없습니다. {given_lines(missing)} 지우거나 고치지 말고 그대로 둡니다.",
             f"The grader could not find {lines} in your code. It needs {'these lines' if many else 'this line'} "
             f"to test other values, so do not delete or change {'them' if many else 'it'}.")


# ------------------------------------------------------------------ 채점

# ------------------------------------------------------------------ 그래프(시각화 과목, 2026-10-14)
# 학생 코드가 그린 그림을 픽셀로 비교하지 않고, matplotlib 객체를 읽어 비교할 수 있는 값으로 바꾼다.
# plt, pandas, seaborn 어느 쪽으로 그려도 같은 그림이면 같은 값이 나오게 읽는다(막대는 이름과 높이, 선은 점의 값).
# matplotlib은 그래프 문제에서만 불러온다. Agg는 화면 없이 그리는 방식이라 Web Worker 안에서도 돈다.
# plt.show()는 코랩처럼 지금 그림을 내보내고 닫는다(뒤의 plt 명령은 새 그림에 붙는다). 채점은 마지막 그림을 본다.
# 2026-10-15 그래프 채점기 독립 검토(닫은 그림, 쌓은 막대, 오차 막대, 상자 방향, 색 묶음, 색 막대 배치 등)를 반영했다.
_mpl = {}
FIGURE_FIELDS = ("layout", "suptitle", "sharex", "sharey", "figlegend", "figtexts", "figsize", "saved", "saved_names")
AXES_FIELDS = ("kind", "bars", "barh", "errorbars", "errorbar_ends", "fills", "lines", "points", "groups", "wedges", "boxes",
               "title", "xlabel", "ylabel", "legend", "legend_title", "xticks", "yticks", "texts", "arrows", "xlim", "ylim",
               "xscale", "yscale", "xgrid", "ygrid", "spines", "line_colors", "line_styles", "bar_colors")
# 그래프 종류의 (한국어, 영어) 이름. 한국어는 책의 차트 이름(memory.md)
KIND_NAMES = {"bar": ("막대 그래프", "bar chart"), "barh": ("가로 막대 그래프", "horizontal bar chart"),
              "line": ("선 그래프", "line chart"), "scatter": ("산점도", "scatter plot"), "pie": ("원 그래프", "pie chart"),
              "box": ("박스 플롯", "box plot"), "boxh": ("가로 박스 플롯", "horizontal box plot")}


def _kind(k):
    return L(*KIND_NAMES[k]) if k in KIND_NAMES else k


def pyplot():
    if "plt" not in _mpl:
        os.environ["MPLBACKEND"] = "Agg"  # Pyodide의 기본 백엔드는 화면(document)이 있어야 해서 Worker에서 쓸 수 없다
        import matplotlib
        matplotlib.use("Agg", force=True)
        import matplotlib.pyplot as plt
        _mpl.update(matplotlib=matplotlib, plt=plt, close=plt.close, done=[])
        _boxplot_compat(plt)
    return _mpl["plt"]


def _boxplot_compat(plt):
    """matplotlib 3.8(브라우저)에는 3.9부터 생긴 boxplot의 tick_labels=와 3.10의 orientation=이 없다.
    코랩(3.10)에서 쓰는 코드가 그대로 돌게 옛 인자(labels=, vert=)로 바꿔 넘긴다. 3.9 이상(빌드)에서는 손대지 않는다."""
    import inspect
    from matplotlib.axes import Axes
    params = inspect.signature(Axes.boxplot).parameters
    if "tick_labels" in params and "orientation" in params:
        return

    def wrap(orig):
        def boxplot(*args, tick_labels=None, orientation=None, **kwargs):
            if tick_labels is not None and "tick_labels" not in params:
                kwargs.setdefault("labels", tick_labels)
            elif tick_labels is not None:
                kwargs["tick_labels"] = tick_labels
            if orientation is not None and "orientation" not in params:
                kwargs.setdefault("vert", orientation != "horizontal")
            elif orientation is not None:
                kwargs["orientation"] = orientation
            return orig(*args, **kwargs)
        return boxplot
    Axes.boxplot = wrap(Axes.boxplot)
    plt.boxplot = wrap(plt.boxplot)


def _open_figures():
    """pyplot이 아직 붙들고 있는 그림(번호 차례). 지금 그림을 바꾸지 않고 읽는다."""
    from matplotlib._pylab_helpers import Gcf
    return [m.canvas.figure for m in sorted(Gcf.get_all_fig_managers(), key=lambda m: m.num)]


def _close(fig=None):
    """plt.close: 닫는 그림을 기억해 두었다가 열린 그림이 없으면 채점한다(코랩은 보여 준 그림이 남는다)."""
    from matplotlib._pylab_helpers import Gcf
    from matplotlib.figure import Figure
    if fig is None:
        active = Gcf.get_active()
        targets = [active.canvas.figure] if active else []
    elif isinstance(fig, str) and fig == "all":
        targets = _open_figures()
    elif isinstance(fig, Figure):
        targets = [fig]
    else:
        targets = [f for f in _open_figures() if getattr(f, "number", None) == fig or (isinstance(fig, str) and f.get_label() == fig)]
    _mpl["done"].extend(f for f in targets if f.axes and f not in _mpl["done"])
    return _mpl["close"](fig)


def _show(*args, **kwargs):
    """plt.show: 코랩처럼 지금까지 그린 그림을 내보내고 닫는다. 그 뒤의 plt.title() 같은 명령은 새 그림에 붙는다."""
    _close("all")


def plot_reset():
    """실행마다 그림을 모두 닫고 rc 설정(seaborn 테마 등)을 기본값으로 되돌린다."""
    plt = pyplot()
    _mpl["close"]("all")
    _mpl["done"] = []
    _mpl["matplotlib"].rcdefaults()
    plt.show = _show
    plt.close = _close
    _mpl["saved_state"] = []
    from matplotlib.figure import Figure
    if "savefig" not in _mpl:  # 저장할 때의 그림을 기억해, 저장한 뒤에 바꾼 것이 있으면 알린다(파일에는 빠져 있다)
        _mpl["savefig"] = Figure.savefig

        def _savefig(self, *args, **kwargs):
            out = _mpl["savefig"](self, *args, **kwargs)
            try:
                _mpl["saved_state"].append((self, [axes_summary(ax) for ax in _ordered_axes(self)]))
            except Exception:
                pass
            return out
        Figure.savefig = _savefig


def _final_figure():
    """채점할 그림: 아직 열린 그림 가운데 마지막 것, 없으면 show()나 close()로 내보낸 마지막 그림(Axes가 있는 그림만)."""
    opened = [f for f in _open_figures() if f.axes]
    if opened:
        return opened[-1]
    done = [f for f in _mpl.get("done", []) if f.axes]
    return done[-1] if done else None


def _num(v):
    v = float(v)
    if v != v or v in (float("inf"), float("-inf")):  # NaN과 무한대는 브라우저의 JSON이 읽지 못해 빈 값으로 둔다
        return None
    v = round(v, 6)
    return 0.0 if v == 0 else v


def _pos_name(pos):
    """숫자 축의 위치 이름. 2021처럼 정수 위치는 '2021'로 불러 pandas, seaborn의 눈금 라벨과 맞춘다."""
    v = _num(pos)
    if v is not None and abs(v - round(v)) < 1e-9:
        return str(int(round(v)))
    return v


def _visible_ticks(axis, lim, locs=False):
    """보이는 눈금 라벨 글자(locs=True면 그 눈금의 위치)."""
    lo, hi = sorted(lim)
    return [_num(loc) if locs else lab.get_text() for loc, lab in zip(axis.get_majorticklocs(), axis.get_majorticklabels())
            if lo - 1e-9 <= loc <= hi + 1e-9 and lab.get_visible() and lab.get_text()]


def _named_ticks(axis):
    """범주 축(plt.bar의 문자열, seaborn, pandas의 막대)이면 (위치, 눈금 라벨) 목록. 숫자 축이면 빈 목록이다.
    숫자 축의 눈금 라벨('1.5' 같은 표기)은 matplotlib 판마다 달라질 수 있어 막대 이름으로 쓰지 않는다."""
    from matplotlib.category import StrCategoryFormatter
    from matplotlib.ticker import FixedLocator
    # plt.bar와 seaborn은 범주 축, pandas는 눈금 위치를 정해 두고(FixedLocator) 라벨을 붙인다.
    # 라벨 글자는 포매터에서 얻는다. sharex로 위 행의 눈금 라벨을 숨겨도 범주 이름은 그대로 읽힌다
    if not (isinstance(axis.get_major_formatter(), StrCategoryFormatter) or isinstance(axis.get_major_locator(), FixedLocator)):
        return []
    locs = list(axis.get_majorticklocs())
    return list(zip(locs, (str(t) for t in axis.get_major_formatter().format_ticks(locs))))  # 화면 글자처럼 str로


def _is_category(axis, ticks):
    """범주 이름을 눈금 라벨로 단 축(문자열 범주, set_xticks(…, labels=…), pandas). set_xticks(숫자)만 한 숫자 축은 아니다.
    눈금 라벨을 다는 포매터가 matplotlib 판마다 달라(3.10은 FuncFormatter) 라벨 글자가 모두 수인지로 가른다."""
    from matplotlib.category import StrCategoryFormatter
    if isinstance(axis.get_major_formatter(), StrCategoryFormatter):
        return True
    return any(t.strip() and not re.fullmatch(r"[−+-]?\d+(?:[.,]\d+)?%?", t.strip()) for _, t in ticks)


def _tick_at(ticks, pos):
    """그 위치의 눈금 라벨. 없으면 위치 이름(히스토그램, 연도처럼 숫자 축인 막대)."""
    for loc, text in ticks:
        if abs(loc - pos) < 1e-6:
            return text
    return _pos_name(pos)


def _group_name(ticks, pos, group):
    """막대와 상자의 이름. 범주 축에서 hue로 나란히 놓은 묶음은 가장 가까운 눈금 라벨과 묶음 이름으로 부른다(간격은 보지 않는다)."""
    name = _tick_at(ticks, pos)
    if isinstance(name, str) and any(abs(loc - pos) < 1e-6 for loc, _ in ticks) or not ticks:
        return name
    loc, text = min(ticks, key=lambda t: abs(t[0] - pos))
    if abs(loc - pos) >= 0.5:
        return name
    return f"{text} · {group}" if group else text


def _split(xy):
    """선의 점을 NaN(빈 값)에서 끊어 조각으로 나눈다. seaborn은 오차 막대와 캡을 한 선에 NaN으로 끊어 그린다."""
    parts, cur = [], []
    for q in xy:
        if None in q:
            if cur:
                parts.append(cur)
            cur = []
        else:
            cur.append(q)
    if cur:
        parts.append(cur)
    return parts


def _boxes(ax, segs, legend):
    """상자그림을 [이름, Q1, 중앙값, Q3, 아래 수염 끝, 위 수염 끝, 이상치 수]로 읽는다. 쓴 선 객체도 돌려준다.
    상자는 닫힌 사각형 선(matplotlib 기본)이나 사각형 패치(patch_artist=True, seaborn)다. 수염은 상자 가장자리에서
    바깥으로 뻗는 선만 인정한다(가로 상자의 중앙선을 세로 상자의 수염으로 잘못 읽지 않게). 가로 상자는 축을 바꿔 읽는다."""
    from matplotlib.patches import PathPatch
    rects = []
    for xy, ln in segs:  # 다섯 점으로 닫힌 사각형 선
        if len(xy) == 5 and xy[0] == xy[-1] and len({p[0] for p in xy}) == 2 and len({p[1] for p in xy}) == 2:
            rects.append((xy, ln))
    for patch in ax.patches:
        if isinstance(patch, PathPatch):
            pts = [[_num(x), _num(y)] for x, y in patch.get_path().vertices]  # 상자그림의 상자는 데이터 좌표로 그린다
            if len(pts) >= 4 and len({p[0] for p in pts}) == 2 and len({p[1] for p in pts}) == 2:
                rects.append((pts, None))
    if not rects:
        return [], None, set()
    two = [(xy, ln) for xy, ln in segs if len(xy) == 2 and None not in xy[0] and None not in xy[1]]
    marker_only = lambda ln: ln.get_linestyle() in ("None", "", " ") and ln.get_marker() not in ("None", "", " ", None)
    marks = [(xy, ln) for xy, ln in segs if marker_only(ln)]
    # showmeans=True: bxp는 상자마다 중앙선 다음에 평균 표식(점 하나), 그다음에 이상치 선을 그린다. 평균 표식은 이상치가 아니다
    order = list(ax.lines)
    means = {id(order[k + 1]) for k in range(len(order) - 2)
             if marker_only(order[k + 1]) and marker_only(order[k + 2]) and len(order[k + 1].get_xydata()) == 1
             and not marker_only(order[k])}

    def read(vertical):
        pos = (lambda q: q[0]) if vertical else (lambda q: q[1])
        val = (lambda q: q[1]) if vertical else (lambda q: q[0])
        out, used, whiskers = [], set(), 0
        for r, rln in rects:
            lo, hi = sorted({pos(p) for p in r})
            q1, q3 = sorted({val(p) for p in r})
            mid = (lo + hi) / 2
            width = hi - lo
            med = [(a, b, ln) for (a, b), ln in two if val(a) == val(b) and q1 - 1e-9 <= val(a) <= q3 + 1e-9
                   and abs(abs(pos(a) - pos(b)) - width) < 1e-6 * max(1, width) and lo - 1e-9 <= min(pos(a), pos(b))]
            if not med:
                return None
            low, high = q1, q3
            for (a, b), ln in two:
                if abs(pos(a) - mid) > 1e-6 or abs(pos(b) - mid) > 1e-6 or val(a) == val(b):
                    continue
                ends = sorted([val(a), val(b)])
                if abs(ends[1] - q1) < 1e-9 and ends[0] < q1:  # 아래 수염: Q1에서 아래로
                    low = min(low, ends[0])
                    used.add(id(ln))
                    whiskers += 1
                elif abs(ends[0] - q3) < 1e-9 and ends[1] > q3:  # 위 수염: Q3에서 위로
                    high = max(high, ends[1])
                    used.add(id(ln))
                    whiskers += 1
            n_out = sum(1 for xy, ln in marks if id(ln) not in means for q in xy if None not in q and abs(pos(q) - mid) < width
                        and (val(q) < low - 1e-9 or val(q) > high + 1e-9))  # 수염 밖의 표식만 이상치(평균 표식은 빼고)
            used.add(id(med[0][2]))
            if rln is not None:
                used.add(id(rln))
            out.append((mid, [_num(q1), _num(val(med[0][0])), _num(q3), _num(low), _num(high), n_out]))
        return out, used, whiskers

    # 두 방향으로 읽어 보고, 상자 가장자리에서 바깥으로 뻗은 수염을 더 많이 찾은 방향을 고른다(같으면 세로)
    readings = [(vertical, r) for vertical in (True, False) for r in [read(vertical)] if r]
    readings.sort(key=lambda t: (-t[1][2], not t[0]))
    for vertical, found in readings[:1]:
        boxes, used, _ = found
        axis = ax.xaxis if vertical else ax.yaxis
        ticks = _named_ticks(axis)
        inverted = ax.xaxis_inverted() if vertical else ax.yaxis_inverted()
        order = sorted(boxes, key=lambda x: x[0], reverse=inverted if vertical else not inverted)
        mids = [m for m, _ in order]
        # hue로 나란히 놓은 상자: 같은 눈금 둘레의 상자에 범례 이름을 차례로 붙인다
        names = []
        for m in mids:
            if ticks and not any(abs(loc - m) < 1e-6 for loc, _ in ticks):
                loc, text = min(ticks, key=lambda t: abs(t[0] - m))
                peers = sorted(x for x in mids if min(ticks, key=lambda t: abs(t[0] - x))[0] == loc)
                k = peers.index(m)
                names.append(f"{text} · {legend[k]}" if len(peers) == len(legend) else text)
            else:
                names.append(_tick_at(ticks, m))
        if len(order) == 1:  # 상자 하나의 이름은 라이브러리마다 달라(plt '1', pandas 열 이름, seaborn 빈칸) 보지 않는다
            names = [""]
        used |= {id(ln) for xy, ln in marks}
        return [[n] + stats for n, (_, stats) in zip(names, order)], "box" if vertical else "boxh", used
    return [], None, set()


def _errorbars(ax, segs, vcenters, hcenters, xticks, yticks):
    """오차 막대를 [이름, 아래 끝, 위 끝]으로 읽는다(길이 0은 뺀다). 쓴 선 객체 id도 돌려준다.
    matplotlib의 errorbar()와 bar(yerr=)는 ErrorbarContainer의 LineCollection, seaborn은 막대 가운데를 지나는 선 조각이다."""
    from matplotlib.container import BarContainer, ErrorbarContainer
    ends, used = [], set()
    conts = [c for c in ax.containers if isinstance(c, ErrorbarContainer)]
    conts += [c.errorbar for c in ax.containers if isinstance(c, BarContainer) and getattr(c, "errorbar", None) is not None]
    conts = list({id(c): c for c in conts}.values())  # bar(yerr=)의 오차 막대는 ax.containers에도 따로 있다
    for cont in conts:
        data_line, caps, cols = cont.lines
        for cap in caps or ():
            used.add(id(cap))
        for col in cols or ():
            for seg in col.get_segments():
                (x0, y0), (x1, y1) = seg[0], seg[-1]
                if x0 == x1 and y0 != y1:
                    ends.append((x0, [_tick_at(xticks, x0), _num(min(y0, y1)), _num(max(y0, y1))]))
                elif y0 == y1 and x0 != x1:
                    ends.append((y0, [_tick_at(yticks, y0), _num(min(x0, x1)), _num(max(x0, x1))]))
    for xy, ln in segs:  # seaborn: 막대 가운데를 지나는 세로(가로 막대면 가로) 조각. 캡은 같은 선의 다른 조각이다
        if ln.get_transform() != ax.transData:
            continue
        found = []
        for part in _split(xy):
            if len(part) != 2:
                continue
            a, b = part
            if vcenters and a[0] == b[0] and round(a[0], 6) in vcenters:
                found.append((a[0], [_tick_at(xticks, a[0]), min(a[1], b[1]), max(a[1], b[1])]))
            elif hcenters and a[1] == b[1] and round(a[1], 6) in hcenters:
                found.append((a[1], [_tick_at(yticks, a[1]), min(a[0], b[0]), max(a[0], b[0])]))
        if found or (all(None in q for q in xy) and len(xy) <= 9 and (vcenters or hcenters)):
            used.add(id(ln))  # 행 하나인 묶음에 seaborn이 긋는 보이지 않는 오차 막대도 선으로 세지 않는다
            ends += found
    ends = [e for e in ends if e[1][1] != e[1][2]]  # 길이 0인 오차 막대는 보이지 않는다
    return [e for _, e in sorted(ends, key=lambda t: t[0])], used


def _arrows(ax, xticks, yticks):
    """화살표가 있는 주석(annotate(..., arrowprops=))을 [글자, 가리키는 x, 가리키는 y]로 읽는다(글자 차례).
    범주 축에서는 가리키는 자리를 눈금 라벨로 부른다. 데이터 좌표로 가리킨 주석만 본다."""
    from matplotlib.text import Annotation
    out = []
    for t in ax.texts:
        if not isinstance(t, Annotation) or t.arrow_patch is None:
            continue
        coords = t.xycoords if isinstance(t.xycoords, str) else None
        if coords not in ("data", None) or (coords is None and t.xycoords is not None):
            continue
        try:
            x = float(ax.xaxis.convert_units(t.xy[0]))
            y = float(ax.yaxis.convert_units(t.xy[1]))
        except Exception:
            continue
        out.append([t.get_text(), _num(x), _num(y)])
    return sorted(out, key=lambda a: a[0])


def axes_summary(ax):
    from matplotlib.colors import to_hex, to_rgba
    from matplotlib.collections import PathCollection, PolyCollection
    from matplotlib.container import BarContainer
    from matplotlib.patches import Wedge
    xlim, ylim = ax.get_xlim(), ax.get_ylim()
    xticks, yticks = _named_ticks(ax.xaxis), _named_ticks(ax.yaxis)
    leg = ax.get_legend()
    legend = [t.get_text() for t in leg.get_texts()] if leg and leg.get_visible() else []
    bar_conts = [c for c in ax.containers if isinstance(c, BarContainer)]
    bars, barh, bar_colors, vcenters, hcenters = [], [], [], set(), set()
    for k, cont in enumerate(bar_conts):
        # 묶음 이름: pandas는 막대 모음의 라벨, seaborn(hue)은 범례에 같은 차례로 둔다
        group = cont.get_label() or ""
        if group.startswith("_"):
            group = legend[k] if len(bar_conts) > 1 and len(legend) == len(bar_conts) else ""
        horizontal = getattr(cont, "orientation", None) == "horizontal"
        for r in cont.patches:
            if horizontal:  # 가로 막대: [이름, 길이, 시작점(쌓은 막대의 왼쪽 끝)]
                mid = r.get_y() + r.get_height() / 2
                barh.append((mid, [_group_name(yticks, mid, group), _num(r.get_width()), _num(r.get_x())]))
                hcenters.add(round(mid, 6))
            else:  # 세로 막대: [이름, 높이, 바닥(쌓은 막대의 아래 끝)]
                mid = r.get_x() + r.get_width() / 2
                bars.append((mid, [_group_name(xticks, mid, group), _num(r.get_height()), _num(r.get_y())]))
                vcenters.add(round(mid, 6))
            bar_colors.append((mid, to_hex(r.get_facecolor())))
    segs = [(xy, ln) for xy, ln in (([[_num(x), _num(y)] for x, y in ln.get_xydata()], ln) for ln in ax.lines) if xy]
    boxes, box_kind, box_used = _boxes(ax, segs, legend)
    err_ends, err_used = _errorbars(ax, segs, vcenters, hcenters, xticks, yticks)
    lines, line_colors, line_styles, marker_points, refs = [], [], [], [], []
    style_of = lambda ln: (ln.get_linestyle() if ln.get_linestyle() not in ("", " ") else "None",
                           "None" if ln.get_marker() in (None, "", " ", "None") else str(ln.get_marker()))
    for xy, ln in segs:
        if boxes or id(ln) in err_used or id(ln) in box_used:  # 상자그림과 오차 막대를 이루는 선은 선 그래프로 세지 않는다
            continue
        if all(None in q for q in xy):  # 모든 점에 빈 값이 있어 아무것도 그려지지 않는 선
            continue
        style, marker = style_of(ln)
        if style == "None" and marker != "None":  # 선 없이 표식만 찍은 plot(x, y, "o")는 산점도로 읽는다
            color = tuple(round(c, 3) for c in to_rgba(ln.get_markerfacecolor()))
            marker_points += [(q, color) for q in xy if None not in q]
            continue
        label = ln.get_label()
        lines.append({"x": [q[0] for q in xy], "y": [q[1] for q in xy], "label": "" if label.startswith("_") else label})
        line_colors.append(to_hex(ln.get_color()))
        line_styles.append([style, marker])
        refs.append(ln.get_transform() != ax.transData)  # axhline, axvline처럼 한쪽이 Axes 좌표인 기준선
    # 라벨 없는 선(seaborn의 hue, ax.legend(["A", "B"]))은 범례에서 이름을 찾는다. 색과 선 모양이 같은 범례 표시가
    # 하나씩만 있으면 그것과 짝짓는다(seaborn kdeplot은 hue 묶음을 거꾸로 그려 범례 차례와 그린 차례가 다르다).
    # 짝이 하나로 정해지지 않으면 범례 차례대로 붙인다(matplotlib의 ax.legend(["A", "B"])와 같다)
    # 데이터 선을 먼저, 기준선을 뒤에 둔다(각각 그린 차례). 기준선을 먼저 그어도 같은 그림으로 읽는다
    order = sorted(range(len(lines)), key=lambda k: refs[k])
    lines, line_colors, line_styles = [lines[k] for k in order], [line_colors[k] for k in order], [line_styles[k] for k in order]
    unnamed = [k for k, line in enumerate(lines) if not line["label"]]
    if unnamed and legend:
        from matplotlib.lines import Line2D
        handles = getattr(leg, "legend_handles", None) or getattr(leg, "legendHandles", None) or []
        marks = [((to_hex(h.get_color()),) + style_of(h), text) for h, text in zip(handles, legend) if isinstance(h, Line2D)]
        pairs = {}
        for k in unnamed:
            found = [text for key, text in marks if key == (line_colors[k], *line_styles[k])]
            if len(found) != 1:
                break
            pairs[k] = found[0]
        if len(pairs) == len(unnamed) and len(set(pairs.values())) == len(pairs):
            for k, text in pairs.items():
                lines[k]["label"] = text
        elif len(handles) == len(legend):
            # 범례 표시가 선(선 모양이 있는 Line2D)인 자리만 차례대로 붙인다. 산점도나 막대의 범례 글자를 선에 붙이지 않는다
            for k, line in enumerate(lines):
                if not line["label"] and k < len(legend) and isinstance(handles[k], Line2D) and style_of(handles[k])[0] != "None":
                    line["label"] = legend[k]
    # 점과 색 묶음: 산점도 컬렉션의 점과 표식만 찍은 선의 점. 묶음은 같은 색끼리 모은 점 목록이다(어떤 색인지는 보지 않는다)
    colored = list(marker_points)
    for coll in ax.collections:
        if isinstance(coll, PathCollection) and len(coll.get_offsets()):
            fcs = coll.get_facecolors()
            for i, (x, y) in enumerate(coll.get_offsets()):
                fc = fcs[i % len(fcs)] if len(fcs) else (0, 0, 0, 0)
                q = [_num(x), _num(y)]
                if None not in q:
                    colored.append((q, tuple(round(c, 3) for c in fc)))
    points = sorted(q for q, _ in colored)
    by_color = {}
    for q, c in colored:
        by_color.setdefault(c, []).append(q)
    groups = sorted(sorted(g) for g in by_color.values())
    fills = sum(1 for coll in ax.collections if isinstance(coll, PolyCollection) and any(len(path.vertices) for path in coll.get_paths()))
    wedges = [[w.get_label() if not w.get_label().startswith("_") else "", _num((w.theta2 - w.theta1) / 360)]
              for w in ax.patches if isinstance(w, Wedge)]
    kind = set()
    if bars:
        kind.add("bar")
    if barh:
        kind.add("barh")
    if lines:
        kind.add("line")
    if points:
        kind.add("scatter")
    if wedges:
        kind.add("pie")
    if boxes:
        kind.add(box_kind)
    title = next((t for t in (ax.get_title(), ax.get_title("left"), ax.get_title("right")) if t), "")
    return {
        "kind": sorted(kind),
        # 막대는 화면에서 보이는 차례로 둔다: 세로 막대는 왼쪽부터, 가로 막대는 위부터(축을 뒤집었으면 그 방향대로)
        "bars": [b for _, b in sorted(bars, key=lambda x: -x[0] if ax.xaxis_inverted() else x[0])],
        "barh": [b for _, b in sorted(barh, key=lambda x: x[0] if ax.yaxis_inverted() else -x[0])],
        "errorbars": len(err_ends),
        "errorbar_ends": err_ends,
        "fills": fills,
        "lines": lines,
        "points": points,
        "groups": groups,
        "wedges": wedges,
        "boxes": boxes,
        "title": title, "xlabel": ax.get_xlabel(), "ylabel": ax.get_ylabel(),
        "legend": legend,
        "legend_title": leg.get_title().get_text() if leg and leg.get_visible() else "",
        "xticks": _visible_ticks(ax.xaxis, xlim), "yticks": _visible_ticks(ax.yaxis, ylim),
        # 눈금 라벨이 붙은 위치. xticks, yticks를 볼 때 함께 본다(set_yticks에 엉뚱한 위치를 주고 라벨만 맞춘 답을 거른다)
        "xtick_locs": _visible_ticks(ax.xaxis, xlim, locs=True), "ytick_locs": _visible_ticks(ax.yaxis, ylim, locs=True),
        "texts": sorted(t.get_text() for t in ax.texts),  # 값 라벨을 다는 차례는 보지 않는다
        "arrows": _arrows(ax, xticks, yticks),
        "xlim": [_num(v) for v in xlim], "ylim": [_num(v) for v in ylim],
        "xscale": ax.get_xscale(), "yscale": ax.get_yscale(),
        "xgrid": any(g.get_visible() for g in ax.get_xgridlines()),
        "ygrid": any(g.get_visible() for g in ax.get_ygridlines()),
        "spines": sorted(k for k, sp in ax.spines.items() if sp.get_visible()),
        "line_colors": line_colors,
        "line_styles": line_styles,
        "bar_colors": [c for _, c in sorted(bar_colors, key=lambda x: x[0])],
        "xcat": bool(xticks) and _is_category(ax.xaxis, xticks),  # 범주 축(선 그래프의 x가 위치 0, 1, 2…로 읽힌다). 비교에만 쓴다
        "ycat": bool(yticks) and _is_category(ax.yaxis, yticks),
    }


def _ordered_axes(fig):
    """그림의 Axes를 배치 차례(왼쪽 위부터 행 순서)로. 색 막대(colorbar)는 뺀다. 같은 자리(twinx)는 만든 차례를 지킨다."""
    def where(ax):
        ss = ax.get_subplotspec()
        ss = ss.get_topmost_subplotspec() if ss else None
        return (ss.rowspan.start, ss.colspan.start) if ss else (99, 99)
    return sorted((ax for ax in fig.axes if ax.get_label() != "<colorbar>"), key=where)


def figure_summary(saved=None):
    """채점할 그림(_final_figure)을 읽는다. Axes는 배치 차례(왼쪽 위부터 행 순서)로 놓는다.
    saved는 학생 코드가 실행 폴더에 저장한 파일([이름, 가로 픽셀, 세로 픽셀] 또는 [이름])이다."""
    saved = saved or []
    fig = _final_figure()
    count = len({id(f) for f in _open_figures() + _mpl.get("done", []) if f.axes})
    if fig is None:
        return {"figures": 0, "axes": [], "layout": [0, 0], "suptitle": "", "sharex": False, "sharey": False,
                "figlegend": [], "figtexts": [], "figsize": [0, 0], "saved": saved, "saved_names": [x[0] for x in saved]}
    fig.canvas.draw()  # 눈금 라벨과 범례는 한 번 그려야 실제 모양으로 읽힌다
    axes = _ordered_axes(fig)
    ss = axes[0].get_subplotspec() if axes else None
    ss = ss.get_topmost_subplotspec() if ss else None  # 색 막대가 붙으면 gridspec이 판마다 달리 나뉘어 가장 바깥 배치를 본다
    suptitle = fig.get_suptitle() if hasattr(fig, "get_suptitle") else (fig._suptitle.get_text() if fig._suptitle else "")
    special = [getattr(fig, a, None) for a in ("_suptitle", "_supxlabel", "_supylabel")]
    return {
        "figures": count,
        "layout": [ss.get_gridspec().nrows, ss.get_gridspec().ncols] if ss else [1, 1],
        "suptitle": suptitle,
        "sharex": len(axes) > 1 and all(axes[0].get_shared_x_axes().joined(axes[0], a) for a in axes[1:]),
        "sharey": len(axes) > 1 and all(axes[0].get_shared_y_axes().joined(axes[0], a) for a in axes[1:]),
        "figlegend": [t.get_text() for leg in fig.legends for t in leg.get_texts()],  # seaborn 패싯(relplot)의 범례
        "figtexts": [t.get_text() for t in fig.texts if t not in special],  # fig.text()로 적은 글자(출처 줄 등)
        "figsize": [_num(v) for v in fig.get_size_inches()],
        "saved": saved,
        "saved_names": [x[0] for x in saved],  # bbox_inches="tight"는 픽셀이 글꼴 엔진마다 달라 이름만 볼 때
        "axes": [axes_summary(ax) for ax in axes],
        # 이 그림을 마지막으로 저장(savefig)했을 때의 Axes. 저장하지 않았으면 None
        "saved_axes": next((state for f, state in reversed(_mpl.get("saved_state", [])) if f is fig), None),
        "saved_blank": any(not state for _, state in _mpl.get("saved_state", [])),  # Axes 없는 빈 그림을 저장했는가
    }


def saved_files(work, given):
    """실행 폴더에 새로 생긴 파일. PNG는 [이름, 가로 픽셀, 세로 픽셀], 나머지는 [이름]."""
    found = []
    for root, _, names in os.walk(work):
        for name in names:
            path = os.path.join(root, name)
            rel = os.path.relpath(path, work).replace(os.sep, "/")
            if rel in given or rel.endswith(".pyc") or "__pycache__" in rel:
                continue
            item = [rel]
            try:  # 깨진 링크, 읽기 권한이 없는 파일은 이름만 적는다(2026-11-02 검토 r06)
                if rel.lower().endswith(".html"):  # Plotly HTML: Plotly.js를 파일에 넣었는지(inline), 인터넷에서 받는지(cdn),
                    with open(path, "rb") as fh:  # 옆 파일 plotly.min.js에서 읽는지(directory, include_plotlyjs="directory")
                        text = fh.read()
                    item.append("inline" if b"plotly.js v" in text and len(text) > 1_000_000 else "cdn" if b"cdn.plot.ly" in text else
                                "directory" if re.search(rb"<script[^>]*src=[\"']plotly\.min\.js[\"']", text) else "none")
                if rel.lower().endswith(".png"):
                    with open(path, "rb") as fh:
                        head = fh.read(24)
                    if head[:8] == b"\x89PNG\r\n\x1a\n":
                        item += [int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")]
            except OSError:
                pass
            found.append(item)
    return sorted(found)


def html_reports(work, given):
    """실행 폴더에 새로 생긴 HTML 파일마다 리포트 모양을 읽는다(시각화 과목 10장, 2026-11-02). (요약, 화면 목록)을 돌려준다.
    요약은 파일마다 차트 수(class="plotly-graph-div"), 파일에 넣은 Plotly.js 수('plotly.js v'), 인터넷에서 받는 Plotly.js 수
    (cdn.plot.ly를 src로 부르는 script), 외부 주소 수(' src='), 차트 제목(차례대로), 본문의 제목(h1~h3)과 문단(p)이다.
    화면 목록은 app.js가 앱 화면처럼 그리는 꼴({elements: [...]})이다."""
    found, views = {}, {}
    for root, _, names in os.walk(work):
        for name in names:
            path = os.path.join(root, name)
            rel = os.path.relpath(path, work).replace(os.sep, "/")
            if rel in given or not rel.lower().endswith((".html", ".htm")):
                continue
            try:
                with open(path, encoding="utf-8", errors="replace") as fh:
                    found[rel], views[rel] = _html_report(fh.read())
            except Exception:  # noqa: BLE001 - 깨진 링크, 읽을 수 없는 파일, 깨진 HTML(2026-11-02 검토 L1)
                found[rel] = {"charts": 0, "plotlyjs": 0, "ready": True, "cdn": 0, "src": 0, "titles": [], "texts": []}
                views[rel] = {"elements": []}
    return found, views


def _skip_comma(text, i):
    while i < len(text) and text[i] in " \t\r\n,":
        i += 1
    return i


BLOCKS = {"div", "table", "ul", "ol", "li", "section", "article", "header", "footer", "main", "figure", "hr", "pre",
          "blockquote", "h4", "h5", "h6", "body", "html", "nav", "aside", "form", "dl"}  # 열리면 열린 문단(<p>)을 닫는 태그


def _html_report(text):
    """HTML 문서 하나를 리포트로 읽는다(html_reports가 부른다). 주석과 script는 앞에서부터 차례로 떼어 내고(주석 속 차트와
    문단은 세지 않는다), 나머지는 HTMLParser로 읽어 제목(h1~h3)과 문단(p)을 차례대로 적는다. </p>를 빠뜨리거나 차트를 <p>로 감싸도
    브라우저처럼 문단을 닫고, <br>은 빈칸 하나로 본다. 차트는 div 아이디·data·layout이 JSON으로 읽히는 Plotly.newPlot 호출이다
    (파일에 넣은 Plotly.js 안에도 'Plotly.newPlot('이 있다). 2026-11-02 채점기 독립 검토(M3~M5, L1, L4)로 정규식에서 바꿨다."""
    from html.parser import HTMLParser
    dec = json.JSONDecoder()
    texts, elements = [], []
    kinds = {"h1": "title", "h2": "header", "h3": "subheader", "p": "markdown"}

    def title(fig):
        t = fig["layout"].get("title")
        return _txt((t or {}).get("text") if isinstance(t, dict) else t)

    class Reader(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.tag, self.buf = None, []

        def flush(self):
            words = " ".join("".join(self.buf).split())
            if self.tag and words:
                texts.append([self.tag, words])
                elements.append({"t": kinds[self.tag], "where": "main", "text": words})
            self.buf = []

        def handle_starttag(self, tag, attrs):
            if tag in kinds or tag in BLOCKS:
                self.flush()
                self.tag = tag if tag in kinds else None
            elif tag == "br":
                self.buf.append(" ")

        def handle_startendtag(self, tag, attrs):
            self.handle_starttag(tag, attrs)

        def handle_endtag(self, tag):
            if tag == self.tag or tag in BLOCKS or tag in kinds:
                self.flush()
                self.tag = None

        def handle_data(self, data):
            if self.tag:
                self.buf.append(data)

        def chart(self, fig):  # 차트는 열린 문단을 끊고 그 자리에 놓인다(뒤의 글은 다음 문단)
            self.flush()
            texts.append(["chart", title(fig)])
            elements.append({"t": "plotly", "where": "main", "fig": json.dumps(fig, ensure_ascii=False)})

    reader, html_parts, scripts, last = Reader(), [], [], 0
    titles, first_chart, lib, cdn = [], None, [], 0
    low = text.lower()
    opener = re.compile(r"<!--|<script\b([^>]*)>", re.I)
    while True:
        m = opener.search(text, last)
        if m is None:
            break
        reader.feed(text[last:m.start()])
        html_parts.append(text[last:m.start()])
        if m.group(0) == "<!--":  # 주석: 닫는 곳까지 건너뛴다(닫지 않으면 끝까지)
            close = text.find("-->", m.end())
            last = len(text) if close < 0 else close + 3
            continue
        close = low.find("</script", m.end())  # 닫지 않은 script는 브라우저처럼 문서 끝까지가 script다
        attrs, js = m.group(1) or "", text[m.end():len(text) if close < 0 else close]
        end_tag = -1 if close < 0 else text.find(">", close)
        last = len(text) if close < 0 or end_tag < 0 else end_tag + 1
        start = m.start()
        scripts.append((attrs, js))
        if re.search(r"\bsrc\s*=", attrs, re.I):
            lib.append(start)
            cdn += bool(re.search(r"\bsrc\s*=\s*[\"']?[^\"'\s>]*cdn\.plot\.ly", attrs, re.I))
        if "plotly.js v" in js:
            lib.append(start)
        for call in re.finditer(r"Plotly\.newPlot\(\s*", js):
            try:
                _, i = dec.raw_decode(js, call.end())
                data, i = dec.raw_decode(js, _skip_comma(js, i))
                layout, i = dec.raw_decode(js, _skip_comma(js, i))
            except (ValueError, IndexError):
                continue
            if isinstance(data, list) and isinstance(layout, dict):
                fig = {"data": data, "layout": layout}
                first_chart = start if first_chart is None else first_chart
                titles.append(title(fig))
                reader.chart(fig)
    reader.feed(text[last:])
    html_parts.append(text[last:])
    reader.close()
    reader.flush()
    html_only = "".join(html_parts)  # 주석과 script를 뺀 HTML
    body = html_only + "".join(js for _, js in scripts)
    # Plotly.js(파일에 넣은 것이나 src로 부르는 것)가 첫 차트보다 앞에 있어야 첫 차트가 그려진다(둘째 차트에만 넣은 답)
    summary = {"charts": len(re.findall(r'class="plotly-graph-div"', body)), "plotlyjs": body.count("plotly.js v"),
               "ready": first_chart is None or (bool(lib) and min(lib) < first_chart),
               # 바깥 파일이나 주소를 부르는 곳: script 밖 HTML과 script 태그의 속성에서 빈칸(줄바꿈 포함) 뒤의 src=(라이브러리 안 글자는 세지 않는다)
               "cdn": cdn, "src": len(re.findall(r"\ssrc\s*=", html_only + " ".join(" " + a for a, _ in scripts), re.I)),
               "titles": titles, "texts": texts}
    return summary, {"elements": elements}


def figure_png():
    import base64
    fig = _final_figure()
    if fig is None:
        return None
    buf = io.BytesIO()
    _mpl.get("savefig", type(fig).savefig)(fig, buf, format="png", dpi=80, bbox_inches="tight", metadata={"Software": None})
    return base64.b64encode(buf.getvalue()).decode("ascii")


def plot_subset(summary, check):
    """채점할 칸만 남긴다(빌드가 기대값으로 저장하는 모양). 선을 보는데 X축이 범주 축이면 xcat도 남긴다:
    범주 축의 선은 x가 0, 1, 2… 위치로 읽혀 x를 빠뜨린 plot(y)의 선과 값이 같기 때문이다."""
    def part(ax):
        out = {k: ax[k] for k in AXES_FIELDS if k in check}
        if "lines" in check and ax.get("xcat") and ax["lines"]:
            out["xcat"] = True
        if ax["lines"] and any(k in check for k in ("lines", "line_styles", "line_colors")):
            out["line_labels"] = [ln["label"] for ln in ax["lines"]]
        for key in ("xticks", "yticks"):
            if key in check:
                out[key[0] + "tick_locs"] = ax[key[0] + "tick_locs"]
        return out
    return {"naxes": len(summary["axes"]), **{k: summary[k] for k in FIGURE_FIELDS if k in check},
            "axes": [part(ax) for ax in summary["axes"]]}


def _alike(a, b):
    if isinstance(a, float) or isinstance(b, float):
        return isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) <= 1e-6 + 1e-9 * max(abs(a), abs(b))
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_alike(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_alike(a[k], b[k]) for k in a)
    return a == b


def _iga(word):
    """낱말 뒤에 받침에 맞는 '이'나 '가'를 붙인다(끝의 괄호 설명은 건너뛰고 본다)."""
    w = re.sub(r"\([^)]*\)$", "", word).strip()
    ch = w[-1] if w else ""
    if "가" <= ch <= "힣":
        return word + ("이" if (ord(ch) - 0xAC00) % 28 else "가")
    return word + "이"


def _eoya(word):
    """낱말 뒤에 받침에 맞는 '이어야'나 '여야'를 붙인다(끝의 괄호 설명은 건너뛰고 본다)."""
    w = re.sub(r"\([^)]*\)$", "", word).strip()
    ch = w[-1] if w else ""
    if "가" <= ch <= "힣":
        return word + ("이어야" if (ord(ch) - 0xAC00) % 28 else "여야")
    return word + "이어야"


def _fmt(v):
    if v is None:
        return L("빈 값", "empty")
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else f"{v:.10g}"
    if isinstance(v, list):
        shown = ", ".join(_fmt(x) for x in v[:8])
        return f"[{shown}{', …' if len(v) > 8 else ''}]"
    if isinstance(v, str):
        v = re.sub(r"\$\\mathdefault\{(.*?)\}\$", r"\1", v)  # 로그 축 눈금 라벨 $\mathdefault{10^{1}}$ → 10^1
        v = re.sub(r"\^\{([^{}]*)\}", r"^\1", v)
        return f"'{v}'"
    return str(v)


def _name(n):
    return n if isinstance(n, str) else _fmt(n)


def _first_diff(a, b):
    """같은 길이의 두 목록에서 처음 다른 자리(0부터)."""
    return next((i for i, (x, y) in enumerate(zip(a, b)) if not _alike(x, y)), None)


def _saved_text(items):
    return L(", ".join(f"{x[0]}({x[1]}×{x[2]})" if len(x) == 3 else x[0] for x in items) or "없음",
             _and(f"{x[0]} ({x[1]}×{x[2]})" if len(x) == 3 else x[0] for x in items) or "none")


def _style_text(st):
    line, marker = st
    return L(f"선 {line!r}, " + ("마커 없음" if marker == "None" else f"마커 {marker!r}"),
             f"linestyle {line!r} and " + ("no marker" if marker == "None" else f"marker {marker!r}"))


def _box_text(b):
    name = (_name(b[0]) + ': ') if b[0] != '' else ''
    return L(f"{name}Q1 {_fmt(b[1])}, 중앙값 {_fmt(b[2])}, Q3 {_fmt(b[3])}, 수염 {_fmt(b[4])}~{_fmt(b[5])}, 이상치 {b[6]}개",
             f"{name}Q1 {_fmt(b[1])}, median {_fmt(b[2])}, Q3 {_fmt(b[3])}, whiskers {_fmt(b[4])} to {_fmt(b[5])}, {_n(b[6], 'outlier')}")


# 그림 칸의 (한국어, 영어) 이름. 영어 이름이 복수인 칸은 _PLURAL에 둔다(The bar colors differ.)
FIELD_NAMES = {"title": ("제목", "title"), "xlabel": ("X축 라벨", "x-axis label"), "ylabel": ("Y축 라벨", "y-axis label"),
               "legend": ("범례", "legend"), "legend_title": ("범례 제목", "legend title"),
               "xticks": ("X축 눈금 라벨", "x-axis tick labels"), "yticks": ("Y축 눈금 라벨", "y-axis tick labels"),
               "texts": ("그래프 안의 글자(값 라벨, 주석)", "text in the chart (value labels, annotations)"),
               "xlim": ("X축 범위", "x-axis range"), "ylim": ("Y축 범위", "y-axis range"),
               "xscale": ("X축 눈금 방식(scale)", "x-axis scale"), "yscale": ("Y축 눈금 방식(scale)", "y-axis scale"),
               "bar_colors": ("막대 색", "bar colors"), "kind": ("그래프 종류", "chart type"), "bars": ("막대", "bars"),
               "barh": ("가로 막대", "horizontal bars"), "errorbars": ("오차 막대", "error bars"),
               "errorbar_ends": ("오차 막대", "error bars"), "fills": ("채운 영역", "filled areas"), "lines": ("선", "lines"),
               "points": ("점", "points"), "groups": ("점의 색 묶음", "color groups of points"),
               "wedges": ("원 그래프 조각", "pie slices"), "boxes": ("박스 플롯", "box plot"),
               "arrows": ("화살표 주석", "arrow annotations"), "xgrid": ("X축 격자", "x-axis grid"),
               "ygrid": ("Y축 격자", "y-axis grid"), "spines": ("테두리", "spines"),
               "line_colors": ("선 색", "line colors"), "line_styles": ("선 모양", "line styles")}
_PLURAL = {"xticks", "yticks", "bar_colors", "bars", "barh", "errorbars", "errorbar_ends", "fills", "lines", "points", "groups",
           "wedges", "arrows", "spines", "line_colors", "line_styles"}


def _field(k):
    return L(*FIELD_NAMES[k])


def _jittered(a, b):
    """한쪽 좌표는 같고 다른 쪽 좌표만 범주 자리에서 0.5 안쪽으로 어긋났는가(seaborn stripplot의 jitter)."""
    for keep in (0, 1):
        move = 1 - keep
        if sorted(p[keep] for p in a) != sorted(p[keep] for p in b):
            continue
        pa = sorted((p[keep], p[move]) for p in a)
        pb = sorted((p[keep], p[move]) for p in b)
        if all(x is not None and y is not None and abs(x - y) < 0.5 for (_, x), (_, y) in zip(pa, pb)) and pa != pb:
            return True
    return False


def _place(i, got):
    """i번째 Axes(왼쪽 위부터 행 차례)를 자리로 부르는 이름('왼쪽 Axes', 'Left Axes'). 책은 axes[0]부터 세므로 번호 대신 자리로 부른다.
    배치가 행·열 격자와 맞지 않으면(subplot_mosaic, twinx) '1번째 Axes', 'Axes 1'처럼 번호로 부른다."""
    rows, cols = got.get("layout") or [0, 0]
    if rows * cols != len(got["axes"]) or rows * cols < 2:
        return L(f"{i + 1}번째 Axes", f"Axes {i + 1}")
    r, c = divmod(i, cols)
    if rows == 1:
        names = {2: [("왼쪽", "Left"), ("오른쪽", "Right")], 3: [("왼쪽", "Left"), ("가운데", "Middle"), ("오른쪽", "Right")]}.get(cols)
        return L(f"{names[c][0]} Axes", f"{names[c][1]} Axes") if names else L(f"왼쪽에서 {c + 1}번째 Axes", f"{_ordinal(c + 1)} Axes from the left")
    if cols == 1:
        names = {2: [("위", "Top"), ("아래", "Bottom")], 3: [("위", "Top"), ("가운데", "Middle"), ("아래", "Bottom")]}.get(rows)
        return L(f"{names[r][0]} Axes", f"{names[r][1]} Axes") if names else L(f"위에서 {r + 1}번째 Axes", f"{_ordinal(r + 1)} Axes from the top")
    if rows == 2 and cols == 2:
        return L(*[("왼쪽 위 Axes", "Top left Axes"), ("오른쪽 위 Axes", "Top right Axes"),
                   ("왼쪽 아래 Axes", "Bottom left Axes"), ("오른쪽 아래 Axes", "Bottom right Axes")][i])
    return L(f"{r + 1}행 {c + 1}열 Axes", f"Axes in row {r + 1}, column {c + 1}")


def compare_plot(want, got):
    """기대한 그림(빌드가 정답으로 만든 값)과 학생 그림을 칸마다 비교해 다른 점을 말로 돌려준다."""
    diffs = []
    if got["figures"] == 0:
        return [L("그림이 없습니다. Axes에 그래프를 그렸는지 봅니다.", "There is no figure. Check that you drew a chart on an Axes.")]
    if want["naxes"] != len(got["axes"]):
        diffs.append(L(f"Axes가 {want['naxes']}개여야 하는데 {len(got['axes'])}개입니다.",
                       f"Expected {want['naxes']} Axes, got {len(got['axes'])}."))
    if "layout" in want and want["layout"] != got["layout"]:
        grid = lambda lay: f"{_n(lay[0], 'row')} and {_n(lay[1], 'column')}"
        diffs.append(L(f"Axes 배치가 다릅니다. 기대 {want['layout'][0]}행 {want['layout'][1]}열, 내 그림 {got['layout'][0]}행 {got['layout'][1]}열.",
                       f"The Axes layout differs. Expected {grid(want['layout'])}, got {grid(got['layout'])}."))
    if "suptitle" in want and want["suptitle"] != got["suptitle"]:
        diffs.append(L(f"그림 전체 제목(suptitle)이 다릅니다. 기대 {_fmt(want['suptitle'])}, 내 그림 {_fmt(got['suptitle'])}.",
                       f"The figure title (suptitle) differs. Expected {_fmt(want['suptitle'])}, got {_fmt(got['suptitle'])}."))
    for key, axis in (("sharex", "X"), ("sharey", "Y")):
        if key in want and want[key] != got[key]:
            diffs.append(L(f"Axes들이 {axis}축을 {'공유해야' if want[key] else '공유하지 않아야'} 합니다({key}).",
                           f"The Axes should {'' if want[key] else 'not '}share the {axis.lower()}-axis ({key})."))
    if "figlegend" in want and want["figlegend"] != got["figlegend"]:
        diffs.append(L(f"그림 범례가 다릅니다. 기대 {_fmt(want['figlegend'])}, 내 그림 {_fmt(got['figlegend'])}.",
                       f"The figure legend differs. Expected {_fmt(want['figlegend'])}, got {_fmt(got['figlegend'])}."))
    if "figtexts" in want and want["figtexts"] != got["figtexts"]:
        diffs.append(L(f"그림에 적은 글자(fig.text)가 다릅니다. 기대 {_fmt(want['figtexts'])}, 내 그림 {_fmt(got['figtexts'])}.",
                       f"The figure text (fig.text) differs. Expected {_fmt(want['figtexts'])}, got {_fmt(got['figtexts'])}."))
    if "figsize" in want and not _alike(want["figsize"], got["figsize"]):
        diffs.append(L(f"그림 크기(figsize)가 다릅니다. 기대 {_fmt(want['figsize'])}, 내 그림 {_fmt(got['figsize'])}.",
                       f"The figure size (figsize) differs. Expected {_fmt(want['figsize'])}, got {_fmt(got['figsize'])}."))
    if "saved" in want and want["saved"] != got["saved"]:
        same_names = [x[0] for x in want["saved"]] == [x[0] for x in got["saved"]]
        diffs.append(L(f"저장한 파일이 다릅니다. 기대 {_saved_text(want['saved'])}, 내 코드 {_saved_text(got['saved'])}."
                       + (" 픽셀 수는 그림 크기(figsize)와 해상도(dpi)가 정합니다. `bbox_inches=\"tight\"`를 주면 여백을 잘라 픽셀 수가 달라집니다."
                          if same_names else ""),
                       f"The saved files differ. Expected {_saved_text(want['saved'])}, got {_saved_text(got['saved'])}."
                       + (" The pixel size depends on the figure size (figsize) and the resolution (dpi). "
                          "`bbox_inches=\"tight\"` trims the margins, which changes the pixel size." if same_names else "")))
    if "saved_names" in want and want["saved_names"] != got["saved_names"]:
        diffs.append(L(f"저장한 파일 이름이 다릅니다. 기대 {', '.join(want['saved_names']) or '없음'}, 내 코드 {', '.join(got['saved_names']) or '없음'}.",
                       f"The saved file names differ. Expected {_and(want['saved_names']) or 'none'}, got {_and(got['saved_names']) or 'none'}."))
    if want["naxes"] == len(got["axes"]):
        many = want["naxes"] > 1
        for i, (w, g) in enumerate(zip(want["axes"], got["axes"])):
            diffs += _axes_diffs(w, g, f"{_place(i, got)}: " if many else "")
    state = got.get("saved_axes")
    if ("saved" in want or "saved_names" in want) and got["saved"] and state is not None:
        # 저장한 뒤에 그래프나 글자를 더하면 화면의 그림에는 있어도 저장한 파일에는 없다
        changed = []
        if len(state) != len(got["axes"]):
            changed.append(L("Axes 수", "number of Axes"))
        else:
            for w, s, g in zip(want["axes"], state, got["axes"]):
                changed += [_field(k) for k in AXES_FIELDS if k in w and not _alike(s[k], g[k]) and _field(k) not in changed]
        if changed:
            diffs.append(L(f"그림을 저장한 뒤에 {_iga(', '.join(changed))} 바뀌었습니다. 저장한 파일에는 빠져 있으니 다 그린 뒤 마지막에 저장합니다.",
                           f"You changed the {_and(changed)} after saving the figure, so the saved file does not show "
                           f"{'the change' if len(changed) == 1 else 'the changes'}. Save at the end, after you finish drawing."))
    for i, w in enumerate(want["axes"] if want["naxes"] == len(got["axes"]) else []):
        if w.get("title") and got["axes"][i]["title"] != w["title"] and got["suptitle"] == w["title"]:
            diffs.append(L("Axes 제목을 그림 전체 제목(suptitle)으로 붙였습니다. Axes 제목은 `set_title()`이나 `plt.title()`로 붙입니다.",
                           "You set the Axes title as the figure title (suptitle). Set an Axes title with `set_title()` or `plt.title()`."))
            break
    if want.get("suptitle") and got["suptitle"] != want["suptitle"] and any(ax["title"] == want["suptitle"] for ax in got["axes"]):
        diffs.append(L("그림 전체 제목을 Axes 하나의 제목으로 붙였습니다. 그림 전체 제목은 `fig.suptitle()`로 붙입니다.",
                       "You set the figure title as the title of one Axes. Set the figure title with `fig.suptitle()`."))
    if ("saved" in want or "saved_names" in want) and got.get("saved_blank"):
        diffs.append(L("빈 그림을 저장했습니다. `plt.show()` 뒤에 `plt.savefig()`를 부르면 새 빈 그림이 저장됩니다. 저장은 `plt.show()` 앞에서 합니다.",
                       "You saved a blank figure. Calling `plt.savefig()` after `plt.show()` saves a new, blank figure. "
                       "Save before `plt.show()`."))
    if diffs and got["figures"] > 1:
        diffs.append(L(f"그림이 {got['figures']}개 있습니다. 마지막 그림만 채점합니다. `plt.figure()`를 한 번 더 불렀거나 "
                       "seaborn 함수에 `ax=`를 빠뜨려 새 그림이 생겼는지 봅니다.",
                       f"There are {got['figures']} figures. Only the last one is graded. Check whether calling `plt.figure()` again "
                       "or leaving out `ax=` in a seaborn function made a new figure."))
    return diffs


def _axes_diffs(w, g, head):
    diffs = []
    labels = w.get("line_labels")
    if labels is not None:
        # 선은 라벨로 짝짓는다(seaborn은 hue 묶음을 거꾸로 그리기도 한다). 라벨 없는 선은 남은 것끼리 그린 차례로 짝짓는다.
        # 목표 그림의 선에 라벨이 하나도 없으면 학생이 붙인 라벨은 보지 않는다(범례 없는 그림에 label=을 더해도 같은 그림이다)
        mine = [ln["label"] for ln in g["lines"]]
        named = [x for x in labels if x]
        if not named:
            g = dict(g, lines=[dict(ln, label="") for ln in g["lines"]])
        elif len(mine) == len(labels) and len(set(named)) == len(named) and sorted(named) == sorted(x for x in mine if x):
            free = iter([k for k, x in enumerate(mine) if not x])
            order = [mine.index(x) if x else next(free) for x in labels]
            g = dict(g, lines=[g["lines"][k] for k in order], line_styles=[g["line_styles"][k] for k in order],
                     line_colors=[g["line_colors"][k] for k in order])
    missing = [k for k in w.get("kind", []) if k not in g["kind"]]  # 요구한 종류가 있는지만 본다(덧붙인 기준선은 괜찮다)
    if missing:
        kinds = [_kind(k) for k in missing]
        filled = [L("채운 영역(바이올린 등)", "filled areas (violins, etc.)")] if g.get("fills") else []
        mine = [_kind(k) for k in g["kind"]] + filled
        has = f"It has only {_and([f'a {_kind(k)}' for k in g['kind']] + filled)}." if mine else "It has no chart at all."
        diffs.append(L(f"{head}{_iga('·'.join(kinds) or '없음')} 없습니다. " + (f"내 그림에는 {'·'.join(mine)}만 있습니다." if mine else "내 그림에는 그래프가 없습니다."),
                       (_head(head, f"There is no {_and(kinds, 'or')}. ") if head else f"Your figure has no {_and(kinds, 'or')}. ") + has))
    if w.get("xcat") and not g.get("xcat"):
        diffs.append(L(f"{head}X축에 범주 이름(눈금 라벨)이 없습니다. " + ("Y축에 범주가 있으니 x와 y를 바꿔 넣었는지 봅니다." if g.get("ycat")
                       else "선을 그릴 때 x에 범주 목록을 넣었는지 봅니다."),
                       _head(head, "The x-axis has no category names (tick labels). " + (
                           "The categories are on the y-axis, so check whether you swapped x and y." if g.get("ycat")
                           else "Check that you passed the list of categories as x when drawing the line."))))
    for key in ("xticks", "yticks"):  # 눈금 라벨 글자는 같은데 붙은 자리가 다를 때
        locs = key[0] + "tick_locs"
        if locs in w and _alike(w[key], g[key]) and not _alike(w[locs], g.get(locs)):
            k = _first_diff(w[locs], g[locs]) if len(w[locs]) == len(g[locs]) else 0
            if k is not None and k < len(w[key]):
                diffs.append(L(f"{head}{key[0].upper()}축 눈금 라벨 {_fmt(w[key][k])}의 자리가 다릅니다. 기대 {_fmt(w[locs][k])}, "
                               f"내 그림 {_fmt(g[locs][k]) if k < len(g[locs]) else '없음'}.",
                               _head(head, f"The {key[0]}-axis tick label {_fmt(w[key][k])} is in a different position. "
                                     f"Expected {_fmt(w[locs][k])}, got {_fmt(g[locs][k]) if k < len(g[locs]) else 'none'}.")))
    lines_count_off = "lines" in w and len(w["lines"]) != len(g["lines"])
    line_name = lambda k: (L(f"선 '{g['lines'][k]['label']}'", f"line '{g['lines'][k]['label']}'")
                           if k < len(g["lines"]) and g["lines"][k]["label"] else L(f"선 {k + 1}", f"line {k + 1}"))
    for key in AXES_FIELDS:
        if key == "kind" or key not in w or _alike(w[key], g[key]):
            continue
        a, b = w[key], g[key]
        if missing and not b and key in ("bars", "barh", "lines", "points", "groups", "wedges", "boxes", "line_styles",
                                         "line_colors", "bar_colors", "errorbar_ends"):
            continue  # 그래프 종류가 없다는 말이 이미 설명한다
        if key in ("bars", "barh"):
            what = L("높이", "height") if key == "bars" else L("길이", "length")
            base = L("바닥", "bottom") if key == "bars" else L("시작점", "start")
            # 숫자 축(히스토그램, 연도)의 막대 이름은 막대 가운데의 좌표다. 기대한 막대도 숫자 이름일 때만 그렇게 부른다
            # (원 그래프를 함께 그려 눈금이 지워진 범주 막대는 이름이 숫자로 읽혀도 범주 막대로 말한다)
            numlike = lambda n: isinstance(n, (int, float)) or bool(re.fullmatch(r"[−+-]?\d+(?:\.\d+)?", str(n)))
            numeric = all(numlike(x[0]) for x in a) and not g.get("xcat" if key == "bars" else "ycat")
            bar = lambda n: (L(f"가운데가 {_name(n)}인 막대", f"the bar centered at {_name(n)}") if numeric
                             else L(f"막대 {_name(n)}", f"bar {_name(n)}"))
            if len(a) != len(b):
                diffs.append(L(f"{head}막대가 {len(a)}개여야 하는데 {len(b)}개입니다.", _head(head, f"Expected {_n(len(a), 'bar')}, got {len(b)}.")))
            elif [x[0] for x in a] != [x[0] for x in b]:
                names = lambda xs: ", ".join(_name(x[0]) for x in xs[:10]) + (" …" if len(xs) > 10 else "")
                diffs.append(L(f"{head}" + ("막대의 자리(가운데 좌표)가 다릅니다. 구간 경계를 봅니다. " if numeric else "막대의 차례나 이름이 다릅니다. ")
                               + f"기대 {names(a)} / 내 그림 {names(b)}.",
                               _head(head, ("The bar positions (centers) differ. Check the bin edges. " if numeric
                                            else "The order or names of the bars differ. ") + f"Expected {names(a)} / got {names(b)}.")))
            else:
                k = _first_diff(a, b)
                x, y = a[k], b[k]
                nth = sum(1 for z in a[:k] if z[0] == x[0])
                if nth or sum(1 for z in a if z[0] == x[0]) > 1:  # 같은 자리에 쌓은 막대: 아래(왼쪽)에서 몇 번째인지 붙인다
                    x = [L(f"{_name(x[0])}의 {nth + 1}번째 층", f"{_name(x[0])} (layer {nth + 1})")] + list(x[1:])
                if not _alike(x[1], y[1]):
                    diffs.append(L(f"{head}{bar(x[0])}의 {what}가 다릅니다. 기대 {_fmt(x[1])}, 내 그림 {_fmt(y[1])}.",
                                   _head(head, f"The {what} of {bar(x[0])} differs. Expected {_fmt(x[1])}, got {_fmt(y[1])}.")))
                else:
                    diffs.append(L(f"{head}{bar(x[0])}의 {base}이 다릅니다(쌓은 막대). 기대 {_fmt(x[2])}, 내 그림 {_fmt(y[2])}.",
                                   _head(head, f"The {base} of {bar(x[0])} differs (stacked bars). Expected {_fmt(x[2])}, got {_fmt(y[2])}.")))
        elif key == "errorbars":
            diffs.append(L(f"{head}오차 막대가 {a}개여야 하는데 {b}개입니다.", _head(head, f"Expected {_n(a, 'error bar')}, got {b}.")))
        elif key == "errorbar_ends":
            if len(a) != len(b):
                if "errorbars" not in w:
                    diffs.append(L(f"{head}오차 막대가 {len(a)}개여야 하는데 {len(b)}개입니다.",
                                   _head(head, f"Expected {_n(len(a), 'error bar')}, got {len(b)}.")))
            else:
                k = _first_diff(a, b)
                diffs.append(L(f"{head}오차 막대 {_name(a[k][0])}의 끝이 다릅니다. 기대 {_fmt(a[k][1])}~{_fmt(a[k][2])}, "
                               f"내 그림 {_fmt(b[k][1])}~{_fmt(b[k][2])}.",
                               _head(head, f"The ends of error bar {_name(a[k][0])} differ. Expected {_fmt(a[k][1])} to {_fmt(a[k][2])}, "
                                     f"got {_fmt(b[k][1])} to {_fmt(b[k][2])}.")))
        elif key == "fills":
            diffs.append(L(f"{head}채운 영역(오차 띠, 바이올린 등)이 {a}개여야 하는데 {b}개입니다.",
                           _head(head, f"Expected {_n(a, 'filled area')} (error band, violin, etc.), got {b}.")))
        elif key == "lines":
            if len(a) != len(b):
                diffs.append(L(f"{head}선이 {len(a)}개여야 하는데 {len(b)}개입니다.", _head(head, f"Expected {_n(len(a), 'line')}, got {len(b)}.")))
                continue
            for k, (la, lb) in enumerate(zip(a, b)):
                for part, name in (("y", L("값(y)", "y value")), ("x", L("x 위치", "x position")), ("label", L("라벨", "label"))):
                    if _alike(la[part], lb[part]):
                        continue
                    if part == "label":
                        diffs.append(L(f"{head}선 {k + 1}의 라벨이 다릅니다. 기대 {_fmt(la['label'])}, 내 그림 {_fmt(lb['label'])}.",
                                       _head(head, f"The label of line {k + 1} differs. Expected {_fmt(la['label'])}, got {_fmt(lb['label'])}.")))
                    elif len(la[part]) != len(lb[part]):
                        diffs.append(L(f"{head}{line_name(k)}의 점이 {len(la[part])}개여야 하는데 {len(lb[part])}개입니다.",
                                       _head(head, f"Expected {_n(len(la[part]), 'point')} on {line_name(k)}, got {len(lb[part])}.")))
                    else:
                        j = _first_diff(la[part], lb[part])
                        diffs.append(L(f"{head}{line_name(k)}의 {j + 1}번째 {_iga(name)} 다릅니다. 기대 {_fmt(la[part][j])}, 내 그림 {_fmt(lb[part][j])}.",
                                       _head(head, f"The {name} of point {j + 1} on {line_name(k)} differs. "
                                             f"Expected {_fmt(la[part][j])}, got {_fmt(lb[part][j])}.")))
                    break
        elif key in ("line_styles", "line_colors"):
            if lines_count_off:
                continue  # 선 수가 다르다는 말이 이미 있다
            if len(a) != len(b):
                if "lines" not in w and not (key == "line_colors" and "line_styles" in w):
                    diffs.append(L(f"{head}선이 {len(a)}개여야 하는데 {len(b)}개입니다.", _head(head, f"Expected {_n(len(a), 'line')}, got {len(b)}.")))
                continue
            for k, (sa, sb) in enumerate(zip(a, b)):
                if sa != sb:
                    diffs.append(L(f"{head}{line_name(k)}의 모양이 다릅니다. 기대 {_style_text(sa)}, 내 그림 {_style_text(sb)}.",
                                   _head(head, f"The style of {line_name(k)} differs. Expected {_style_text(sa)}, got {_style_text(sb)}."))
                                 if key == "line_styles" else
                                 L(f"{head}{line_name(k)}의 색이 다릅니다. 기대 {sa}, 내 그림 {sb}.",
                                   _head(head, f"The color of {line_name(k)} differs. Expected {sa}, got {sb}.")))
        elif key == "points":
            if len(a) != len(b):
                diffs.append(L(f"{head}점이 {len(a)}개여야 하는데 {len(b)}개입니다.", _head(head, f"Expected {_n(len(a), 'point')}, got {len(b)}.")))
            elif _jittered(a, b):
                diffs.append(L(f"{head}점이 옆으로 흔들려 찍혔습니다. `stripplot()`은 기본으로 점을 흔들어 찍으니 `jitter=False`를 줍니다.",
                               _head(head, "The points are shifted sideways (jitter). `stripplot()` jitters points by default, "
                                     "so pass `jitter=False`.")))
            else:
                diffs.append(L(f"{head}점의 좌표가 다릅니다. x와 y에 넣은 값을 봅니다.",
                               _head(head, "The point coordinates differ. Check the values you passed as x and y.")))
        elif key == "groups":
            diffs.append(L(f"{head}점을 색으로 나눈 묶음이 {len(a)}개여야 하는데 {len(b)}개입니다.",
                           _head(head, f"Expected {_n(len(a), 'color group')} of points, got {len(b)}.")) if len(a) != len(b) else
                         L(f"{head}같은 색으로 묶인 점들이 다릅니다. 색을 나누는 기준(hue 등)을 봅니다.",
                           _head(head, "The points grouped by color differ. Check what splits the colors (hue, etc.).")))
        elif key == "wedges":
            text = lambda ws: (", ".join(f"{lab or L('(라벨 없음)', '(no label)')} {round(f * 100, 1):g}%" for lab, f in ws if f is not None)
                               or L("없음", "none"))
            diffs.append(L(f"{head}원 그래프 조각이 다릅니다. 기대 {text(a)} / 내 그림 {text(b)}.",
                           _head(head, f"The pie slices differ. Expected {text(a)} / got {text(b)}.")))
        elif key == "boxes":
            if len(a) != len(b):
                diffs.append(L(f"{head}박스가 {len(a)}개여야 하는데 {len(b)}개입니다.", _head(head, f"Expected {_n(len(a), 'box', 'boxes')}, got {len(b)}.")))
            elif [x[0] for x in a] != [x[0] for x in b]:
                names = lambda xs: ", ".join(_name(x[0]) for x in xs)
                diffs.append(L(f"{head}박스의 차례나 이름(눈금 라벨)이 다릅니다. 기대 {names(a)} / 내 그림 {names(b)}.",
                               _head(head, f"The order or names (tick labels) of the boxes differ. Expected {names(a)} / got {names(b)}.")))
            else:
                k = _first_diff(a, b)
                diffs.append(L(f"{head}박스 플롯이 다릅니다. 기대 {_box_text(a[k])} / 내 그림 {_box_text(b[k])}.",
                               _head(head, f"The box plot differs. Expected {_box_text(a[k])} / got {_box_text(b[k])}.")))
        elif key == "arrows":
            if len(a) != len(b):
                diffs.append(L(f"{head}화살표 주석이 {len(a)}개여야 하는데 {len(b)}개입니다. `annotate()`에 `arrowprops`를 주었는지 봅니다.",
                               _head(head, f"Expected {_n(len(a), 'arrow annotation')}, got {len(b)}. "
                                     "Check that you passed `arrowprops` to `annotate()`.")))
                continue
            # 가리키는 점은 허용 범위 안이면 같다고 본다: 범주 축은 같은 범주(±0.4), 숫자 축은 축 범위의 3%(X), 5%(Y)
            span = lambda lim: abs(lim[1] - lim[0]) if lim and None not in lim else 1.0
            xtol = 0.4 if g.get("xcat") else 0.03 * span(g.get("xlim"))
            ytol = 0.4 if g.get("ycat") else 0.05 * span(g.get("ylim"))
            where = lambda v, ticks, locs: next((t for t, loc in zip(ticks, locs) if loc is not None and v is not None and abs(loc - v) < 0.4), _fmt(v))
            for wa, ga in zip(a, b):
                if wa[0] != ga[0]:
                    diffs.append(L(f"{head}화살표 주석의 글자가 다릅니다. 기대 {_fmt(wa[0])}, 내 그림 {_fmt(ga[0])}.",
                                   _head(head, f"The text of an arrow annotation differs. Expected {_fmt(wa[0])}, got {_fmt(ga[0])}.")))
                    break
                if None in wa[1:] or None in ga[1:] or abs(wa[1] - ga[1]) > xtol or abs(wa[2] - ga[2]) > ytol:
                    show = lambda p: (f"({where(p[1], g.get('xticks', []), g.get('xtick_locs', [])) if g.get('xcat') else _fmt(p[1])}, {_fmt(p[2])})")
                    diffs.append(L(f"{head}주석 {_fmt(wa[0])}의 화살표가 가리키는 점이 다릅니다. 기대 {show(wa)}, 내 그림 {show(ga)}.",
                                   _head(head, f"The arrow of annotation {_fmt(wa[0])} points to a different spot. "
                                         f"Expected {show(wa)}, got {show(ga)}.")))
                    break
        elif key in ("xgrid", "ygrid"):
            diffs.append(L(f"{head}{key[0].upper()}축 격자({'세로선' if key == 'xgrid' else '가로선'})가 {'있어야' if a else '없어야'} 합니다.",
                           _head(head, f"The {key[0]}-axis grid ({'vertical' if key == 'xgrid' else 'horizontal'} lines) "
                                 f"should be {'on' if a else 'off'}.")))
        elif key == "spines":
            diffs.append(L(f"{head}보이는 테두리(spines)가 다릅니다. 기대 {'·'.join(a) or '없음'}, 내 그림 {'·'.join(b) or '없음'}.",
                           _head(head, f"The visible spines differ. Expected {_and(a) or 'none'}, got {_and(b) or 'none'}.")))
        else:
            name = _field(key)
            if key == "legend" and not b:
                diffs.append(L(f"{head}범례가 없습니다. 기대 {_fmt(a)}.", _head(head, f"There is no legend. Expected {_fmt(a)}.")))
            else:
                diffs.append(L(f"{head}{_iga(name)} 다릅니다. 기대 {_fmt(a)}, 내 그림 {_fmt(b)}.",
                               _head(head, f"The {name} {'differ' if key in _PLURAL else 'differs'}. Expected {_fmt(a)}, got {_fmt(b)}.")))
    return diffs


# ------------------------------------------------------------------ Plotly 그림(시각화 과목 9장, 2026-11-02)
# 학생 코드가 fig.show()로 내보낸 Figure를 그 순간의 모양으로 베껴 둔다(노트북 화면에 남는 그림과 같다). show()가 없으면
# write_html()로 저장한 Figure, 그것도 없으면 이름 공간에 남은 마지막 Figure를 채점한다. matplotlib처럼 픽셀이 아니라
# Figure 객체(트레이스와 layout)를 읽으므로 px로 그리든 go로 그리든 같은 값이 나온다.
PLOTLY_FIELDS = ("kind", "traces", "names", "title", "xlabel", "ylabel", "legend_title", "hover", "hovermode",
                 "xrange", "yrange", "xdtick", "xscale", "yscale", "barmode", "widths", "sizes", "colors", "markers", "dashes",
                 "symbols", "annotations", "texts", "hlines", "bar_text", "saved", "saved_names",
                 # 10장(2026-11-02): 서브플롯 축, 범례 묶음, 날짜 축 탐색, 툴팁 문구, 빗금, HTML 리포트
                 "axis_titles", "axis_ranges", "tickformats", "legend_groups", "rangeslider", "rangeselector",
                 "hover_templates", "patterns", "report", "report_text")
REPORT_ONLY = {"report", "report_text", "saved", "saved_names"}  # 그림이 아니라 저장한 파일만 보는 칸
TRACE_KINDS = {"line": ("선 그래프", "line chart"), "scatter": ("산점도", "scatter plot"), "bar": ("막대 그래프", "bar chart"),
               "barh": ("가로 막대 그래프", "horizontal bar chart"), "histogram": ("히스토그램", "histogram"),
               "box": ("박스 플롯", "box plot"), "pie": ("원 그래프", "pie chart"), "area": ("영역 그래프", "area chart")}
PLOTLY_NAMES = {"title": ("제목", "title"), "xlabel": ("X축 제목", "x-axis title"), "ylabel": ("Y축 제목", "y-axis title"),
                "legend_title": ("범례 제목", "legend title"), "xscale": ("X축 눈금 방식", "x-axis scale"),
                "yscale": ("Y축 눈금 방식", "y-axis scale"), "barmode": ("막대 배치(barmode)", "bar mode")}
TRACE_STYLES = {"widths": ("선 굵기", "line width"), "sizes": ("점 크기", "marker size"), "colors": ("색", "color"),
                "dashes": ("선 모양", "line dash"), "symbols": ("점 모양", "marker symbol"),
                "patterns": ("빗금 모양(pattern_shape)", "pattern shape"), "hover_templates": ("툴팁 문구(hovertemplate)", "hover template")}
# 색을 정하지 않은 트레이스는 plotly.js가 템플릿의 colorway에서 트레이스 차례대로 색을 고른다. 템플릿에 색 목록이 없을 때
# plotly.js의 기본 색(D3 category10)
DEFAULT_COLORWAY = ("#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf")
MAX_SHOWS = 50
_px = {}


def _tk(k):
    return L(*TRACE_KINDS[k]) if k in TRACE_KINDS else k


def _px_show(self, *args, **kwargs):
    if len(_px["shown"]) >= MAX_SHOWS:
        raise RuntimeError(L(f"`fig.show()`를 {MAX_SHOWS}번 넘게 불렀습니다. 반복문 안에서 show()를 부르는지 봅니다.",
                             f"`fig.show()` was called more than {MAX_SHOWS} times. Check whether you call show() inside a loop."))
    _px["shown"].append(_freeze(self))
    _px["live"].append(self)  # show() 뒤에 이 Figure를 고쳤는지 보려고(plotly_summary의 after_show)


def _px_write_html(self, *args, **kwargs):
    _px["saved"].append(_freeze(self))
    return _px["write_html"](self, *args, **kwargs)


def plotly_reset():
    """실행마다 내보낸 Figure 목록을 비우고, show()와 write_html()이 Figure를 기억하게 한다. 학생 코드가 바꾼 show(),
    px.defaults, 기본 템플릿도 되돌린다(같은 브라우저에서 앞 문제의 설정이 다음 문제의 그림에 남지 않게)."""
    _px.update(shown=[], saved=[], ns=[], live=[])
    try:
        from plotly.basedatatypes import BaseFigure
    except ImportError:  # Plotly를 아직 받지 않은 브라우저
        return
    if "write_html" not in _px:
        _px["write_html"] = BaseFigure.write_html
    BaseFigure.show, BaseFigure.write_html = _px_show, _px_write_html
    px = sys.modules.get("plotly.express")
    if px is not None:
        px.defaults.reset()
    pio = sys.modules.get("plotly.io")
    if pio is not None:
        pio.templates.default = "plotly"


def _freeze(fig):
    """그 순간의 Figure를 베낀다. show() 뒤에 고친 것은 화면에 남은 그림에 없다."""
    try:
        import plotly.graph_objects as go
        return go.Figure(fig)
    except Exception:  # noqa: BLE001 - Figure가 아닌 것(사전 등)은 그대로 둔다
        return fig


def _is_plotly_figure(v):
    mod = sys.modules.get("plotly.basedatatypes")
    return bool(mod) and isinstance(v, mod.BaseFigure)


def _peek_figures(ns):
    """학생 코드가 끝난 뒤 이름 공간에 남은 Figure(show도 저장도 하지 않은 답을 읽으려고). 변수 fig가 있으면 그것을,
    없으면 마지막 Figure를 채점한다(_plotly_final은 목록의 끝을 본다)."""
    figs = sorted(((k, v) for k, v in ns.items() if _is_plotly_figure(v)), key=lambda kv: kv[0] == "fig")
    _px["ns"] = [_freeze(v) for _, v in figs]


def _plotly_final():
    """채점할 Figure: 마지막으로 show()한 것, 없으면 마지막으로 저장한 것, 그것도 없으면 이름 공간의 마지막 Figure."""
    for pool in ("shown", "saved", "ns"):
        if _px.get(pool):
            return _px[pool][-1]
    return None


def _pv(x):
    """트레이스 값 하나. 글자는 그대로, 날짜는 '2026-01-01'처럼, 수는 작은 오차를 지운 실수로."""
    if isinstance(x, str):
        return str(x)
    if "datetime" in type(x).__name__ or hasattr(x, "isoformat"):
        s = str(x).replace(" ", "T")
        return s[:10] if re.fullmatch(r"\d{4}-\d\d-\d\d(T00:00:00(\.0+)?)?", s) else s[:19]
    try:
        return _num(x)
    except (TypeError, ValueError):
        return str(x)


def _typed_array(v):
    """Plotly 6이 줄여 쓴 수 배열({dtype, bdata(base64), shape})을 파이썬 리스트로."""
    import base64
    import numpy as np
    arr = np.frombuffer(base64.b64decode(v["bdata"]), dtype=np.dtype(v.get("dtype", "f8")))
    if v.get("shape"):
        arr = arr.reshape([int(n) for n in str(v["shape"]).split(",")])
    return arr.tolist()


def _pvals(v):
    if v is None:
        return []
    if isinstance(v, dict) and "bdata" in v:  # go.Figure(fig.to_dict())처럼 사전에서 다시 만든 Figure
        v = _typed_array(v)
    if isinstance(v, (str, bytes)):
        return [_pv(v)]
    try:
        return [_pv(x) for x in list(v)]
    except TypeError:
        return [_pv(v)]


def _prop(obj, name):
    """트레이스에 없는 칸(원 그래프의 x 등)을 읽어도 오류 없이 None."""
    try:
        return getattr(obj, name)
    except Exception:  # noqa: BLE001
        return None


def _trace_mode(t):
    """scatter 트레이스의 mode. 주지 않으면 plotly.js는 점이 20개보다 적을 때 선과 점을 함께, 많으면 선만 그린다."""
    mode = _prop(t, "mode")
    if mode:
        return mode
    return "lines+markers" if len(_pvals(_prop(t, "x")) or _pvals(_prop(t, "y"))) < 20 else "lines"


def _trace_kind(t):
    if t.type in ("scatter", "scattergl"):
        fill = _prop(t, "fill")
        if (fill and fill != "none") or _prop(t, "stackgroup"):  # px.area: 아래를 채우거나 쌓은 선
            return "area"
        return "line" if "lines" in _trace_mode(t) else "scatter"
    if t.type == "bar":
        return "barh" if _prop(t, "orientation") == "h" else "bar"
    return t.type


def _hover_fields(t):
    """툴팁에 보이는 항목의 이름(px의 hovertemplate '지점=A<br>월=%{x}'에서 '='의 앞)."""
    tpl = _prop(t, "hovertemplate")
    if not isinstance(tpl, str) or not tpl:
        return []
    out = []
    for part in re.split(r"<br\s*/?>", re.sub(r"<extra>.*?</extra>", "", tpl)):
        part = re.sub(r"<[^>]+>", "", part).strip()
        if part == "%{hovertext}":
            out.append("hover_name")
        elif "=" in part:
            out.append(part.split("=", 1)[0].strip())
        elif ":" in part and "%{" in part:
            out.append(part.split(":", 1)[0].strip())
    return out


def _color(c):
    """색 표기를 '#rrggbb'로 맞춘다('red', '#FF0000', 'rgb(255, 0, 0)'은 같은 색). 읽지 못하면 소문자 글자 그대로."""
    if not isinstance(c, str):
        return None
    s = c.strip().lower()
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)", s)
    if m:
        return "#" + "".join(f"{min(255, int(round(float(v)))):02x}" for v in m.groups())
    try:
        from matplotlib.colors import to_hex
        return to_hex(s)
    except Exception:  # noqa: BLE001 - matplotlib이 모르는 이름
        return s


def _sort_key(v):
    return (0, v, "") if isinstance(v, (int, float)) and not isinstance(v, bool) else (1, 0, str(v))


def _sorted_pairs(x, y):
    """점이나 값의 모임(산점도, 히스토그램, 박스, 원 그래프)은 그린 차례가 화면에 드러나지 않는다. 짝을 정렬해 둔다."""
    if x and y and len(x) == len(y):
        pairs = sorted(zip(x, y), key=lambda q: (_sort_key(q[0]), _sort_key(q[1])))
        return [q[0] for q in pairs], [q[1] for q in pairs]
    return sorted(x, key=_sort_key), sorted(y, key=_sort_key)


def _d3(v, spec):
    """막대 값 v를 d3-format 형식 spec으로 화면에 보일 글로 바꾼다. 흔한 꼴([,][.N][f|d|%])만 알고, 모르면 None.
    spec이 None이면 형식 없는 값(정수는 그대로, 아니면 12자리까지)."""
    if spec is None or spec == "":
        return str(int(v)) if float(v).is_integer() else f"{float(v):.12g}"
    m = re.fullmatch(r"(,)?(?:\.(\d+))?([fd%]?)", spec)
    if m is None:
        return None
    group, places, kind = bool(m.group(1)), m.group(2), m.group(3)
    if kind == "%":
        if places is None:
            return None
        return f"{float(v) * 100:{',' if group else ''}.{places}f}%"
    if kind == "d" or (kind == "" and places is None and float(v).is_integer()):
        return f"{round(float(v)):{',' if group else ''}d}"
    if kind == "f" or places is not None:
        return f"{float(v):{',' if group else ''}.{int(places or 6)}f}"
    return f"{float(v):{',' if group else ''}}"


def _bar_text(t):
    """막대에 적은 글. 없으면 False, 값이 아닌 글이면 "other", 값이면 {"fmt": 형식, "labels": 화면에 보일 글}이다(막대가 아니면 False).
    값으로 보는 것: texttemplate이 막대 값 변수(세로 %{y}, 가로 %{x}, %{value}, 값과 같은 수를 담은 %{text})를 쓸 때(text_auto=True,
    text_auto=","도 이 꼴), text가 값과 같은 수일 때, text의 글마다 처음 나오는 수가 그 자릿수로 반올림한 값과 같을 때('2,150', '432 riders').
    fmt가 None(형식 없이 값 그대로)인 정답은 어떤 값 글이든 맞고, 형식이 있는 정답은 화면에 보일 글(labels)이 같아야 한다.
    2026-11-02 학생처럼 풀기(text="route")와 채점기 독립 검토(H2: 같은 '2,150'인 %{y:,.0f}가 떨어짐, 1,000 아래 값)로 이 꼴이 됐다."""
    if t.type != "bar":
        return False
    var = "x" if _prop(t, "orientation") == "h" else "y"
    vals = _pvals(_prop(t, var))
    text = _prop(t, "text")
    texts = [] if text is None or (isinstance(text, str) and not text) else _pvals(text)
    tpl = _prop(t, "texttemplate")
    if not vals or any(not isinstance(v, float) for v in vals):
        return "other" if tpl or texts else False
    if tpl:
        tpls = [tpl] if isinstance(tpl, str) else [str(x) for x in _pvals(tpl)]
        labels, specs = [], set()
        for i, v in enumerate(vals):
            s = tpls[i % len(tpls)]
            m = re.search(r"%\{(" + var + r"|value|text)(?::([^}]*))?\}", s)
            if m is None:
                return "other"
            if m.group(1) == "text" and (len(texts) != len(vals) or not isinstance(texts[i], float) or abs(texts[i] - v) > 1e-9):
                return "other"
            spec = m.group(2) or None
            shown = _d3(v, spec)
            if shown is None:  # 모르는 형식: 형식 글자 그대로 견준다
                shown = "{" + str(spec) + "}"
            specs.add(spec)
            labels.append(s[:m.start()] + shown + s[m.end():])
        plain = specs == {None} and all(x in ("%{" + var + "}", "%{value}", "%{text}") for x in tpls)
        return {"fmt": None if plain else "template", "labels": labels}
    if not texts:
        return False
    if len(texts) != len(vals):
        return "other"
    if all(isinstance(x, float) for x in texts):  # 값 열을 그대로 준 text(text="riders")
        if any(abs(x - v) > 1e-9 for x, v in zip(texts, vals)):
            return "other"
        return {"fmt": None, "labels": [_d3(v, None) for v in vals]}
    for x, v in zip(texts, vals):
        m = re.search(r"-?\d[\d,]*(?:\.(\d+))?", str(x))
        if m is None or abs(round(v, len(m.group(1) or "")) - float(m.group().replace(",", ""))) > 1e-9:
            return "other"
    return {"fmt": "text", "labels": [str(x) for x in texts]}


def _trace_summary(t):
    line, marker = _prop(t, "line"), _prop(t, "marker")
    color = None
    for c in (_prop(line, "color") if line is not None else None, _prop(marker, "color") if marker is not None else None):
        if isinstance(c, str):
            color = _color(c)
            break
    width = _prop(line, "width") if line is not None else None
    size = _prop(marker, "size") if marker is not None else None
    text = _bar_text(t)
    kind = _trace_kind(t)
    x, y = _pvals(_prop(t, "x")), _pvals(_prop(t, "y"))
    if t.type == "pie":
        x, y = _pvals(_prop(t, "labels")), _pvals(_prop(t, "values"))
    if kind in ("scatter", "histogram", "box", "pie"):
        x, y = _sorted_pairs(x, y)
    dots = kind == "scatter" or (kind == "line" and "markers" in _trace_mode(t))
    dash = _prop(line, "dash") if line is not None else None
    symbol = _prop(marker, "symbol") if marker is not None else None
    hovertext = _prop(t, "hovertext")
    pattern = _prop(_prop(marker, "pattern"), "shape") if marker is not None else None
    group = _prop(t, "legendgroup")
    return {"name": "" if t.name is None else str(t.name), "kind": kind, "x": x, "y": y,
            # 서브플롯(10장): 트레이스가 놓인 축 짝('xy', 'x2y2'). 축이 없는 원 그래프는 'xy'
            "panel": f"{_prop(t, 'xaxis') or 'x'}{_prop(t, 'yaxis') or 'y'}",
            # 범례 묶음과 범례에 보이는지(10장), 툴팁 문구(빈칸과 <extra>를 뺀 hovertemplate), 막대의 빗금(pattern_shape)
            "legendgroup": str(group) if group else "", "showlegend": _prop(t, "showlegend") is not False,
            "hovertemplate": _tpl(_prop(t, "hovertemplate")),
            "pattern": (pattern or None) if isinstance(pattern, str) or pattern is None else str(_pvals(pattern)),
            "width": _num(width) if isinstance(width, (int, float)) else None,
            "size": _num(size) if isinstance(size, (int, float)) else None,
            "color": color, "hover": _hover_fields(t), "text": text,
            # 선 위에 점을 찍었는지(px.line의 markers=True). 선 그래프가 아니면 None
            "markers": "markers" in _trace_mode(t) if kind == "line" else None,
            # 선 모양(px의 line_dash)과 점 모양(px의 symbol). 정하지 않으면 plotly.js의 기본값
            "dash": (dash if isinstance(dash, str) else "solid") if kind in ("line", "area") else None,
            "symbol": (symbol if isinstance(symbol, str) else "circle" if symbol is None else str(_pvals(symbol))) if dots else None,
            # 툴팁 맨 위의 이름(px의 hover_name 열의 값). 어느 열을 주었는지 가리려고 값을 정렬해 둔다
            "hovertext": sorted(map(str, _pvals(hovertext))) if hovertext is not None and not isinstance(hovertext, str) else []}


def _tpl(v):
    """hovertemplate에서 <extra>…</extra>를 뺀 것(비교는 빈칸을 빼고 한다, compare_plotly). 없으면 None."""
    if not isinstance(v, str) or not v:
        return None
    return re.sub(r"<extra>.*?</extra>", "", v).strip() or None


def _txt(v):
    return "" if v is None else re.sub(r"<[^>]+>", " ", str(v)).strip()


def _range(r):
    """축 범위. 날짜는 '2026-01-01'과 '2026-01-01 00:00:00'을 같게 본다(2026-11-02 검토 L6)."""
    day = lambda v: (v[:10] if re.fullmatch(r"\d{4}-\d\d-\d\d(?:[ T]00:00(?::00(?:\.0+)?)?)?", v) else v + "-01" if re.fullmatch(r"\d{4}-\d\d", v)
                     else v) if isinstance(v, str) else v
    return None if r is None else [day(_pv(v)) for v in r]


def _data_ref(ref):
    return ref is None or (re.fullmatch(r"[xy]\d*", str(ref)) is not None)


def _panel_refs(panel):
    """'x2y2' → ('x2', 'y2')."""
    m = re.match(r"(x\d*)(y\d*)", panel)
    return (m.group(1), m.group(2)) if m else ("x", "y")


def _layout_axis(lay, ref):
    """layout의 축('x2' → xaxis2). 트레이스가 layout에 없는 축을 쓰면 첫 축으로 본다(그림 전체를 못 읽지 않게, 2026-11-02 검토 L2)."""
    try:
        return lay[f"{ref[0]}axis{ref[1:]}"]
    except Exception:  # noqa: BLE001
        return lay.xaxis if ref.startswith("x") else lay.yaxis


def _slider_on(axis):
    """범위 슬라이더가 보이는지. plotly.js는 rangeslider에 무엇이든 정하면 visible을 참으로 본다(2026-11-02 검토 M6)."""
    rs = axis.rangeslider
    if rs.visible is not None:
        return bool(rs.visible)
    try:
        return bool(rs.to_plotly_json())
    except Exception:  # noqa: BLE001
        return False


def _panel_grid(lay, traces):
    """트레이스가 놓인 패널의 [행 수, 열 수]. 축의 domain으로 센다(1행 2열과 2행 1열을 가르려고, 2026-11-02 검토 H3)."""
    dom = lambda ref: tuple(round(float(v), 3) for v in (_layout_axis(lay, ref).domain or (0, 1)))
    try:
        xs = {dom(_panel_refs(t["panel"])[0]) for t in traces}
        ys = {dom(_panel_refs(t["panel"])[1]) for t in traces}
    except Exception:  # noqa: BLE001
        return [1, 1]
    return [max(1, len(ys)), max(1, len(xs))]


def _panel_count(lay, traces):
    """패널(서브플롯) 수: layout에 만든 X축 수와 트레이스가 놓인 축 짝 수 가운데 큰 것. make_subplots(rows=2, cols=2)로
    빈 패널을 더 만든 그림을 거르려고 센다(2026-11-02 돌연변이 시험)."""
    try:
        made = sum(1 for k in lay.to_plotly_json() if re.fullmatch(r"xaxis\d*", k))
    except Exception:  # noqa: BLE001
        made = 0
    return max(1, made, len({t["panel"] for t in traces}))


def _axis_sort(ref):
    return ref[0], int(ref[1:] or 1)


def _panel_word(panel):
    """'x2y2' → '2번째 패널'. X축과 Y축 번호가 다르면(보조 축) 둘 다 적는다."""
    m = re.fullmatch(r"x(\d*)y(\d*)", panel)
    xn, yn = (int(m.group(1) or 1), int(m.group(2) or 1)) if m else (1, 1)
    return L(f"{xn}번째 패널", f"panel {xn}") if xn == yn else L(f"X축 {xn}·Y축 {yn}", f"x-axis {xn}, y-axis {yn}")


def _key_order(key):
    """트레이스 열쇠를 이름, 패널 차례로 늘어놓는 열쇠('A @xy'가 'A @x2y2'보다 앞)."""
    name, _, panel = key.partition(" @")
    m = re.fullmatch(r"x(\d*)y(\d*)", panel)
    return (name, int(m.group(1) or 1), int(m.group(2) or 1)) if m else (name, 0, 0)


def _key_label(key):
    """트레이스 열쇠('A', 또는 서브플롯에서 'A @x2y2')를 메시지에 쓸 말로."""
    name, sep, panel = key.rpartition(" @")
    if not sep or not re.fullmatch(r"x\d*y\d*", panel):  # 이름에 ' @'가 든 패널 하나짜리 트레이스도 그대로(2026-11-02 검토 L11)
        return f"'{key}'"
    if not name:  # 이름 없는 트레이스(2026-11-02 검토 M2)
        return L(f"{_panel_word(panel)}의 이름 없는", f"(unnamed, {_panel_word(panel)})")
    return L(f"'{name}'({_panel_word(panel)})", f"'{name}' ({_panel_word(panel)})")


def _axis_word(ref, multi):
    """'x2' → '2번째 패널의 X축'. 패널이 하나면 'X축'."""
    letter, n = ref[0], int(ref[1:] or 1)
    return L(f"{n}번째 패널 {letter.upper()}축", f"the {letter}-axis of panel {n}") if multi else L(f"{letter.upper()}축", f"the {letter}-axis")


def _paper_spot(v, axis):
    """그림 영역 비율 좌표를 셋으로 나눈 쪽으로 적는다(2026-11-02 학생처럼 풀기: 출처 줄을 오른쪽 위에 둬도 통과함).
    0~1/3은 왼쪽(아래), 2/3~1은 오른쪽(위), 그 사이는 가운데다. 그림 밖(음수, 1 넘음)은 가까운 쪽이다. 값이 없으면 가운데(0.5)다."""
    try:
        v = 0.5 if v is None else float(v)
    except (TypeError, ValueError):  # 날짜 글자 같은 값(2026-11-02 검토 L3): 가운데로 본다
        v = 0.5
    low, high = ("left", "right") if axis == "x" else ("bottom", "top")
    return "paper:" + (low if v < 1 / 3 else high if v > 2 / 3 else "center" if axis == "x" else "middle")


STEPS = {"month": ("개월", "month"), "year": ("년", "year"), "day": ("일", "day"), "hour": ("시간", "hour"),
         "minute": ("분", "minute"), "second": ("초", "second")}  # 기간 버튼(rangeselector)의 step
SPOTS = {"left": ("왼쪽", "left"), "center": ("가운데", "center"), "right": ("오른쪽", "right"),
         "bottom": ("아래", "bottom"), "middle": ("가운데", "middle"), "top": ("위", "top")}


def _spot_word(v):
    """'paper:left' 같은 좌표 하나를 말로 적는다."""
    ko, en = SPOTS[str(v).split(":", 1)[1]]
    return L(f"그림 영역 {ko}", f"{en} of the plot area")


def _spot_name(a):
    """주석 [글, x, y, 화살표]의 두 좌표가 모두 그림 영역 비율일 때 자리를 '왼쪽 아래'처럼 적는다."""
    x, y = (str(v).split(":", 1)[1] for v in a[1:3])
    (xk, xe), (yk, ye) = SPOTS[x], SPOTS[y]
    if x == "center":
        return L(xk if y == "middle" else f"{yk} {xk}", "center" if y == "middle" else f"{ye} center")
    return L(f"{xk} {yk}", f"middle {xe}" if y == "middle" else f"{ye} {xe}")


def _dtick(axis):
    """눈금 간격. dtick을 주지 않아도 tickmode="linear"(간격 1)나 같은 간격의 tickvals로 정한 것은 그 간격으로 본다."""
    if axis.dtick is not None:
        return _pv(axis.dtick)
    vals = axis.tickvals
    if vals is not None and len(vals) >= 2:
        try:
            nums = [float(v) for v in vals]
        except (TypeError, ValueError):
            return None
        steps = {round(b - a, 9) for a, b in zip(nums, nums[1:])}
        return _num(steps.pop()) if len(steps) == 1 else None
    return 1.0 if axis.tickmode == "linear" else None


def _bar_order(traces, lay):
    """막대를 화면에 보이는 차례로 놓는다. 범주 축이면 축의 차례(category_orders, categoryorder, 없으면 처음 나온 차례),
    숫자 축이면 자리 차례다. 표를 정렬해 그린 답과 category_orders=로 차례를 정한 답이 같은 요약이 된다."""
    groups = []  # 범주 축마다(서브플롯이면 패널의 축마다, 2026-11-02 검토 L5) 따로 차례를 정한다
    for kind, key, other in (("bar", "x", "y"), ("barh", "y", "x")):
        by_axis = {}
        for t in traces:
            if t["kind"] == kind and len(t[key]) == len(t[other]):
                by_axis.setdefault(_panel_refs(t.get("panel", "xy"))[0 if key == "x" else 1], []).append(t)
        groups += [(_layout_axis(lay, ref), key, other, bars) for ref, bars in by_axis.items()]
    for axis, key, other, bars in groups:
        cats = [c for t in bars for c in t[key]]
        if not cats:
            continue
        seen = list(dict.fromkeys(cats))
        how = axis.categoryorder or "trace"
        dates = all(isinstance(c, str) and re.fullmatch(r"\d{4}-\d\d-\d\d.*", c) for c in cats)
        if axis.type != "category" and (all(isinstance(c, float) for c in cats) or dates):  # 숫자 축, 날짜 축: 자리 차례
            order = sorted(seen)
        elif how == "array" and axis.categoryarray is not None:
            first = [_pv(c) for c in axis.categoryarray]
            order = first + [c for c in seen if c not in first]
        elif how.startswith("category"):
            order = sorted(seen, key=_sort_key, reverse=how.endswith("descending"))
        elif how.split()[0] in ("total", "sum", "min", "max", "mean", "median"):  # 값으로 정한 차례(update_xaxes(categoryorder="total descending") 등)
            vals = {c: [] for c in seen}
            for t in bars:
                for c, v in zip(t[key], t[other]):
                    if isinstance(v, float):
                        vals[c].append(v)
            agg = {"total": sum, "sum": sum, "min": min, "max": max, "mean": lambda v: sum(v) / len(v),
                   "median": lambda v: (sorted(v)[(len(v) - 1) // 2] + sorted(v)[len(v) // 2]) / 2}[how.split()[0]]
            order = sorted(seen, key=lambda c: agg(vals[c]) if vals[c] else 0.0, reverse=how.endswith("descending"))
        else:
            order = seen
        rank = {c: i for i, c in enumerate(order)}
        for t in bars:
            pairs = sorted(zip(t[key], t[other]), key=lambda q: rank.get(q[0], len(rank)))
            t[key], t[other] = [q[0] for q in pairs], [q[1] for q in pairs]


def _figure_fields(fig):
    """Figure 하나에서 채점할 칸을 모두 읽는다."""
    lay = fig.layout
    traces = [_trace_summary(t) for t in fig.data]
    way = [_color(c) for c in ((lay.template.layout.colorway if lay.template is not None else None) or DEFAULT_COLORWAY)]
    for i, t in enumerate(traces):
        if t["color"] is None and t["kind"] != "pie":
            t["color"] = way[i % len(way)]
    _bar_order(traces, lay)
    # 서브플롯(10장): 패널이 둘 이상이면 같은 이름이 두 패널에 있을 수 있어(A지점의 선과 막대) 'A @x2y2'처럼 패널을 붙인 열쇠로 짝짓는다
    multi = len({t["panel"] for t in traces}) > 1
    for t in traces:
        t["key"] = f"{t['name']} @{t['panel']}" if multi else t["name"]
    refs = sorted({_panel_refs(t["panel"])[i] for t in traces for i in (0, 1)} or {"x", "y"}, key=_axis_sort)
    axis = lambda ref: _layout_axis(lay, ref)
    groups = {}
    for t in traces:
        if t["legendgroup"]:
            groups.setdefault(t["legendgroup"], []).append(t["key"])
    buttons = []
    for ref in (r for r in refs if r.startswith("x")):
        for b in axis(ref).rangeselector.buttons or ():
            step = b.step or "month"  # plotly.js 기본값: step 'month', count 1, stepmode 'backward'(2026-11-02 검토 M7)
            buttons.append([None if step == "all" else 1 if b.count is None else int(b.count), step, b.stepmode or "backward", _txt(b.label)])
        if buttons:
            break
    # 범주 축(글자 값만 놓인 축)에는 tickformat이 보이지 않으므로 보지 않는다(2026-11-02 검토 L7)
    cats = {r for r in refs if axis(r).type == "category" or (lambda vs: bool(vs) and all(isinstance(v, str) and not re.match(r"\d{4}-\d\d-\d\d", v) for v in vs))(
        [v for t in traces if r in _panel_refs(t["panel"]) for v in t["x" if r.startswith("x") else "y"]])}
    hover = []
    for t in traces:
        hover += [h for h in t["hover"] if h not in hover]
    notes = []
    for a in lay.annotations or ():  # 좌표마다 따로: xref나 yref가 'paper'(그림 영역 비율)면 그 좌표는 'paper:left'처럼 쪽만 적는다
        notes.append([_txt(a.text), _pv(a.x) if _data_ref(a.xref) else _paper_spot(a.x, "x"),
                      _pv(a.y) if _data_ref(a.yref) else _paper_spot(a.y, "y"), a.showarrow is not False])
    hlines = []
    for s in lay.shapes or ():
        if s.type == "line" and s.y0 is not None and s.y0 == s.y1 and not _data_ref(s.xref):
            hlines.append(_pv(s.y0))
    return {"kind": sorted({t["kind"] for t in traces}), "traces": traces,
            "names": [t["name"] for t in traces], "title": _txt(lay.title.text), "xlabel": _txt(lay.xaxis.title.text),
            "ylabel": _txt(lay.yaxis.title.text), "legend_title": _txt(lay.legend.title.text), "hover": hover,
            "hover_names": {t["name"]: t["hovertext"] for t in traces if t["hovertext"]},
            "hovermode": lay.hovermode if isinstance(lay.hovermode, str) else None,
            "xrange": _range(lay.xaxis.range), "yrange": _range(lay.yaxis.range), "xdtick": _dtick(lay.xaxis),
            "xscale": "log" if lay.xaxis.type == "log" else "linear", "yscale": "log" if lay.yaxis.type == "log" else "linear",
            "barmode": lay.barmode or "group",
            "widths": {t["key"]: t["width"] for t in traces}, "sizes": {t["key"]: t["size"] for t in traces},
            "colors": {t["key"]: t["color"] for t in traces},
            "markers": {t["key"]: t["markers"] for t in traces if t["kind"] == "line"},
            "dashes": {t["key"]: t["dash"] for t in traces if t["dash"] is not None},
            "symbols": {t["key"]: t["symbol"] for t in traces if t["symbol"] is not None},
            "annotations": sorted(notes, key=lambda n: str(n[0])),
            "texts": sorted(n[0] for n in notes), "hlines": sorted(hlines), "bar_text": {t["key"]: t["text"] for t in traces if t["kind"] in ("bar", "barh")},
            # 10장(2026-11-02): 패널마다 축 제목·범위·날짜 눈금 표기, 범례 묶음(둘 이상 묶인 것만)과 범례에 보이는지,
            # 범위 슬라이더와 기간 버튼([count, step, stepmode, label]), 툴팁 문구, 막대 빗금
            "keys": [t["key"] for t in traces], "panel_count": _panel_count(lay, traces),
            "axis_titles": {r: _txt(axis(r).title.text) for r in refs}, "axis_ranges": {r: _range(axis(r).range) for r in refs},
            "tickformats": {r: None if r in cats else axis(r).tickformat or None for r in refs},
            "legend_groups": {"groups": sorted(sorted(g, key=_key_order) for g in groups.values() if len(g) > 1),
                              "shown": {t["key"]: t["showlegend"] for t in traces}, "of": {t["key"]: t["legendgroup"] for t in traces}},
            "rangeslider": any(_slider_on(axis(r)) for r in refs if r.startswith("x")), "rangeselector": buttons,
            "panel_grid": _panel_grid(lay, traces),
            "hover_templates": {t["key"]: t["hovertemplate"] for t in traces}, "patterns": {t["key"]: t["pattern"] for t in traces}}


def plotly_summary(saved=None, reports=None):
    saved, reports = saved or [], reports or {}
    fig = _plotly_final()
    base = {"figures": len(_px.get("shown") or []), "saved": saved, "saved_names": [x[0] for x in saved],
            "report": {k: {f: v[f] for f in ("charts", "plotlyjs", "ready", "cdn", "src", "titles")} for k, v in reports.items()},
            "report_text": {k: v["texts"] for k, v in reports.items()}}
    if fig is None or not _is_plotly_figure(fig):
        return {**base, "figures": 0, "kind": [], "traces": [], "names": [], "title": "", "xlabel": "", "ylabel": "",
                "legend_title": "", "hover": [], "hover_names": {}, "hovermode": None, "xrange": None, "yrange": None, "xdtick": None,
                "xscale": "linear", "yscale": "linear", "barmode": "group", "widths": {}, "sizes": {}, "colors": {}, "markers": {},
                "dashes": {}, "symbols": {}, "annotations": [], "texts": [], "hlines": [], "bar_text": {}, "saved_fig": None,
                "after_show": False, "keys": [], "axis_titles": {}, "axis_ranges": {}, "tickformats": {},
                "legend_groups": {"groups": [], "shown": {}}, "rangeslider": False, "rangeselector": [], "hover_templates": {},
                "panel_count": 0, "panel_grid": None,
                "patterns": {}}
    after = False
    if _px.get("shown") and _px.get("live") and fig is _px["shown"][-1]:
        try:  # show()로 띄운 뒤에 그 Figure를 고쳤는지(고친 것은 띄운 그림에 남지 않는다)
            # 사본은 칸 차례만 달라 글자로는 비교하지 않는다. None과 빈 사전은 지우고 본다(title_text=None, 2026-11-02 검토 M1)
            after = _no_none(json.loads(_px["live"][-1].to_json())) != _no_none(json.loads(fig.to_json()))
        except Exception:  # noqa: BLE001
            after = False
    shot = _px["saved"][-1] if _px.get("saved") else None
    return {**base, "figures": max(1, base["figures"]), **_figure_fields(fig), "after_show": after,
            "saved_fig": _figure_fields(shot) if _is_plotly_figure(shot) else None}


def _no_none(v):
    if isinstance(v, dict):
        out = {k: _no_none(x) for k, x in v.items() if x is not None}
        return {k: x for k, x in out.items() if x != {}}
    if isinstance(v, list):
        return [_no_none(x) for x in v]
    return v


def plotly_json():
    """화면(plotly.js)이 그릴 수 있는 Figure JSON. 채점할 그림이 없으면 None."""
    fig = _plotly_final()
    return fig.to_json() if _is_plotly_figure(fig) else None


def plotly_subset(summary, check):
    """채점할 칸만 남긴다(빌드가 기대값으로 저장하는 모양). 툴팁을 보면 툴팁 맨 위 이름(hover_name)의 값도 두고,
    저장한 파일을 보면 저장한 그림에서도 같은 칸을 둔다(저장한 뒤에 고친 그림을 띄운 답을 거르려고)."""
    out = {"figures": summary["figures"], **{k: summary[k] for k in PLOTLY_FIELDS if k in check}}
    if "traces" in check and summary.get("panel_count", 1) > 1:  # 서브플롯이면 패널 수와 배치(행·열)도 본다
        out["panel_count"] = summary["panel_count"]
        out["panel_grid"] = summary.get("panel_grid")
    if "hover" in check:
        out["hover_names"] = summary["hover_names"]
    inner = [k for k in check if k not in ("saved", "saved_names")]
    if ("saved" in check or "saved_names" in check) and inner and summary.get("saved_fig") is not None:
        out["saved_fig"] = plotly_subset({"figures": 1, **summary["saved_fig"]}, inner)
    return out


def _tname(t, i):
    return _key_label(t.get("key", t["name"])) if t["name"] else L(f"{i + 1}번째", f"#{i + 1}")


def _trace_diffs(want, got, head=""):
    """트레이스를 이름으로 짝지어(이름이 없으면 차례로) 종류와 X·Y 값을 비교한다. 그린 차례는 보지 않는다."""
    diffs = []
    if len(want) != len(got):
        msg = L(f"{head}트레이스가 {len(want)}개여야 하는데 {len(got)}개입니다.",
                f"{head}Expected {_n(len(want), 'trace')}, got {len(got)}.")
        if len(want) == 1 and len(got) > 1:
            msg += L(" 묶음(`color=` 등)으로 나누면 묶음마다 트레이스가 생깁니다. 막대나 선 하나로 그리려면 묶음을 나누지 않습니다.",
                     " Splitting into groups (with `color=` and so on) makes one trace per group. Do not split if it should be a single bar set or line.")
        if len(want) > 1 and len(got) == 1 and all(t["name"] for t in want):
            msg += L(" 묶음마다 선이나 점을 나누려면 px는 `color=`에 열 이름을 주고, go는 묶음마다 `add_trace()`를 부릅니다"
                     "(반복문 안에서 `go.Figure()`를 새로 만들면 앞의 트레이스가 사라집니다).",
                     " To split the lines or points by group, pass a column name to `color=` with px, or call `add_trace()` "
                     "for each group with go (making a new `go.Figure()` inside the loop drops the earlier traces).")
            return [msg]
        diffs.append(msg)
    # 이름(서브플롯이면 '이름 @패널')으로 짝짓는다. 그린 차례는 보지 않는다
    keys = [t.get("key", t["name"]) for t in want]
    by_name = all(keys) and len(set(keys)) == len(keys)
    pairs = []
    sub = lambda ts: any(t.get("key", t["name"]) != t["name"] for t in ts)
    if by_name and sub(want) and got and not sub(got):
        panels = len({t["panel"] for t in want})
        diffs.append(L(f"{head}목표 그림은 패널이 {panels}개인 서브플롯인데, 내 그림은 트레이스가 모두 한 패널에 있습니다. "
                       "`make_subplots()`로 패널을 만들고, 트레이스마다 `add_trace(..., row=, col=)`로 놓을 패널을 정합니다.",
                       f"{head}The target figure is a subplot with {panels} panels, but all your traces are in one panel. "
                       "Make the panels with `make_subplots()` and choose each trace's panel with `add_trace(..., row=, col=)`."))
        return diffs
    if by_name:
        got_by = {t.get("key", t["name"]): t for t in got}
        missing = [k for k in keys if k not in got_by]
        if missing:
            mine = [_key_label(t.get("key", t["name"])) for t in got]
            diffs.append(L(f"{head}없는 트레이스: {', '.join(_key_label(k) for k in missing)}. "
                           f"내 그림의 트레이스: {', '.join(mine) or '없음'}.",
                           f"{head}Missing {_n(len(missing), 'trace')}: {_and(_key_label(k) for k in missing)}. "
                           f"Your traces: {_and(mine) or 'none'}."))
        pairs = [(w, got_by[k], i) for i, (w, k) in enumerate(zip(want, keys)) if k in got_by]
    elif len(want) == len(got):
        pairs = [(w, g, i) for i, (w, g) in enumerate(zip(want, got))]
    for w, g, i in pairs:
        who = _tname(w, i)
        if w["kind"] != g["kind"]:
            diffs.append(L(f"{head}{who} 트레이스가 {_eoya(_tk(w['kind']))} 하는데 {_tk(g['kind'])}입니다.",
                           f"{head}Trace {who} should be a {_tk(w['kind'])}, but it is a {_tk(g['kind'])}."))
            continue
        for axis in ("x", "y"):
            a, b = w[axis], g[axis]
            if _alike(a, b):
                continue
            if len(a) == len(b) and sorted(map(str, a)) == sorted(map(str, b)):
                if w["kind"] in ("bar", "barh"):
                    diffs.append(L(f"{head}{who} 트레이스의 막대 차례가 다릅니다. 기대 {_fmt(a)}, 내 그림 {_fmt(b)}. "
                                   "막대는 표의 행 차례대로 놓이므로 정렬(`sort_values()`)했는지 봅니다(`category_orders=`로 정해도 됩니다).",
                                   f"{head}The bars of trace {who} are in a different order. Expected {_fmt(a)}, got {_fmt(b)}. "
                                   "Bars follow the table's row order, so check that you sorted the table (`sort_values()`) "
                                   "or set the order with `category_orders=`."))
                else:
                    diffs.append(L(f"{head}{who} 트레이스의 {axis.upper()} 값 차례가 다릅니다. 기대 {_fmt(a)}, 내 그림 {_fmt(b)}. "
                                   "선은 표의 행 차례대로 이어지므로 정렬(`sort_values()`)했는지 봅니다.",
                                   f"{head}The {axis} values of trace {who} are in a different order. Expected {_fmt(a)}, got {_fmt(b)}. "
                                   "Lines join the rows in table order, so check that you sorted the table (`sort_values()`)."))
                break
            msg = L(f"{head}{who} 트레이스의 {axis.upper()} 값이 다릅니다. 기대 {_fmt(a)}, 내 그림 {_fmt(b)}.",
                    f"{head}The {axis} values of trace {who} differ. Expected {_fmt(a)}, got {_fmt(b)}.")
            cats = g["x"] if g["kind"] == "bar" else g["y"]
            stacked = g["kind"] in ("bar", "barh") and len(set(map(str, cats))) < len(cats)
            if stacked:
                msg += L(" 같은 자리에 막대가 여러 개 쌓였습니다. `px.bar`는 묶지 않고 넣은 행을 모두 그리므로 평균이나 합계로 묶은 표를 먼저 만듭니다.",
                         " Several bars are stacked at the same place. `px.bar` does not group rows; it draws every row you pass, "
                         "so make a table of means or totals first.")
            diffs.append(msg)
            break
    return diffs


def _report_diffs(want, got):
    """HTML 리포트(10장): 파일이 있는지, 차트 수와 차례(제목), Plotly.js를 넣은 횟수와 외부 주소, 제목·문단 글."""
    diffs = []
    for name in {**(want.get("report") or {}), **(want.get("report_text") or {})}:
        if name not in got["report"]:
            have = ", ".join(_fmt(k) for k in got["report"]) or L("없음", "none")
            diffs.append(L(f"리포트 파일 {_fmt(name)}을 찾지 못했습니다. 내 코드가 만든 HTML 파일: {have}. 파일 이름과 폴더를 봅니다.",
                           f"Could not find the report file {_fmt(name)}. HTML files your code made: {have}. Check the file name and folder."))
    for name, w in (want.get("report") or {}).items():
        g = got["report"].get(name)
        if g is None:
            continue
        head = L(f"리포트 파일 {_fmt(name)}: ", f"Report file {_fmt(name)}: ")
        if w["charts"] != g["charts"]:
            diffs.append(head + L(f"차트가 {w['charts']}개여야 하는데 {g['charts']}개입니다.",
                                  f"it should have {_n(w['charts'], 'chart')}, but it has {g['charts']}."))
        elif w["titles"] != g["titles"]:
            diffs.append(head + L(f"차트의 차례(제목)가 다릅니다. 기대 {_fmt(w['titles'])}, 내 파일 {_fmt(g['titles'])}.",
                                  f"the charts are in a different order (titles). Expected {_fmt(w['titles'])}, got {_fmt(g['titles'])}."))
        if (w["plotlyjs"], w["cdn"]) != (g["plotlyjs"], g["cdn"]):  # Plotly.js를 넣은 방식(파일 안 횟수, cdn 횟수)
            how = lambda r: L(f"파일 안 {r['plotlyjs']}번, 인터넷(cdn) {r['cdn']}번", f"{r['plotlyjs']} inside the file, {r['cdn']} from the internet (cdn)")
            if g["plotlyjs"] > w["plotlyjs"] or g["cdn"] > w["cdn"]:
                hint = L(" Plotly.js는 첫 차트 조각에만 넣고(`include_plotlyjs=" + ("True" if w["plotlyjs"] else '"cdn"') + "`), 나머지 차트는 `include_plotlyjs=False`로 합니다.",
                         " Include Plotly.js only in the first chart's piece (`include_plotlyjs=" + ("True" if w["plotlyjs"] else '"cdn"') +
                         "`) and use `include_plotlyjs=False` for the rest.")
            elif w["plotlyjs"]:
                hint = L(" 인터넷 없이 열리게 첫 차트를 `include_plotlyjs=True`로 넣습니다.", " To open it without the internet, use `include_plotlyjs=True` for the first chart.")
            else:
                hint = L(' 첫 차트를 `include_plotlyjs="cdn"`으로 넣습니다.', ' Use `include_plotlyjs="cdn"` for the first chart.')
            diffs.append(head + L(f"Plotly.js를 넣은 방식이 다릅니다. 기대 {how(w)}, 내 파일 {how(g)}.{hint}",
                                  f"Plotly.js is included differently. Expected {how(w)}, got {how(g)}.{hint}"))
        elif w.get("ready", True) and not g.get("ready", True):
            diffs.append(head + L("Plotly.js가 첫 차트보다 뒤에 있어 첫 차트가 그려지지 않습니다. Plotly.js는 첫 차트 조각에 넣습니다"
                                  "(첫 차트만 `include_plotlyjs=True`).",
                                  "Plotly.js comes after the first chart, so the first chart is not drawn. Put Plotly.js in the first "
                                  "chart's piece (only the first chart uses `include_plotlyjs=True`)."))
        elif w["src"] - w["cdn"] <= 0 and g["src"] - g["cdn"] > 0:
            extra = g["src"] - g["cdn"]
            diffs.append(head + L(f"다른 파일이나 인터넷 주소(src=)를 {extra}곳 부릅니다. 파일 하나만으로 열리게 합니다.",
                                  f"it loads {_n(extra, 'other file or web address', 'other files or web addresses')} (src=). "
                                  "Make it open on its own."))
    tags = {"h1": L("큰 제목(h1)", "the main heading (h1)"), "h2": L("제목(h2)", "the heading (h2)"),
            "h3": L("작은 제목(h3)", "the subheading (h3)"), "p": L("문단(p)", "the paragraph (p)"),
            "chart": L("차트", "the chart")}
    for name, w in (want.get("report_text") or {}).items():
        g = got["report_text"].get(name)
        if g is None or w == g:
            continue
        i = next((i for i, (a, b) in enumerate(zip(w, g)) if a != b), min(len(w), len(g)))
        exp = f"{tags[w[i][0]]} {_fmt(w[i][1])}" if i < len(w) else L("없음", "nothing")
        mine = f"{tags[g[i][0]]} {_fmt(g[i][1])}" if i < len(g) else L("없음", "nothing")
        diffs.append(L(f"리포트 파일 {_fmt(name)}: {i + 1}번째 글이 다릅니다. 기대 {exp}, 내 파일 {mine}. "
                       "제목(h1, h2)과 문단(p)은 지문과 똑같이 쓰고, 숫자는 표에서 꺼냅니다. 차트는 지문이 말한 자리에 넣습니다.",
                       f"Report file {_fmt(name)}: text item {i + 1} differs. Expected {exp}, got {mine}. "
                       "Write the headings (h1, h2) and paragraphs (p) exactly as the problem says, take the numbers from the table, "
                       "and put each chart where the problem says."))
    return diffs


def compare_plotly(want, got):
    """기대한 Figure(빌드가 정답으로 만든 값)와 학생 Figure를 칸마다 비교해 다른 점을 말로 돌려준다."""
    if not got["traces"] and got["figures"] == 0 and not set(want) - {"figures"} <= REPORT_ONLY:
        return [L("그림이 없습니다. Figure를 만들고 `fig.show()`로 띄웠는지 봅니다.",
                  "There is no figure. Check that you made a Figure and showed it with `fig.show()`.")]
    diffs = []
    if "kind" in want:
        missing = [k for k in want["kind"] if k not in got["kind"]]
        if missing:
            diffs.append(L(f"그래프 종류가 다릅니다. 있어야 할 것: {', '.join(_tk(k) for k in missing)}. "
                           f"내 그림: {', '.join(_tk(k) for k in got['kind']) or '없음'}.",
                           f"The chart type differs. Expected a {_and(_tk(k) for k in missing)}. "
                           f"Yours: {_and(_tk(k) for k in got['kind']) or 'none'}."))
    if "traces" in want:
        diffs += _trace_diffs(want["traces"], got["traces"])
        if want.get("panel_count", 1) > 1 and got.get("panel_count", 1) != want["panel_count"]:
            diffs.append(L(f"패널 수가 다릅니다. 기대 {want['panel_count']}개, 내 그림 {got.get('panel_count', 1)}개. "
                           "`make_subplots(rows=, cols=)`의 행과 열 수를 봅니다.",
                           f"The number of panels differs. Expected {want['panel_count']}, got {got.get('panel_count', 1)}. "
                           "Check the numbers of rows and columns in `make_subplots(rows=, cols=)`."))
        elif want.get("panel_grid") and got.get("panel_grid") and want["panel_grid"] != got["panel_grid"]:
            (wr, wc), (gr, gc) = want["panel_grid"], got["panel_grid"]
            diffs.append(L(f"패널 배치가 다릅니다. 기대 {wr}행 {wc}열, 내 그림 {gr}행 {gc}열. `make_subplots(rows=, cols=)`와 "
                           "트레이스마다 준 `row=`, `col=`을 봅니다.",
                           f"The panel layout differs. Expected {wr} row(s) by {wc} column(s), got {gr} by {gc}. Check "
                           "`make_subplots(rows=, cols=)` and the `row=` and `col=` you gave each trace."))
    if "names" in want and sorted(want["names"]) != sorted(got["names"]) and "traces" not in want:
        diffs.append(L(f"트레이스 이름(범례)이 다릅니다. 기대 {_fmt(want['names'])}, 내 그림 {_fmt(got['names'])}.",
                       f"The trace names (legend) differ. Expected {_fmt(want['names'])}, got {_fmt(got['names'])}."))
    for key, (ko, en) in PLOTLY_NAMES.items():
        if key in want and want[key] != got[key]:
            diffs.append(L(f"{_iga(ko)} 다릅니다. 기대 {_fmt(want[key])}, 내 그림 {_fmt(got[key])}.",
                           f"The {en} differs. Expected {_fmt(want[key])}, got {_fmt(got[key])}."))
    if "hover" in want:
        missing = [h for h in want["hover"] if h not in got["hover"]]
        if missing:
            shown = ", ".join("hover_name" if h == "hover_name" else repr(h) for h in missing)
            diffs.append(L(f"툴팁에 빠진 항목: {shown}. `hover_data`나 `hover_name`, 축 이름(`labels`)을 봅니다.",
                           f"The tooltip is missing {shown}. Check `hover_data`, `hover_name`, and the axis names (`labels`)."))
        elif "hover_names" in want and want["hover_names"] and not _alike(sorted(want["hover_names"].values()), sorted(got["hover_names"].values())):
            w0, g0 = next(iter(want["hover_names"].values())), next(iter(got["hover_names"].values()), [])
            diffs.append(L(f"툴팁 맨 위의 이름이 다릅니다. 기대 {_fmt(w0[:5])}…, 내 그림 {_fmt(g0[:5])}. `hover_name=`에 준 열을 봅니다.",
                           f"The names at the top of the tooltip differ. Expected {_fmt(w0[:5])}..., got {_fmt(g0[:5])}. "
                           "Check the column you passed to `hover_name=`."))
    if "hovermode" in want and want["hovermode"] != got["hovermode"]:
        diffs.append(L(f"툴팁 방식(hovermode)이 다릅니다. 기대 {_fmt(want['hovermode'])}, 내 그림 {_fmt(got['hovermode'])}.",
                       f"The tooltip mode (hovermode) differs. Expected {_fmt(want['hovermode'])}, got {_fmt(got['hovermode'])}."))
    auto = lambda v: L("자동 범위", "automatic") if v is None else _fmt(v)
    for key, axis in (("xrange", "X"), ("yrange", "Y")):
        if key in want and not _alike(want[key], got[key]):
            diffs.append(L(f"{axis}축 범위가 다릅니다. 기대 {auto(want[key])}, 내 그림 {auto(got[key])}.",
                           f"The {axis.lower()}-axis range differs. Expected {auto(want[key])}, got {auto(got[key])}."))
    tick = lambda v: L("자동", "automatic") if v is None else _fmt(v)
    if "xdtick" in want and not _alike(want["xdtick"], got["xdtick"]):
        diffs.append(L(f"X축 눈금 간격(dtick)이 다릅니다. 기대 {tick(want['xdtick'])}, 내 그림 {tick(got['xdtick'])}.",
                       f"The x-axis tick spacing (dtick) differs. Expected {tick(want['xdtick'])}, got {tick(got['xdtick'])}."))
    styled = [k for k in (*TRACE_STYLES, "markers") if k in want]
    wanted = sorted({n for k in styled for n in want[k]})
    one = len(wanted) == 1 and len(got["names"]) == 1  # 트레이스가 하나뿐이면 이름(name=)과 상관없이 짝짓는다
    missing = [] if one or "traces" in want or "names" in want else [n for n in wanted if n not in (got.get("keys") or got["names"])]
    if missing:
        shown = ", ".join(_key_label(k) for k in missing)
        if any(k != _key_label(k).strip("'") for k in missing):  # 서브플롯: 이름보다 패널이 다른 것이다
            diffs.append(L(f"내 그림에 없는 트레이스: {shown}. 트레이스마다 `add_trace(..., row=, col=)`로 놓을 패널을 정합니다.",
                           f"Your figure is missing these traces: {shown}. Choose each trace's panel with `add_trace(..., row=, col=)`."))
        else:
            diffs.append(L(f"트레이스 이름(범례)이 다릅니다. 기대한 이름 {shown}의 트레이스가 내 그림에 없습니다. 내 그림 {_fmt(got['names'])}.",
                           f"The trace names (legend) differ. Your figure has no trace named {shown}. Yours: {_fmt(got['names'])}."))
    for key in styled:
        pairs = list(want[key].items())
        if one and len(pairs) == 1 and len(got[key]) == 1:
            pairs = [(pairs[0][0], pairs[0][1], next(iter(got[key].values())))]
        else:
            pairs = [(n, w, got[key][n]) for n, w in pairs if n in got[key]]
        for name, w, g in pairs:
            if _alike(w, g) or (key == "hover_templates" and " ".join((w or "").split()) == " ".join((g or "").split())):
                continue
            who = f"{_key_label(name)} " if name else ""
            if key == "markers":
                diffs.append(L(f"{who}선에 점이 없습니다. 선 위에 점을 함께 찍으려면 `markers=True`(go 트레이스는 `mode=\"lines+markers\"`)를 줍니다." if w else
                               f"{who}선에 점이 있습니다. 점 없이 선만 그립니다.",
                               f"Line {who}has no markers. To mark the points on a line, pass `markers=True` (for a go trace, `mode=\"lines+markers\"`)." if w else
                               f"Line {who}has markers. Draw the line without markers."))
                continue
            ko, en = TRACE_STYLES[key]
            dflt = lambda v: (L("없음", "none") if key == "patterns" else L("기본값", "default")) if v is None else _fmt(v)
            diffs.append(L(f"{who}트레이스의 {_iga(ko)} 다릅니다. 기대 {dflt(w)}, 내 그림 {dflt(g)}.",
                           f"The {en} of trace {who}differs. Expected {dflt(w)}, got {dflt(g)}." if name else
                           f"The trace {en} differs. Expected {dflt(w)}, got {dflt(g)}."))
    # 10장(2026-11-02): 패널마다 축, 범례 묶음, 날짜 축 탐색
    for key, (ko, en) in (("axis_titles", ("제목", "title")), ("axis_ranges", ("범위", "range")),
                          ("tickformats", ("눈금 표기(tickformat)", "tick format"))):
        if key not in want:
            continue
        multi = sum(r.startswith("x") for r in want[key]) > 1 or sum(r.startswith("y") for r in want[key]) > 1
        for ref, w in want[key].items():
            if ref not in got[key]:  # 내 그림에 그 패널의 축이 없다(2026-11-02 검토 L8: 말없이 건너뛰지 않는다)
                diffs.append(L(f"내 그림의 {_axis_word(ref, multi)}에 놓인 트레이스가 없습니다. 트레이스마다 `add_trace(..., row=, col=)`로 놓을 패널을 정합니다.",
                               f"No trace in your figure uses {_axis_word(ref, multi)}. Choose each trace's panel with `add_trace(..., row=, col=)`."))
                break
            g = got[key][ref]
            if _alike(w, g) or (key != "axis_ranges" and not w and not g):
                continue
            show = lambda v: (L("자동 범위", "automatic") if key == "axis_ranges" else L("없음", "none")) if v in (None, "") else _fmt(v)
            diffs.append(L(f"{_axis_word(ref, multi)} {_iga(ko)} 다릅니다. 기대 {show(w)}, 내 그림 {show(g)}.",
                           f"The {en} of {_axis_word(ref, multi)} differs. Expected {show(w)}, got {show(g)}."))
    if "legend_groups" in want:
        w, g = want["legend_groups"], got["legend_groups"]
        names = lambda ks: ", ".join(_key_label(k) for k in ks)
        if w["groups"] != g["groups"] and set(w["shown"]) == set(g["shown"]):  # 트레이스가 다르면 트레이스 비교가 알린다
            of = g.get("of") or {}
            split = next((grp for grp in w["groups"] if len({of.get(k, "") for k in grp}) > 1 or not of.get(grp[0])), None)
            if split is not None:
                now = "; ".join(f"{_key_label(k)} " + (repr(of[k]) if of.get(k) else L("묶음 없음", "no group")) for k in split)
                diffs.append(L(f"{names(split)} 트레이스를 같은 `legendgroup`으로 묶습니다(지금: {now}). "
                               "범례 항목 하나로 함께 숨길 트레이스에는 같은 `legendgroup`을 줍니다.",
                               f"Put traces {names(split)} in the same `legendgroup` (now: {now}). "
                               "Give the same `legendgroup` to the traces that one legend item should hide together."))
            else:
                merged = next((grp for grp in g["groups"] if not any(set(grp) <= set(x) for x in w["groups"])), g["groups"][0] if g["groups"] else [])
                diffs.append(L(f"{names(merged)} 트레이스가 한 범례 묶음에 있습니다. 묶음은 "
                               + " / ".join(f"[{names(grp)}]" for grp in w["groups"]) + "처럼 나눕니다.",
                               f"Traces {names(merged)} share one legend group. Split the groups as "
                               + " / ".join(f"[{names(grp)}]" for grp in w["groups"]) + "."))
        for k, shown in w["shown"].items():
            if k in g["shown"] and g["shown"][k] != shown:
                who = _key_label(k)
                diffs.append(L(f"{who} 트레이스가 범례에 보여야 하는데 보이지 않습니다. `showlegend=`로 정합니다.",
                               f"Trace {who} should appear in the legend, but it does not. Set it with `showlegend=`.") if shown else
                             L(f"{who} 트레이스가 범례에 보이지 않아야 하는데 보입니다. `showlegend=False`로 숨깁니다.",
                               f"Trace {who} should not appear in the legend, but it does. Hide it with `showlegend=False`."))
                break
    if "rangeslider" in want and want["rangeslider"] != got["rangeslider"]:
        diffs.append(L("X축 아래에 범위 슬라이더가 없습니다. `update_xaxes(rangeslider_visible=True)`로 붙입니다." if want["rangeslider"] else
                       "범위 슬라이더가 있습니다. 목표 그림에는 범위 슬라이더가 없습니다.",
                       "There is no range slider under the x-axis. Add one with `update_xaxes(rangeslider_visible=True)`." if want["rangeslider"] else
                       "There is a range slider, but the target figure has none."))
    if "rangeselector" in want and want["rangeselector"] != got["rangeselector"]:
        unit = lambda b: STEPS.get(b[1], (b[1], b[1]))
        how = lambda b: (L("전체", "all") if b[1] == "all" else L(f"{b[0]}{unit(b)[0]}", f"{b[0]} {unit(b)[1]}{'' if b[0] == 1 else 's'}")) + (
            "" if b[2] == "backward" else f", {b[2]}")
        btns = lambda bs: ", ".join(L(f"{_fmt(b[3])}({how(b)})", f"{_fmt(b[3])} ({how(b)})") for b in bs) or L("없음", "none")
        diffs.append(L(f"기간 버튼(rangeselector)이 다릅니다. 기대 {btns(want['rangeselector'])}, 내 그림 {btns(got['rangeselector'])}. "
                       "버튼은 `rangeselector=dict(buttons=[...])`에 놓일 차례대로 적습니다.",
                       f"The range selector buttons differ. Expected {btns(want['rangeselector'])}, got {btns(got['rangeselector'])}. "
                       "List the buttons in `rangeselector=dict(buttons=[...])` in the order they should appear."))
    diffs += _report_diffs(want, got)
    if "annotations" in want and not _alike(want["annotations"], got["annotations"]):
        wt, gt = [a[0] for a in want["annotations"]], [a[0] for a in got["annotations"]]
        if wt != gt:
            diffs.append(L(f"주석 글이 다릅니다. 기대 {_fmt(wt)}, 내 그림 {_fmt(gt)}.",
                           f"The annotation text differs. Expected {_fmt(wt)}, got {_fmt(gt)}."))
        else:
            for w, g in zip(want["annotations"], got["annotations"]):
                if _alike(w, g):
                    continue
                if _alike(w[1:3], g[1:3]):
                    has = lambda v: L("있음", "on") if v else L("없음", "off")
                    diffs.append(L(f"주석 '{w[0]}'의 화살표가 다릅니다. 기대 {has(w[3])}, 내 그림 {has(g[3])}. 화살표는 `showarrow=`로 정합니다.",
                                   f"The arrow of annotation '{w[0]}' differs. Expected {has(w[3])}, got {has(g[3])}. Set it with `showarrow=`."))
                    continue
                paper = lambda a: [str(v).startswith("paper:") for v in a[1:3]]
                arrow = "" if w[3] == g[3] else L(" 화살표 여부도 다릅니다.", " The arrow setting also differs.")
                if paper(w) == paper(g) == [True, True]:  # 둘 다 그림 영역 비율 좌표: 쪽(왼쪽 아래 등)이 다르다
                    diffs.append(L(f"주석 '{w[0]}'의 자리가 다릅니다. 기대 그림 영역의 {_spot_name(w)}, 내 그림 {_spot_name(g)}.{arrow} "
                                   "그림 영역 비율 좌표는 x가 0이면 왼쪽, 1이면 오른쪽이고, y가 0이면 아래, 1이면 위입니다.",
                                   f"Annotation '{w[0]}' is in a different place. Expected the {_spot_name(w)} of the plot area, "
                                   f"got the {_spot_name(g)}.{arrow} In paper coordinates, x = 0 is the left edge and 1 the right edge, "
                                   "and y = 0 is the bottom and 1 the top."))
                    continue
                coord = lambda v: _spot_word(v) if str(v).startswith("paper:") else _fmt(v)
                where = lambda a: f"({coord(a[1])}, {coord(a[2])})"
                hint = (L(" 그림 영역 비율 좌표는 `xref=\"paper\"`, `yref=\"paper\"`로 정합니다.",
                          " Paper coordinates are set with `xref=\"paper\"` and `yref=\"paper\"`.") if paper(w) != paper(g) else
                        L(" 데이터 좌표 주석의 x, y에는 가리킬 점의 축 값을 줍니다(행 번호가 아닙니다).",
                          " For an annotation in data coordinates, give x and y the axis values of the point (not a row number)."))
                diffs.append(L(f"주석 '{w[0]}'의 자리가 다릅니다. 기대 {where(w)}, 내 그림 {where(g)}.{arrow}{hint}",
                               f"Annotation '{w[0]}' points to a different place. Expected {where(w)}, got {where(g)}.{arrow}{hint}"))
    if "texts" in want and want["texts"] != got["texts"] and "annotations" not in want:
        diffs.append(L(f"주석 글이 다릅니다. 기대 {_fmt(want['texts'])}, 내 그림 {_fmt(got['texts'])}.",
                       f"The annotation text differs. Expected {_fmt(want['texts'])}, got {_fmt(got['texts'])}."))
    if "hlines" in want and not _alike(want["hlines"], got["hlines"]):
        diffs.append(L(f"가로 기준선이 다릅니다. 기대 {_fmt(want['hlines'])}, 내 그림 {_fmt(got['hlines'])}.",
                       f"The horizontal reference lines differ. Expected {_fmt(want['hlines'])}, got {_fmt(got['hlines'])}."))
    if "bar_text" in want and want["bar_text"] != got["bar_text"]:
        # 정답이 형식 없이 값만 적었으면(text_auto=True) 어떤 값 글이든 맞고, 형식이 있으면(text_auto=",") 화면에 보일 글이 같아야 한다
        is_val = lambda v: isinstance(v, dict)
        same = lambda w, g: w == g or (is_val(w) and is_val(g) and (w["fmt"] is None or w["labels"] == g["labels"]))
        bad = [(w, got["bar_text"].get(n)) for n, w in want["bar_text"].items() if not same(w, got["bar_text"].get(n))]
        fmt = next((w for w, _ in bad if is_val(w) and w["fmt"] is not None), None)
        auto = "`text_auto=True`" if fmt is None else L("`text_auto=`(예: `\",\"`)", "`text_auto=` (for example `\",\"`)")
        if any(g == "other" for _, g in bad):
            diffs.append(L(f"막대에 적은 글이 막대의 값이 아닙니다. 막대의 값을 적으려면 {auto}를 줍니다.",
                           f"The text on the bars is not the bar values. To show the values on the bars, pass {auto}."))
        elif fmt is not None and any(is_val(g) for _, g in bad):
            g = next(g for _, g in bad if is_val(g))
            comma = any("," in x for x in fmt["labels"]) and not any("," in x for x in g["labels"])
            diffs.append(L(f"막대 끝 값의 표기가 다릅니다. 기대 {_fmt(fmt['labels'][:3])}, 내 그림 {_fmt(g['labels'][:3])}."
                           + (" 천 단위 쉼표가 없습니다. `text_auto=\",\"`처럼 형식을 줍니다." if comma else ""),
                           f"The value labels on the bars are formatted differently. Expected {_fmt(fmt['labels'][:3])}, got {_fmt(g['labels'][:3])}."
                           + (" The thousands separators are missing. Give a format, as in `text_auto=\",\"`." if comma else "")))
        elif bad:
            diffs.append(L(f"막대 끝의 값 표시가 다릅니다. 막대에 값을 적으려면 {auto}를 줍니다.",
                           f"The value labels on the bars differ. To show the values on the bars, pass {auto}."))
    if "saved" in want and want["saved"] != got["saved"]:
        modes = {"inline": L("Plotly.js를 넣은 파일", "with Plotly.js inside"), "cdn": L("인터넷에서 Plotly.js를 받는 파일", "loading Plotly.js from the internet"),
                 "directory": L("옆 파일 plotly.min.js에서 Plotly.js를 읽는 파일", "loading Plotly.js from plotly.min.js next to it"),
                 "none": L("Plotly.js가 없는 파일", "without Plotly.js")}
        text = lambda items: ", ".join(f"{x[0]}({modes.get(x[1], x[1])})" if len(x) == 2 else x[0] for x in items) or L("없음", "none")
        # include_plotlyjs="directory"는 plotly.min.js를 따로 쓴다. 그 파일을 빼고 이름이 같으면 Plotly.js를 넣는 방식만 다른 것이다
        apart = any(len(x) == 2 and x[1] == "directory" for x in got["saved"])
        names = [x[0] for x in got["saved"] if not (apart and x[0].rsplit("/", 1)[-1] == "plotly.min.js")]
        mode_only = [x[0] for x in want["saved"]] == names
        diffs.append(L(f"저장한 HTML 파일이 다릅니다. 기대 {text(want['saved'])}, 내 코드 {text(got['saved'])}."
                       + (" 인터넷 없이 열리게 하려면 `include_plotlyjs=True`를 줍니다." if mode_only else " 파일 이름과 폴더를 봅니다.")
                       + (" `include_plotlyjs=\"directory\"`는 Plotly.js를 plotly.min.js라는 다른 파일로 따로 저장해서, "
                          "HTML 파일 하나만 옮기면 열리지 않습니다." if apart else ""),
                       f"The saved HTML files differ. Expected {text(want['saved'])}, got {text(got['saved'])}."
                       + (" To open the file without the internet, pass `include_plotlyjs=True`." if mode_only else
                          " Check the file name and folder.")
                       + (" `include_plotlyjs=\"directory\"` saves Plotly.js as a separate file, plotly.min.js, "
                          "so the HTML file does not open if you move it alone." if apart else "")))
    if "saved_names" in want and want["saved_names"] != got["saved_names"]:
        diffs.append(L(f"저장한 파일 이름이 다릅니다. 기대 {', '.join(want['saved_names']) or '없음'}, 내 코드 {', '.join(got['saved_names']) or '없음'}.",
                       f"The saved file names differ. Expected {_and(want['saved_names']) or 'none'}, got {_and(got['saved_names']) or 'none'}."))
    if want.get("saved_fig") is not None and got.get("saved_fig") is not None:
        inner = compare_plotly(want["saved_fig"], {**got["saved_fig"], "figures": 1, "saved": [], "saved_names": []})
        diffs += [L("저장한 HTML 파일의 그림: ", "In the saved HTML file: ") + d for d in inner if d not in diffs]
    files_only = set(want) - {"figures"} <= REPORT_ONLY  # 저장한 파일만 보는 문제(리포트)에는 show 안내를 붙이지 않는다
    if diffs and got.get("after_show") and not files_only:
        diffs.append(L("`fig.show()` 뒤에 그림을 고쳤습니다. 고친 것은 띄운 그림에 남지 않으므로 다 고친 뒤에 show()를 부릅니다.",
                       "You changed the figure after `fig.show()`. Changes after show() are not in the figure shown, "
                       "so call show() after all your changes."))
    if diffs and got["figures"] > 1 and not files_only:
        diffs.append(L(f"`fig.show()`를 {got['figures']}번 불렀습니다. 마지막에 띄운 그림만 채점합니다.",
                       f"You called `fig.show()` {got['figures']} times. Only the last figure shown is graded."))
    return diffs


# ------------------------------------------------------------------ Streamlit 앱(시각화 과목 11장, 2026-11-02)
# 브라우저 안의 파이썬에서는 Streamlit 서버가 돌지 않는다. 그래서 st의 함수 이름과 쓰는 법만 같은 작은 대역을 넣고,
# 테스트마다 위젯 값을 정해 앱 파일을 위에서 아래로 한 번 실행한다(위젯을 바꿀 때마다 파일 전체를 다시 실행하는 Streamlit과 같다).
# 대역은 화면에 놓인 것(제목, 위젯, 지표 카드, 알림, 표, 차트, 내려받기 단추)을 차례대로 적어 두고, 채점은 그 목록을 정답 앱의
# 목록과 비교한다. Streamlit의 코드는 한 줄도 쓰지 않는다(이름만 같은 대역).
APP_FIELDS = ("widgets", "metrics", "alerts", "tables", "charts", "texts", "downloads", "layout")
WIDGET_KINDS = {"multiselect": ("여럿 고르기(multiselect)", "multiselect"), "slider": ("슬라이더(slider)", "slider"),
                "selectbox": ("하나 고르기(selectbox)", "selectbox"), "radio": ("라디오 단추(radio)", "radio"),
                "checkbox": ("체크 상자(checkbox)", "checkbox"), "toggle": ("켜고 끄기(toggle)", "toggle"),
                "button": ("단추(button)", "button"), "text_input": ("글 입력(text_input)", "text_input"),
                "number_input": ("수 입력(number_input)", "number_input")}
TEXT_KINDS = {"title": ("제목(title)", "title"), "header": ("머리글(header)", "header"), "subheader": ("소제목(subheader)", "subheader"),
              "caption": ("캡션(caption)", "caption"), "markdown": ("글(markdown)", "markdown"), "write": ("글(write)", "write"),
              "text": ("글(text)", "text")}
MAX_ELEMENTS = 1000  # 앱 화면에 놓을 수 있는 것의 수(if 대신 while을 쓴 앱이 화면을 수십만 개로 채우지 않게)


class _StopApp(BaseException):
    """st.stop(): 이번 실행을 여기서 멈춘다(학생 코드의 except Exception이 잡지 못하게 BaseException)."""


class StreamlitDuplicateElementId(Exception):
    """같은 위젯을 두 번 만듦. 진짜 Streamlit의 오류와 이름을 같게 했다."""


class _State(dict):
    """st.session_state: 사전처럼도, 속성처럼도 읽고 쓴다."""

    def __getattr__(self, k):
        try:
            return self[k]
        except KeyError:
            raise AttributeError(k) from None

    def __setattr__(self, k, v):
        self[k] = v


def _no_streamlit(name):
    return AttributeError(L(f"이 연습의 Streamlit 대역에는 `st.{name}`이 없습니다. 수업에서 쓴 함수(제목, 위젯, 지표 카드, 알림, 표, 차트, "
                            "내려받기, 배치)로 만듭니다.",
                            f"The Streamlit stand-in on this site has no `st.{name}`. Use the functions from class (titles, widgets, "
                            "metrics, alerts, tables, charts, downloads, layout)."))


def _is_frame(v):
    mod = sys.modules.get("pandas")
    return bool(mod) and isinstance(v, (mod.DataFrame, mod.Series))


def _is_styler(v):
    return type(v).__name__ == "Styler" and hasattr(v, "data")  # df.style로 꾸민 표


def _jsonable(v):
    if isinstance(v, dict):
        return {str(k): _jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_jsonable(x) for x in v]
    if v is None or isinstance(v, (bool, str)):
        return v
    if isinstance(v, int) and not isinstance(v, bool):
        return v
    kind = getattr(getattr(v, "dtype", None), "kind", "")
    if kind in ("i", "u"):  # numpy 정수는 정수로(화면에 'Month 1.0'이 아니라 'Month 1')
        return int(v)
    if kind == "b":
        return bool(v)
    return _pv(v)


def _shown_index(idx):
    """화면에서 뜻이 있는 행 이름인지: 이름이 붙었거나(set_index, groupby의 결과) 값이 정수가 아니다(글자, 날짜)."""
    return any(n is not None for n in idx.names) or idx.dtype.kind not in "iu"


def _frame(data):
    import pandas as pd
    if _is_styler(data):
        data = data.data
    return data.to_frame() if isinstance(data, pd.Series) else data if isinstance(data, pd.DataFrame) else pd.DataFrame(data)


def _table(data, limit=200, hide_index=None):
    """표 요약: 열 이름, 앞의 limit행 값, 행 수. 뜻이 있는 행 이름(groupby로 만든 표 등)은 화면처럼 맨 앞 열로 넣는다
    (그래서 as_index=False로 만든 표와 같은 요약이 된다). hide_index=True면 넣지 않는다."""
    try:
        df = _frame(data)
        if hide_index is not True and _shown_index(df.index):
            try:
                df = df.reset_index()
            except ValueError:  # 행 이름과 같은 이름의 열이 이미 있다
                pass
    except Exception:  # noqa: BLE001 - 표로 바꿀 수 없는 것
        return {"columns": [], "rows": [], "n": 0}
    return {"columns": [str(c) for c in df.columns], "n": int(len(df)),
            "rows": [[_pv(v) for v in row] for row in df.head(limit).itertuples(index=False, name=None)]}


def _chart_series(data, x=None, y=None, color=None):
    """st.line_chart, st.bar_chart 등이 그리는 계열: {계열 이름: [[x, y], ...]}. Streamlit처럼 x를 주지 않으면 행 이름이
    X축이고, y를 주지 않으면 x와 color를 뺀 열이 모두 계열이다. color에 열 이름을 주면 그 열의 값마다 계열을 나눈다.
    Streamlit의 차트는 X 값 차례로 그리므로 짝을 정렬해 둔다."""
    try:
        df = _frame(data)
        xs = list(df.index) if x is None else list(df[x])
        ycols = [c for c in df.columns if c not in (x, color)] if y is None else [y] if isinstance(y, str) else list(y)
        groups = [(None, [True] * len(df))]
        if isinstance(color, str) and color in df.columns:
            groups = [(v, list(df[color] == v)) for v in dict.fromkeys(df[color])]
        out = {}
        for c in ycols:
            for v, mask in groups:
                name = str(c) if v is None else str(v) if len(ycols) == 1 else f"{v}, {c}"
                pairs = [[_pv(a), _pv(b)] for a, b, m in zip(xs, df[c], mask) if m]
                out[name] = sorted(pairs, key=lambda q: (_sort_key(q[0]), _sort_key(q[1])))
        return out
    except Exception:  # noqa: BLE001 - 차트로 그릴 수 없는 것
        return {}


def _download_text(data):
    if isinstance(data, bytes):
        return data.decode("utf-8-sig", errors="replace")
    if hasattr(data, "getvalue"):
        return _download_text(data.getvalue())
    if _is_frame(data):
        return data.to_csv(index=False)
    return str(data).removeprefix("﻿")


def _download_bom(data):
    """내려받을 파일이 엑셀용 BOM(EF BB BF)으로 시작하는가. 글자(str)는 Streamlit이 UTF-8로 바꿔 내보내므로 맨 앞이 \\ufeff일 때만이다.
    2026-11-02 학생처럼 풀기·돌연변이 시험: encode("utf-8-sig")를 빼도 통과해 넣었다."""
    if isinstance(data, bytes):
        return data.startswith(b"\xef\xbb\xbf")
    if hasattr(data, "getvalue"):
        return _download_bom(data.getvalue())
    return isinstance(data, str) and data.startswith("﻿")


def _raw(options):
    try:
        return list(options)
    except TypeError:
        return [options]


def _opt(o):
    """고를 수 있는 값 하나를 요약에 쓸 모양으로(numpy 정수는 정수, 날짜는 '2026-01-01' 같은 글자)."""
    if o is None or isinstance(o, (bool, str, int)):
        return o
    return _jsonable(o)


def _widget_value(kind, v, options, default):
    """테스트가 정한 위젯 값을 그 위젯이 받을 수 있는지 보고 돌려줄 값을 정한다. 받을 수 없으면 (처음 값, False).
    예: 값 하나짜리 슬라이더에 범위 [8, 12], 고를 수 있는 값에 없는 이름(진짜 Streamlit에서는 고를 수 없는 상태)."""
    num = lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)
    if kind == "slider":
        if isinstance(default, tuple):
            return (tuple(v), True) if isinstance(v, (list, tuple)) and len(v) == 2 else (default, False)
        return (v, True) if num(v) else (default, False)
    if kind == "number_input":
        return (v, True) if num(v) else (default, False)
    if kind == "multiselect":
        if not isinstance(v, (list, tuple)):
            return default, False
        keep = [x for x in v if x in options]
        return keep, len(keep) == len(v)
    if kind in ("selectbox", "radio"):
        return (v, True) if v in options else (default, False)
    if kind in ("checkbox", "toggle", "button"):
        return (v, True) if isinstance(v, bool) else (default, False)
    if kind == "text_input":
        return (v, True) if isinstance(v, str) else (default, False)
    return v, True


def _pyplot_snapshot(fig):
    """st.pyplot을 부른 순간의 그림: 막대·선 값(채점)과 PNG(화면). 뒤에서 그림을 지우거나 고쳐도 남는다."""
    import base64
    try:
        fig.canvas.draw()
        axes = [axes_summary(ax) for ax in _ordered_axes(fig)]
    except Exception:  # noqa: BLE001
        axes = []
    buf = io.BytesIO()
    try:
        _mpl.get("savefig", type(fig).savefig)(fig, buf, format="png", dpi=80, bbox_inches="tight", metadata={"Software": None})
        png = base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:  # noqa: BLE001
        png = None
    return axes, png


def _cache(func=None, **kwargs):
    """@st.cache_data, @st.cache_data(...): 함수를 그대로 돌려준다(대역은 매번 새로 실행하므로 캐시가 필요 없다)."""
    def wrap(f):
        try:
            f.clear = lambda *a, **k: None
        except AttributeError:
            pass
        return f
    return wrap(func) if callable(func) else wrap


class _Block:
    """st, st.sidebar, st.columns()의 칸처럼 요소를 놓는 자리. with 블록 안에서 부른 st.*는 그 자리에 놓인다.
    요소마다 화면 차례 열쇠(_key)와 자리(place)를 붙인다. 열쇠는 이 자리가 바깥 자리의 몇 번째에 놓였는지와 그 안의
    차례라, 칸을 오른쪽부터 채워도 화면처럼 왼쪽 칸이 먼저 온다(app_summary가 이 열쇠로 정렬한다). 자리는 'main/col1of3'처럼
    본문·사이드바와 칸, 탭, 펼침 상자를 적는다(배치 칸 layout)."""

    def __init__(self, app, where, key=None, single=False, place=None):
        self._app, self._where = app, where
        self._key = (where,) if key is None else key
        self._place = where if place is None else place
        self._n = 0
        self._single = single  # st.empty(): 새로 놓으면 앞의 것을 바꾼다

    def __enter__(self):
        self._app["stack"].append(self)
        return self

    def __exit__(self, *exc):
        self._app["stack"].pop()
        return False

    def __getattr__(self, name):
        raise _no_streamlit(name)

    def _slot(self):
        self._n += 1
        return self._key + (self._n,)

    def _child(self, where, key, place, single=False):
        return type(self)(self._app, where, key, single, place)

    def _add(self, t, **item):
        app = self._app
        if app["stopping"]:  # except로 삼킨 st.stop() 뒤: 진짜 Streamlit처럼 다음 st 호출에서 다시 멈춘다
            raise _StopApp()
        els = app["elements"]
        if len(els) >= MAX_ELEMENTS:
            raise RuntimeError(L(f"앱 화면에 놓인 것이 {MAX_ELEMENTS:,}개를 넘었습니다. 반복문 안에서 st 함수를 부르는지(if 대신 while을 썼는지) 봅니다.",
                                 f"The app put more than {MAX_ELEMENTS:,} things on the screen. Check whether you call st functions "
                                 "inside a loop (for example, while instead of if)."))
        if self._single:
            els[:] = [e for e in els if e["_in"] != id(self)]
        els.append({"t": t, "where": self._where, "place": self._place, "_key": self._slot(), "_in": id(self), **item})

    def _widget(self, kind, label, options=None, default=None, key=None, raw=None):
        """위젯을 놓고 이번 실행의 값을 돌려준다. options는 요약에 쓸 모양이고, raw는 학생이 넘긴 그대로의 값이다
        (고른 값을 돌려줄 때는 raw의 것을 돌려준다. numpy 정수나 날짜를 그대로 쓰는 코드가 진짜처럼 돌게)."""
        label = str(label)
        app = self._app
        ident = ("key", str(key)) if key is not None else (self._where.split("/")[0], kind, label, repr(options), repr(default))
        if ident in app["idents"]:
            raise StreamlitDuplicateElementId(L(
                f"같은 위젯을 두 번 만들었습니다(이름 '{label}'). 진짜 Streamlit에서도 오류가 납니다. 위젯은 한 번만 만들고 돌려받은 값을 씁니다.",
                f"You created the same widget twice (label '{label}'). Real Streamlit raises an error too. "
                "Create each widget once and use the value it returns."))
        app["idents"].add(ident)
        value = default
        if label in app["values"]:  # 테스트가 정한 값. 이 위젯이 받을 수 없는 값이면 처음 값을 두고 적어 둔다
            given = app["values"][label]
            app["used"].add(label)
            value, ok = _widget_value(kind, given, options, default)
            if not ok:
                app["rejected"].append([label, _jsonable(given)])
        if raw is not None:
            back = lambda v: raw[options.index(v)] if v in options else v
            value = [back(v) for v in value] if kind == "multiselect" else back(value)
        self._add("widget", kind=kind, label=label, options=options, default=default, value=value)
        if key is not None:
            app["state"][key] = value
        return value

    # 글
    def title(self, body, *a, **k):
        self._add("title", text=str(body))

    def header(self, body, *a, **k):
        self._add("header", text=str(body))

    def subheader(self, body, *a, **k):
        self._add("subheader", text=str(body))

    def caption(self, body, *a, **k):
        self._add("caption", text=str(body))

    def markdown(self, body, *a, **k):
        self._add("markdown", text=str(body))

    def text(self, body, *a, **k):
        self._add("text", text=str(body))

    def code(self, body, *a, **k):
        self._add("code", text=str(body))

    def divider(self, *a, **k):
        self._add("divider")

    def write(self, *args, **k):
        for v in args:
            if _is_frame(v) or _is_styler(v):
                self.dataframe(v)
            elif _is_plotly_figure(v):
                self.plotly_chart(v)
            elif hasattr(v, "savefig") and hasattr(v, "axes"):  # Matplotlib Figure
                self.pyplot(v)
            else:
                self._add("write", text=str(v))

    # 숫자, 표, 차트
    def metric(self, label, value, delta=None, *a, **k):
        self._add("metric", label=str(label), value="" if value is None else str(value), delta=None if delta is None else str(delta))

    def dataframe(self, data=None, *a, **k):
        self._add("table", table=_table(data, hide_index=k.get("hide_index")))

    def table(self, data=None, *a, **k):
        self._add("table", table=_table(data))

    def plotly_chart(self, figure_or_data, *a, **k):
        self._add("plotly", fig=_freeze(figure_or_data))

    def pyplot(self, fig=None, *a, clear_figure=None, **k):
        plt = pyplot()
        given = fig
        if fig is None or fig is plt:  # st.pyplot(), st.pyplot(plt): 지금 그림
            fig = plt.gcf()
        axes, png = _pyplot_snapshot(fig)
        self._add("pyplot", axes=axes, png=png)
        if clear_figure or (clear_figure is None and (given is None or given is plt)):  # 진짜처럼 지금 그림을 그린 뒤 지운다
            fig.clear()

    def _chart(self, kind, data, x, y, color):
        self._add("chart", kind=kind, table=_table(data), series=_chart_series(data, x, y, color))

    def line_chart(self, data=None, x=None, y=None, color=None, *a, **k):
        self._chart("line_chart", data, x, y, color)

    def bar_chart(self, data=None, x=None, y=None, color=None, *a, **k):
        self._chart("bar_chart", data, x, y, color)

    def area_chart(self, data=None, x=None, y=None, color=None, *a, **k):
        self._chart("area_chart", data, x, y, color)

    def scatter_chart(self, data=None, x=None, y=None, color=None, *a, **k):
        self._chart("scatter_chart", data, x, y, color)

    # 알림
    def success(self, body, *a, **k):
        self._add("alert", level="success", text=str(body))

    def info(self, body, *a, **k):
        self._add("alert", level="info", text=str(body))

    def warning(self, body, *a, **k):
        self._add("alert", level="warning", text=str(body))

    def error(self, body, *a, **k):
        self._add("alert", level="error", text=str(body))

    def exception(self, e, *a, **k):
        self._add("alert", level="error", text=str(e))

    # 내려받기
    def download_button(self, label, data, file_name=None, mime=None, *a, **k):
        self._add("download", label=str(label), file_name=None if file_name is None else str(file_name),
                  mime=mime, data=_download_text(data), _bom=_download_bom(data))
        return False

    # 위젯
    def multiselect(self, label, options, default=None, *a, key=None, **k):
        raw = _raw(options)
        default = [] if default is None else [default] if isinstance(default, (str, int)) else list(default)
        return self._widget("multiselect", label, [_opt(o) for o in raw], [_opt(o) for o in default], key, raw)

    def slider(self, label, min_value=None, max_value=None, value=None, step=None, *a, key=None, **k):
        if value is None:
            value = min_value if min_value is not None else 0
        return self._widget("slider", label, [min_value, max_value], tuple(value) if isinstance(value, list) else value, key)

    def selectbox(self, label, options, index=0, *a, key=None, **k):
        raw = _raw(options)
        opts = [_opt(o) for o in raw]
        return self._widget("selectbox", label, opts, opts[index] if opts and index is not None else None, key, raw)

    def radio(self, label, options, index=0, *a, key=None, **k):
        raw = _raw(options)
        opts = [_opt(o) for o in raw]
        return self._widget("radio", label, opts, opts[index] if opts and index is not None else None, key, raw)

    def checkbox(self, label, value=False, *a, key=None, **k):
        return self._widget("checkbox", label, None, bool(value), key)

    def toggle(self, label, value=False, *a, key=None, **k):
        return self._widget("toggle", label, None, bool(value), key)

    def button(self, label, *a, key=None, **k):
        return self._widget("button", label, None, False, key)

    def text_input(self, label, value="", *a, key=None, **k):
        return self._widget("text_input", label, None, value, key)

    def number_input(self, label, min_value=None, max_value=None, value=None, *a, key=None, **k):
        if value is None:
            value = min_value if min_value is not None else 0
        return self._widget("number_input", label, [min_value, max_value], value, key)

    # 배치
    def columns(self, spec, *a, **k):
        n = spec if isinstance(spec, int) else len(spec)
        self._app["cols"] = self._app.get("cols", 0) + 1  # 화면이 같은 st.columns()로 만든 칸끼리 나란히 놓게(main/c1.1, main/c1.2)
        at = self._slot()
        return [self._child(f"{self._where}/c{self._app['cols']}.{i + 1}", at + (i,), f"{self._place}/col{i + 1}of{n}") for i in range(n)]

    def tabs(self, labels, *a, **k):
        at = self._slot()
        return [self._child(f"{self._where}/{t}", at + (i,), f"{self._place}/tab:{t}") for i, t in enumerate(labels)]

    def container(self, *a, **k):
        return self._child(self._where, self._slot(), self._place)

    def expander(self, label="", *a, **k):
        return self._child(self._where, self._slot(), f"{self._place}/exp:{label}")

    def empty(self, *a, **k):
        return self._child(self._where, self._slot(), self._place, single=True)


def _make_streamlit(values):
    """학생 앱이 import streamlit as st로 받을 대역 모듈과, 화면에 놓인 것을 적어 둘 상태."""
    app = {"elements": [], "stack": [], "values": dict(values or {}), "page": {}, "used": set(), "rejected": [],
           "idents": set(), "stopping": False, "state": _State()}
    block = type("_Block", (_Block,), {})  # 실행마다 새 클래스: 학생 코드가 대역에 붙인 것이 다음 실행에 남지 않게
    main = block(app, "main")
    mod = types.ModuleType("streamlit")
    mod.__file__ = "<practice-streamlit>"
    mod.__version__ = "practice"  # 진짜 Streamlit이 아니라 이 사이트의 대역이다

    def route(name):
        def call(*args, **kwargs):
            return getattr(app["stack"][-1] if app["stack"] else main, name)(*args, **kwargs)
        call.__name__ = name
        return call
    for name in [n for n in vars(_Block) if not n.startswith("_")]:
        setattr(mod, name, route(name))

    def stop():
        app["stopping"] = True
        raise _StopApp()

    def missing(name):
        raise _no_streamlit(name)
    mod.sidebar = block(app, "sidebar")
    mod.session_state = app["state"]
    mod.cache_data = mod.cache_resource = _cache
    mod.set_page_config = lambda *a, **k: app["page"].update({k2: str(v) for k2, v in k.items()})
    mod.stop = stop
    mod.__getattr__ = missing
    return mod, app


def _layout_name(e):
    """배치 칸에서 요소를 가리킬 이름."""
    t = e["t"]
    if t in ("widget", "metric"):
        return e["label"]
    if t == "alert" or t in TEXT_KINDS:
        return e.get("text", "")
    if t == "table":
        return ", ".join(e["table"]["columns"])
    if t == "chart":
        return e["kind"]
    if t == "download":
        return e.get("file_name") or ""
    return ""


def app_summary(app, stopped):
    """대역이 적어 둔 화면을 채점할 모양으로 정리한다(차례는 화면에 놓인 차례, _Block의 열쇠).
    rejected는 위젯이 받지 못한 테스트 값, unused는 테스트가 정했는데 앱에 그 이름의 위젯이 없던 값이다."""
    els = sorted(app["elements"], key=lambda e: e["_key"])
    charts = []
    for e in els:
        if e["t"] == "plotly":
            fig = e["fig"]
            charts.append({"kind": "plotly", "traces": [_trace_summary(t) for t in fig.data] if _is_plotly_figure(fig) else []})
        elif e["t"] == "pyplot":
            axes = e["axes"]
            charts.append({"kind": "pyplot", "bars": axes[0]["bars"] if axes else [], "lines": axes[0]["lines"] if axes else []})
        elif e["t"] == "chart":
            charts.append({"kind": e["kind"], "series": e["series"]})
    return _jsonable({
        "stopped": bool(stopped), "rejected": app["rejected"], "unused": sorted(set(app["values"]) - app["used"]),
        "widgets": [[w["where"].split("/")[0], w["kind"], w["label"], w["options"], w["default"]] for w in els if w["t"] == "widget"],
        "metrics": [[e["label"], e["value"]] for e in els if e["t"] == "metric"],
        "alerts": [[e["level"], e["text"]] for e in els if e["t"] == "alert"],
        "tables": [e["table"] for e in els if e["t"] == "table"],
        "charts": charts,
        "texts": [[e["t"], e["text"]] for e in els if e["t"] in TEXT_KINDS],
        # [파일 이름, 파일 종류, 내용, 엑셀용 BOM, 단추 이름]. 뒤의 둘은 2026-11-02 돌연변이 시험에서 더함
        "downloads": [[e["file_name"], e["mime"], e["data"], e["_bom"], e["label"]] for e in els if e["t"] == "download"],
        "layout": [[e["t"], _layout_name(e), e["place"]] for e in els if e["t"] != "divider"]})


def app_view(app, stopped):
    """화면(app.js)이 앱 모양으로 그릴 목록. Plotly 차트는 Figure JSON, Matplotlib 차트는 st.pyplot을 부른 때의 PNG로 담는다."""
    out = []
    for e in sorted(app["elements"], key=lambda e: e["_key"]):
        item = {k: v for k, v in e.items() if k not in ("fig", "data", "axes", "series") and not k.startswith("_")}
        if e["t"] == "plotly":
            item["fig"] = e["fig"].to_json() if _is_plotly_figure(e["fig"]) else None
        elif e["t"] in ("table", "chart"):
            item["table"] = {**e["table"], "rows": e["table"]["rows"][:12]}
        elif e["t"] == "download":
            item["lines"] = len(e["data"].splitlines())
        out.append(item)
    return _jsonable({"elements": out, "stopped": bool(stopped), "page": app["page"]})


def app_subset(summary, check):
    """채점할 칸만 남긴다. 앱이 멈췄는지(stopped)와 정답 앱에도 없던 위젯 이름(unused)은 늘 둔다."""
    return {"stopped": summary["stopped"], "unused": summary["unused"], **{k: summary[k] for k in APP_FIELDS if k in check}}


def _wk(k):
    return L(*WIDGET_KINDS[k]) if k in WIDGET_KINDS else k


def _table_diffs(w, g, head):
    if w["columns"] != g["columns"]:
        return [L(f"{head}표의 열이 다릅니다. 기대 {_fmt(w['columns'])}, 내 앱 {_fmt(g['columns'])}.",
                  f"{head}The table columns differ. Expected {_fmt(w['columns'])}, got {_fmt(g['columns'])}.")]
    if w["n"] != g["n"]:
        return [L(f"{head}표의 행 수가 다릅니다. 기대 {w['n']}행, 내 앱 {g['n']}행. 고른 행(`view`)을 보였는지 봅니다.",
                  f"{head}The number of table rows differs. Expected {w['n']}, got {g['n']}. Check that you showed the selected rows (`view`).")]
    for i, (a, b) in enumerate(zip(w["rows"], g["rows"])):
        if not _alike(a, b):
            return [L(f"{head}표의 {i + 1}행이 다릅니다. 기대 {_fmt(a)}, 내 앱 {_fmt(b)}.",
                      f"{head}Row {i + 1} of the table differs. Expected {_fmt(a)}, got {_fmt(b)}.")]
    return []


def _el_name(t, name):
    """배치 메시지에서 요소를 부르는 말."""
    if t == "widget":
        return L(f"위젯 '{name}'", f"widget '{name}'")
    if t == "metric":
        return L(f"지표 카드 '{name}'", f"metric '{name}'")
    if t in TEXT_KINDS:
        ko, en = TEXT_KINDS[t]
        return L(f"{ko} '{name}'", f"{en} '{name}'")
    if t == "alert":
        return L(f"알림 '{name}'", f"alert '{name}'")
    if t == "table":
        return L(f"표({name})", f"table ({name})")
    if t == "chart":
        return f"st.{name}"
    if t == "plotly":
        return L("Plotly 차트(st.plotly_chart)", "Plotly chart (st.plotly_chart)")
    if t == "pyplot":
        return L("Matplotlib 그림(st.pyplot)", "Matplotlib figure (st.pyplot)")
    if t == "download":
        return L(f"내려받기 단추({name})", f"download button ({name})")
    return t


def _place_text(place):
    """'main/col1of3' → '본문 › 3칸 가운데 1번째 칸'."""
    out = []
    for i, part in enumerate(place.split("/")):
        col = re.fullmatch(r"col(\d+)of(\d+)", part)
        if i == 0:
            out.append(L("사이드바", "sidebar") if part == "sidebar" else L("본문", "main area"))
        elif col:
            out.append(L(f"{col.group(2)}칸 가운데 {col.group(1)}번째 칸", f"column {col.group(1)} of {col.group(2)}"))
        elif part.startswith("tab:"):
            out.append(L(f"'{part[4:]}' 탭", f"tab '{part[4:]}'"))
        elif part.startswith("exp:"):
            out.append(L(f"'{part[4:]}' 펼침 상자", f"expander '{part[4:]}'"))
    return " › ".join(out)


def compare_app(want, got):
    """기대한 앱 화면(빌드가 정답 앱으로 만든 값)과 학생 앱 화면을 칸마다 비교해 다른 점을 말로 돌려준다."""
    diffs = []
    for label, value in got.get("rejected") or []:
        diffs.append(L(f"이름이 '{label}'인 위젯이 채점할 때 넣는 값을 받지 못했습니다(넣은 값 {_fmt(value)}). "
                       "위젯 종류(범위 슬라이더인지 등)와 고를 수 있는 값을 지문과 맞춥니다.",
                       f"Widget '{label}' could not take the value used in grading ({_fmt(value)}). "
                       "Match the widget type (for example, a range slider) and its choices to the problem."))
    named = {w[2] for w in want.get("widgets") or []}  # 위젯 칸을 보면 아래 '위젯이 없습니다'가 알린다
    for label in [x for x in got.get("unused") or [] if x not in (want.get("unused") or []) and x not in named]:
        diffs.append(L(f"채점할 때 위젯 '{label}'의 값을 바꾸는데, 내 앱에는 그 이름의 위젯이 없습니다. 위젯 이름(첫 인자)을 지문과 똑같이 씁니다.",
                       f"Grading sets widget '{label}', but your app has no widget with that label. Use the label from the problem as the first argument."))
    if want["stopped"] != got["stopped"]:
        diffs.append(L("이 테스트에서는 앱이 `st.stop()`으로 멈춰야 하는데 끝까지 실행됐습니다. "
                       "멈추는 조건(빈 선택, 빈 표 등)을 확인하는 `if` 문을 봅니다."
                       if want["stopped"] else "이 테스트에서는 앱이 끝까지 실행돼야 하는데 `st.stop()`으로 멈췄습니다. 멈추는 조건을 봅니다.",
                       "In this test the app should stop with `st.stop()`, but it ran to the end. Check the `if` statement "
                       "that decides when to stop (an empty selection, an empty table, and so on)." if want["stopped"] else
                       "In this test the app should run to the end, but it stopped with `st.stop()`. Check the condition for stopping."))
    if "widgets" in want:
        got_by = {w[2]: w for w in got["widgets"]}
        for w in want["widgets"]:
            g = got_by.get(w[2])
            if g is None:
                diffs.append(L(f"이름이 '{w[2]}'인 위젯이 없습니다. 위젯 이름(첫 인자)을 지문과 똑같이 씁니다.",
                               f"There is no widget labeled '{w[2]}'. Use the label from the problem as the first argument."))
            elif g[1] != w[1]:
                diffs.append(L(f"이름이 '{w[2]}'인 위젯은 {_eoya(_wk(w[1]))} 하는데 {_wk(g[1])}입니다.",
                               f"Widget '{w[2]}' should be a {_wk(w[1])}, but it is a {_wk(g[1])}."))
            elif g[0] != w[0]:
                diffs.append(L(f"위젯 '{w[2]}'의 자리가 다릅니다. " + ("사이드바에 두려면 `st.sidebar.`로 만듭니다." if w[0] == "sidebar" else "본문에 둡니다."),
                               f"Widget '{w[2]}' is in a different place. " + ("To put it in the sidebar, create it with `st.sidebar.`."
                                                                                if w[0] == "sidebar" else "Put it in the main area.")))
            elif not _alike(g[3], w[3]):
                diffs.append(L(f"위젯 '{w[2]}'의 고를 수 있는 값이 다릅니다. 기대 {_fmt(w[3])}, 내 앱 {_fmt(g[3])}.",
                               f"The choices of widget '{w[2]}' differ. Expected {_fmt(w[3])}, got {_fmt(g[3])}."))
            elif not _alike(g[4], w[4]):
                diffs.append(L(f"위젯 '{w[2]}'의 처음 값이 다릅니다. 기대 {_fmt(w[4])}, 내 앱 {_fmt(g[4])}.",
                               f"The starting value of widget '{w[2]}' differs. Expected {_fmt(w[4])}, got {_fmt(g[4])}."))
    if "metrics" in want and want["metrics"] != got["metrics"]:
        got_by = {m[0]: m[1] for m in got["metrics"]}
        shown = False
        for label, value in want["metrics"]:
            if label not in got_by:
                diffs.append(L(f"이름이 '{label}'인 지표 카드가 없습니다. 내 앱의 카드: {_fmt([m[0] for m in got['metrics']])}.",
                               f"There is no metric labeled '{label}'. Your metrics: {_fmt([m[0] for m in got['metrics']])}."))
                shown = True
            elif got_by[label] != value:
                diffs.append(L(f"지표 카드 '{label}'의 값이 다릅니다. 기대 {_fmt(value)}, 내 앱 {_fmt(got_by[label])}.",
                               f"The value of metric '{label}' differs. Expected {_fmt(value)}, got {_fmt(got_by[label])}."))
                shown = True
        names = [m[0] for m in got["metrics"]]
        if not shown and want["metrics"]:
            diffs.append(L(f"지표 카드가 다릅니다. 기대 {_fmt([m[0] for m in want['metrics']])}, 내 앱 {_fmt(names)}.",
                           f"The metrics differ. Expected {_fmt([m[0] for m in want['metrics']])}, got {_fmt(names)}."))
        elif not shown and not (want["stopped"] and not got["stopped"]):  # 멈추지 않아 생긴 카드는 위의 st.stop() 말로 충분하다
            diffs.append(L(f"이 테스트에서는 지표 카드가 없어야 하는데 내 앱에 {_fmt(names)} 카드가 있습니다.",
                           f"There should be no metric in this test, but your app shows {_fmt(names)}."))
    if "alerts" in want and want["alerts"] != got["alerts"]:
        wt, gt = [a[1] for a in want["alerts"]], [a[1] for a in got["alerts"]]
        if not want["alerts"]:
            diffs.append(L(f"이 테스트에서는 알림이 없어야 하는데 알림이 나왔습니다: {_fmt(gt)}.",
                           f"There should be no alert in this test, but the app showed {_fmt(gt)}."))
        elif wt != gt:
            diffs.append(L(f"알림 글이 다릅니다. 기대 {_fmt(wt)}, 내 앱 {_fmt(gt)}.",
                           f"The alert text differs. Expected {_fmt(wt)}, got {_fmt(gt)}."))
        else:
            wk, gk = [a[0] for a in want["alerts"]], [a[0] for a in got["alerts"]]
            first = next((w for w, g in zip(wk, gk) if w != g), wk[0])
            diffs.append(L(f"알림 종류가 다릅니다. 기대 {_fmt(wk)}, 내 앱 {_fmt(gk)}. 이 알림은 `st.{first}()`로 띄웁니다.",
                           f"The alert type differs. Expected {_fmt(wk)}, got {_fmt(gk)}. Show this alert with `st.{first}()`."))
    if "tables" in want:
        if len(want["tables"]) != len(got["tables"]):
            diffs.append(L(f"표가 {len(want['tables'])}개여야 하는데 {len(got['tables'])}개입니다.",
                           f"Expected {_n(len(want['tables']), 'table')}, got {len(got['tables'])}."))
        else:
            for w, g in zip(want["tables"], got["tables"]):
                diffs += _table_diffs(w, g, "")
    if "charts" in want:
        if [c["kind"] for c in want["charts"]] != [c["kind"] for c in got["charts"]]:
            names = {"plotly": "st.plotly_chart", "pyplot": "st.pyplot"}
            kinds = lambda cs: [names.get(c["kind"], "st." + c["kind"]) for c in cs]
            diffs.append(L(f"차트가 다릅니다. 기대 {_fmt(kinds(want['charts']))}, 내 앱 {_fmt(kinds(got['charts']))}.",
                           f"The charts differ. Expected {_fmt(kinds(want['charts']))}, got {_fmt(kinds(got['charts']))}."))
        else:
            many = len(want["charts"]) > 1
            for i, (w, g) in enumerate(zip(want["charts"], got["charts"])):
                head = L(f"{i + 1}번째 차트: ", f"Chart {i + 1}: ") if many else L("차트: ", "Chart: ")
                if w["kind"] == "plotly":
                    diffs += _trace_diffs(w["traces"], g["traces"], head)
                elif w["kind"] == "pyplot":
                    wb, gb = [b[:2] for b in w["bars"]], [b[:2] for b in g["bars"]]
                    by_name = lambda bs: sorted(bs, key=lambda b: str(b[0]))
                    if _alike(w["lines"], g["lines"]) and not _alike(wb, gb) and _alike(by_name(wb), by_name(gb)):
                        diffs.append(L(f"{head}막대의 값은 같고 차례가 다릅니다. 기대 {_fmt(wb)}, 내 앱 {_fmt(gb)}.",
                                       f"{head}The bars have the same values in a different order. Expected {_fmt(wb)}, got {_fmt(gb)}."))
                    elif not _alike(w["bars"], g["bars"]) or not _alike(w["lines"], g["lines"]):
                        diffs.append(L(f"{head}막대나 선의 값이 다릅니다. 기대 {_fmt(wb)}, 내 앱 {_fmt(gb)}.",
                                       f"{head}The bar or line values differ. Expected {_fmt(wb)}, got {_fmt(gb)}."))
                elif sorted(w["series"]) != sorted(g["series"]):
                    diffs.append(L(f"{head}차트의 계열(선이나 막대 묶음)이 다릅니다. 기대 {_fmt(sorted(w['series']))}, 내 앱 {_fmt(sorted(g['series']))}. "
                                   "`x=`, `y=`, `color=`에 준 열을 봅니다.",
                                   f"{head}The chart series differ. Expected {_fmt(sorted(w['series']))}, got {_fmt(sorted(g['series']))}. "
                                   "Check the columns you passed to `x=`, `y=`, and `color=`."))
                else:
                    for name in sorted(w["series"]):
                        a, b = w["series"][name], g["series"][name]
                        if not _alike(a, b):
                            diffs.append(L(f"{head}계열 '{name}'의 값이 다릅니다. 기대 {_fmt(a[:8])}, 내 앱 {_fmt(b[:8])}.",
                                           f"{head}The values of series '{name}' differ. Expected {_fmt(a[:8])}, got {_fmt(b[:8])}."))
                            break
    if "texts" in want and want["texts"] != got["texts"]:
        for kind, text in want["texts"]:
            if [kind, text] in got["texts"]:
                continue
            ko, en = TEXT_KINDS.get(kind, ("글", "text"))
            other = [t[0] for t in got["texts"] if t[1] == text]
            if other:
                ko2, en2 = TEXT_KINDS.get(other[0], ("글", "text"))
                diffs.append(L(f"{_fmt(text)}: 쓴 함수가 다릅니다. 기대 {ko}, 내 앱 {ko2}.",
                               f"{_fmt(text)}: a different function was used. Expected {en}, got {en2}."))
            else:
                same = [t[1] for t in got["texts"] if t[0] == kind]
                diffs.append(L(f"{_iga(ko)} 다릅니다. 기대 {_fmt(text)}, 내 앱 {_fmt(same[0]) if same else '없음'}.",
                               f"The {en} differs. Expected {_fmt(text)}, got {_fmt(same[0]) if same else 'none'}."))
            break
        else:
            diffs.append(L(f"화면의 글이 다릅니다. 기대 {_fmt([t[1] for t in want['texts']])}, 내 앱 {_fmt([t[1] for t in got['texts']])}.",
                           f"The text on the screen differs. Expected {_fmt([t[1] for t in want['texts']])}, got {_fmt([t[1] for t in got['texts']])}."))
    if "downloads" in want and want["downloads"] != got["downloads"]:
        if len(want["downloads"]) != len(got["downloads"]):
            diffs.append(L(f"내려받기 단추가 {len(want['downloads'])}개여야 하는데 {len(got['downloads'])}개입니다.",
                           f"Expected {_n(len(want['downloads']), 'download button')}, got {len(got['downloads'])}."))
        else:
            for w, g in zip(want["downloads"], got["downloads"]):
                if w[0] != g[0]:
                    diffs.append(L(f"내려받을 파일 이름이 다릅니다. 기대 {_fmt(w[0])}, 내 앱 {_fmt(g[0])}.",
                                   f"The download file name differs. Expected {_fmt(w[0])}, got {_fmt(g[0])}."))
                elif w[2] != g[2]:
                    wl, gl = w[2].splitlines(), g[2].splitlines()
                    diffs.append(L(f"내려받을 파일의 내용이 다릅니다. 기대 {len(wl)}줄, 내 앱 {len(gl)}줄"
                                   + (f"(첫 줄 기대 {_fmt(wl[0])}, 내 앱 {_fmt(gl[0])})." if wl and gl and wl[0] != gl[0] else "."),
                                   f"The downloaded file's contents differ. Expected {_n(len(wl), 'line')}, got {len(gl)}"
                                   + (f" (first line: expected {_fmt(wl[0])}, got {_fmt(gl[0])})." if wl and gl and wl[0] != gl[0] else ".")))
                elif w[1] != g[1]:
                    diffs.append(L(f"내려받을 파일의 종류(mime)가 다릅니다. 기대 {_fmt(w[1])}, 내 앱 {_fmt(g[1])}.",
                                   f"The download file type (mime) differs. Expected {_fmt(w[1])}, got {_fmt(g[1])}."))
                elif w[4:] and w[4] != g[4]:
                    diffs.append(L(f"내려받기 단추의 이름이 다릅니다. 기대 {_fmt(w[4])}, 내 앱 {_fmt(g[4])}.",
                                   f"The download button label differs. Expected {_fmt(w[4])}, got {_fmt(g[4])}."))
                elif w[3:] and w[3] and not g[3]:  # BOM을 더 붙인 답은 막지 않는다(지문이 BOM을 요구할 때만 본다)
                    diffs.append(L("내려받을 파일 앞에 엑셀용 BOM이 없습니다. 엑셀에서 글자가 깨지지 않게 "
                                   "`encode(\"utf-8-sig\")`로 바꿔 넘깁니다.",
                                   "The download has no BOM for Excel at the start. Pass the text through `encode(\"utf-8-sig\")` "
                                   "so Excel shows the letters correctly."))
    if "layout" in want and want["layout"] != got["layout"]:
        # 배치: 목표 화면의 요소마다 같은 자리(본문·사이드바, 칸, 탭)에 있는지, 그 차례가 같은지 본다. 더 놓은 것은 보지 않는다
        left = list(enumerate(got["layout"]))
        last, in_order = -1, True
        for t, name, place in want["layout"]:
            hit = next(((j, g) for j, g in left if g[0] == t and g[1] == name), None)
            if hit is None:
                diffs.append(L(f"내 앱 화면에 없는 것: {_el_name(t, name)}.", f"Your app screen is missing: {_el_name(t, name)}."))
                break
            left.remove(hit)
            if hit[1][2] != place:
                diffs.append(L(f"{_el_name(t, name)}의 자리가 다릅니다. 기대 {_place_text(place)}, 내 앱 {_place_text(hit[1][2])}.",
                               f"The {_el_name(t, name)} is in a different place. Expected {_place_text(place)}, got {_place_text(hit[1][2])}."))
                break
            in_order = in_order and hit[0] > last
            last = hit[0]
        else:
            if not in_order:
                diffs.append(L("화면에 놓인 차례가 다릅니다. 목표 화면과 같은 차례로 놓습니다.",
                               "Things are in a different order on the screen. Place them in the same order as the target screen."))
    return diffs


def run_test(code, test):
    kind = test["kind"]
    want = test["expect"]
    out = {"label": test.get("label", ""), "optional": bool(test.get("optional")), "ok": False}
    for key in ("hidden", "perf", "example", "hint", "max_steps", "var"):  # 코딩 테스트 문제의 표시, 답을 담는 변수
        if test.get(key) is not None:
            out[key] = test[key]
    if kind == "program":
        src, missing = apply_replace(code, test.get("replace", []))
        if src is None:
            out["note"] = _missing_note(missing)
            out["missing"] = missing
            return out
        if test.get("stdin"):
            out["stdin"] = test["stdin"]
        r = execute(src, test.get("stdin"), files=test.get("files"))
        out["expected"] = norm(want["stdout"])
        out["got"] = norm(r["stdout"])
        out["error"] = r["error"]
        want_err = want.get("error")
        got_err = r["error"]["type"] if r["error"] else None
        out["ok"] = (got_err == want_err) and out["got"] == out["expected"]
        if want_err:
            out["expected_error"] = want_err
        return out

    if kind == "plot":  # 그래프 문제: 주어진 줄을 바꿔 실행한 뒤 그린 그림을 기대한 그림과 칸마다 비교한다
        out["plot"] = True  # 화면이 결과를 그래프 모양(차이 목록과 내 그림)으로 보이게
        src, missing = apply_replace(code, test.get("replace", []))
        if src is None:
            out["note"] = _missing_note(missing)
            out["missing"] = missing
            return out
        r = execute(src, test.get("stdin"), files=test.get("files"), plot=True, image=lambda got: bool(compare_plot(want["plot"], got)))
        out["error"] = r["error"]
        out["_total"] = r["steps"]
        printed = norm(r["stdout"])
        if printed:
            out["printed"] = printed
        if r["error"]:
            out["image"] = r.get("image")  # 오류가 나기 전까지 그린 그림
            return out
        if r.get("plot") is None:
            out["note"] = L("그림을 읽지 못했습니다. ", "Could not read the figure. ") + r.get("plot_error", "")
            return out
        out["diffs"] = compare_plot(want["plot"], r["plot"])
        out["ok"] = not out["diffs"]
        if not out["ok"]:
            out["image"] = r.get("image")
        return out

    if kind in ("plotly", "app"):  # Plotly 그림 문제와 Streamlit 앱 문제(2026-11-02)
        out[kind] = True
        src, missing = apply_replace(code, test.get("replace", []))
        if src is None:
            out["note"] = _missing_note(missing)
            out["missing"] = missing
            return out
        if kind == "plotly":
            compare, key, view = compare_plotly, "plotly", "fig"
            reports = [*((want.get("plotly") or {}).get("report") or {}), *((want.get("plotly") or {}).get("report_text") or {})]
            r = execute(src, test.get("stdin"), files=test.get("files"), plotly=True, image=lambda got: bool(compare_plotly(want["plotly"], got)),
                        report=reports[0] if reports else None)
        else:
            compare, key, view = compare_app, "app", "app_view"
            out["widgets"] = test.get("widgets") or {}
            r = execute(src, test.get("stdin"), files=test.get("files"), app=out["widgets"],
                        image=lambda got: bool(compare_app(want["app"], got)))
        out["error"] = r["error"]
        out["_total"] = r["steps"]
        printed = norm(r["stdout"])
        if printed:
            out["printed"] = printed
        if r.get(key) is None:
            out["note"] = (L("그림을 읽지 못했습니다. ", "Could not read the figure. ") if kind == "plotly" else
                           L("앱 화면을 읽지 못했습니다. ", "Could not read the app screen. ")) + r.get("plot_error", "")
            return out
        if r.get("report_view"):  # HTML 리포트 문제(10장): 내 리포트도 앱 화면처럼 보인다
            out["report_view"] = r["report_view"]
        if r["error"]:
            out[view] = r.get(view)
            if kind == "app" and (want.get("app") or {}).get("stopped"):
                out["note"] = L("이 테스트에서는 앱이 `st.stop()`으로 멈춰야 합니다. 멈추기 전에 오류가 났습니다.",
                                "In this test the app should stop with `st.stop()`. It raised an error before stopping.")
            return out
        out["diffs"] = compare(want[key], r[key])
        out["ok"] = not out["diffs"]
        if not out["ok"]:
            out[view] = r.get(view)
        else:
            out.pop("report_view", None)
        return out

    # kind == "call": 코드를 실행한 뒤 식의 값을 구해 비교한다. 답을 변수에 담는 문제(var)는
    # 주어진 줄을 바꿔 실행한 뒤 그 변수의 값을 본다.
    src, missing = apply_replace(code, test.get("replace", []))
    if src is None:
        out["note"] = _missing_note(missing)
        out["missing"] = missing
        return out
    # 변수를 보는 테스트는 학생 코드의 이름 공간에서, 함수를 부르는 테스트는 따로 떼어 낸 곳에서 식을 구한다
    r = execute(src, test.get("stdin"), test.get("setup"), test["expr"], test.get("max_steps"), isolate=not test.get("var"),
                files=test.get("files"))
    if test.get("setup"):
        out["setup"] = test["setup"]
    out["expr"] = test["expr"]
    out["expected"] = want.get("value")
    out["printed"] = norm(r.get("call_stdout", ""))
    out["error"] = r["error"]
    out["steps"] = r.get("call_steps")
    out["_total"] = r["steps"]
    if r["error"] and r["error"]["type"] == "TimeLimit":
        out["note"] = L(f"효율성 기준({test['max_steps']:,}줄) 안에 끝나지 않았습니다. 더 적게 반복하는 방법을 찾아봅니다.",
                        f"It did not finish within the efficiency limit ({test['max_steps']:,} lines). Find a way that repeats fewer times.")
    elif r["error"] and r["error"]["type"] == "StepLimit" and r.get("phase") != "test" and not test.get("var"):
        out["note"] = L("함수를 부르기 전에, 함수 밖의 코드가 줄 수 한도를 넘었습니다. 맨 아래에 남긴 확인용 호출을 지우고 다시 채점합니다.",
                        "The code outside the function went over the line limit before the function was called. "
                        "Delete the test calls left at the bottom and check again.")
    if want.get("error"):
        out["expected_error"] = want["error"]
        out["ok"] = bool(r["error"]) and r["error"]["type"] == want["error"]
        if not r["error"]:  # 오류 없이 끝났으면 무엇을 돌려줬는지 보인다
            out["got"] = show(r.get("value"))
            out.setdefault("note", L(f"오류 없이 끝났습니다. 이 경우에는 {want['error']}로 멈춰야 합니다.",
                                     f"It finished without an error. In this case, it should stop with {want['error']}."))
        return out
    if r["error"]:
        if test.get("var") and r["error"]["type"] == "NameError" and r["error"]["line"] is None:
            names = re.findall(r"\w+", test["expr"])
            m = re.search(r"name '(\w+)'", r["error"]["message"])
            missing = m.group(1) if m else names[0]
            out["note"] = L(f"`{missing}` 변수가 없습니다. 답은 " + ", ".join(f"`{n}`" for n in names) + "에 담습니다.",
                            f"There is no variable `{missing}`. Store the answer in " + _and(f"`{n}`" for n in names) + ".")
        return out
    got = r.get("value")
    out["got"] = show(got)
    expected = ast.literal_eval(want["value"])
    out["ok"] = same(got, expected)
    if not out["ok"]:
        try:  # 틀린 까닭을 짐작하는 안내는 덤이다. 안내를 고르다 난 오류(pandas 값의 == 등)로 채점이 멈추지 않게 한다
            _hint(out, test, got, expected)
        except Exception:  # noqa: BLE001
            pass
    return out


def _numpy_or_pandas(value):
    return type(value).__module__.split(".")[0] in ("numpy", "pandas")


def _hint(out, test, got, expected):
    """답이 틀렸을 때 흔한 까닭(자료형, print만 함, return 빠짐)을 out["note"]에 적는다."""
    if _numpy_or_pandas(got):  # 시각화 과목: Series, DataFrame, 배열, numpy 수를 그대로 담음
        out["note"] = L(f"pandas나 numpy 값({type(got).__name__})이 담겼습니다. 답은 파이썬 값({type(expected).__name__})으로 담습니다. "
                        "`int()`, `float()`, `.tolist()`로 바꿉니다.",
                        f"You stored a pandas or numpy value ({type(got).__name__}). Store the answer as a plain Python value "
                        f"({type(expected).__name__}). Convert it with `int()`, `float()`, or `.tolist()`.")
        return
    if test.get("var"):
        names = re.findall(r"\w+", test["expr"])
        pairs = list(zip(names, got, expected)) if len(names) > 1 and isinstance(got, tuple) and len(got) == len(expected) \
            else [(names[0], got, expected)]
        for name, g, e in pairs:
            if not same(g, e) and type(g) is not type(e) and (g == e or str(g) == str(e)):
                out["note"] = L(f"`{name}`의 값은 같아 보이지만 자료형이 다릅니다. 답의 자료형은 {type(e).__name__}입니다.",
                                f"The value of `{name}` looks the same, but the type is different. The answer's type is {type(e).__name__}.")
                break
    elif not out["ok"]:
        if got is None and expected is not None and out["printed"]:
            out["note"] = L("값을 return하지 않고 print만 한 것 같습니다. 함수는 None을 돌려주었습니다.",
                            "It looks like you printed the value instead of returning it. The function returned None.")
        elif got is None and expected is not None:
            out["note"] = L("함수가 None을 돌려주었습니다. return이 빠졌거나 반복 안에서 끝났는지 봅니다.",
                            "The function returned None. Check whether `return` is missing or sits only inside a loop.")
        elif type(got) is not type(expected) and (got == expected or (
                isinstance(got, (list, tuple)) and isinstance(expected, (list, tuple)) and list(got) == list(expected))):
            out["note"] = L(f"값은 같지만 자료형이 다릅니다. {type(expected).__name__} 자료형으로 돌려줍니다.",
                            f"The value is the same, but the type is different. Return a value of type {type(expected).__name__}.")
        elif isinstance(got, (list, tuple)) and type(got) is type(expected) and len(got) == len(expected) and got == expected:
            i = next(k for k, (g, e) in enumerate(zip(got, expected)) if not same(g, e))  # 값은 같은데 자료형이 다른 원소
            out["note"] = L(f"값은 같아 보이지만 {i + 1}번째 값의 자료형이 다릅니다. {type(expected[i]).__name__} 자료형이어야 합니다.",
                            f"The values look the same, but item {i + 1} has a different type. It should be of type "
                            f"{type(expected[i]).__name__}.")


def grade(problem, answer):
    """problem은 빌드가 만든 문제 하나, answer는 {"code": ...} 또는 {"blanks": [...]}.
    메시지 언어는 문제의 lang(영어 과목의 문제는 "en")으로 정하고, 끝나면 그 전 값으로 되돌린다."""
    global _LANG
    before, _LANG = _LANG, problem.get("lang") or "ko"
    try:
        return _grade(problem, answer)
    finally:
        _LANG = before


def _grade(problem, answer):
    ptype = problem["type"]
    report = {"ok": False, "tests": [], "notes": [], "blocked": None}
    if ptype == "fill":
        blanks = [str(b).strip() for b in answer.get("blanks", [])]
        empty = [i + 1 for i, b in enumerate(blanks) if not b]
        if len(blanks) != len(problem["parts"]) - 1 or empty:
            nums = [str(n) for n in empty or [1]]
            report["blocked"] = L("빈칸 " + ", ".join(nums) + "번을 채우세요.", f"Fill in blank{'s' if len(nums) > 1 else ''} {_and(nums)}.")
            return report
        code = fill_code(problem["parts"], blanks)
    else:
        code = answer.get("code", "")
    report["code"] = code

    magic = [ln.strip() for ln in code.splitlines() if ln.strip()[:1] in ("%", "!")]
    if magic:  # 코랩(Jupyter)에서만 쓰는 줄. 이 연습의 파이썬에서는 문법 오류가 난다
        report["blocked"] = L(f"`{magic[0][:40]}`처럼 %나 !로 시작하는 줄은 코랩에서만 씁니다. 그 줄을 지우고 채점합니다.",
                              f"Lines that start with % or !, like `{magic[0][:40]}`, work only in Colab. Delete that line and check again.")
        return report

    try:
        compile(code, CODE_FILE, "exec")
    except SyntaxError as e:
        report["error"] = describe(e)
        report["blocked"] = L("문법 오류가 있어 실행하지 못했습니다.", "Could not run the code because of a syntax error.")
        if ptype == "fill":  # 빈칸 문제는 오류 줄에 있는 빈칸 번호로 알린다(2026-11-02 학생처럼 풀기: 빈칸 끝에 쉼표를 붙인 답)
            report["blocked"] = _blank_syntax_note(problem["parts"], blanks, e.lineno) or report["blocked"]
        return report

    funcs, methods, defined = calls_in(code) or (set(), set(), set())
    # 직접 만든 같은 이름의 함수는 막지 않는다. 메서드(.count() 등)는 막는다
    banned = [n for n in problem.get("forbid", []) if (n in funcs and n not in defined) or n in methods]
    if banned:
        report["blocked"] = L("이 문제는 " + ", ".join(f"{n}()" for n in banned) + " 없이 풉니다.",
                              "Solve this problem without " + _and((f"`{n}()`" for n in banned), "or") + ".")
        return report
    bare = without_comments(code)  # 주석에 적은 낱말로는 통과하지 않게
    for rule in problem.get("require", []):
        if not re.search(rule["pattern"], bare):
            report["blocked"] = rule["message"]
            return report
    # 코드 리뷰(fix)와 코딩 테스트 모의고사의 디버깅 문항(entry가 있는 작성형, 2026-10-20)은 바꾼 줄 수를 세어 안내한다(막지 않음)
    if (ptype == "fix" or problem.get("entry")) and problem.get("max_changed"):
        n = changed_lines(problem["code"], code)
        report["changed"] = n
        if n > problem["max_changed"]:
            report["notes"].append(L(f"{n}줄을 바꿨습니다. 이 문제는 {problem['max_changed']}줄 안에서 고칠 수 있습니다.",
                                     f"You changed {_n(n, 'line')}. You can fix this problem by changing "
                                     f"{_n(problem['max_changed'], 'line')} or fewer."))

    used_steps = 0
    for test in problem["tests"]:
        if used_steps > TOTAL_STEPS:
            report["tests"].append({"label": test.get("label", ""), "optional": bool(test.get("optional")), "ok": False,
                                    "hidden": test.get("hidden"), "perf": test.get("perf"), "hint": test.get("hint"),
                                    "example": test.get("example"), "skipped": True,
                                    "note": L("앞의 테스트들이 너무 오래 돌아 이 테스트는 건너뛰었습니다. 끝나지 않는 반복이 있는지 봅니다. "
                                              "함수 밖에 확인용 호출이 남아 있으면 지우고 다시 채점합니다.",
                                              "The earlier tests ran too long, so this test was skipped. Check for a loop that never ends. "
                                              "If test calls are left outside the function, delete them and check again.")})
            continue
        t = run_test(code, test)
        used_steps += t.pop("_total", 0) or 0
        missing = t.pop("missing", None)
        if missing and ptype != "fill":
            start = problem.get("code") or ""
            if not all(line.strip() in start for line in missing.split("\n") if line.strip()):  # 시작 코드에 없던 줄: 학생이 더할 줄이다
                lines, many = _given_lines_en(missing)
                t["note"] = L(f"채점할 때 값을 바꿔 넣는 {given_lines(missing)[:-3]} 줄이 코드에 없습니다. 지문이 말한 이 줄을 코드에 더합니다.",
                              f"The grader could not find {lines} in your code. It needs {'these lines' if many else 'this line'} "
                              f"to test other values. Add {'them' if many else 'it'} as the problem describes.")
        report["tests"].append(t)
    required = [t for t in report["tests"] if not t["optional"]]
    report["ok"] = bool(required) and all(t["ok"] for t in required)
    if problem.get("entry"):  # 코딩 테스트: 통과한 정확성 테스트 비율로 점수를 매긴다
        passed = sum(1 for t in required if t["ok"])
        report["passed"] = passed
        report["total"] = len(required)
        report["score"] = int(100 * passed / len(required) + 0.5) if required else 0  # 12.5는 13점(반올림)
        perf = [t for t in report["tests"] if t.get("perf")]
        report["perf"] = {"passed": sum(1 for t in perf if t["ok"]), "total": len(perf)}
    return report


def handle(request_json):
    global _LANG
    req = json.loads(request_json)
    op = req.get("op")
    if op == "run":
        before, _LANG = _LANG, req.get("lang") or "ko"
        try:
            return _run(req)
        finally:
            _LANG = before
    if op == "grade":
        return json.dumps(grade(req["problem"], req["answer"]), ensure_ascii=False)
    if op == "version":
        return json.dumps({"python": sys.version.split()[0]})
    return json.dumps({"error": {"type": "BadRequest", "message": str(op), "line": None}})


def _run(req):
    """run 요청: 코드를 실행한 결과(출력, 오류, 답을 담는 변수의 값, 그래프 문제면 그림)."""
    names = req.get("var") or []  # 답을 담는 변수가 있는 문제는 실행한 뒤 그 값도 보여 준다
    names = [names] if isinstance(names, str) else names
    expr = None if not names else names[0] if len(names) == 1 else "(" + ", ".join(names) + ",)"
    plot = bool(req.get("plot"))
    plotly = bool(req.get("plotly"))
    app = req.get("widgets") or {} if req.get("app") else None
    r = execute(req.get("code", ""), req.get("stdin"), None, expr, files=req.get("files"), plot=plot, image=plot or plotly or app is not None,
                plotly=plotly, app=app, report=bool(req.get("report")))
    res = {"stdout": r["stdout"], "screen": r["screen"], "error": r["error"]}
    if plot:
        res["image"] = r.get("image")
    if plotly:
        res["fig"] = r.get("fig")
        res["report_view"] = r.get("report_view")
    if app is not None:
        res["app_view"] = r.get("app_view")
    if names:
        err = r["error"]
        if err and err["type"] == "NameError" and err["line"] is None:  # 변수만 없고 코드는 끝까지 돌았다
            m = re.search(r"name '(\w+)'", err["message"])
            res["error"] = None
            res["var"] = {"names": names, "missing": m.group(1) if m else names[0]}
        elif not err:
            values = [r.get("value")] if len(names) == 1 else list(r.get("value"))
            res["var"] = {"names": names, "values": [show(v) for v in values]}
    return json.dumps(res, ensure_ascii=False)
