import path from "path";
import fs from "fs-extra";
import { ask } from "../lib/ai.js";
import {
  getUsername,
  getRepoInfo,
  getRepoLanguages,
  getFileContent,
  getLatestCommits,
} from "../lib/github.js";
import { readProjectFile, writeProjectFile, execSafe, gitCommit } from "../lib/fs.js";

interface DocsOptions {
  target: string; // repo name or local path
  mode: "readme" | "architecture" | "all";
  remote: boolean;
  dryRun: boolean;
}

async function gatherLocalContext(projectDir: string): Promise<string> {
  const parts: string[] = [];

  const pkg = await readProjectFile(projectDir, "package.json");
  if (pkg) parts.push(`package.json:\n${pkg}`);

  const tsconfig = await readProjectFile(projectDir, "tsconfig.json");
  if (tsconfig) parts.push(`tsconfig.json:\n${tsconfig}`);

  const files = execSafe(`find src -type f \\( -name "*.ts" -o -name "*.tsx" \\) | head -40`, projectDir);
  if (files) parts.push(`Source files:\n${files}`);

  // Read key files for deeper understanding
  const fileList = files?.split("\n").filter(Boolean).slice(0, 10) ?? [];
  for (const f of fileList) {
    const content = await readProjectFile(projectDir, f);
    if (content && content.length < 4000) {
      parts.push(`--- ${f} ---\n${content}`);
    }
  }

  return parts.join("\n\n");
}

async function gatherRemoteContext(repo: string): Promise<string> {
  const owner = getUsername();
  const parts: string[] = [];

  const info = await getRepoInfo(owner, repo);
  parts.push(`Repo: ${info.full_name}\nDescription: ${info.description}\nStars: ${info.stargazers_count}\nLanguage: ${info.language}`);

  const languages = await getRepoLanguages(owner, repo);
  parts.push(`Languages: ${JSON.stringify(languages)}`);

  const pkg = await getFileContent(owner, repo, "package.json");
  if (pkg) parts.push(`package.json:\n${pkg}`);

  const commits = await getLatestCommits(owner, repo, 5);
  const commitLog = commits.map((c) => `- ${c.commit.message.split("\n")[0]}`).join("\n");
  parts.push(`Recent commits:\n${commitLog}`);

  return parts.join("\n\n");
}

async function generateReadme(context: string, projectName: string): Promise<string> {
  return ask(
    `Generate a professional, comprehensive GitHub README.md for this project.

Project: ${projectName}
Author: George Castillo (gcasti256)

Context:
${context}

Include these sections:
1. Title with badges (build status via GitHub Actions, MIT license, Node.js version)
2. One-paragraph description explaining what it does and why it's useful
3. Features (bulleted list, 4-6 items)
4. Tech Stack (table with technology and purpose)
5. Getting Started (prerequisites, installation steps, running locally)
6. Project Structure (tree view of key directories/files)
7. Architecture (brief explanation of how the pieces fit together)
8. Contributing (standard open-source contributing guide)
9. License (MIT)

Make it professional but approachable. Use clear, concise language.
Return ONLY the markdown content, no wrapper or explanation.`,
    {
      system: "You are a technical writer creating world-class GitHub README files. Return raw markdown only.",
      maxTokens: 4096,
    }
  );
}

async function generateArchitectureDocs(context: string, projectName: string): Promise<string> {
  return ask(
    `Generate architecture documentation (ARCHITECTURE.md) for this project.

Project: ${projectName}
Author: George Castillo

Context:
${context}

Include:
1. Overview — what the system does at a high level
2. System Architecture — component diagram description, how pieces connect
3. Data Flow — how data moves through the system
4. Key Design Decisions — why certain technologies/patterns were chosen
5. Directory Structure — annotated tree
6. API Endpoints (if applicable)
7. State Management (if applicable)
8. Deployment — how to build and deploy

Keep it concise but thorough. Use diagrams described in text (mermaid syntax is fine).
Return ONLY the markdown content.`,
    {
      system: "You are a software architect documenting system design. Return raw markdown only.",
      maxTokens: 4096,
    }
  );
}

export async function generateDocs(options: DocsOptions): Promise<void> {
  const isLocal = !options.remote && (await fs.pathExists(path.resolve(options.target)));
  const projectName = isLocal ? path.basename(path.resolve(options.target)) : options.target;

  console.log(`\n📖 Generating docs for: ${projectName}`);
  console.log(`   Mode: ${options.mode}`);
  console.log(`   Source: ${isLocal ? "local" : "remote"}\n`);

  // Gather context
  console.log("   ⏳ Analyzing project...");
  const context = isLocal
    ? await gatherLocalContext(path.resolve(options.target))
    : await gatherRemoteContext(options.target);

  if (options.mode === "readme" || options.mode === "all") {
    console.log("   ⏳ Generating README.md...");
    const readme = await generateReadme(context, projectName);

    if (options.dryRun) {
      console.log("\n--- README.md Preview ---\n");
      console.log(readme);
      console.log("\n--- End Preview ---\n");
    } else if (isLocal) {
      await writeProjectFile(path.resolve(options.target), "README.md", readme);
      console.log("   ✓ README.md written");
    } else {
      console.log("   ℹ Remote mode: README content generated (paste manually or use GitHub API)");
      console.log(readme);
    }
  }

  if (options.mode === "architecture" || options.mode === "all") {
    console.log("   ⏳ Generating ARCHITECTURE.md...");
    const arch = await generateArchitectureDocs(context, projectName);

    if (options.dryRun) {
      console.log("\n--- ARCHITECTURE.md Preview ---\n");
      console.log(arch);
      console.log("\n--- End Preview ---\n");
    } else if (isLocal) {
      await writeProjectFile(path.resolve(options.target), "ARCHITECTURE.md", arch);
      console.log("   ✓ ARCHITECTURE.md written");
    } else {
      console.log(arch);
    }
  }

  // Commit if local and not dry run
  if (isLocal && !options.dryRun) {
    try {
      gitCommit(path.resolve(options.target), `docs: update ${options.mode} documentation`);
      console.log("   ✓ Changes committed");
    } catch {
      console.log("   ℹ No changes to commit (docs may be unchanged)");
    }
  }

  console.log(`\n✅ Documentation generation complete!\n`);
}
