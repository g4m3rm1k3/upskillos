import { CNCEngine, MACHINE_DEFINITIONS } from "../../../engines/cnc/CNCEngine.js";

self.onmessage = ({ data }) => {
  const { requestId, machineId, sources, toolTable, toolUnits, offsets } = data || {};
  try {
    const machine = MACHINE_DEFINITIONS[machineId] || MACHINE_DEFINITIONS.fanuc_mill;
    const engine = new CNCEngine(machine);
    engine.setToolTable(toolTable || {}, toolUnits || "mm");
    engine.setWorkOffsets(offsets || {});
    engine.loadPrograms(sources || "");
    self.postMessage({
      requestId,
      pathPoints: engine.getPathPoints(),
      stats: engine.getStats(),
      diagnostics: engine.getDiagnostics(),
    });
  } catch (error) {
    self.postMessage({ requestId, error: error?.message || String(error) });
  }
};
