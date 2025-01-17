import * as github from '@actions/github';
import * as core from '@actions/core';

interface User {
  login: string;
}

interface PullRequest {
  title: string;
  body: string;
  number: number;
  html_url: string;
  user: User;
  merged_by: User | null;
  labels: string[] | null;
  assignees: string[] | null;
}

async function run(): Promise<void> {
  try {
    const pull = await getMergedPullRequest(
      core.getInput('github_token'),
      github.context.repo.owner,
      github.context.repo.repo,
      github.context.sha
    );
    if (!pull) {
      core.debug('pull request not found');
      return;
    }

    core.setOutput('title', pull.title);
    core.setOutput('body', pull.body);
    core.setOutput('number', pull.number);
    core.setOutput('labels', pull.labels?.join('\n'));
    core.setOutput('assignees', pull.assignees?.join('\n'));
    core.setOutput('author', pull.user.login);
  } catch (e) {
    core.error(e);
    core.setFailed(e.message);
  }
}

async function getMergedPullRequest(
  githubToken: string,
  owner: string,
  repo: string,
  sha: string
): Promise<PullRequest | null> {
  const client = new github.GitHub(githubToken);

  const resp = await client.pulls.list({
    owner,
    repo,
    sort: 'updated',
    direction: 'desc',
    state: 'closed',
    per_page: 100
  });

  const pullSummary = resp.data.find(p => p.merge_commit_sha === sha);
  if (!pullSummary) {
    return null;
  }

  const pull = (
    await client.pulls.get({
      owner,
      repo,
      pull_number: pullSummary.number
    })
  ).data;

  const merged_by = pull.merged_by?.login;

  return {
    title: pull.title,
    body: pull.body,
    number: pull.number,
    html_url: pull.html_url,
    labels: pull.labels.map(l => l.name),
    assignees: pull.assignees.map(a => a.login),
    user: {
      login: pull.user.login
    },
    merged_by: merged_by ? { login: merged_by } : null
  };
}

run();
