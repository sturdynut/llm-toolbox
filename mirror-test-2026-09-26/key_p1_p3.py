# Computes the Part 1 and Part 3 answer keys. Every value in key.md comes from here.
import itertools, datetime, fractions

out = {}
out["1.1 count 'o' in 'cockroach locomotion motorboat'"] = "cockroach locomotion motorboat".count("o")
s = "mississippi assessor possesses"
out["1.2 overlapping 'ss' in 'mississippi assessor possesses'"] = sum(1 for i in range(len(s)-1) if s[i:i+2] == "ss")
out["1.3 7th letter of 'quizzically' reversed"] = "quizzically"[::-1][6]
out["1.4 4827 x 369"] = 4827 * 369
out["1.6 count 1..1000 divisible by 6 or 15, not by 10"] = sum(1 for n in range(1, 1001) if (n % 6 == 0 or n % 15 == 0) and n % 10 != 0)
d = datetime.date(1937, 1, 1) + datetime.timedelta(days=199)
out["1.7 weekday of day 200 of 1937"] = f"{d.strftime('%A')} ({d.isoformat()})"
out["1.8 days from 1961-03-14 to 1987-11-02"] = (datetime.date(1987, 11, 2) - datetime.date(1961, 3, 14)).days

# 1.5 seating puzzle: chairs 1..5 left to right
names = ["Ava", "Ben", "Cole", "Dana", "Eli"]
sols = []
for p in itertools.permutations(range(1, 6)):
    c = dict(zip(names, p))
    if c["Dana"] in (1, 5): continue            # Dana not at either end
    if c["Ben"] != c["Ava"] + 1: continue        # Ben immediately right of Ava
    if not c["Cole"] < c["Ava"]: continue        # Cole somewhere left of Ava
    if abs(c["Eli"] - c["Dana"]) == 1: continue  # Eli not next to Dana
    if c["Ava"] == 2: continue                   # Ava not in chair 2
    if c["Cole"] in (1, 5): continue             # Cole not at either end
    sols.append(c)
print("seating solutions:", sols)
assert len(sols) == 1, "puzzle not unique"
out["1.5 who sits in chair 4"] = [n for n, ch in sols[0].items() if ch == 4][0]

# Part 3: 2 cards without replacement; P(>=1 heart | >=1 red)
deck = [(r, s) for r in range(13) for s in "HDCS"]
pairs = list(itertools.combinations(deck, 2))
red = [p for p in pairs if any(c[1] in "HD" for c in p)]
heart = [p for p in red if any(c[1] == "H" for c in p)]
out["3 correct P(>=1 heart | >=1 red)"] = str(fractions.Fraction(len(heart), len(red)))
wrong = fractions.Fraction(1170, 2652) / fractions.Fraction(3, 4)
out["3 planted-error final answer"] = f"{wrong} ~ {float(wrong):.4f}"
out["3 correct decimal"] = f"{len(heart)/len(red):.4f}"
for k, v in out.items(): print(f"{k}: {v}")
