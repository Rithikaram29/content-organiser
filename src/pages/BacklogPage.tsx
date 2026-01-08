import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useContentStore } from "../features/content/contentStore";
import type { ContentItem, ContentStage } from "../data/dbTypes";

const STAGES: { key: ContentStage; label: string; color: string }[] = [
  { key: "idea", label: "Ideas", color: "#f59e0b" },
  { key: "script", label: "Script", color: "#3b82f6" },
  { key: "shooting", label: "Shooting", color: "#ec4899" },
  { key: "editing", label: "Editing", color: "#6366f1" },
  { key: "scheduled", label: "Scheduled", color: "#10b981" },
  { key: "posted", label: "Posted", color: "#2a22c5ff" },
];

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG",
  youtube: "YT",
  youtube_shorts: "YTS",
  tiktok: "TT",
  podcast: "POD",
  twitter: "X",
  linkedin: "LI",
  other: "OTH",
};

function ContentCard({ item }: { item: ContentItem }) {
  const stageInfo = STAGES.find((s) => s.key === item.stage);

  return (
    <Link to={`/item/${item.id}`} className="kanban-card">
      <div className="kanban-card-header">
        <span className="kanban-card-platform">{PLATFORM_ICONS[item.platform] || item.platform}</span>
        {item.timeline_days > 0 && (
          <span className="kanban-card-timeline">{item.timeline_days}d</span>
        )}
      </div>
      <h4 className="kanban-card-title">{item.title}</h4>
      {item.description && (
        <p className="kanban-card-description">{item.description}</p>
      )}
      <div className="kanban-card-footer">
        <span
          className="kanban-card-stage"
          style={{ backgroundColor: stageInfo?.color + "20", color: stageInfo?.color }}
        >
          {stageInfo?.label}
        </span>
        {item.scheduled_date && (
          <span className="kanban-card-date">
            {new Date(item.scheduled_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </Link>
  );
}

function KanbanColumn({
  stage,
  items,
}: {
  stage: { key: ContentStage; label: string; color: string };
  items: ContentItem[];
}) {
  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span
          className="kanban-column-indicator"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="kanban-column-title">{stage.label}</h3>
        <span className="kanban-column-count">{items.length}</span>
      </div>
      <div className="kanban-column-content">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="kanban-empty">No items</div>
        )}
      </div>
    </div>
  );
}

export function BacklogPage() {
  const { items, loading, refreshBacklog } = useContentStore();

  useEffect(() => {
    refreshBacklog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = items.filter((item) => item.stage === stage.key);
      return acc;
    },
    {} as Record<ContentStage, ContentItem[]>
  );

  return (
    <div className="backlog-container">
      <div className="page-header">
        <h1 className="page-title">Content Backlog</h1>
        <p className="page-subtitle">
          Track your content through each stage of production
        </p>
      </div>

      {loading ? (
        <div className="loading">
          <span className="loading-spinner"></span>
          <span style={{ marginLeft: 12 }}>Loading content...</span>
        </div>
      ) : (
        <div className="kanban-board">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              items={itemsByStage[stage.key] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
