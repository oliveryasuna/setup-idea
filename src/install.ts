import type {ResolvedRelease} from './resolve';
import type {Config} from './schema';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const LAUNCHER_CANDIDATES = (['bin/idea', 'bin/idea.sh'] as const);

interface InstallResult {
  installDir: string;
  binary: string;
  cacheHit: boolean;
}

const cacheKey = ((
  config: Config,
  release: ResolvedRelease
): string => {
  const runnerOs = (process.env.RUNNER_OS ?? process.platform);

  return `${config.cacheKeyPrefix}-${runnerOs}-${release.archive}`;
});

const computeSha256 = (async(file: string): Promise<string> => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(file);

  await (new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk => hash.update(chunk)));
    stream.on(
      'end',
      (() => {
        resolve();
      })
    );
    stream.on('error', reject);
  }));

  return hash.digest('hex');
});

const verifyChecksum = (async(
  file: string,
  checksumUrl: string
): Promise<void> => {
  const response = (await fetch(checksumUrl));

  if(!response.ok) {
    throw (new Error(`Failed to fetch checksum (${response.status} ${response.statusText}): ${checksumUrl}`));
  }

  // Checksum files look like: `<hex>  <filename>`.
  const expected = ((await response.text()).trim().split(/\s+/)[0] ?? '').toLowerCase();
  const actual = (await computeSha256(file)).toLowerCase();

  if(expected !== actual) {
    throw (new Error(`Checksum mismatch: expected ${expected}, got ${actual}.`));
  }

  core.info(`Checksum verified (sha256: ${actual}).`);
});

// Whether a path exists and is executable.
const isExecutable = (async(full: string): Promise<boolean> => {
  try {
    await fs.promises.access(full, fs.constants.X_OK);

    return true;
  } catch{
    return false;
  }
});

const findLauncher = (async(installDir: string): Promise<string> => {
  const candidates = LAUNCHER_CANDIDATES.map(candidate => path.join(installDir, candidate));
  const executable = (await Promise.all(candidates.map(async candidate => isExecutable(candidate))));
  const found = candidates.find((_, index) => executable[index]);

  if(found === undefined) {
    throw (new Error(`No IDEA launcher (${LAUNCHER_CANDIDATES.join(', ')}) found under ${installDir}.`));
  }

  return found;
});

// Download, optionally verify, and extract the release into `installDir`.
const download = (async(
  config: Config,
  release: ResolvedRelease
): Promise<void> => {
  core.info(`Downloading ${release.archive} ...`);

  const archivePath = (await tc.downloadTool(release.url));

  if(config.verifyChecksum) {
    if(release.checksumUrl === undefined) {
      throw (new Error(`No checksum published for ${release.archive}; set verify-checksum: false to skip verification.`));
    }

    await verifyChecksum(archivePath, release.checksumUrl);
  }

  core.info(`Extracting to ${config.installDir} ...`);

  // `--strip-components=1` drops the top-level versioned directory so the
  // launcher lands at `${installDir}/bin/...`.
  await tc.extractTar(archivePath, config.installDir, ['xz', '--strip-components=1']);
});

// Restore from cache when possible, otherwise download and populate it.
const install = (async(
  config: Config,
  release: ResolvedRelease
): Promise<InstallResult> => {
  const key = cacheKey(config, release);
  const paths = [config.installDir];

  let cacheHit = false;

  if(config.cache) {
    const restored = (await cache.restoreCache(paths, key));

    cacheHit = (restored !== undefined);
  }

  if(cacheHit) {
    core.info(`Cache hit for ${key}.`);
  } else {
    await download(config, release);

    if(config.cache) {
      await cache.saveCache(paths, key);
    }
  }

  const binary = (await findLauncher(config.installDir));

  return {
    installDir: config.installDir,
    binary: binary,
    cacheHit: cacheHit
  };
});

export {
  install
};

export type {
  InstallResult
};
