import {defineConfig} from '@oliveryasuna/tsdown-config';

export default defineConfig(
  'node',
  {
    tsconfig: './tsconfig.build.json',
    format: 'cjs',
    fixedExtension: false,
    sourcemap: false,
    dts: false,
    noExternal: [/.*/]
  }
);
