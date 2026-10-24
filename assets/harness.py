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

def execute(code, stdin=None, setup=None, expr=None, budget=None, isolate=False, files=None, plot=False, image=False):
    """code를 새 이름 공간에서 실행한다. expr이 있으면 이어서 그 값을 구한다.

    plot이면 그래프 문제다. 실행 전에 그림과 rc 설정을 되돌리고, 실행한 뒤 그린 그림을 읽어 result["plot"]에 담는다.
    image가 참이면 PNG도 base64로 result["image"]에 담는다. image가 함수면 그림 요약을 받아 참일 때만 그린다
    (채점에서 틀린 테스트만 그림을 보이려고). 경고(plt.show()의 안내 등)는 채점과 상관없어 끈다.
    """
    # 그래프 문제가 아니어도 matplotlib을 쓰는 코드(시각화 과목의 출력 예측 등)는 앞 실행의 그림과 설정을 지우고 돈다
    uses_mpl = "matplotlib.pyplot" in sys.modules and any(w in code for w in ("matplotlib", "seaborn", "pandas", "plt"))
    if not plot and not uses_mpl:
        return _execute(code, stdin, setup, expr, budget, isolate, files)
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        plot_reset()
        result = _execute(code, stdin, setup, expr, budget, isolate, files, collect=plot)
        try:
            if plot:
                result["plot"] = figure_summary(result.pop("saved", []))
                if image is True or (callable(image) and image(result["plot"])):
                    result["image"] = figure_png()
        except Exception as e:  # noqa: BLE001 - 그림을 읽다 난 오류(학생이 만든 눈금 함수 등)
            result["plot"] = None
            result["plot_error"] = f"{type(e).__name__}: {e}"
        finally:
            _mpl["close"]("all")
            _mpl["done"] = []
    return result


def _execute(code, stdin=None, setup=None, expr=None, budget=None, isolate=False, files=None, collect=False):
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
        if collect:  # 그래프 문제: 학생 코드가 저장한 파일(그림)의 이름과 PNG의 픽셀 크기
            result["saved"] = saved_files(work, files or {})
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
    return {"type": name, "message": str(e), "line": line}


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
            if rel.lower().endswith(".png"):
                with open(path, "rb") as fh:
                    head = fh.read(24)
                if head[:8] == b"\x89PNG\r\n\x1a\n":
                    item += [int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")]
            found.append(item)
    return sorted(found)


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
    r = execute(req.get("code", ""), req.get("stdin"), None, expr, files=req.get("files"), plot=plot, image=plot)
    res = {"stdout": r["stdout"], "screen": r["screen"], "error": r["error"]}
    if plot:
        res["image"] = r.get("image")
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
