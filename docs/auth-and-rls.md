# Auth and Row Level Security (RLS)

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE AUTH                        │
│  (handles login, sessions, tokens - we don't touch)    │
└─────────────────────┬───────────────────────────────────┘
                      │ auto-creates
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    PROFILES TABLE                       │
│  (our app data: display_name, role)                    │
└─────────────────────┬───────────────────────────────────┘
                      │ role checked by
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    RLS POLICIES                         │
│  (database enforces permissions on every query)        │
└─────────────────────────────────────────────────────────┘
```

---

## 1. User Table Structure

### `auth.users` (Supabase managed - don't modify)
Supabase creates this automatically. Contains email, password hash, etc.

### `profiles` (Our table - extends auth.users)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',  -- Safe default
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Same as auth.users.id (1:1 relationship) |
| email | TEXT | Copied from auth for convenience |
| display_name | TEXT | Shown in UI ("John" instead of "john@company.com") |
| role | user_role | **admin**, **editor**, or **viewer** |

### Why a separate profiles table?
- Supabase Auth tables are in `auth` schema (restricted access)
- We need a `public` table we can query with RLS
- Allows us to add app-specific fields (role, display_name)

---

## 2. Role Assignment Flow

### Roles Defined

```sql
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
```

| Role | Can Read | Can Create/Update | Can Delete | Manage Users |
|------|----------|-------------------|------------|--------------|
| viewer | Yes | No | No | No |
| editor | Yes | Yes | No | No |
| admin | Yes | Yes | Yes | Yes |

### How Users Get Roles

**Step 1: User signs up or is invited**
- They authenticate via Supabase Auth (email/password or magic link)
- Trigger auto-creates profile with `role = 'viewer'` (safe default)

**Step 2: Admin promotes user**
- Admin updates the profile:
```sql
UPDATE profiles SET role = 'editor' WHERE email = 'jane@company.com';
```

### Auto-Create Profile Trigger

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'viewer'  -- ALWAYS start as viewer (principle of least privilege)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### First Admin Setup (One-time)

After deploying, manually set the first admin:

```sql
-- Run this ONCE in Supabase SQL Editor
UPDATE profiles SET role = 'admin' WHERE email = 'rithika@yourcompany.com';
```

---

## 3. RLS Policies Per Table

### Helper Function (Check User Role)

```sql
-- Returns current user's role (used in all policies)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

This simplifies policies: `auth.user_role() = 'admin'` instead of a subquery.

---

### 3.1 `profiles` Table

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read all profiles (needed for display names, assignments)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own display_name (but NOT role)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM profiles WHERE id = auth.uid())  -- Prevents role self-promotion
  );

-- Only admins can change anyone's role
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.user_role() = 'admin');
```

**Key safety**: Users cannot change their own role. The `WITH CHECK` ensures `role` stays the same unless an admin is making the change.

---

### 3.2 `categories` Table

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "categories_select"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete categories
CREATE POLICY "categories_insert"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY "categories_update"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.user_role() = 'admin');

CREATE POLICY "categories_delete"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.user_role() = 'admin');
```

**Rationale**: Categories are structural data. Only admins should manage them.

---

### 3.3 `content_items` Table

```sql
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "content_items_select"
  ON content_items FOR SELECT
  TO authenticated
  USING (true);

-- Editors and admins can create
CREATE POLICY "content_items_insert"
  ON content_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'editor'));

-- Editors and admins can update
CREATE POLICY "content_items_update"
  ON content_items FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('admin', 'editor'));

-- ONLY admins can delete (safety measure)
CREATE POLICY "content_items_delete"
  ON content_items FOR DELETE
  TO authenticated
  USING (auth.user_role() = 'admin');
```

**Key safety**: Editors can create and update but **cannot delete**. Only admins can delete content.

---

### 3.4 `assets` Table

```sql
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "assets_select"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

-- Editors and admins can create
CREATE POLICY "assets_insert"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'editor'));

-- Editors and admins can update
CREATE POLICY "assets_update"
  ON assets FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('admin', 'editor'));

-- Only admins can delete
CREATE POLICY "assets_delete"
  ON assets FOR DELETE
  TO authenticated
  USING (auth.user_role() = 'admin');
```

---

### 3.5 `comments` Table

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "comments_select"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

-- Editors and admins can create comments
CREATE POLICY "comments_insert"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('admin', 'editor'));

-- Users can only update their OWN comments
CREATE POLICY "comments_update"
  ON comments FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid() AND
    auth.user_role() IN ('admin', 'editor')
  );

-- Users can delete their own comments, admins can delete any
CREATE POLICY "comments_delete"
  ON comments FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid() OR
    auth.user_role() = 'admin'
  );
```

**Rationale**: Comments are more personal. Users can edit/delete their own, admins can moderate.

---

## 4. Safety Guards

### 4.1 No Public Access

```sql
-- Revoke all access from anonymous users (belt and suspenders)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
```

All policies use `TO authenticated` - anonymous users get nothing.

### 4.2 Soft Delete Option

Instead of hard deletes, add an `archived` flag:

```sql
ALTER TABLE content_items ADD COLUMN archived BOOLEAN DEFAULT false;

-- Modify select policy to hide archived by default
CREATE POLICY "content_items_select"
  ON content_items FOR SELECT
  TO authenticated
  USING (archived = false OR auth.user_role() = 'admin');
```

Editors "delete" by setting `archived = true`. Admins can still see and recover.

### 4.3 Prevent Accidental Bulk Deletes

Add a trigger that prevents deleting more than 10 items at once:

```sql
CREATE OR REPLACE FUNCTION prevent_bulk_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- This runs per-row, so we count in a transaction
    IF (SELECT count(*) FROM content_items WHERE id = OLD.id) > 10 THEN
      RAISE EXCEPTION 'Bulk delete blocked. Delete items one at a time or contact admin.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

Better approach: Handle in frontend with confirmation dialogs.

### 4.4 Audit Log (Optional)

Track who changed what:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for content_items
CREATE OR REPLACE FUNCTION log_content_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    'content_items',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER content_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON content_items
  FOR EACH ROW EXECUTE FUNCTION log_content_changes();
```

---

## Summary: Permission Matrix

| Table | Viewer | Editor | Admin |
|-------|--------|--------|-------|
| **profiles** | Read all | Read all, Update own (not role) | Full |
| **categories** | Read | Read | Full |
| **content_items** | Read | Read, Create, Update | Full |
| **assets** | Read | Read, Create, Update | Full |
| **comments** | Read | Read, Create, Update own, Delete own | Full |

---

## Testing RLS Policies

After setup, test with different users:

```sql
-- Impersonate a viewer
SET request.jwt.claim.sub = 'viewer-user-uuid';
SELECT * FROM content_items;  -- Should work
INSERT INTO content_items (title, platform) VALUES ('Test', 'instagram');  -- Should FAIL

-- Impersonate an editor
SET request.jwt.claim.sub = 'editor-user-uuid';
INSERT INTO content_items (title, platform) VALUES ('Test', 'instagram');  -- Should work
DELETE FROM content_items WHERE id = '...';  -- Should FAIL
```

Or test via the React app by logging in as different users.
