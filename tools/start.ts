import { Core_Console_Log } from '../src/lib/ericchase/Core_Console_Log.js';
import { NODE_PATH } from '../src/lib/ericchase/NodePlatform.js';

// Bun.spawnSync(['bun', 'install'], {
//   cwd: NODE_PATH.join(__dirname, '..'),
//   stderr: 'inherit',
//   stdout: 'inherit',
// });

let server_process: Bun.Subprocess<'ignore', 'inherit', 'inherit'> | undefined = undefined;

process.on('SIGTERM', async () => {
  if (server_process !== undefined) {
    server_process.kill('SIGTERM');
    await server_process.exited;
    server_process = undefined;
  }
  process.exit(0);
});

while (true) {
  server_process = Bun.spawn(['bun', NODE_PATH.join('src', 'server.ts')], {
    cwd: NODE_PATH.join(__dirname, '..'),
    stderr: 'inherit',
    stdout: 'inherit',
  });
  await server_process.exited;
  switch (server_process.exitCode) {
    case 1:
      Core_Console_Log('Exit Code [1]:Restart');
      break;
    case 2:
      Core_Console_Log('Exit Code [2]:Shutdown');
      process.exit(0);
      break;
    default:
      Core_Console_Log(`Exit Code [${server_process.exitCode}]`);
      process.stdout.write('Restart? (y/n)');
      for await (const line of console) {
        if (line.trim() === 'y') break;
        process.exit(0);
      }
      break;
  }
  Core_Console_Log('\n');
  server_process = undefined;
}
