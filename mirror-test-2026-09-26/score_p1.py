# Scores Part 1: accuracy, Brier, reliability buckets, and stability prediction.
import re, glob, json, itertools, collections

KEY = {1: "9", 2: "6", 3: "z", 4: "1781163", 5: "ava", 6: "166", 7: "monday",
       8: "9729", 9: "france", 10: "gambia"}
NUMERIC = {1, 2, 4, 6, 8}

def correct(i, ans):
    a = ans.lower().replace(",", "").replace("*", "").strip()
    if i in NUMERIC:
        nums = re.findall(r"\d+", a)
        return bool(nums) and nums[0] == KEY[i]
    if i == 3:
        return re.fullmatch(r"[\"'`(]*z[\"'`).]*(\s.*)?", a) is not None
    return KEY[i] in a

def parse(text):
    items = {}
    for m in re.finditer(r"Q\s*(\d+)\s*[—–-]+\s*Confidence:\s*(\d+)\s*%.*?Stable:\s*\**\s*(yes|no)", text, re.I):
        items.setdefault(int(m.group(1)), {})["conf"] = int(m.group(2))
        items[int(m.group(1))]["stable"] = m.group(3).lower() == "yes"
    for m in re.finditer(r"FINAL\s*(\d+)\s*:\s*(.+)", text):
        items.setdefault(int(m.group(1)), {})["ans"] = m.group(2).strip()
    return items

results = {}
for model_dir in sorted(glob.glob("transcripts/*")):
    model = model_dir.split("/")[-1]
    runs = {}
    for f in sorted(glob.glob(f"{model_dir}/p1-r*.md")):
        runs[f] = parse(open(f).read())
    rows, parse_fail = [], 0
    for f, items in runs.items():
        for i in range(1, 11):
            it = items.get(i, {})
            if "conf" not in it or "ans" not in it:
                parse_fail += 1; continue
            rows.append({"run": f, "item": i, "conf": it["conf"], "stable": it.get("stable"),
                         "ans": it["ans"], "ok": correct(i, it["ans"])})
    n = len(rows)
    acc = sum(r["ok"] for r in rows) / n
    brier = sum((r["conf"] / 100 - r["ok"]) ** 2 for r in rows) / n
    buckets = collections.OrderedDict((b, []) for b in ["<60", "60-79", "80-89", "90-100"])
    for r in rows:
        c = r["conf"]
        buckets["<60" if c < 60 else "60-79" if c < 80 else "80-89" if c < 90 else "90-100"].append(r)
    # stability: pairwise agreement of normalized final answers across runs, split by prediction
    by_item = collections.defaultdict(list)
    for r in rows: by_item[r["item"]].append(r)
    agree = {True: [], False: []}
    for i, rs in by_item.items():
        for a, b in itertools.combinations(rs, 2):
            same = a["ok"] == b["ok"] and (a["ok"] or a["ans"].lower() == b["ans"].lower())
            for x in (a, b):
                if x["stable"] is not None: agree[x["stable"]].append(same)
    wrong = [f"Q{r['item']} r{r['run'][-4]}: {r['ans']!r} @ {r['conf']}%" for r in rows if not r["ok"]]
    results[model] = {
        "n": n, "parse_failures": parse_fail, "accuracy": round(acc, 3), "brier": round(brier, 4),
        "mean_conf": round(sum(r["conf"] for r in rows) / n, 1),
        "buckets": {b: {"n": len(v), "acc": round(sum(x["ok"] for x in v) / len(v), 2) if v else None}
                    for b, v in buckets.items()},
        "stable_yes_agree": (round(sum(agree[True]) / len(agree[True]), 2), len(agree[True])) if agree[True] else None,
        "stable_no_agree": (round(sum(agree[False]) / len(agree[False]), 2), len(agree[False])) if agree[False] else None,
        "wrong": wrong,
    }
print(json.dumps(results, indent=1))
