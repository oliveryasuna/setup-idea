import {z} from 'zod';

const EDITIONS = (['community', 'ultimate'] as const);

const EDITION_CODES: Record<(typeof EDITIONS)[number], string> = {
  community: 'IIC',
  ultimate: 'IIU'
};

// `@actions/core.getInput` returns `''` for an unset input. Map that to
// `undefined` so schema-level `.default(...)` applies instead of failing
// validation on an empty string.
const emptyToUndefined = ((value: unknown): unknown => ((value === '') ? undefined : value));

// `installDir` has no schema default because its fallback is environment
// derived (`${RUNNER_TEMP}/idea`); the IO layer resolves that before parsing so
// this schema stays free of environment access.
const InputSchema = z.object({
  version: z.preprocess(emptyToUndefined, z.string().min(1).default('latest')),
  edition: z.preprocess(emptyToUndefined, z.enum(EDITIONS).default('community')),
  cache: z.preprocess(emptyToUndefined, z.stringbool().default(true)),
  cacheKeyPrefix: z.preprocess(emptyToUndefined, z.string().min(1).default('idea')),
  addToPath: z.preprocess(emptyToUndefined, z.stringbool().default(true)),
  verifyChecksum: z.preprocess(emptyToUndefined, z.stringbool().default(true)),
  installDir: z.preprocess(emptyToUndefined, z.string().min(1))
});

type RawInput = Record<(keyof z.input<typeof InputSchema>), string>;

type Config = z.output<typeof InputSchema>;

export type {
  Config,
  RawInput
};
export {
  EDITION_CODES,
  InputSchema
};
