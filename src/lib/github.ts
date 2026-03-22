import { Octokit } from "@octokit/rest";

let octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (!octokit) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
  return octokit;
}

export function getUsername(): string {
  return process.env.GITHUB_USERNAME ?? "gcasti256";
}

export async function createRepo(
  name: string,
  description: string,
  isPrivate = false
): Promise<string> {
  const { data } = await getOctokit().repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: false,
  });
  return data.html_url;
}

export async function repoExists(owner: string, repo: string): Promise<boolean> {
  try {
    await getOctokit().repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
}

export async function getRepoInfo(owner: string, repo: string) {
  const { data } = await getOctokit().repos.get({ owner, repo });
  return data;
}

export async function listUserRepos(username: string) {
  const { data } = await getOctokit().repos.listForUser({
    username,
    sort: "updated",
    per_page: 100,
  });
  return data;
}

export async function getRepoLanguages(owner: string, repo: string) {
  const { data } = await getOctokit().repos.listLanguages({ owner, repo });
  return data;
}

export async function getRepoTopics(owner: string, repo: string) {
  const { data } = await getOctokit().repos.getAllTopics({ owner, repo });
  return data.names;
}

export async function setRepoTopics(owner: string, repo: string, topics: string[]) {
  await getOctokit().repos.replaceAllTopics({ owner, repo, names: topics });
}

export async function getLatestCommits(owner: string, repo: string, count = 10) {
  const { data } = await getOctokit().repos.listCommits({
    owner,
    repo,
    per_page: count,
  });
  return data;
}

export async function getRepoContents(owner: string, repo: string, path = "") {
  const { data } = await getOctokit().repos.getContent({ owner, repo, path });
  return data;
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const { data } = await getOctokit().repos.getContent({ owner, repo, path });
    if ("content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}
