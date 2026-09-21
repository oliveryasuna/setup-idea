import type {Config} from './schema';
import {z} from 'zod';
import {EDITION_CODES} from './schema';

const RELEASES_ENDPOINT = 'https://data.services.jetbrains.com/products/releases';

const DOWNLOAD_KEYS = (({
  'linux:x64': 'linux',
  'linux:arm64': 'linuxARM64'
} as const) satisfies Record<string, string>);

const DownloadSchema = z.object({
  link: z.url(),
  checksumLink: z.url().optional()
});

const ReleaseSchema = z.object({
  type: z.string(),
  version: z.string(),
  build: z.string(),
  downloads: z.record(z.string(), DownloadSchema)
});

const ReleasesResponseSchema = z.record(z.string(), z.array(ReleaseSchema));

type Release = z.output<typeof ReleaseSchema>;

interface ResolvedRelease {
  version: string;
  build: string;
  url: string;
  archive: string;
  checksumUrl: (string | undefined);
}

/**
 * Determines the JetBrains download key for the current runner. Throws with an
 * actionable message on an unsupported platform/architecture rather than
 * silently guessing.
 */
const resolveDownloadKey = ((): string => {
  const target = `${process.platform}:${process.arch}`;
  const key = (DOWNLOAD_KEYS as Record<string, string>)[target];

  if(key === undefined) {
    const supported = Object.keys(DOWNLOAD_KEYS).join(', ');

    throw (new Error(`Unsupported runner platform "${target}". Supported: ${supported}.`));
  }

  return key;
});

/**
 * Fetches and validates the release list for a product code. When a specific
 * version is requested the full history is retrieved so it can be located;
 * `latest` short-circuits to only the newest release.
 */
const fetchReleases = (async(
  code: string,
  version: string
): Promise<Release[]> => {
  const query = (new URLSearchParams({
    code: code, type: 'release'
  }));

  if(version === 'latest') {
    query.set('latest', 'true');
  }

  const url = `${RELEASES_ENDPOINT}?${query.toString()}`;
  const response = (await fetch(url));

  if(!response.ok) {
    throw (new Error(`Failed to query JetBrains releases (${response.status} ${response.statusText}): ${url}`));
  }

  const body = ReleasesResponseSchema.parse(await response.json());

  return (body[code] ?? []);
});

/**
 * Selects the requested release from a newest-first list: the first entry for
 * `latest`, or an exact version match otherwise.
 */
const selectRelease = ((
  releases: Release[],
  version: string
): Release => {
  if(version === 'latest') {
    const [latest] = releases;

    if(latest === undefined) {
      throw (new Error('No releases were returned by the JetBrains releases API.'));
    }

    return latest;
  }

  const match = releases.find(release => (release.version === version));

  if(match === undefined) {
    const available = releases.map(release => release.version).join(', ');

    throw (new Error(`Version "${version}" was not found. Available versions: ${available}.`));
  }

  return match;
});

/**
 * Resolves the requested edition/version into a concrete, downloadable release
 * for the current runner.
 */
const resolveRelease = (async(config: Config): Promise<ResolvedRelease> => {
  const code = EDITION_CODES[config.edition];
  const downloadKey = resolveDownloadKey();

  const releases = (await fetchReleases(code, config.version));
  const release = selectRelease(releases, config.version);
  const download = release.downloads[downloadKey];

  if(download === undefined) {
    throw (new Error(`Release "${release.version}" has no "${downloadKey}" download.`));
  }

  return {
    version: release.version,
    build: release.build,
    url: download.link,
    archive: ((new URL(download.link)).pathname.split('/').pop() ?? ''),
    checksumUrl: download.checksumLink
  };
});

export type {
  ResolvedRelease
};
export {
  resolveRelease
};
