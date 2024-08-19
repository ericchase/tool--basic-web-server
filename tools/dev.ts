import type { Subprocess } from 'bun';

import { Broadcast } from './lib/Broadcast.js';
// TODO: replace watch with Bun.watch?
import { Watch } from './lib/Watch.js';

const pipe = new Broadcast<string>();

(async function () {
  let proc: Subprocess<'ignore', 'inherit', 'inherit'> | undefined = undefined;
  await pipe.wait('restart');
  while (true) {
    proc = Bun.spawn(['bun', './src/server.ts'], { stdout: 'inherit' });
    let restart = false;
    pipe.wait('restart').then(() => {
      restart = true;
      console.log('Dev:Restart...');
      proc?.kill();
    });
    await proc.exited;
    const code = restart ? 1 : proc.exitCode;
    switch (code) {
      case 1:
        console.log('Exit Code [1]:Restart');
        break;
      case 2:
        console.log('Exit Code [2]:Shutdown');
        process.exit(0);
      default:
        console.log(`Exit Code [${code}]`);
        process.stdout.write('Restart? (y/n)');
        for await (const line of console) {
          if (line.trim() === 'y') break;
          process.exit(0);
        }
        break;
    }
    console.log('\n');
  }
})();

while (true) {
  try {
    await Watch({
      path: './src',
      debounce_interval: 500,
      change_cb: () => {
        pipe.send('restart');
      },
      error_cb: (error) => {
        console.error('\x1b[31mfail\x1b[0m', 'ERROR', error);
      },
    });
  } catch (err) {
    console.log(err);
  }
}
