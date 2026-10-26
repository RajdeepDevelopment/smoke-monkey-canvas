import React, { useState, useMemo } from 'react';
import { Zap, WandSparkles } from 'lucide-react';
import { getBrandVisuals, getBrandIcon } from '../common/brand-icons.js';
import type { StockMcp } from '../mcp/mcp.types.js';
import type { AgentTemplate } from '../agent/agent.templates.js';

export const formatMcpDisplayName = (name: string): string => {
  if (!name) return '';
  const cleaned = name
    .replace(/-mcp-server$/i, '')
    .replace(/-mcp$/i, '')
    .replace(/^mcp-/i, '');

  const known: Record<string, string> = {
    github: 'GitHub',
    gitlab: 'GitLab',
    filesystem: 'Filesystem',
    'local-filesystem': 'Filesystem',
    slack: 'Slack',
    notion: 'Notion',
    'google-drive': 'Google Drive',
    jira: 'Jira',
    'jira-cloud': 'Jira',
    sentry: 'Sentry',
    linear: 'Linear',
    postgres: 'PostgreSQL',
    postgresql: 'PostgreSQL',
    bigquery: 'BigQuery',
    excel: 'Excel',
    spreadsheet: 'Spreadsheet',
    gcal: 'Google Calendar',
    gmail: 'Gmail',
    brave: 'Brave Search',
    'brave-search': 'Brave Search',
    playwright: 'Playwright',
    puppeteer: 'Puppeteer',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    confluence: 'Confluence',
    hubspot: 'HubSpot',
    salesforce: 'Salesforce',
    linkedin: 'LinkedIn',
    miro: 'Miro',
    asana: 'Asana',
    tavily: 'Tavily',
    exa: 'Exa',
    firecrawl: 'Firecrawl',
    supabase: 'Supabase',
    redis: 'Redis',
    mongodb: 'MongoDB',
    mysql: 'MySQL',
    sqlite: 'SQLite',
    datadog: 'Datadog',
    discord: 'Discord',
    zendesk: 'Zendesk',
    intercom: 'Intercom',
    twilio: 'Twilio',
    figma: 'Figma',
    stripe: 'Stripe',
  };

  const key = cleaned.toLowerCase();
  if (known[key]) return known[key];

  return cleaned
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const formatSkillDisplayName = (skill: string): { label: string; owner?: string; full: string } => {
  if (!skill) return { label: '', full: '' };
  if (skill.includes('/')) {
    const [owner, rawRepo] = skill.split('/');
    const cleanRepo = (rawRepo || skill)
      .replace(/-mcp-server$/i, '')
      .replace(/-mcp$/i, '');
    return {
      label: cleanRepo,
      owner,
      full: skill,
    };
  }

  const label = skill
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    label,
    full: skill,
  };
};

export const AgentMcpBadge: React.FC<{
  mcpName: string;
  catalogMcp?: StockMcp;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ mcpName, catalogMcp, onClick }) => {
  const label = catalogMcp?.label || formatMcpDisplayName(mcpName);
  const brand = getBrandVisuals(`${label} ${mcpName}`, 12);
  const [imgError, setImgError] = useState(false);

  const icon = useMemo(() => {
    if (catalogMcp?.iconUrl && !imgError) {
      return (
        <img
          src={catalogMcp.iconUrl}
          alt=""
          onError={() => setImgError(true)}
          className="lib-mini-chip-img"
          loading="lazy"
        />
      );
    }
    if (brand.icon) {
      return brand.icon;
    }
    return <Zap size={10} color="#fb923c" />;
  }, [catalogMcp?.iconUrl, imgError, brand.icon]);

  return (
    <span
      className={`lib-agent-mini-chip lib-agent-mcp-chip ${onClick ? 'is-clickable' : ''}`}
      title={`MCP Server: ${label}${catalogMcp?.description ? ` — ${catalogMcp.description}` : ''}`}
      onClick={onClick}
      style={{
        '--chip-border': brand.borderColor,
        '--chip-bg': brand.bgColor,
        '--chip-color': brand.color,
      } as React.CSSProperties}
    >
      <span className="lib-mini-chip-icon">{icon}</span>
      <span className="lib-mini-chip-text">{label}</span>
    </span>
  );
};

