export function AnalyticsDashboardSkeleton() {
  return (
    <div className="analytix-dash analytix-theme-light analytix-skeleton" aria-busy="true" aria-label="Loading analytics">
      <div className="toolbar">
        <div className="sk skRealtime" />
        <div className="sk skBtn" />
      </div>

      <div className="filters">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="filterGroup">
            <div className="sk skLabel" />
            <div className="skRow">
              <div className="sk skChip" />
              <div className="sk skChip" />
              <div className="sk skChip" />
            </div>
          </div>
        ))}
      </div>

      <div className="metrics">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="metricCard">
            <div className="sk skIcon" />
            <div className="sk skMetricValue" />
            <div className="sk skMetricLabel" />
            <div className="sk skDelta" />
          </div>
        ))}
      </div>

      <div className="chartPanel">
        <div className="sk skPanelTitle" />
        <div className="sk skChart" />
      </div>

      <div className="splitPanels">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="chartPanel">
            <div className="sk skPanelTitle" />
            <div className="skList">
              {Array.from({ length: 5 }).map((__, j) => (
                <div key={j} className="sk skListRow" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
