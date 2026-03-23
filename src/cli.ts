#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import { scaffold } from "./commands/scaffold.js";
import { buildFeature } from "./commands/build-feature.js";
import { generateDocs } from "./commands/generate-docs.js";
import { syncPortfolio } from "./commands/sync-portfolio.js";
import { propose } from "./commands/propose.js";
import { autoFeature } from "./commands/auto-feature.js";

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

// ── Propose ─────────────────────────────────────────────────
program
  .command("propose")
  .description("Generate project ideas and create them as GitHub issues for review")
  .option("-c, --count <number>", "Number of ideas to generate", "1")
  .option("--dry-run", "Preview ideas without creating issues", false)
  .action(async (opts) => {
    try {
      await propose({
        count: parseInt(opts.count, 10),
        dryRun: opts.dryRun,
      });
    } catch (err) {
      console.error(`\n❌ Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

// ── Auto Feature ────────────────────────────────────────────
program
  .command("auto-feature")
  .description("Pick a random repo and add an AI-generated feature improvement")
  .option("-r, --repo <name>", "Target specific repo (random if omitted)")
  .option("-w, --work-dir <path>", "Working directory for clones", "/tmp/portfolio-repos")
  .option("--dry-run", "Preview without building or pushing", false)
  .action(async (opts) => {
    try {
      await autoFeature({
        repo: opts.repo,
        dryRun: opts.dryRun,
        workDir: opts.workDir,
      });
    } catch (err) {
      console.error(`\n❌ Error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program.parse();
