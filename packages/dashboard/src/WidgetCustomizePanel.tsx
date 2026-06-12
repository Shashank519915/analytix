import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABELS,
  type DashboardWidgetId,
} from "@Shashank519915/analytix-core";

export function WidgetCustomizePanel({
  widgets,
  onToggle,
  onReset,
  onSaveDefault,
  savingDefault,
}: {
  widgets: DashboardWidgetId[];
  onToggle: (id: DashboardWidgetId) => void;
  onReset: () => void;
  onSaveDefault?: () => void;
  savingDefault?: boolean;
}) {
  return (
    <div className="chartPanel widgetCustomize">
      <div className="panelTitle">Dashboard widgets</div>
      <div className="widgetGrid">
        {DASHBOARD_WIDGET_IDS.map((id) => (
          <label key={id} className="widgetToggle">
            <input type="checkbox" checked={widgets.includes(id)} onChange={() => onToggle(id)} />
            {DASHBOARD_WIDGET_LABELS[id]}
          </label>
        ))}
      </div>
      <div className="widgetActions">
        <button type="button" className="btn" onClick={onReset}>
          Reset layout
        </button>
        {onSaveDefault ? (
          <button type="button" className="btn" onClick={onSaveDefault} disabled={savingDefault}>
            {savingDefault ? "Saving…" : "Save as site default"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
