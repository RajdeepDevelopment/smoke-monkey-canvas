## 🐒 Description of Changes

<!-- Provide a brief description of what this PR does and why it was introduced. -->

---

## Type of Change

- [ ] 🚀 New feature (non-breaking change which adds functionality)
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ⚡ Performance improvement
- [ ] 🎨 UI/UX aesthetic enhancement
- [ ] 🛠️ Refactoring / Tech debt
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration / Build / CI change
- [ ] 🔐 Security fix

---

## Related Issue / ADR

<!-- Link to GitHub Issue, ADR, or design doc -->
- Issue: #
- ADR: docs/architecture/adr-[NNNN].md

---

## Testing Checklist

### Local Verification
- [ ] Tested locally on `http://localhost:3333` (server) and `http://localhost:5180` (web dev)
- [ ] Verified frontend build passes (`npm run build`)
- [ ] Verified server types pass (`npx tsc --noEmit`)
- [ ] Verified NO sensitive credentials, API keys, or `.db` files are included
- [ ] Verified CLI works (`node ./bin/cli.js --help`)

### Test Coverage
- [ ] Unit tests added/updated for new logic (`tests/` or co-located `*.test.ts`)
- [ ] Integration tests added/updated for API endpoints
- [ ] E2E tests added/updated for critical user flows (if applicable)
- [ ] **Coverage threshold met**: `npm run test:coverage` shows ≥ 85% for modified `server/` code paths

### Quality Gates
- [ ] Lint passes (`npm --prefix web run lint`)
- [ ] No new TypeScript `any` types introduced without justification
- [ ] No hardcoded secrets (use `$VAR` placeholders)
- [ ] Memory/file handles properly cleaned up in new code
- [ ] Structured logging used (no `console.log` in production paths)

---

## Architecture & Design Review (for changes > 3 story points)

- [ ] ADR created/updated in `docs/architecture/adr-[NNNN].md`
- [ ] Design reviewed by Tech Lead (Devon Reed) — **24hr SLA for critical paths**
- [ ] Breaking API changes approved by Engineering Manager (David Kim)
- [ ] Migration path documented for schema/interface changes
- [ ] Rollback plan documented

---

## Deployment & Operations

- [ ] Database migrations included (if schema changes)
- [ ] Environment variable changes documented in `.env.example`
- [ ] Feature flag added for gradual rollout (if applicable)
- [ ] Monitoring/alerting updated for new metrics (if applicable)

---

## Documentation

- [ ] README updated (if user-facing change)
- [ ] API docs updated (if endpoint changes)
- [ ] CHANGELOG.md updated (for releases)
- [ ] Code comments added for complex logic

---

## Screenshots / Demo (UI changes)

<!-- Drag and drop screenshots or link to Loom/Video -->

---

## Checklist for Reviewers

- [ ] Code follows project conventions (TypeScript strict, ESLint/Oxlint)
- [ ] Tests are meaningful (not just coverage theater)
- [ ] Error handling includes proper degradation paths
- [ ] Idempotency considered for mutating endpoints
- [ ] Performance impact assessed (no N+1, unbounded loops)
- [ ] Security review passed (no XSS, injection, auth bypass)