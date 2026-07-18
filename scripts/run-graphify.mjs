import { runGraphify } from "./graphifyCommand.mjs";

const args = process.argv.slice(2);

if (!args.length) {
  console.error("Usage: npm run graphify -- <graphify args>");
  console.error('Example: npm run graphify -- query "How does the online lobby work?"');
  process.exit(2);
}

try {
  const result = runGraphify(args, { throwOnFailure: false });
  process.exit(result.status ?? 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
