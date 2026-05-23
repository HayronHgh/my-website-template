import {
  formatContentValidationResult,
  validateContent,
} from "../lib/content/validation";

async function main() {
  const result = await validateContent();
  const lines = formatContentValidationResult(result);

  if (result.issues.length) {
    console.error(lines.join("\n"));
    process.exit(1);
  }

  console.log(lines.join("\n"));
}

void main();
