import * as core from '@actions/core';
import {z} from 'zod';
import {readConfig} from './input';
import {install} from './install';
import {writeOutputs} from './output';
import {resolveRelease} from './resolve';

const run = (async(): Promise<void> => {
  try {
    const config = readConfig();

    const release = (await resolveRelease(config));

    core.info(`Resolved IntelliJ IDEA ${config.edition} ${release.version} (build ${release.build}).`);

    const result = (await install(config, release));

    writeOutputs(config, release, result);

    core.info(`IntelliJ IDEA ready at ${result.binary}.`);
  } catch(err) {
    if(err instanceof z.ZodError) {
      core.setFailed(`Invalid inputs:\n${z.prettifyError(err)}`);
    } else if(err instanceof Error) {
      core.setFailed(err.message);
    } else {
      core.setFailed(String(err));
    }
  }
});

export {
  run
};
