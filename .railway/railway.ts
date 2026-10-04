// ──────────────────────────────────────────────────────────────────────────────
// 🐒 Smoke Monkey Canvas — Railway Infrastructure as Code
// ──────────────────────────────────────────────────────────────────────────────
// Authoring API: https://docs.railway.com/infrastructure-as-code/reference
//
// Apply with the official CLI, `npm i -g @railway/cli` (the CLI is a separate
// package from the `railway` SDK that provides the "railway/iac" DSL below —
// that one is already a devDependency of this repo):
//   railway login
//   railway link
//   railway config plan      # preview
//   railway config apply     # provision
//
// Then publish this project as a Railway template so users get a one-click deploy:
//   railway templates create --project <project> --environment production
//   railway templates publish <template-code> \
//     --category "AI/ML" \
//     --description "Deploy and Host Smoke Monkey Canvas with Railway" \
//     --readme-file README.template.md
//
// NOTE: this file declares a *project*. A one-click "Deploy to Railway" URL only
// exists once `railway templates publish` has assigned the template a code, at
// which point the URL is https://railway.com/new/template/<CODE>.
// ──────────────────────────────────────────────────────────────────────────────

import { defineRailway, image, project, service, volume } from "railway/iac";

// Where the persistent volume is provisioned. Must match the service region.
const REGION = "us-west2";

export default defineRailway(() => {
  // SQLite database lives on this volume. Without it every redeploy wipes
  // agents, chat history and encrypted API keys.
  const canvasData = volume("canvas-data", {
    region: REGION,
    sizeMB: 5120,
  });

  const canvas = service("Smoke Monkey Canvas", {
    // Official multi-arch image on Docker Hub (linux/amd64 + linux/arm64).
    // Railway redeploys unversioned tags such as `:latest` on every deploy,
    // so upgrades are a redeploy away.
    source: image("rajdeepsadhu/smoke-monkey-canvas:latest"),
    healthcheck: "/api/space",
    volumeMounts: {
      "/app/data": canvasData,
    },
    env: {
      NODE_ENV: "production",
      SMOKE_CANVAS_DB: "/app/data/canvas.db",
      // Volumes are mounted as root. The image runs as `node`, so without this
      // the SQLite file cannot be written. See docs.railway.com/volumes#permissions
      RAILWAY_RUN_UID: "0",
    },
  });

  return project("smoke-monkey-canvas", {
    resources: [canvas, canvasData],
  });
});