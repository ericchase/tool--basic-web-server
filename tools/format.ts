await Bun.spawn(['biome', 'format', '--verbose', '--write'], { stderr: 'inherit', stdout: 'inherit' }).exited;
await Bun.spawn(['prettier', '--write', '.'], { stderr: 'inherit', stdout: 'inherit' }).exited;
