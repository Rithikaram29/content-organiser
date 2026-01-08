export function CategoriesPage() {
  const placeholderCategories = [
    { name: "Tutorials", color: "#3b82f6" },
    { name: "Behind the Scenes", color: "#ec4899" },
    { name: "Product Reviews", color: "#f59e0b" },
    { name: "Vlogs", color: "#10b981" },
    { name: "Collaborations", color: "#8b5cf6" },
    { name: "Announcements", color: "#ef4444" },
  ];

  return (
    <div className="categories-container">
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <p className="page-subtitle">Organize your content with custom categories</p>
      </div>

      <div className="categories-grid">
        {placeholderCategories.map((category) => (
          <div key={category.name} className="category-card">
            <span
              className="category-color"
              style={{ backgroundColor: category.color }}
            />
            <span className="category-name">{category.name}</span>
          </div>
        ))}

        <button className="category-card category-add">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="category-name">Add Category</span>
        </button>
      </div>

      <div className="categories-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>Categories help you organize content by topic, series, or campaign. Assign categories to content items to filter and track them easily.</span>
      </div>
    </div>
  );
}
