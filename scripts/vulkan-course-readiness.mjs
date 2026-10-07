// Author-side preflight. This does not install tools, create a device, render, or certify a lesson.
// Run: node scripts/vulkan-course-readiness.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export function supportsBaseline(version) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version ?? '');
  if (!match) return false;
  const major = Number(match[1]), minor = Number(match[2]);
  return major > 1 || (major === 1 && minor >= 3);
}

export function assessReadiness({ runtime, headers, shaderCompiler }) {
  const summary = runtime.stdout ?? '';
  const instanceVersion = summary.match(/Vulkan Instance Version:\s*(\d+\.\d+\.\d+)/)?.[1] ?? null;
  const deviceVersions = [...summary.matchAll(/apiVersion\s*=\s*(\d+\.\d+\.\d+)/g)].map(m => m[1]);
  const checks = {
    runtimeReport: runtime.status === 0 && instanceVersion !== null,
    loaderBaseline: supportsBaseline(instanceVersion),
    candidateDeviceBaseline: deviceVersions.some(supportsBaseline),
    headersCompile: headers.status === 0,
    shaderCompiler: shaderCompiler.status === 0,
    validationLayerListed: /\bVK_LAYER_KHRONOS_validation\b/.test(summary),
  };
  const missing = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  return {
    stage: 'toolchain-preflight',
    readyForSetupLesson: missing.length === 0,
    rendererVerified: false,
    instanceVersion, deviceVersions, checks, missing,
    remainingEvidence: [
      'Query and enable dynamicRendering and synchronization2 on the selected device.',
      'Query required surface, queue and presentation-maintenance capabilities; version numbers do not prove them.',
      'Enable validation in the real application and prove that the diagnostic callback receives a controlled fault.',
      'Run the bounded renderer; inspect frames, resize/minimize/restore, and presentation-resource retirement.',
      'Capture the verified game demonstration for the opening lesson before publishing the series.',
    ],
  };
}

export function probeTools() {
  const run = (command, args, options = {}) => spawnSync(command, args, {
    encoding: 'utf8', timeout: 30000, windowsHide: true, ...options,
  });
  const sdk = process.env.VULKAN_SDK;
  const includeArgs = sdk ? ['-I', path.join(sdk, process.platform === 'win32' ? 'Include' : 'include')] : [];
  let shaderCommand = 'glslc';
  if (sdk) {
    const candidate = path.join(sdk, process.platform === 'win32' ? 'Bin' : 'bin', process.platform === 'win32' ? 'glslc.exe' : 'glslc');
    if (fs.existsSync(candidate)) shaderCommand = candidate;
  }
  return assessReadiness({
    runtime: run('vulkaninfo', ['--summary']),
    headers: run('g++', ['-std=c++20', ...includeArgs, '-x', 'c++', '-fsyntax-only', '-'], {
      input: '#include <vulkan/vulkan.h>\nstatic_assert(VK_HEADER_VERSION_COMPLETE >= VK_MAKE_API_VERSION(0, 1, 3, 0));\nint main() {}\n',
    }),
    shaderCompiler: run(shaderCommand, ['--version']),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = probeTools();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.readyForSetupLesson ? 0 : 2;
}