export const AgentSkillBadge: React.FC<{
  skillId: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ skillId, onClick }) => {
  const { label, owner, full } = formatSkillDisplayName(skillId);
  const [imgError, setImgError] = useState(false);

  const brandIcon = useMemo(() => {
    if (!owner) return getBrandIcon(skillId, 12);
    return getBrandIcon(owner, 12) || getBrandIcon(label, 12);
  }, [owner, label, skillId]);

  const avatarUrl = useMemo(() => {
    if (owner) {
      return `https://avatars.githubusercontent.com/${owner}?s=32`;
    }
    return null;
  }, [owner]);

  const icon = useMemo(() => {
    if (brandIcon) return brandIcon;
    if (avatarUrl && !imgError) {
      return (
        <img
          src={avatarUrl}
          alt=""
          onError={() => setImgError(true)}
          className="lib-mini-chip-img"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    }
    return <WandSparkles size={10} color="#c084fc" />;
  }, [brandIcon, avatarUrl, imgError]);

  return (
    <span
      className={`lib-agent-mini-chip lib-agent-skill-chip ${onClick ? 'is-clickable' : ''}`}
      title={`Skill: ${full}${owner ? ` (${owner})` : ''}`}
      onClick={onClick}
    >
      <span className="lib-mini-chip-icon">{icon}</span>
      <span className="lib-mini-chip-text">{label}</span>
    </span>
  );
};

export interface AgentResourceRowsProps {
  agent: AgentTemplate;
  catalogMcps?: Map<string, StockMcp>;
  onSelectMcp?: (mcp: StockMcp) => void;
  maxCollapsed?: number;
}

export const AgentResourceRows: React.FC<AgentResourceRowsProps> = ({
  agent,
  catalogMcps,
  onSelectMcp,
  maxCollapsed = 3,
}) => {
  const [mcpsExpanded, setMcpsExpanded] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);

  const rawMcps = agent.recommended_mcps || [];
  const mcps = catalogMcps && catalogMcps.size > 0
    ? rawMcps.filter((name) => catalogMcps.has(name))
    : rawMcps;
  const skills = agent.recommended_skills || [];

  if (mcps.length === 0 && skills.length === 0) return null;

  const visibleMcps = mcpsExpanded ? mcps : mcps.slice(0, maxCollapsed);
  const hiddenMcpsCount = mcps.length - maxCollapsed;
  const hasMoreMcps = mcps.length > maxCollapsed;

  const visibleSkills = skillsExpanded ? skills : skills.slice(0, maxCollapsed);
  const hiddenSkillsCount = skills.length - maxCollapsed;
  const hasMoreSkills = skills.length > maxCollapsed;

  return (
    <div className="lib-agent-resources-block" onClick={(e) => e.stopPropagation()}>
      {/* Linked MCPs */}
      {mcps.length > 0 && (
        <div className="lib-agent-resource-row">
          <span
            className="lib-agent-resource-prefix mcp"
            title={`${mcps.length} Linked MCP Servers`}
          >
            <Zap size={8.5} /> MCPs
          </span>
          {visibleMcps.map((mcpName) => {
            const catMcp = catalogMcps?.get(mcpName);
            return (
              <AgentMcpBadge
                key={mcpName}
                mcpName={mcpName}
                catalogMcp={catMcp}
                onClick={
                  catMcp && onSelectMcp
                    ? (e) => {
                        e.stopPropagation();
                        onSelectMcp(catMcp);
                      }
                    : undefined
                }
              />
            );
          })}
          {hasMoreMcps && (
            <button
              type="button"
              className="lib-agent-more-badge"
              onClick={(e) => {
                e.stopPropagation();
                setMcpsExpanded((prev) => !prev);
              }}
              title={
                mcpsExpanded
                  ? 'Collapse MCP list'
                  : `+${hiddenMcpsCount} more: ${mcps
                      .slice(maxCollapsed)
                      .map(formatMcpDisplayName)
                      .join(', ')} (click to expand)`
              }
            >
              {mcpsExpanded ? '− Less' : `+${hiddenMcpsCount}`}
            </button>
          )}
        </div>
      )}

      {/* Attached Skills */}
      {skills.length > 0 && (
        <div className="lib-agent-resource-row">
          <span
            className="lib-agent-resource-prefix skill"
            title={`${skills.length} Attached Skills`}
          >
            <WandSparkles size={8.5} /> Skills
          </span>
          {visibleSkills.map((skillId) => (
            <AgentSkillBadge key={skillId} skillId={skillId} />
          ))}
          {hasMoreSkills && (
            <button
              type="button"
              className="lib-agent-more-badge"
              onClick={(e) => {
                e.stopPropagation();
                setSkillsExpanded((prev) => !prev);
              }}
              title={
                skillsExpanded
                  ? 'Collapse skills list'
                  : `+${hiddenSkillsCount} more: ${skills
                      .slice(maxCollapsed)
                      .map((s) => s.split('/').pop())
                      .join(', ')} (click to expand)`
              }
            >
              {skillsExpanded ? '− Less' : `+${hiddenSkillsCount}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
