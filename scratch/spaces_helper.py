def make_space(
    id,
    name,
    category,
    desc,
    width,
    height,
    color,
    icon,
    resp,
    instructions,
    policy,
    ethics,
    quality,
    deploy,
    collab,
    delegation=None,
    deleg=None,
    **kwargs
):
    deleg_text = delegation if delegation is not None else (deleg if deleg is not None else "")
    prompt = (
        f"### {name.upper()} — WORKSPACE OPERATING WORKFLOW & SYSTEM CHARTER\n\n"
        f"**1. WORKSPACE CULTURE & PROFESSIONAL ETHICS:**\n{ethics}\n\n"
        f"**2. CODE & DELIVERABLE QUALITY BENCHMARKS:**\n{quality}\n\n"
        f"**3. DEPLOYMENT PIPELINE, CI/CD & CLOUD SERVICES:**\n{deploy}\n\n"
        f"**4. TEAM COLLABORATION & ASYNCHRONOUS PROTOCOLS:**\n{collab}\n\n"
        f"**5. TASK DELEGATION & ESCALATION RULES:**\n{deleg_text}"
    )
    return {
        "id": id,
        "name": name,
        "description": desc,
        "category": category,
        "width": width,
        "height": height,
        "color": color,
        "shape": "rectangle",
        "icon": icon,
        "responsibilities": resp,
        "workflowInstructions": instructions,
        "delegationPolicy": policy,
        "workflowPrompt": prompt,
    }
