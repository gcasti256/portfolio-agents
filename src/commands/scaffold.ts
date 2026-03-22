import path from "path";
import fs from "fs-extra";
import { ask } from "../lib/ai.js";
import { createRepo, repoExists, getUsername } from "../lib/github.js";
import { writeProjectFile, gitInit, gitPush } from "../lib/fs.js";

interface ScaffoldOptions {
  name: string;
  template: "nextjs" | "vite-react" | "node-cli" | "express-api";
  description: string;
  publish: boolean;
  outDir: string;
}

const TEMPLATES: Record<string, () => Record<string, string>> = {
  "nextjs": () => ({
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ),
    ".gitignore": "node_modules/\n.next/\n.env\n.env.local\n*.db\ndist/\n",
    "postcss.config.mjs": `export default { plugins: { "@tailwindcss/postcss": {} } };\n`,
    ".github/workflows/ci.yml": `name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
`,
  }),
  "vite-react": () => ({
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
        },
        include: ["src"],
      },
      null,
      2
    ),
    ".gitignore": "node_modules/\ndist/\n.env\n",
    "vite.config.ts": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n`,
    ".github/workflows/ci.yml": `name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
`,
  }),
  "node-cli": () => ({
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "Node16",
          moduleResolution: "Node16",
          outDir: "dist",
          rootDir: "src",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          declaration: true,
        },
        include: ["src"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2
    ),
    ".gitignore": "node_modules/\ndist/\n.env\n",
    ".github/workflows/ci.yml": `name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
`,
  }),
  "express-api": () => ({
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "Node16",
          moduleResolution: "Node16",
          outDir: "dist",
          rootDir: "src",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ["src"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2
    ),
    ".gitignore": "node_modules/\ndist/\n.env\n*.db\n",
    ".github/workflows/ci.yml": `name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
`,
  }),
};

async function generateReadme(name: string, description: string, template: string): Promise<string> {
  return ask(
    `Generate a professional GitHub README.md for a project called "${name}".
Description: ${description}
Template: ${template}

Include: badges (build status, license, node version), description, features list, tech stack,
getting started (prerequisites, install, run), project structure, contributing section, and MIT license note.
Author: George Castillo. GitHub: gcasti256.
Return ONLY the markdown, no explanation.`,
    {
      system: "You are a technical writer creating professional GitHub README files. Output raw markdown only.",
    }
  );
}

async function generatePackageJson(
  name: string,
  description: string,
  template: string
): Promise<string> {
  const base: Record<string, unknown> = {
    name,
    version: "1.0.0",
    description,
    author: "George Castillo",
    license: "MIT",
    type: "module",
  };

  switch (template) {
    case "nextjs":
      return JSON.stringify(
        {
          ...base,
          scripts: { dev: "next dev", build: "next build", start: "next start" },
          dependencies: {
            next: "latest",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
            tailwindcss: "^4.0.0",
            "@tailwindcss/postcss": "^4.0.0",
            postcss: "^8.0.0",
          },
          devDependencies: { typescript: "^5.0.0", "@types/react": "^19.0.0", "@types/node": "^22.0.0" },
        },
        null,
        2
      );
    case "vite-react":
      return JSON.stringify(
        {
          ...base,
          scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
          dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
          devDependencies: {
            typescript: "^5.0.0",
            vite: "^6.0.0",
            "@vitejs/plugin-react": "^4.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
          },
        },
        null,
        2
      );
    case "node-cli":
      return JSON.stringify(
        {
          ...base,
          bin: { [name]: "./dist/cli.js" },
          scripts: { build: "tsc", dev: "tsc --watch" },
          dependencies: { commander: "^13.0.0" },
          devDependencies: { typescript: "^5.0.0", "@types/node": "^22.0.0" },
        },
        null,
        2
      );
    case "express-api":
      return JSON.stringify(
        {
          ...base,
          scripts: { build: "tsc", dev: "tsx watch src/index.ts", start: "node dist/index.js" },
          dependencies: { express: "^5.0.0", cors: "^2.8.5", helmet: "^8.0.0" },
          devDependencies: {
            typescript: "^5.0.0",
            tsx: "^4.0.0",
            "@types/node": "^22.0.0",
            "@types/express": "^5.0.0",
            "@types/cors": "^2.8.17",
          },
        },
        null,
        2
      );
    default:
      return JSON.stringify(base, null, 2);
  }
}

export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const projectDir = path.join(options.outDir, options.name);

  if (await fs.pathExists(projectDir)) {
    throw new Error(`Directory ${projectDir} already exists`);
  }

  console.log(`\n📁 Creating project: ${options.name}`);
  console.log(`   Template: ${options.template}`);
  console.log(`   Location: ${projectDir}\n`);

  // Create directory
  await fs.ensureDir(projectDir);

  // Write template files
  const templateFiles = TEMPLATES[options.template]();
  for (const [filePath, content] of Object.entries(templateFiles)) {
    await writeProjectFile(projectDir, filePath, content);
    console.log(`   ✓ ${filePath}`);
  }

  // Generate and write package.json
  const packageJson = await generatePackageJson(options.name, options.description, options.template);
  await writeProjectFile(projectDir, "package.json", packageJson);
  console.log("   ✓ package.json");

  // Generate README with AI
  console.log("   ⏳ Generating README with AI...");
  const readme = await generateReadme(options.name, options.description, options.template);
  await writeProjectFile(projectDir, "README.md", readme);
  console.log("   ✓ README.md");

  // Generate LICENSE
  const year = new Date().getFullYear();
  const license = `MIT License\n\nCopyright (c) ${year} George Castillo\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;
  await writeProjectFile(projectDir, "LICENSE", license);
  console.log("   ✓ LICENSE");

  // Create src directory with placeholder
  await writeProjectFile(
    projectDir,
    "src/index.ts",
    `// ${options.name} — ${options.description}\nconsole.log("Hello from ${options.name}");\n`
  );
  console.log("   ✓ src/index.ts");

  // Git init
  console.log("\n   ⏳ Initializing git...");
  gitInit(projectDir);
  console.log("   ✓ Git initialized with initial commit");

  // Publish to GitHub if requested
  if (options.publish) {
    const username = getUsername();
    const exists = await repoExists(username, options.name);
    if (exists) {
      console.log(`   ⚠ Repo ${username}/${options.name} already exists, skipping creation`);
    } else {
      console.log("   ⏳ Creating GitHub repo...");
      const url = await createRepo(options.name, options.description);
      gitPush(projectDir, `${url}.git`);
      console.log(`   ✓ Published to ${url}`);
    }
  }

  console.log(`\n✅ Project ${options.name} scaffolded successfully!\n`);
}
