// shared/EnvironmentBanner.jsx
// Checking / Install / Ready banner for a desktop-only runtime install —
// originally built inline in PySideNotebook.jsx, extracted here once a
// second and third consumer (CppNotebook, NativeRunNotebook) needed the
// exact same Checking/Install-button/progress-bar/Ready states, just with
// different copy and a different phase→label map.
import { withAlpha } from "../../../hooks/useThemeColors";

export default function EnvironmentBanner({ status, installing, progress, onInstall, C, title, description, phaseLabels }) {
  if (status === "checking") {
    return (
      <div style={{ padding: "10px 16px", fontSize: 12, color: C.hint, borderBottom: `1px solid ${C.border}` }}>
        Checking for {title}…
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div
        style={{
          padding: "6px 16px",
          fontSize: 11,
          fontWeight: 600,
          color: C.teal,
          background: withAlpha(C.tealBd ?? C.teal, "15"),
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        ✓ {title} ready
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
      {!installing ? (
        <>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.text }}>{description}</p>
          <button
            onClick={onInstall}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: C.teal,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Install {title}
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.text }}>
            {phaseLabels[progress?.phase] || "Working…"}
          </p>
          <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress?.percent ?? 0}%`,
                background: C.teal,
                borderRadius: 8,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
