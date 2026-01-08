# Domain Model

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌────────────┐
│  profiles   │       │  content_items  │       │ categories │
├─────────────┤       ├─────────────────┤       ├────────────┤
│ id (PK)     │◄──────│ created_by (FK) │       │ id (PK)    │
│ email       │       │ id (PK)         │───────│ name       │
│ display_name│       │ title           │       │ color      │
│ role        │       │ description     │       └────────────┘
└─────────────┘       │ platform        │
      │               │ category_id(FK) │───────►
      │               │ stage           │
      │               │ scheduled_date  │
      │               │ timeline_days   │
      │               └────────┬────────┘
      │                        │
      │               ┌────────┴────────┐
      │               │                 │
      ▼               ▼                 ▼
┌─────────────┐  ┌─────────┐      ┌──────────┐
│  comments   │  │ assets  │      │ (views)  │
├─────────────┤  ├─────────┤      ├──────────┤
│ id (PK)     │  │ id (PK) │      │ Backlog  │
│ content_id  │  │ cont_id │      │ Calendar │
│ author_id   │  │ type    │      │ Timeline │
│ body        │  │ url     │      │ Board    │
└─────────────┘  │ label   │      └──────────┘
                 └─────────┘
```

## Tables Overview

### 1. `profiles`
Extends Supabase Auth. Stores app-specific user data.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | References auth.users |
| email | TEXT | From auth |
| display_name | TEXT | For UI |
| role | user_role | admin, editor, viewer |

**Auto-created** via trigger when user signs up.

### 2. `categories`
User-defined groupings (like Jira epics).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | TEXT | Unique, e.g., "Product Launch", "Weekly Series" |
| color | TEXT | Hex color for UI badges |

### 3. `content_items` (Core Object)
The single source of truth. All views derive from this table.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| title | TEXT | Required |
| description | TEXT | Notes, script ideas, etc. |
| platform | content_platform | instagram, youtube, etc. |
| category_id | UUID | FK to categories (optional) |
| stage | content_stage | idea → script → shooting → editing → scheduled → posted |
| scheduled_date | DATE | **NULL = backlog**, NOT NULL = scheduled |
| timeline_days | INTEGER | Days needed before posting (default 7) |
| created_by | UUID | FK to profiles |

### 4. `assets`
Google Drive links for each content item.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| content_item_id | UUID | FK to content_items (CASCADE delete) |
| type | asset_type | raw_files, inspiration, final_post |
| url | TEXT | Google Drive link |
| label | TEXT | Optional description |

### 5. `comments`
Linear thread per content item.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| content_item_id | UUID | FK to content_items (CASCADE delete) |
| author_id | UUID | FK to profiles |
| body | TEXT | Comment text |

---

## Enums

### `content_stage` (Ordered Workflow)
```
idea → script → shooting → editing → scheduled → posted
```

### `content_platform`
```
instagram | youtube | youtube_shorts | tiktok | podcast | twitter | linkedin
```

### `asset_type`
```
raw_files | inspiration | final_post
```

### `user_role`
```
admin | editor | viewer
```

---

## View Derivation (Frontend Queries)

All views query the **same `content_items` table** with different filters.

### Backlog View
Items without a scheduled date.

```sql
SELECT * FROM content_items
WHERE scheduled_date IS NULL
ORDER BY created_at DESC;
```

**UI**: Kanban board grouped by `stage`, or a simple list.

### Calendar View
Items with a scheduled date, grouped by date.

```sql
SELECT * FROM content_items
WHERE scheduled_date IS NOT NULL
ORDER BY scheduled_date ASC;
```

**UI**: Monthly/weekly calendar grid.

### Timeline/Gantt View
Scheduled items with computed start date.

```sql
SELECT *,
  (scheduled_date - timeline_days) AS timeline_start_date
FROM content_items
WHERE scheduled_date IS NOT NULL
ORDER BY timeline_start_date ASC;
```

**UI**: Horizontal bars from `timeline_start_date` to `scheduled_date`.

### Board View (by Stage)
All items grouped by production stage.

```sql
SELECT * FROM content_items
ORDER BY stage, scheduled_date NULLS LAST;
```

**UI**: Kanban columns for each stage.

---

## Key Design Decisions

### 1. `scheduled_date` as the Backlog Indicator
- **NULL** = backlog (no date assigned yet)
- **NOT NULL** = appears on calendar/timeline

This is simpler than a separate `is_backlog` boolean.

### 2. `timeline_days` for Planning
Instead of storing both start and end dates, we store:
- `scheduled_date` (the publish/post date)
- `timeline_days` (how many days of work needed)

The frontend computes: `start_date = scheduled_date - timeline_days`

### 3. Assets as Separate Table
Multiple Drive links per content item:
- Raw footage/files
- Inspiration posts
- Final deliverable

This is more flexible than 3 separate URL columns.

### 4. Categories are User-Defined
Like Jira epics. Examples:
- "Q1 Product Launch"
- "Weekly Tips Series"
- "Client: Acme Corp"

### 5. Linear Comments (Not Threaded)
Simple chronological comments. No replies-to-replies.
Sufficient for internal ops.

---

## Data Retention (4 months)

Old content is deleted manually or via scheduled function.

**Option 1: Manual (Recommended for Free Tier)**
```sql
DELETE FROM content_items
WHERE created_at < NOW() - INTERVAL '4 months';
```

**Option 2: Supabase Edge Function (Cron)**
Set up a scheduled function if you upgrade.

---

## Row Level Security Summary

| Table | Viewers | Editors | Admins |
|-------|---------|---------|--------|
| profiles | Read all | Read all | Read all, Update all |
| categories | Read all | Read all | Full CRUD |
| content_items | Read all | Full CRUD | Full CRUD |
| assets | Read all | Full CRUD | Full CRUD |
| comments | Read all, Create | Read all, Create, Update own | Full CRUD |
