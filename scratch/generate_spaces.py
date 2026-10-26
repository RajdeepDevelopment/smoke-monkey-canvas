import os
import json

def make_workflow_prompt(name, category, ethics, quality, deployment, collaboration, delegation):
    return (
        f"### {name.upper()} OPERATING WORKFLOW & RUNTIME CHARTER\n\n"
        f"**1. WORKSPACE ETHICS & PROFESSIONAL CONDUCT:**\n"
        f"{ethics}\n\n"
        f"**2. OPERATIONAL STANDARDS & DELIVERABLE QUALITY:**\n"
        f"{quality}\n\n"
        f"**3. DEPLOYMENT SERVICES, CI/CD & CLOUD INFRASTRUCTURE:**\n"
        f"{deployment}\n\n"
        f"**4. TEAM COLLABORATION & COMMUNICATION PROTOCOLS:**\n"
        f"{collaboration}\n\n"
        f"**5. TASK DELEGATION & ESCALATION RULES:**\n"
        f"{delegation}"
    )

print("Helper defined.")
