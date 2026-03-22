# Portfolio Agents

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI-powered CLI toolkit for scaffolding, building, documenting, and syncing portfolio projects. Built with the Anthropic SDK and GitHub API.

## Commands

| Command | Description |
|---------|-------------|
| `scaffold` | Create a new project with TypeScript, CI, README, and optional GitHub publish |
| `build` | AI-generate a feature implementation in an existing project |
| `docs` | Generate or update README.md and ARCHITECTURE.md from code analysis |
| `sync` | Sync portfolio site with latest project data from GitHub |

## Getting Started

```bash
# Clone and install
git clone https://github.com/gcasti256/portfolio-agents.git
cd portfolio-agents
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Build
npm run build
```

## Usage

### Scaffold a new project

```bash
# Create a Next.js project with all best practices
npx portfolio-agents scaffold -n my-app -t nextjs -d "A cool app"

# Create and publish to GitHub in one step
npx portfolio-agents scaffold -n my-app -t vite-react -d "React app" --publish
```

**Templates**: `nextjs`, `vite-react`, `node-cli`, `express-api`

### Build a feature with AI

```bash
# Preview what the AI would generate
npx portfolio-agents build -p ./my-app -f "add dark mode toggle" --dry-run

# Generate and commit
npx portfolio-agents build -p ./my-app -f "add user authentication with JWT"
```

### Generate documentation

```bash
# Update README and architecture docs for a local project
npx portfolio-agents docs ./my-app

# Generate README only, from GitHub
npx portfolio-agents docs my-repo --remote --mode readme

# Preview without writing
npx portfolio-agents docs ./my-app --dry-run
```

### Sync portfolio site

```bash
# Sync project data from GitHub → portfolio site
npx portfolio-agents sync -p ./portfolio-site

# Preview changes
npx portfolio-agents sync --dry-run
```

## Architecture

```
portfolio-agents/
├── src/
│   ├── cli.ts                    # Commander.js entry point
│   ├── commands/
│   │   ├── scaffold.ts           # Project scaffolder with templates
│   │   ├── build-feature.ts      # AI code generation agent
│   │   ├── generate-docs.ts      # Documentation generator
│   │   └── sync-portfolio.ts     # Portfolio site syncer
│   └── lib/
│       ├── ai.ts                 # Anthropic SDK wrapper
│       ├── github.ts             # Octokit GitHub API client
│       └── fs.ts                 # File system + git utilities
├── .env.example
├── package.json
└── tsconfig.json
```

### How it works

1. **Scaffold** uses project templates (tsconfig, CI workflows, gitignore) + AI-generated README to bootstrap new repos
2. **Build** reads your project's source files for context, sends them to Claude, parses the structured response into file changes, writes them, verifies the build, and commits
3. **Docs** analyzes your codebase (locally or via GitHub API) and generates professional README.md and ARCHITECTURE.md files
4. **Sync** fetches project metadata from your GitHub repos and regenerates the portfolio site's data files and project pages

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| TypeScript | Type-safe CLI implementation |
| Commander.js | CLI framework and argument parsing |
| Anthropic SDK | AI-powered code and doc generation |
| Octokit | GitHub API integration |
| fs-extra | Enhanced file system operations |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `GITHUB_TOKEN` | Yes | GitHub personal access token |
| `GITHUB_USERNAME` | No | GitHub username (default: gcasti256) |

## License

MIT — George Castillo
