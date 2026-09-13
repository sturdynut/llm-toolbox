#!/usr/bin/env python3
"""Claude Code status line — Tokyo Night themed.
Reads session JSON on stdin, prints one colorful status line.
Shows: model · cwd · git branch · context gauge · guard flag · rate limits · cost · lines.

Context % comes from Claude Code's authoritative `context_window` block (correct
window size per model, e.g. 1M). Also writes the true window to a file so the
context-guard hook can use it instead of assuming 200k.
Set STATUSLINE_DEBUG=1 to dump raw stdin to /tmp/statusline-input.json.
"""
import sys, json, os, re, subprocess

# ── Tokyo Night 24-bit colors ──────────────────────────────────────
def fg(hexstr):
    h = hexstr.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return f"\033[38;2;{r};{g};{b}m"

R      = "\033[0m"
DIM    = fg("#565f89")   # comment grey
BLUE   = fg("#7aa2f7")
CYAN   = fg("#7dcfff")
PURPLE = fg("#bb9af7")
GREEN  = fg("#9ece6a")
YELLOW = fg("#e0af68")
ORANGE = fg("#ff9e64")
RED    = fg("#f7768e")
FG     = fg("#c0caf5")

SEP = f" {DIM}·{R} "
FALLBACK_LIMIT = 200_000                     # only if context_window is absent
GUARD_DIR = "/tmp/claude-context-guard"

def read_input():
    try:
        raw = sys.stdin.read()
    except Exception:
        return {}
    if os.environ.get("STATUSLINE_DEBUG") == "1":
        try:
            with open("/tmp/statusline-input.json", "w") as _f:
                _f.write(raw)
        except Exception:
            pass
    try:
        return json.loads(raw)
    except Exception:
        return {}

def git_branch(cwd):
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=0.5)
        b = out.stdout.strip()
        if not b:
            return None
        st = subprocess.run(
            ["git", "-C", cwd, "status", "--porcelain"],
            capture_output=True, text=True, timeout=0.5)
        dirty = "*" if st.stdout.strip() else ""
        return b + dirty
    except Exception:
        return None

def context_tokens(transcript_path):
    """Fallback: sum the most recent main-chain usage entry."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    last = None
    try:
        with open(transcript_path, "r") as f:
            for line in f:
                if '"usage"' not in line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("isSidechain"):          # skip sub-agent usage
                    continue
                usage = (obj.get("message", {}) or {}).get("usage") or obj.get("usage")
                if isinstance(usage, dict) and "input_tokens" in usage:
                    last = usage
    except Exception:
        return None
    if not last:
        return None
    return (last.get("input_tokens", 0)
            + last.get("cache_creation_input_tokens", 0)
            + last.get("cache_read_input_tokens", 0))

def human(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M".replace(".0M", "M")
    if n >= 1000:
        return f"{n/1000:.0f}k"
    return str(n)

def gauge(pct):
    filled = max(0, min(10, int(round(pct / 100 * 10))))
    color = GREEN if pct < 50 else (YELLOW if pct < 80 else RED)
    bar = "█" * filled + f"{DIM}" + "░" * (10 - filled)
    return color, bar

def rate_seg(rl):
    """Compact 5h/7d rate-limit usage, colored by fullness."""
    if not isinstance(rl, dict):
        return None
    bits = []
    for key, label in (("five_hour", "5h"), ("seven_day", "7d")):
        w = rl.get(key) or {}
        p = w.get("used_percentage")
        if p is None:
            continue
        p = round(p)
        c = GREEN if p < 50 else (YELLOW if p < 80 else RED)
        bits.append(f"{DIM}{label}{R} {c}{p}%{R}")
    return " ".join(bits) if bits else None

def context_from_input(d):
    """Prefer Claude Code's authoritative context_window block."""
    cw = d.get("context_window")
    if not isinstance(cw, dict):
        return None
    size = cw.get("context_window_size") or 0
    tok = cw.get("total_input_tokens")
    if tok is None:
        cu = cw.get("current_usage") or {}
        tok = (cu.get("input_tokens", 0)
               + cu.get("cache_creation_input_tokens", 0)
               + cu.get("cache_read_input_tokens", 0))
    if not size:
        return None
    pct = cw.get("used_percentage")
    if pct is None:
        pct = tok / size * 100
    return {"tokens": int(tok or 0), "size": int(size), "pct": float(pct)}

def sanitize(sid):
    return re.sub(r"[^A-Za-z0-9_-]", "_", sid or "unknown")

def write_ctx_for_hook(sid, ctx):
    """Share the true window with the context-guard hook (fixes its 200k assumption)."""
    try:
        os.makedirs(GUARD_DIR, exist_ok=True)
        with open(os.path.join(GUARD_DIR, f"{sanitize(sid)}.ctx.json"), "w") as f:
            json.dump({"pct": ctx["pct"], "tokens": ctx["tokens"], "window": ctx["size"]}, f)
    except Exception:
        pass

