# Part 2 simulator: checks each MOVE/STATE line of a transcript against the Ring rules.
# Usage: python3 p2_sim.py <transcript.md>   (or import and call check(text))
import re, sys, json

HANDS = {"Amber": [1, 2, 3, 5], "Blue": [1, 3, 4, 6]}
ORDER = ["Amber", "Blue", "Amber", "Blue", "Amber"]

def direction(prev_tile, tile):
    """Rule 2: counter-clockwise if prev+this is a multiple of 5; first move clockwise."""
    return -1 if prev_tile is not None and (prev_tile + tile) % 5 == 0 else 1

def dest(cell, tile, d):
    return (cell + d * tile) % 8

def legal_options(state, player):
    """Tiles that satisfy Rule 3 (destination never visited), using Rule 2's direction."""
    return [t for t in state["hands"][player]
            if dest(state["cell"], t, direction(state["prev"], t)) not in state["visited"]]

def apply(state, player, tile):
    """Returns (expected destination, forced?, violation or None)."""
    hand = state["hands"][player]
    if tile not in hand:
        return None, False, f"Rule 1: {player} has no tile {tile} (hand {hand})"
    opts = legal_options(state, player)
    if opts:
        if tile not in opts:
            d = direction(state["prev"], tile)
            return dest(state["cell"], tile, d), False, (
                f"Rule 3: tile {tile} ({'ccw' if d < 0 else 'cw'}) lands on visited cell "
                f"{dest(state['cell'], tile, d)}; legal tiles were {opts}")
        return dest(state["cell"], tile, direction(state["prev"], tile)), False, None
    # Rule 4: forced play — smallest tile, clockwise, may land on a visited cell
    if tile != min(hand):
        return None, True, f"Rule 4: no legal tile, so must play smallest tile {min(hand)}, not {tile}"
    return dest(state["cell"], tile, 1), True, None

def check(text):
    moves = re.findall(r"MOVE\s*(\d)\s*:\s*(Amber|Blue)\s+plays\s+(\d)\s*->\s*cell\s*(\d)", text, re.I)
    states = {int(m[0]): m for m in re.findall(
        r"STATE\s*(\d)\s*:\s*cell\s*=\s*(\d).*?score\s*Amber\s*=\s*(\d+)\s*,?\s*Blue\s*=\s*(\d+)", text, re.I)}
    st = {"cell": 0, "prev": None, "visited": {0}, "hands": {k: v[:] for k, v in HANDS.items()},
          "score": {"Amber": 0, "Blue": 0}}
    report = {"moves_found": len(moves), "legal": 0, "violations": [], "drift": [], "first_violation": None}
    for turn, player, tile, claimed in moves[:5]:
        turn, tile, claimed = int(turn), int(tile), int(claimed)
        player = player.capitalize()
        if player != ORDER[turn - 1]:
            report["violations"].append(f"turn {turn}: wrong player {player}")
        exp, forced, why = apply(st, player, tile)
        if why:
            report["violations"].append(f"turn {turn}: {why}")
            report["first_violation"] = report["first_violation"] or f"turn {turn}: {why}"
        else:
            report["legal"] += 1
        if exp is None:
            break  # can't continue simulation meaningfully
        if claimed != exp:
            report["drift"].append(f"turn {turn}: claimed cell {claimed}, rules give {exp}")
        # Continue from the rules' position so later turns are judged fairly
        st["hands"][player].remove(tile)
        st["cell"] = exp
        st["visited"].add(exp)
        st["prev"] = tile
        st["score"][player] += exp
        if turn in states:
            _, c, a, b = states[turn]
            if (int(c), int(a), int(b)) != (exp, st["score"]["Amber"], st["score"]["Blue"]):
                report["drift"].append(
                    f"turn {turn} STATE: shown cell={c} A={a} B={b}, "
                    f"true cell={exp} A={st['score']['Amber']} B={st['score']['Blue']}")
    if len(moves) < 5:
        report["violations"].append(f"only {len(moves)} parseable MOVE lines")
    return report

if __name__ == "__main__":
    print(json.dumps(check(open(sys.argv[1]).read()), indent=2))
