#!/usr/bin/env python3
import json
import os
import sys

# Import original chains and all specialized modules
import build_data
import chains_startups_saas
import chains_support_escalation
import chains_product_sales_gtm
import chains_infra_secops
import chains_ai_data_fintech
import chains_it_consulting_games
import chains_verticals_deeptech

all_chains = []
# 1. Original 11 chains
all_chains.extend(build_data.chains)
# 2. Startups & SaaS scaleup varieties (16)
all_chains.extend(chains_startups_saas.CHAINS)
# 3. Customer Support & Issue Escalation (12)
all_chains.extend(chains_support_escalation.CHAINS)
# 4. Product, Design, Sales & GTM (16)
all_chains.extend(chains_product_sales_gtm.CHAINS)
# 5. Cloud, DevOps, SRE & SecOps (18)
all_chains.extend(chains_infra_secops.CHAINS)
# 6. AI, Data & FinTech (18)
all_chains.extend(chains_ai_data_fintech.CHAINS)
# 7. IT Consulting & Game Dev (15)
all_chains.extend(chains_it_consulting_games.CHAINS)
# 8. Verticals & DeepTech (16)
all_chains.extend(chains_verticals_deeptech.CHAINS)

print(f"Total chains collected: {len(all_chains)}")

# Validation
seen_chain_ids = set()
total_nodes = 0

for i, chain in enumerate(all_chains):
    cid = chain.get("id")
    if not cid:
        raise ValueError(f"Chain at index {i} has no id: {chain}")
    if cid in seen_chain_ids:
        raise ValueError(f"Duplicate chain id '{cid}' found!")
    seen_chain_ids.add(cid)

    nodes = chain.get("nodes", [])
    if not nodes:
        raise ValueError(f"Chain '{cid}' has no nodes!")

    total_nodes += len(nodes)
    node_ids = set()
    for n in nodes:
        nid = n.get("id")
        if not nid:
            raise ValueError(f"In chain '{cid}', node has no id: {n}")
        if nid in node_ids:
            raise ValueError(f"In chain '{cid}', duplicate node id '{nid}'!")
        node_ids.add(nid)

    # Check parentIds and acyclicity
    roots = []
    children_map = {nid: [] for nid in node_ids}
    for n in nodes:
        pid = n.get("parentId")
        if pid is None:
            roots.append(n["id"])
        else:
            if pid not in node_ids:
                raise ValueError(f"In chain '{cid}', node '{n['id']}' references unknown parentId '{pid}'!")
            children_map[pid].append(n["id"])

    if not roots:
        raise ValueError(f"In chain '{cid}', no root nodes found (all nodes have parentId)!")

    # Check for cycles using DFS
    visited = set()
    visiting = set()
    def dfs(curr):
        if curr in visiting:
            raise ValueError(f"Cycle detected in chain '{cid}' involving node '{curr}'!")
        if curr in visited:
            return
        visiting.add(curr)
        for child in children_map[curr]:
            dfs(child)
        visiting.remove(curr)
        visited.add(curr)

    for r in roots:
        dfs(r)

print(f"All {len(all_chains)} chains successfully validated! Total nodes: {total_nodes}")

