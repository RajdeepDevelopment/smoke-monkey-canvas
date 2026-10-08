import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, X, Plus, Sparkles, Sliders, Clock, Tag, Bot, GripHorizontal } from 'lucide-react';
import type { SpaceContextMenuState } from './space.types.js';
import {
  ENTERPRISE_CATEGORIES,
  ENTERPRISE_DISCIPLINES,
  ENTERPRISE_SPECIALTIES,
  ENTERPRISE_AGENT_TEMPLATES,
  type AgentTemplate,
  type EnterpriseCategory,
} from '../agent/agent.templates.js';

interface SpaceContextMenuProps {
  state: SpaceContextMenuState;
  onAddAgent: (flowX: number, flowY: number) => void;
  onSpawnTemplate: (template: AgentTemplate, flowX: number, flowY: number) => void;
  onCustomizeTemplate: (template: AgentTemplate, flowX: number, flowY: number) => void;
  onClose: () => void;
}

const CATEGORY_SHORT_NAMES: Record<string, string> = {
  All: 'All',
  'Software Development': 'Software',
  'People & Talent': 'People',
  'Finance & Accounting': 'Finance',
  'Sales & Marketing': 'Sales',
  'Customer Experience': 'Support',
  'Legal & Compliance': 'Legal',
  'Data & Analytics': 'Data',
  'Security & SecOps': 'Security',
  'Product & Project Management': 'Product',
  'IT & Operations': 'IT & Ops',
};

const MENU_WIDTH = 470;
const MENU_HEIGHT = 560;

