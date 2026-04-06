/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 113:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 591:
/***/ ((module) => {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 441:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 894:
/***/ ((module) => {

module.exports = eval("require")("@octokit/auth-app");


/***/ }),

/***/ 624:
/***/ ((module) => {

module.exports = eval("require")("@octokit/rest");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
const core = __nccwpck_require__(113);
const exec = __nccwpck_require__(591);
const github = __nccwpck_require__(441);
const { createAppAuth } = __nccwpck_require__(894);
const { Octokit } = __nccwpck_require__(624);

async function getAppOctokit(appId, privateKey, installationId) {
  if (!appId || !privateKey || !installationId) return null;
  try {
    const auth = createAppAuth({
      appId: parseInt(appId),
      privateKey: privateKey.replace(/\\n/g, '\n'),
      installationId: parseInt(installationId),
    });
    const { token } = await auth({ type: 'installation' });
    return new Octokit({ auth: token });
  } catch (err) {
    core.warning(`GitHub App auth failed, falling back to GITHUB_TOKEN: ${err.message}`);
    return null;
  }
}

function formatTimestamp(timezone) {
  try {
    return new Date().toLocaleString('en-US', {
      timeZone: timezone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return new Date().toUTCString();
  }
}

function extractPreviewUrl(output) {
  const match = output.match(/https:\/\/[a-zA-Z0-9\-]+\.pages\.dev/);
  return match ? match[0] : null;
}

async function createGithubDeployment(octokit, context, environment, previewUrl) {
  try {
    const deployment = await octokit.rest.repos.createDeployment({
      ...context.repo,
      ref: context.sha,
      environment,
      auto_merge: false,
      required_contexts: [],
      description: `Deploying to ${environment}`,
    });
    if (deployment.status === 201) {
      await octokit.rest.repos.createDeploymentStatus({
        ...context.repo,
        deployment_id: deployment.data.id,
        state: 'success',
        environment_url: previewUrl,
        log_url: previewUrl,
        description: 'Deployment successful',
      });
    }
  } catch (err) {
    core.warning(`Could not create GitHub Deployment: ${err.message}`);
  }
}

async function run() {
  const apiToken       = core.getInput('apiToken', { required: true });
  const accountId      = core.getInput('accountId', { required: true });
  const projectName    = core.getInput('projectName', { required: true });
  const directory      = core.getInput('directory', { required: true });
  const workingDir     = core.getInput('workingDirectory') || '.';
  const branch         = core.getInput('branch');
  const wranglerVer    = core.getInput('wranglerVersion') || '3';
  const gitHubToken    = core.getInput('gitHubToken');
  const appId          = core.getInput('appId');
  const privateKey     = core.getInput('privateKey');
  const installationId = core.getInput('installationId');
  const reactionsInput = core.getInput('reactions');
  const timezone       = core.getInput('timezone') || 'UTC';

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: apiToken,
    CLOUDFLARE_ACCOUNT_ID: accountId,
  };

  const args = ['pages', 'deploy', directory, `--project-name=${projectName}`];
  if (branch) args.push(`--branch=${branch}`);

  let deployOutput = '';
  let deployError  = '';

  core.startGroup('Wrangler Pages Deploy');
  const exitCode = await exec.exec(`npx wrangler@${wranglerVer}`, args, {
    cwd: workingDir,
    env,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data) => { deployOutput += data.toString(); },
      stderr: (data) => { deployError  += data.toString(); },
    },
  });
  core.endGroup();

  if (exitCode !== 0) {
    core.setFailed(`Wrangler deploy failed:\n${deployError}`);
    return;
  }

  const fullOutput = deployOutput + deployError;
  const previewUrl = extractPreviewUrl(fullOutput);
  if (previewUrl) {
    core.setOutput('url', previewUrl);
    core.info(`Preview URL: ${previewUrl}`);
  } else {
    core.warning('Could not extract preview URL from wrangler output.');
  }

  const { context } = github;
  let octokit = null;

  if (appId && privateKey && installationId) {
    octokit = await getAppOctokit(appId, privateKey, installationId);
  }
  if (!octokit && gitHubToken) {
    octokit = github.getOctokit(gitHubToken);
  }

  if (!octokit) {
    core.info('No GitHub token provided — skipping PR comment and deployment status.');
    return;
  }

  const environment = branch ? `Preview (${branch})` : 'Preview';
  if (previewUrl) {
    await createGithubDeployment(octokit, context, environment, previewUrl);
  }

  const pr = context.payload.pull_request;
  if (!pr || !previewUrl) return;

  const timestamp = formatTimestamp(timezone);
  const shortSha = context.sha.substring(0, 7);
  const inspectUrl = `https://dash.cloudflare.com/${accountId}/pages/view/${projectName}`;
  const commentBody = [
    `## 🚀 Deploying your latest changes`,
    ``,
    `| Name | Status | Preview | Updated (${timezone}) |`,
    `|------|--------|---------|----------------------|`,
    `| ${projectName} | ✅ Ready ([Inspect](${inspectUrl})) | 🔗 [Visit Preview](${previewUrl}) | ${timestamp} |`,
    ``,
    `**Latest commit:** \`${shortSha}\``,
  ].join('\n');

  let comment;
  try {
    comment = await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: pr.number,
      body: commentBody,
    });
    core.info(`Posted PR comment: ${comment.data.html_url}`);
  } catch (err) {
    core.warning(`Could not post PR comment: ${err.message}`);
    return;
  }

  if (reactionsInput && comment) {
    const validReactions = ['+1', '-1', 'laugh', 'confused', 'heart', 'hooray', 'rocket', 'eyes'];
    const reactions = reactionsInput.trim().split('\n').map(r => r.trim()).filter(Boolean);
    for (const reaction of reactions) {
      if (!validReactions.includes(reaction)) {
        core.warning(`Invalid reaction "${reaction}" — skipping.`);
        continue;
      }
      try {
        await octokit.rest.reactions.createForIssueComment({
          ...context.repo,
          comment_id: comment.data.id,
          content: reaction,
        });
      } catch (err) {
        core.warning(`Could not add reaction "${reaction}": ${err.message}`);
      }
    }
  }
}

run().catch(core.setFailed);

module.exports = __webpack_exports__;
/******/ })()
;