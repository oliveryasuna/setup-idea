import type {InstallResult} from './install';
import type {ResolvedRelease} from './resolve';
import type {Config} from './schema';
import * as core from '@actions/core';
import path from 'node:path';

// TS name -> YAML name
const OUTPUT_NAMES = (({
  binary: 'binary',
  installDir: 'install-dir',
  version: 'version',
  build: 'build',
  archive: 'archive',
  cacheHit: 'cache-hit'
} as const) satisfies Record<string, string>);

// Publish outputs and, when requested, put the launcher on PATH.
const writeOutputs = ((
  config: Config,
  release: ResolvedRelease,
  result: InstallResult
): void => {
  core.setOutput(OUTPUT_NAMES.binary, result.binary);
  core.setOutput(OUTPUT_NAMES.installDir, result.installDir);
  core.setOutput(OUTPUT_NAMES.version, release.version);
  core.setOutput(OUTPUT_NAMES.build, release.build);
  core.setOutput(OUTPUT_NAMES.archive, release.archive);
  core.setOutput(OUTPUT_NAMES.cacheHit, String(result.cacheHit));

  if(config.addToPath) {
    core.addPath(path.dirname(result.binary));
  }
});

export {
  OUTPUT_NAMES,
  writeOutputs
};
