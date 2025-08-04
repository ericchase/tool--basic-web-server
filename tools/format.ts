await Bun.spawn(['bunx', 'prettier', '--write', '.'], {
  stderr: 'inherit',
  stdout: 'inherit',
}).exited;
