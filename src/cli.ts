#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { scaffold } from "./commands/scaffold.js";
import { buildFeature } from "./commands/build-feature.js";
import { generateDocs } from "./commands/generate-docs.js";
import { syncPortfolio } from "./commands/sync-portfolio.js";

dotenv.config();

const program = new Command();

program
  .name("portfolio-agents")
  .description("AI-powered agents for managing portfolio projects")
  .version("1.0.0");

// ── Scaffold ────────────────────────────────────────────────
program
  .command("scaffold")
  .description("Create a new project with best-practice structure, CI, and docs")
  .requiredOption("-n, --name <name>", "Project name")
  .requiredOption(
    "-t, --template <template>",
    "Template: nextjs | vite-react | node-cli | express-api"
  )
  .option("-d, --description <desc>", "Project description", "A new project")
  .option("-o, --out-dir <dir>", "Output directory", process.cwd())
  .option("--publish", "Create GitHub repo and push", false)
  .action(async (opts) => {
    try {
      await scaffold({
        name: opts.name,
        template: opts.template,
        description: opts.description,
        publish: opts.publish,
        outDir: opts.outDir,
      });
    } catch (err) {
      console.error(`\n❌ Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

// ── Build Feature ───────────────────────────────────────────
program
  .command("build")
  .description("AI-generate a feature implementation in an existing project")
  .requiredOption("-p, --project <path>", "Path to project directory")
  .requiredOption("-f, --feature <description>", "Feature to implement")
  .option("--dry-run", "Preview changes without writing files", false)
  .action(async (opts) => {
    try {
      await buildFeature({
        projectDir: opts.project,
        feature: opts.feature,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      console.error(`\n❌ Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

// ── Generate Docs ───────────────────────────────────────────
program
  .command("docs")
  .description("Generate or update README and architecture docs")
  .argument("<target>", "Repo name (remote) or path (local)")
  .option("-m, --mode <mode>", "readme | architecture | all", "all")
  .option("--remote", "Fetch from GitHub instead of local filesystem", false)
  .option("--dry-run", "Preview output without writing", false)
  .action(async (target, opts) => {
    try {
      await generateDocs({
        target,
        mode: opts.mode as "readme" | "architecture" | "all",
        remote: opts.remote,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      console.error(`\n❌ Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

// ── Sync Portfolio ──────────────────────────────────────────
program
  .command("sync")
  .description("Sync portfolio site with latest GitHub project data")
  .option(
    "-p, --portfolio-dir <path>",
    "Path to portfolio site directory",
    "../portfolio-site"
  )
  .option("--dry-run", "Preview changes without writing", false)
  .action(async (opts) => {
    try {
      await syncPortfolio({
        portfolioDir: opts.portfolioDir,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      console.error(`\n❌ Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program.parse();