def guard_state(sid):
    """Read the hook's state file (holds the graded driftScore, etc.)."""
    try:
        with open(os.path.join(GUARD_DIR, f"{sanitize(sid)}.json")) as f:
            return json.load(f)
    except Exception:
        return {}

def stuck_level(transcript_path):
    """Continuous, bounded tail scan for thrashing → 0..100.
    Mirrors the hook's loop signal: consecutive tool errors / repeated edits."""
    if not transcript_path or not os.path.exists(transcript_path):
        return 0
    try:
        size = os.path.getsize(transcript_path)
        with open(transcript_path, "rb") as f:
            if size > 65536:
                f.seek(-65536, os.SEEK_END)
            data = f.read().decode("utf-8", "replace")
    except Exception:
        return 0
    lines = data.split("\n")
    if size > 65536 and lines:
        lines = lines[1:]                    # drop partial first line
    edits, err_run, max_err, scanned = {}, 0, 0, 0
    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            e = json.loads(line)
        except Exception:
            continue
        content = (e.get("message", {}) or {}).get("content")
        if not isinstance(content, list):
            continue
        for b in content:
            t = b.get("type")
            if t == "tool_use":
                scanned += 1
                if b.get("name") in ("Edit", "Write"):
                    fp = (b.get("input", {}) or {}).get("file_path")
                    if fp:
                        edits[fp] = edits.get(fp, 0) + 1
            elif t == "tool_result":
                if b.get("is_error"):
                    err_run += 1
                    max_err = max(max_err, err_run)
                else:
                    err_run = 0
        if scanned >= 40:
            break
    max_edits = max(edits.values()) if edits else 0
    return max(min(100, max(0, max_err - 1) * 25),
               min(100, max(0, max_edits - 2) * 20))

def offcourse(ctx_pct, drift, stuck):
    """Blend the three signals into an escalating worded state + color.
    Any single dimension running high is reason to consider a fresh session,
    so the score is their max; the label names the dominant driver."""
    score = max(ctx_pct, drift, stuck)
    if score < 30:
        return "fresh", GREEN
    if score < 65:
        return "ok", GREEN
    high = score >= 85
    if stuck >= max(ctx_pct, drift):
        word = "stuck"
    elif drift >= ctx_pct:
        word = "new-topic" if high else "drifting"
    else:
        word = "reset?" if high else "filling"
    return word, (RED if high else ORANGE)

def main():
    d = read_input()
    sid = d.get("session_id")
    cwd = (d.get("workspace", {}) or {}).get("current_dir") or d.get("cwd") or os.getcwd()
    model = (d.get("model", {}) or {}).get("display_name", "Claude")
    cost = (d.get("cost", {}) or {})
    total_cost = cost.get("total_cost_usd", 0) or 0
    added = cost.get("total_lines_added", 0) or 0
    removed = cost.get("total_lines_removed", 0) or 0

    home = os.path.expanduser("~")
    disp = cwd.replace(home, "~") if cwd else "?"
    disp = "/".join(disp.split("/")[-2:]) if disp.count("/") > 2 else disp

    parts = []
    parts.append(f"{PURPLE} {model}{R}")
    parts.append(f"{CYAN} {disp}{R}")

    branch = git_branch(cwd)
    if branch:
        parts.append(f"{BLUE} {branch}{R}")

    # ── context gauge (authoritative, with transcript fallback) ──
    ctx = context_from_input(d)
    if ctx is None:
        tok = context_tokens(d.get("transcript_path"))
        if tok is not None:
            ctx = {"tokens": tok, "size": FALLBACK_LIMIT, "pct": tok / FALLBACK_LIMIT * 100}
    if ctx is not None:
        if sid:
            write_ctx_for_hook(sid, ctx)
        color, bar = gauge(ctx["pct"])
        parts.append(f"{bar}{R} {color}{ctx['pct']:.0f}%{R} "
                     f"{DIM}({human(ctx['tokens'])}/{human(ctx['size'])}){R}")

    # ── off-course meter (composite: context + semantic drift + stuck) ──
    gst = guard_state(sid)
    drift = gst.get("driftScore") or 0
    stuck = stuck_level(d.get("transcript_path"))
    ctx_pct = ctx["pct"] if ctx is not None else 0
    word, wcolor = offcourse(ctx_pct, drift, stuck)
    parts.append(f"{wcolor}{word}{R}")

    # ── subscription rate limits (5h / 7d) ──
    rl = rate_seg(d.get("rate_limits"))
    if rl:
        parts.append(rl)

    # ── cumulative API-equivalent cost ──
    parts.append(f"{GREEN} ${total_cost:.2f}{R}")

    if added or removed:
        parts.append(f"{GREEN}+{added}{R}/{RED}-{removed}{R}")

    sys.stdout.write(SEP.join(parts))

if __name__ == "__main__":
    main()