# Prepare TypeScript file content
ts_code = f"""import type {{ HierarchicalChainPreset }} from '../library.types.js';
import type {{ RoleZone }} from '../../../features/space/space.types.js';

export const HIERARCHICAL_CHAINS: HierarchicalChainPreset[] = {json.dumps(all_chains, indent=2)};

export interface HierarchicalLayoutResult {{
  zones: (Omit<RoleZone, 'id'> & {{ id: string; chainNodeId: string }})[];
  requiredWidth: number;
  requiredHeight: number;
}}

/**
 * Calculates absolute coordinates for an entire company hierarchical chain
 * so all reporting tiers form a clean top-to-bottom flowchart tree inside the space.
 */
export function layoutHierarchicalChain(
  chain: HierarchicalChainPreset,
  space: {{ x?: number; y?: number; width?: number; height?: number }} = {{ x: 0, y: 0 }},
  startOffset = {{ x: 36, y: 70 }},
  nodeDimensions = {{ width: 300, height: 160 }},
  spacing = {{ horizontalGap: 36, verticalGap: 85 }},
): HierarchicalLayoutResult {{
  const {{ width: nodeW, height: nodeH }} = nodeDimensions;
  const {{ horizontalGap: hGap, verticalGap: vGap }} = spacing;

  const childrenMap = new Map<string, typeof chain.nodes>();
  const roots: typeof chain.nodes = [];
  const nodeMap = new Map<string, (typeof chain.nodes)[0]>();

  for (const n of chain.nodes) {{
    nodeMap.set(n.id, n);
    childrenMap.set(n.id, []);
  }}

  for (const n of chain.nodes) {{
    if (n.parentId && childrenMap.has(n.parentId)) {{
      childrenMap.get(n.parentId)!.push(n);
    }} else {{
      roots.push(n);
    }}
  }}

  // Calculate width of each subtree recursively
  const subtreeWidths = new Map<string, number>();
  function calculateSubtreeWidth(node: (typeof chain.nodes)[0]): number {{
    const kids = childrenMap.get(node.id) || [];
    if (kids.length === 0) {{
      subtreeWidths.set(node.id, nodeW);
      return nodeW;
    }}
    const kidsWidth = kids.reduce((sum, kid) => sum + calculateSubtreeWidth(kid), 0) + (kids.length - 1) * hGap;
    const width = Math.max(nodeW, kidsWidth);
    subtreeWidths.set(node.id, width);
    return width;
  }}

  for (const root of roots) {{
    calculateSubtreeWidth(root);
  }}

  // Generate unique IDs for every node so parents and children are linked
  const generatedIdMap = new Map<string, string>();
  for (const n of chain.nodes) {{
    const uniqueId = `rz-${{chain.id}}-${{n.id}}-${{Date.now().toString(36)}}-${{Math.random().toString(36).slice(2, 6)}}`;
    generatedIdMap.set(n.id, uniqueId);
  }}

  const placedZones: (Omit<RoleZone, 'id'> & {{ id: string; chainNodeId: string }})[] = [];

  function placeNode(
    node: (typeof chain.nodes)[0],
    currentX: number,
    baseY: number,
  ) {{
    const sWidth = subtreeWidths.get(node.id) || nodeW;
    const x = Math.round(currentX + (sWidth - nodeW) / 2);
    const y = Math.round(baseY + node.level * (nodeH + vGap));
    const uniqueId = generatedIdMap.get(node.id)!;
    const parentId = node.parentId ? generatedIdMap.get(node.parentId) ?? null : null;

    placedZones.push({{
      id: uniqueId,
      chainNodeId: node.id,
      name: node.name,
      roleTitle: node.roleTitle,
      level: node.level,
      parentZoneId: parentId,
      responsibilities: node.responsibilities,
      workflowInstructions: node.workflowInstructions,
      delegationPolicy: node.delegationPolicy ?? 'auto',
      x,
      y,
      width: nodeW,
      height: nodeH,
      color: node.color || '#3b82f6',
      shape: 'rectangle',
    }});

    const kids = childrenMap.get(node.id) || [];
    if (kids.length > 0) {{
      const totalKidsWidth = kids.reduce((sum, kid) => sum + (subtreeWidths.get(kid.id) || nodeW), 0) + (kids.length - 1) * hGap;
      let kidX = currentX + (sWidth - totalKidsWidth) / 2;
      for (const kid of kids) {{
        placeNode(kid, kidX, baseY);
        kidX += (subtreeWidths.get(kid.id) || nodeW) + hGap;
      }}
    }}
  }}

  const spaceX = space.x ?? 0;
  const spaceY = space.y ?? 0;
  let rootX = spaceX + startOffset.x;
  for (const root of roots) {{
    placeNode(root, rootX, spaceY + startOffset.y);
    rootX += (subtreeWidths.get(root.id) || nodeW) + hGap * 2;
  }}

  // Calculate required bounding box
  const maxX = Math.max(...placedZones.map((z) => z.x + z.width));
  const maxY = Math.max(...placedZones.map((z) => z.y + z.height));

  const requiredWidth = Math.max(maxX - spaceX + startOffset.x, 720);
  const requiredHeight = Math.max(maxY - spaceY + startOffset.y, 520);

  return {{
    zones: placedZones,
    requiredWidth,
    requiredHeight,
  }};
}}
"""

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
target_path = os.path.join(repo_root, "web/src/features/library/data/hierarchical-chains.data.ts")
with open(target_path, "w", encoding="utf-8") as f:
    f.write(ts_code)

print(f"Successfully generated {target_path} ({len(ts_code)} bytes).")
