import os
import sys
import json

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(repo_root, "scratch"))

from spaces_software_devops import SPACES_SOFTWARE_DEVOPS
from spaces_secops_engineering import SPACES_SECOPS_ENGINEERING
from spaces_data_fintech import SPACES_DATA_FINTECH
from spaces_health_product_care import SPACES_HEALTH_PRODUCT_CARE
from spaces_ecom_creative_legal import SPACES_ECOM_CREATIVE_LEGAL

all_spaces = (
    SPACES_SOFTWARE_DEVOPS
    + SPACES_SECOPS_ENGINEERING
    + SPACES_DATA_FINTECH
    + SPACES_HEALTH_PRODUCT_CARE
    + SPACES_ECOM_CREATIVE_LEGAL
)

print(f"Assembling {len(all_spaces)} spaces into spaces.data.ts...")

# Verify IDs are unique
ids = set()
for s in all_spaces:
    if s["id"] in ids:
        raise ValueError(f"Duplicate space id: {s['id']}")
    ids.add(s["id"])

output_path = os.path.join(repo_root, "web", "src", "features", "library", "data", "spaces.data.ts")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

header = """import type { WorkspaceZonePreset } from '../library.types.js';

/**
 * Curated library of 200+ specialized visual Office Spaces / Workspace Zones.
 * Each space embeds a full operational workflow prompt injected into agent runtime system prompts,
 * defining work ethics, code quality standards, deployment infrastructure, team collaboration,
 * and task delegation rules.
 */
export const SPACE_PRESETS: WorkspaceZonePreset[] = """

with open(output_path, "w", encoding="utf-8") as f:
    f.write(header)
    f.write(json.dumps(all_spaces, indent=2))
    f.write(";\n")

print(f"Successfully wrote {len(all_spaces)} spaces to {output_path}")
