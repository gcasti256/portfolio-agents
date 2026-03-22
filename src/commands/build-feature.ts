import path from "path";
import fs from "fs-extra";
import { askWithCode } from "../lib/ai.js";
import { readProjectFile, writeProjectFile, exec, execSafe } from "../lib/fs.js";

interface BuildOptions {
  projectDir: string;
  feature: string;
  dryRun: boolean;
}

interface FileChange {
  path: string;
  content: string;
  action: "create" | "replace";
}

function parseFileChanges(response: string): FileChange[] {
  const changes: FileChange[] = [];
  const fileBlockRegex = /```(?:[\w.]+)?\s*\n\/\/ FILE: (.+)\n\/\/ ACTION: (create|replace)\n([\s\S]*?)```/g;

  let match;
  while ((match = fileBlockRegex.exec(response)) !== null) {
    changes.push({
      path: match[1].trim(),
      action: match[2].trim() as "create" | "replace",
      content: match[3].trimEnd() + "\n",
    });
  }

  return changes;
}

async function gatherProjectContext(projectDir: string): Promise<string> {
  const parts: string[] = [];

  // Package.json
  const pkg = await readProjectFile(projectDir, "package.json");
  if (pkg) parts.push(`package.json:\n${pkg}`);

  // tsconfig
  const tsconfig = await readProjectFile(projectDir, "tsconfig.json");
  if (tsconfig) parts.push(`tsconfig.json:\n${tsconfig}`);

  // List src files
  const srcDir = path.join(projectDir, "src");
  if (await fs.pathExists(srcDir)) {
    const files = execSafe(`find src -type f -name "*.ts" -o -name "*.tsx" | head -30`, projectDir);
    if (files) parts.push(`Source files:\n${files}`);

    // Read up to 5 key files for context
    const fileList = files?.split("\n").slice(0, 5) ?? [];
    for (const f of fileList) {
      const content = await readProjectFile(projectDir, f);
      if (content && content.length < 3000) {
        parts.push(`--- ${f} ---\n${content}`);
      }
    }
  }

  return parts.join("\n\n");
}

export async function buildFeature(options: BuildOptions): Promise<void> {
  const projectDir = path.resolve(options.projectDir);

  if (!(await fs.pathExists(projectDir))) {
    throw new Error(`Project directory not found: ${projectDir}`);
  }

  console.log(`\n🔨 Building feature in: ${projectDir}`);
  console.log(`   Feature: ${options.feature}\n`);

  // Gather project context
  console.log("   ⏳ Analyzing project structure...");
  const context = await gatherProjectContext(projectDir);

  // Ask AI to generate the implementation
  console.log("   ⏳ Generating implementation with AI...");
  const response = await askWithCode(
    `I need to implement the following feature in this project:

FEATURE: ${options.feature}

PROJECT CONTEXT:
${context}

Generate the implementation. For each file that needs to be created or modified, use this exact format:

\`\`\`typescript
// FILE: path/relative/to/project/root.ts
// ACTION: create (for new files) or replace (for existing files)
// ... file content ...
\`\`\`

Rules:
- Use TypeScript with strict types
- Follow the existing code patterns and style
- Keep imports consistent with existing files
- Only change what's needed for this feature
- Include proper error handling
- Add brief inline comments only where logic is non-obvious`,
    `You are a senior TypeScript developer implementing features in existing projects.
Output ONLY code blocks in the specified format. No explanations outside of code blocks.
Each code block must start with // FILE: and // ACTION: comments.`
  );

  const changes = parseFileChanges(response);

  if (changes.length === 0) {
    console.log("   ⚠ No file changes generated. The AI response may not have used the expected format.");
    if (options.dryRun) {
      console.log("\n   Raw response:\n");
      console.log(response);
    }
    return;
  }

  console.log(`\n   📝 ${changes.length} file(s) to ${options.dryRun ? "change (dry run)" : "write"}:\n`);

  for (const change of changes) {
    const marker = change.action === "create" ? "+" : "~";
    console.log(`   ${marker} ${change.path}`);

    if (!options.dryRun) {
      await writeProjectFile(projectDir, change.path, change.content);
    }
  }

  if (!options.dryRun) {
    // Try to build to verify
    console.log("\n   ⏳ Verifying build...");
    const buildResult = execSafe("npm run build 2>&1", projectDir);
    if (buildResult !== null) {
      console.log("   ✓ Build succeeded");

      // Commit
      const branchName = `feature/${options.feature.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      execSafe(`git checkout -b ${branchName}`, projectDir);
      exec("git add -A", projectDir);
      exec(
        `git commit -m "feat: ${options.feature}" --author="George Castillo <gcasti256@users.noreply.github.com>"`,
        projectDir
      );
      console.log(`   ✓ Committed on branch: ${branchName}`);
    } else {
      console.log("   ⚠ Build failed — files written but not committed. Review and fix manually.");
    }
  }

  console.log(`\n✅ Feature implementation ${options.dryRun ? "previewed" : "complete"}!\n`);
}
