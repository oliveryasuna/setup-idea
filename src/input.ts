import type {Config, RawInput} from './schema';
import * as core from '@actions/core';
import path from 'node:path';
import {InputSchema} from './schema';

// TS name -> YAML name
const INPUT_NAMES = (({
  version: 'version',
  edition: 'edition',
  cache: 'cache',
  cacheKeyPrefix: 'cache-key-prefix',
  addToPath: 'add-to-path',
  verifyChecksum: 'verify-checksum',
  installDir: 'install-dir'
} as const) satisfies Record<(keyof RawInput), string>);

const requireEnv = ((name: string): string => {
  const value = process.env[name];

  if((value === undefined) || (value === '')) {
    throw (new Error(`Required environment variable "${name}" is not set.`));
  }

  return value;
});

const readRawInput = ((): RawInput => ({
  version: core.getInput(INPUT_NAMES.version),
  edition: core.getInput(INPUT_NAMES.edition),
  cache: core.getInput(INPUT_NAMES.cache),
  cacheKeyPrefix: core.getInput(INPUT_NAMES.cacheKeyPrefix),
  addToPath: core.getInput(INPUT_NAMES.addToPath),
  verifyChecksum: core.getInput(INPUT_NAMES.verifyChecksum),
  installDir: (core.getInput(INPUT_NAMES.installDir) || path.join(requireEnv('RUNNER_TEMP'), 'idea'))
}));

const readConfig = ((): Config => InputSchema.parse(readRawInput()));

export {
  INPUT_NAMES,
  readConfig
};
