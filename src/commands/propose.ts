import { ask } from "../lib/ai.js";
import { getUsername, listUserRepos } from "../lib/github.js";
import { exec } from "../lib/fs.js";

interface ProposeOptions {
  count: number;
  dryRun: boolean;
}

interface ProjectIdea {
  name: string;
  description: string;
  template: "nextjs" | "vite-react" | "node-cli" | "express-api";
  features: string[];
  tags: string[];
}

const PROJECT_CATEGORIES = [
  "developer tool / CLI utility",
  "data visualization / dashboard",
  "API service / backend tool",
  "browser extension / bookmarklet",
  "full-stack web application",
  "automation / workflow tool",
  "AI-powered utility",
  "real-time application",
];

async function getExistingProjects(): Promise<string[]> {
  const username = getUsername();
  const repos = await listUserRepos(username);
  return repos.map((r) => r.name);
}

async function generateIdeas(
  existing: string[],
  count: number
): Promise<ProjectIdea[]> {
  const category =
    PROJECT_CATEGORIES[Math.floor(Math.random() * PROJECT_CATEGORIES.length)];

  const response = await ask(
    `Generate ${count} unique portfolio project idea(s) for a full-stack TypeScript developer.

Category focus: ${category}

Existing projects (DO NOT duplicate these):
${existing.map((p) => `- ${p}`).join("\n")}

Requirements for each idea:
- Must be a REAL, useful tool or application (not a toy/demo)
- Should be buildable in a weekend (not a massive system)
- Should showcase TypeScript + modern web dev skills
- Should have a clear value proposition (who uses it and why)
- Prefer projects that integrate AI or automation where natural

For each project, return a JSON array with objects containing:
- name: kebab-case repo name (short, memorable)
- description: one-line description (under 120 chars)
- template: one of "nextjs", "vite-react", "node-cli", "express-api"
- features: array of 4-6 specific features to implement
- tags: array of GitHub topic tags

Return ONLY the JSON array, no explanation or markdown.`,
    {
      system:
        "You are a senior developer generating realistic, impressive portfolio project ideas. Return valid JSON only.",
      maxTokens: 2048,
    }
  );

  try {
    // Extract JSON from response (handle possible markdown wrapping)
    const jsonStr = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse AI response as JSON:");
    console.error(response);
    throw new Error("AI returned invalid JSON for project ideas");
  }
}

function formatIssueBody(idea: ProjectIdea): string {
  return `## Project Proposal: ${idea.name}

**Description:** ${idea.description}

**Template:** \`${idea.template}\`

**Features to implement:**
${idea.features.map((f) => `- [ ] ${f}`).join("\n")}

**Tags:** ${idea.tags.map((t) => `\`${t}\``).join(", ")}

---

### How to approve

Add the \`approved\` label to this issue. The automation will:
1. Scaffold the project from the \`${idea.template}\` template
2. Generate a professional README
3. Create a public GitHub repo
4. Push the initial commit
5. Close this issue with a link to the new repo

### Project metadata
\`\`\`json
${JSON.stringify(idea, null, 2)}
\`\`\`
`;
}

export async function propose(options: ProposeOptions): Promise<void> {
  console.log(`\n💡 Generating ${options.count} project idea(s)...\n`);

  // Get existing repos to avoid duplicates
  console.log("   ⏳ Fetching existing projects...");
  const existing = await getExistingProjects();
  console.log(`   Found ${existing.length} existing repos.\n`);

  // Generate ideas
  console.log("   ⏳ Brainstorming with AI...");
  const ideas = await generateIdeas(existing, options.count);

  for (const idea of ideas) {
    console.log(`\n   📋 ${idea.name}`);
    console.log(`      ${idea.description}`);
    console.log(`      Template: ${idea.template}`);
    console.log(`      Features: ${idea.features.length}`);

    if (options.dryRun) {
      console.log(`\n      --- Issue Preview ---`);
      console.log(formatIssueBody(idea));
      continue;
    }

    // Create GitHub issue in the portfolio-agents repo
    const username = getUsername();
    const body = formatIssueBody(idea);
    const title = `[Project Idea] ${idea.name}: ${idea.description}`;

    const result = exec(
      `gh issue create --repo ${username}/portfolio-agents --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, "\\n")}" --label "project-idea"`,
      process.cwd()
    );

    console.log(`      ✓ Issue created: ${result}`);
  }

  console.log(`\n✅ ${ideas.length} project idea(s) ${options.dryRun ? "previewed" : "proposed as GitHub issues"}!\n`);
}
