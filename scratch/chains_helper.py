"""Helper utilities for constructing and validating hierarchical chains."""

LEVEL_COLORS = {
    0: "#8b5cf6", # Executive / C-level (Purple)
    1: "#3b82f6", # VP / Director (Blue)
    2: "#0284c7", # Manager / Head (Sky)
    3: "#059669", # Lead / Principal (Emerald)
    4: "#d97706", # Senior Specialist (Amber)
    5: "#dc2626", # Engineer / Specialist (Red/Orange)
    6: "#64748b", # Associate / Junior (Slate)
}

def node(
    id: str,
    roleTitle: str,
    name: str,
    level: int,
    parentId: str or None,
    responsibilities: str,
    workflowInstructions: str,
    delegationPolicy: str = "auto",
    color: str = None
):
    if not color:
        color = LEVEL_COLORS.get(level, "#3b82f6")
    return {
        "id": id,
        "roleTitle": roleTitle,
        "name": name,
        "level": level,
        "parentId": parentId,
        "responsibilities": responsibilities.strip(),
        "workflowInstructions": workflowInstructions.strip(),
        "delegationPolicy": delegationPolicy,
        "color": color
    }

def chain(
    id: str,
    name: str,
    description: str,
    category: str,
    domain: str,
    color: str,
    icon: str,
    nodes: list,
    companyName: str = None
):
    return {
        "id": id,
        "name": name,
        "companyName": companyName or name,
        "description": description.strip(),
        "category": category,
        "domain": domain,
        "color": color,
        "icon": icon,
        "nodes": nodes
    }
