import { Core_Console_Log } from '../src/lib/ericchase/api.core.js';

Bun.spawnSync(['bun', 'install'], { cwd: `${__dirname}\\..`, stderr: 'inherit', stdout: 'inherit' });

while (true) {
  const server_process = Bun.spawn(['bun', './src/server.ts'], { cwd: `${__dirname}/..`, stderr: 'inherit', stdout: 'inherit' });
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
}
