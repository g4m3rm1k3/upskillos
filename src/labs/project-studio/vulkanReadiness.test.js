import { expect, it } from 'vitest';
import { assessReadiness, supportsBaseline } from '../../../scripts/vulkan-course-readiness.mjs';

const good = {
  runtime: {status:0,stdout:'Vulkan Instance Version: 1.4.321\nVK_LAYER_KHRONOS_validation\napiVersion = 1.3.300\n'},
  headers:{status:0}, shaderCompiler:{status:0},
};
it('never confuses toolchain readiness with a verified renderer', () => {
  const report = assessReadiness(good);
  expect(report.readyForSetupLesson).toBe(true);
  expect(report.rendererVerified).toBe(false);
  expect(report.remainingEvidence.join(' ')).toContain('presentation');
});
it('rejects a modern loader with an older device or missing tools', () => {
  const report = assessReadiness({
    runtime:{status:0,stdout:'Vulkan Instance Version: 1.4.321\napiVersion = 1.2.198\n'},
    headers:{status:1}, shaderCompiler:{status:null},
  });
  expect(report.readyForSetupLesson).toBe(false);
  expect(report.missing).toEqual(['candidateDeviceBaseline','headersCompile','shaderCompiler','validationLayerListed']);
});
it('does not accept a failed or malformed runtime report', () => {
  expect(assessReadiness({...good,runtime:{...good.runtime,status:1}}).readyForSetupLesson).toBe(false);
  expect(assessReadiness({...good,runtime:{status:0,stdout:'no GPU report'}}).readyForSetupLesson).toBe(false);
  expect(supportsBaseline('1.3.0')).toBe(true);
  expect(supportsBaseline('1.2.999')).toBe(false);
  expect(supportsBaseline(null)).toBe(false);
});
