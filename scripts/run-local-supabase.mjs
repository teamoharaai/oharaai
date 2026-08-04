import { spawnSync } from 'node:child_process';
import { verifyLocalTarget } from './momentum-local-target.mjs';

const operation = process.argv[2];
const commands = {
  start: ['start'],
  status: ['status'],
  stop: ['stop', '--no-backup'],
  reset: ['db', 'reset', '--local'],
};

if (!operation || !(operation in commands)) {
  console.error('Usage: node scripts/run-local-supabase.mjs <start|status|stop|reset>');
  process.exit(1);
}

let local;
try {
  local = verifyLocalTarget({ requireKeys: operation === 'reset' });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log(`Verified local Supabase target: ${local.origin}`);
const result = spawnSync('supabase', commands[operation], {
  env: { ...process.env, ...local.values },
  stdio: 'inherit',
});
if (result.error) {
  console.error(`Unable to run Supabase CLI: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
