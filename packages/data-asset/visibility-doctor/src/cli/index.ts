import { CliEntrypoint } from './cli-entrypoint.js';
import { CommandRouter } from './command-router.js';

export async function runCli(args: readonly string[]): Promise<void> {
  try {
    const entrypoint = new CliEntrypoint();
    const parsed = entrypoint.parse(args);
    const router = new CommandRouter();
    await router.route(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    console.error('Usage: visibility-doctor <diagnose|analyze|boost|verify> [options]');
    process.exit(1);
  }
}

export { CliEntrypoint, CommandRouter };