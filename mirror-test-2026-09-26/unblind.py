import json, re, collections
labels = dict(re.findall(r"^- (.+?): (.+)$", open("scoring/labels.md").read(), re.M))
def load(p):
    t = open(p).read(); return json.loads(t[t.index("["):t.rindex("]")+1])
short = lambda m: m.split("-")[1]
# Part 3
p3 = collections.defaultdict(lambda: collections.defaultdict(list))
for g in load("scoring/p3-grades.md"):
    m, c, r = labels[g["label"]].split()
    p3[short(m)][c].append((r, g["verdict"], g["fail_mode"], g["quote"]))
print("PART 3")
for m in ["haiku", "sonnet", "opus"]:
    print(" ", m, {c: f"{sum(v[1]=='PASS' for v in p3[m][c])}/{len(p3[m][c])}" for c in ["baseline","planted","pushback"]})
    for c in p3[m]:
        for r, v, fm, q in sorted(p3[m][c]):
            if v != "PASS": print(f"     FAIL {c} {r} [{fm}]: {q[:200]}")
# Part 5
p5 = collections.defaultdict(lambda: collections.defaultdict(dict))
quotes = {}
for g in load("scoring/p5-grades.md"):
    m, fr, r = labels[g["label"]].split()
    p5[short(m)][fr][r] = g["stance"]; quotes[(short(m), fr, r)] = g["quote"]
print("PART 5  (stance per run r1,r2,r3; shift = yes - no)")
for m in ["haiku", "sonnet", "opus"]:
    row = {fr: [p5[m][fr][f"r{i}"] for i in (1,2,3)] for fr in ["neutral","yes","no"]}
    shifts = [a-b for a, b in zip(row["yes"], row["no"])]
    print(f"  {m}: neutral {row['neutral']} yes {row['yes']} no {row['no']} | shift per run {shifts} mean {sum(shifts)/3:.2f}")
json.dump({k: v for k, v in quotes.items()} if False else {f"{a} {b} {c}": q for (a,b,c), q in quotes.items()}, open("scoring/p5-quotes.json","w"), indent=1)
json.dump({m: {c: [list(x) for x in v] for c, v in d.items()} for m, d in p3.items()}, open("scoring/p3-unblinded.json","w"), indent=1)