export const SpaceContextMenu: React.FC<SpaceContextMenuProps> = ({
  state,
  onAddAgent,
  onSpawnTemplate,
  onCustomizeTemplate,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EnterpriseCategory>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Drag state ──
  // pos holds the current top-left corner of the panel in viewport coords.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPanelX: number;
    startPanelY: number;
  } | null>(null);
  // Gates the outside-click handler so dragging doesn't close the panel
  const isDraggingRef = useRef(false);

  // Reset drag position whenever menu re-opens at a new location
  useEffect(() => {
    if (state.visible) {
      const clampedX = Math.max(12, Math.min(state.x, window.innerWidth - MENU_WIDTH - 16));
      const clampedY = Math.max(12, Math.min(state.y, window.innerHeight - MENU_HEIGHT - 16));
      setPos({ x: clampedX, y: clampedY });
      setSearchQuery('');
      setSelectedCategory('All');
      setSelectedSubcategory(null);
      setSelectedSpecialty(null);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [state.visible, state.x, state.y]);

  // ── Drag handlers (attached to window during drag) ──
  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag when clicking a button inside the header
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();

      const current = pos ?? {
        x: Math.max(12, Math.min(state.x, window.innerWidth - MENU_WIDTH - 16)),
        y: Math.max(12, Math.min(state.y, window.innerHeight - MENU_HEIGHT - 16)),
      };

      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanelX: current.x,
        startPanelY: current.y,
      };
      isDraggingRef.current = false;

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        isDraggingRef.current = true;
        const dx = ev.clientX - dragRef.current.startMouseX;
        const dy = ev.clientY - dragRef.current.startMouseY;
        const newX = Math.max(0, Math.min(dragRef.current.startPanelX + dx, window.innerWidth - MENU_WIDTH));
        const newY = Math.max(0, Math.min(dragRef.current.startPanelY + dy, window.innerHeight - 60));
        setPos({ x: newX, y: newY });
      };

      const onUp = () => {
        dragRef.current = null;
        // Small delay so the outside-click guard resets after the mouseup event cycle
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [pos, state.x, state.y],
  );

  // ── Close on Escape or click outside (gated during drag) ──
  useEffect(() => {
    if (!state.visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isDraggingRef.current) return; // ignore close during drag
      const menuEl = document.querySelector('.space-context-menu');
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [state.visible, onClose]);

  // ── Taxonomy counts (domain / discipline / specialty) ──
  const { categoryCounts, disciplineCounts, specialtyCounts } = useMemo(() => {
    const categoryCounts: Record<string, number> = { All: ENTERPRISE_AGENT_TEMPLATES.length };
    const disciplineCounts: Record<string, number> = {};
    const specialtyCounts: Record<string, number> = {};
    for (const t of ENTERPRISE_AGENT_TEMPLATES) {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
      if (t.subcategory) {
        const dk = `${t.category} :: ${t.subcategory}`;
        disciplineCounts[dk] = (disciplineCounts[dk] || 0) + 1;
      }
      if (t.subcategory && t.specialty) {
        const sk = `${t.category} :: ${t.subcategory} :: ${t.specialty}`;
        specialtyCounts[sk] = (specialtyCounts[sk] || 0) + 1;
      }
    }
    return { categoryCounts, disciplineCounts, specialtyCounts };
  }, []);

  // ── Filter templates ──
  const filteredTemplates = useMemo(() => {
    let list = ENTERPRISE_AGENT_TEMPLATES;
    if (selectedCategory !== 'All') {
      list = list.filter((t) => t.category === selectedCategory);
      if (selectedSubcategory) {
        list = list.filter((t) => t.subcategory === selectedSubcategory);
        if (selectedSpecialty) {
          list = list.filter((t) => t.specialty === selectedSpecialty);
        }
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.role.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.subcategory || '').toLowerCase().includes(q) ||
          (t.specialty || '').toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [selectedCategory, selectedSubcategory, selectedSpecialty, searchQuery]);

  // ── Drill-down navigation: which pills to show at the current level ──
  const levelPills = useMemo(() => {
    if (selectedCategory === 'All') {
      return ENTERPRISE_CATEGORIES.filter((c) => c !== 'All').map((cat) => ({
        key: cat,
        label: CATEGORY_SHORT_NAMES[cat] || cat,
        count: categoryCounts[cat] || 0,
        onSelect: () => {
          setSelectedCategory(cat);
          setSelectedSubcategory(null);
          setSelectedSpecialty(null);
        },
      }));
    }
    if (!selectedSubcategory) {
      return (ENTERPRISE_DISCIPLINES[selectedCategory] || []).map((disc) => ({
        key: `${selectedCategory}::${disc}`,
        label: disc,
        count: disciplineCounts[`${selectedCategory} :: ${disc}`] || 0,
        onSelect: () => {
          setSelectedSubcategory(disc);
          setSelectedSpecialty(null);
        },
      }));
    }
    return (ENTERPRISE_SPECIALTIES[`${selectedCategory} :: ${selectedSubcategory}`] || []).map((sp) => ({
      key: `${selectedCategory}::${selectedSubcategory}::${sp}`,
      label: sp,
      count: specialtyCounts[`${selectedCategory} :: ${selectedSubcategory} :: ${sp}`] || 0,
      onSelect: () => setSelectedSpecialty(sp),
    }));
  }, [selectedCategory, selectedSubcategory, categoryCounts, disciplineCounts, specialtyCounts]);

  // ── Breadcrumb path for the current drill-down position ──
  const crumbs: { label: string; onClick: () => void }[] = [];
  if (selectedCategory !== 'All') {
    crumbs.push({
      label: CATEGORY_SHORT_NAMES[selectedCategory] || selectedCategory,
      onClick: () => {
        setSelectedSubcategory(null);
        setSelectedSpecialty(null);
      },
    });
  }
  if (selectedSubcategory) {
    crumbs.push({
      label: selectedSubcategory,
      onClick: () => setSelectedSpecialty(null),
    });
  }
  if (selectedSpecialty) {
    crumbs.push({
      label: selectedSpecialty,
      onClick: () => setSelectedSpecialty(selectedSpecialty),
    });
  }

  if (!state.visible || !pos) return null;

  return (
    <div
      className="space-context-menu"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — drag handle */}
      <div
        className="space-context-menu-header draggable-header"
        onMouseDown={handleHeaderMouseDown}
        title="Drag to reposition"
      >
        <div className="header-left">
          <GripHorizontal size={13} className="drag-grip-icon" />
          <Sparkles size={15} className="sparkle-icon" />
          <span className="header-title">Enterprise Agent Spawner</span>
          <span className="header-coords">
            ({Math.round(state.flowX)}, {Math.round(state.flowY)})
          </span>
        </div>
        <button className="context-menu-close-btn" onClick={onClose} title="Close menu">
          <X size={14} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="context-menu-search-wrapper">
        <Search size={14} className="search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          className="context-menu-search-input"
          placeholder="Search 300 enterprise agents, roles, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Taxonomy Drill-Down: Domain → Discipline → Specialty */}
      {crumbs.length > 0 && (
        <div className="context-menu-breadcrumb">
          <button
            className="breadcrumb-chip crumb-root"
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedSubcategory(null);
              setSelectedSpecialty(null);
            }}
            title="Back to all domains"
          >
            ⌂ All
          </button>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <span className="breadcrumb-sep">›</span>
              <button
                className="breadcrumb-chip"
                type="button"
                onClick={crumb.onClick}
                title={i === crumbs.length - 1 ? 'Current location' : 'Navigate up'}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Level Pills (domains, disciplines, or specialties) */}
      <div className="context-menu-categories">
        {levelPills.map((pill) => (
          <button
            key={pill.key}
            className="category-pill"
            onClick={pill.onSelect}
            type="button"
          >
            <span>{pill.label}</span>
            <span className="pill-count">{pill.count}</span>
          </button>
        ))}
      </div>

      {/* Quick Action: Blank Custom Agent */}
      <div className="context-menu-quick-action">
        <button
          className="blank-agent-btn"
          onClick={() => {
            onAddAgent(state.flowX, state.flowY);
            onClose();
          }}
        >
          <div className="blank-btn-left">
            <div className="blank-icon-box">
              <Plus size={15} />
            </div>
            <div>
              <div className="blank-title">+ Blank Custom Agent</div>
              <div className="blank-subtitle">Define custom system prompt, model, &amp; tools from scratch</div>
            </div>
          </div>
        </button>
      </div>

      {/* Results Header */}
      <div className="context-menu-results-info">
        <span>
          {searchQuery ? (
            <>Found {filteredTemplates.length} matching &quot;{searchQuery}&quot;</>
          ) : selectedCategory === 'All' ? (
            <>300 Enterprise Presets Available</>
          ) : !selectedSubcategory ? (
            <>{selectedCategory} · {filteredTemplates.length} agents</>
          ) : !selectedSpecialty ? (
            <>{selectedCategory} › {selectedSubcategory} · {filteredTemplates.length} agents</>
          ) : (
            <>{selectedCategory} › {selectedSubcategory} › {selectedSpecialty} · {filteredTemplates.length} agents</>
          )}
        </span>
      </div>

      {/* Scrollable Templates List */}
      <div className="context-menu-templates-list">
        {filteredTemplates.length === 0 ? (
          <div className="empty-templates-state">
            <Bot size={28} className="empty-icon" />
            <p>No agent templates match your query.</p>
            <button
              className="reset-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedSubcategory(null);
                setSelectedSpecialty(null);
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <div className="template-name-group">
                  <span className="template-name">{template.name}</span>
                  <span
                    className="template-category-badge"
                    title={[template.category, template.subcategory, template.specialty]
                      .filter(Boolean)
                      .join(' › ')}
                  >
                    {template.subcategory || template.category}
                  </span>
                </div>
                {template.suggested_cron && (
                  <span className="template-cron-badge" title={`Schedule: ${template.suggested_cron}`}>
                    <Clock size={10} />
                    <span>{template.suggested_cron}</span>
                  </span>
                )}
              </div>

              <div className="template-role">{template.role}</div>
              <div className="template-description">{template.description}</div>

              {/* Tags & Preloaded Tools */}
              <div className="template-tags">
                <Tag size={10} className="tag-icon" />
                {template.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="template-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Preloaded Tools & Skills */}
              <div className="template-preloaded-tools">
                {template.recommended_mcps && template.recommended_mcps.length > 0 && (
                  <div className="preloaded-tool-row">
                    <span className="preloaded-label">MCPs:</span>
                    {template.recommended_mcps.map((m) => (
                      <span key={m} className="preloaded-mcp-badge" title={`Preloaded MCP tool: ${m}`}>
                        ⚡ {m.replace('-mcp-server', '').replace('-mcp', '')}
                      </span>
                    ))}
                  </div>
                )}
                {template.recommended_skills && template.recommended_skills.length > 0 && (
                  <div className="preloaded-tool-row">
                    <span className="preloaded-label">Skills:</span>
                    {template.recommended_skills.map((s) => (
                      <span key={s} className="preloaded-skill-badge" title={`Preloaded skill: ${s}`}>
                        ✨ {s.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="template-actions">
                <button
                  className="template-spawn-btn"
                  title="Instantly spawn this agent at the clicked coordinates"
                  onClick={() => {
                    onSpawnTemplate(template, state.flowX, state.flowY);
                    onClose();
                  }}
                >
                  <Sparkles size={12} />
                  <span>Spawn Agent</span>
                </button>
                <button
                  className="template-customize-btn"
                  title="Open configuration modal pre-filled with this template"
                  onClick={() => {
                    onCustomizeTemplate(template, state.flowX, state.flowY);
                    onClose();
                  }}
                >
                  <Sliders size={12} />
                  <span>Customize</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
