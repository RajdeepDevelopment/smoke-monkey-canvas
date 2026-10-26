import json

def test_layout(nodes, node_w=300, node_h=160, h_gap=36, v_gap=85):
    by_id = {n["id"]: n for n in nodes}
    children_map = {n["id"]: [] for n in nodes}
    roots = []
    for n in nodes:
        pid = n.get("parentId")
        if pid and pid in children_map:
            children_map[pid].append(n)
        else:
            roots.append(n)

    subtree_w = {}
    def calc_w(n):
        kids = children_map[n["id"]]
        if not kids:
            subtree_w[n["id"]] = node_w
            return node_w
        kw = sum(calc_w(k) for k in kids) + (len(kids) - 1) * h_gap
        w = max(node_w, kw)
        subtree_w[n["id"]] = w
        return w

    for r in roots:
        calc_w(r)

    placed = []
    def place(n, cur_x, start_y):
        w = subtree_w[n["id"]]
        x = cur_x + (w - node_w) / 2
        y = start_y + n["level"] * (node_h + v_gap)
        placed.append({"id": n["id"], "role": n["roleTitle"], "x": round(x), "y": round(y), "w": node_w, "h": node_h})
        kids = children_map[n["id"]]
        if kids:
            total_kw = sum(subtree_w[k["id"]] for k in kids) + (len(kids) - 1) * h_gap
            cx = cur_x + (w - total_kw) / 2
            for k in kids:
                place(k, cx, start_y)
                cx += subtree_w[k["id"]] + h_gap

    start_x = 40
    start_y = 60
    cur_x = start_x
    for r in roots:
        place(r, cur_x, start_y)
        cur_x += subtree_w[r["id"]] + h_gap * 2

    # Check for bounding box
    min_x = min(p["x"] for p in placed)
    max_x = max(p["x"] + p["w"] for p in placed)
    min_y = min(p["y"] for p in placed)
    max_y = max(p["y"] + p["h"] for p in placed)
    return placed, max_x + 40, max_y + 40

with open("scratch/build_data.py") as f:
    text = f.read()

# Execute build_data to get chains
loc = {}
exec(text, {}, loc)
chains = loc["chains"]

for c in chains:
    placed, req_w, req_h = test_layout(c["nodes"])
    print(f"Chain {c['name']}: {len(placed)} nodes placed, required canvas size: {req_w}x{req_h}")
