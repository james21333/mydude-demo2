import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`test5 contract failed: ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/App.jsx', 'utf8');
const bridge = fs.readFileSync('bridge/mydude-bridge.mjs', 'utf8');

assert(/function Test5AvatarLab\s*\(/.test(app), 'frontend Test5AvatarLab component is missing');
assert(/\/test5\(\\\/\|\$\)/.test(app) || /test5/.test(app), 'RootRouter does not expose /test5');
assert(/\/test5\/avatar/.test(app), 'frontend does not call the test5 avatar endpoint');
assert(/<SceneAvatar\s+scene=\{scene\}/.test(app), 'frontend does not render returned SceneSpec with SceneAvatar');
assert(/expandedPrompt|designBrief|visualChecklist/.test(app), 'frontend does not expose expanded prompt/design brief receipts');
assert(/coverage/.test(app) && /enrichments/.test(app), 'frontend must expose detail coverage and deterministic enrichments');
assert(/useEnrichment/.test(app) && /fallback reusable shape primitives/.test(app), 'frontend must make enrichment/fallback primitives easy to toggle for comparisons');
assert(/function generateTest5Avatar\s*\(/.test(bridge), 'bridge generateTest5Avatar is missing');
assert(/req\.method === 'POST' && req\.url\?\.startsWith\('\/test5\/avatar'\)/.test(bridge), 'bridge POST /test5/avatar route is missing');
assert(/function expandTest5Prompt\s*\(/.test(bridge), 'bridge prompt expander stage is missing');
assert(/requiredRenderableDetails/.test(bridge), 'prompt expander must produce required renderable detail contracts');
assert(/generateTest5SceneSpec\s*\([^)]*designBrief/.test(bridge), 'SceneSpec generator must consume the expanded design brief');
assert(/callTest5Llm/.test(bridge), 'bridge does not call an LLM for test5');
assert(/function validateDetailCoverage\s*\(/.test(bridge), 'bridge must validate required detail coverage against layers');
assert(/function ensurePromptDetails\s*\(/.test(bridge), 'bridge must add deterministic procedural layer enrichments for missing common details');
assert(/coverage\.ok/.test(bridge) && /missingRequiredDetails/.test(bridge), 'test5 must gate acceptance on detail coverage, not just structural validity');
assert(/function test5OptionEnabled\s*\(/.test(bridge), 'test5 must have request/env option parsing');
assert(/TEST5_ENABLE_ENRICHMENT/.test(bridge), 'test5 must allow procedural enrichment/fallback primitives to be disabled for testing');
assert(/coverageMode/.test(bridge) && /report-only/.test(bridge), 'test5 must support report-only coverage when enrichment is disabled for comparisons');
assert(/commitRequested/.test(bridge), 'test5 artifacts must record whether commit was requested');
assert(/generateTest5ReactCssCharacter\s*\(/.test(bridge), 'test5 must generate a GPT-authored React/CSS character blueprint, not only SceneSpec layers');
assert(/sanitizeReactCssCharacter\s*\(/.test(bridge), 'test5 must sanitize the React/CSS character blueprint before the browser renders it');
assert(/reactCssCharacter/.test(bridge), 'test5 artifacts/results must include the GPT-authored React/CSS character receipt');
assert(/function Test5HandCodedAvatar\s*\(/.test(app), 'frontend must render a hand-coded React/CSS character component for /test5');
assert(/<Test5HandCodedAvatar\s+character=\{reactCssCharacter\}/.test(app), 'frontend must prefer the React/CSS character blueprint when available');
const css = fs.readFileSync('src/styles.css', 'utf8');
assert(/test5-dude-head/.test(app) && /test5-dude-head/.test(css), 'frontend must include original-blue-dude-style head/body CSS scaffold');
assert(/test5-dude-hand/.test(app) && /test5-dude-hand/.test(css), 'hand-held props such as wands must be nested in an explicit hand anchor');
assert(/test5-dude-foot/.test(app) && /test5-dude-foot/.test(css), 'foot-worn props such as boots/flames must be nested in an explicit foot anchor');
assert(/skipPreset: true/.test(bridge), 'test5 sanitizer must skip baked quality presets to prove fresh generation');
assert(/artifacts\/test5\/generated/.test(bridge), 'test5 artifacts are not saved under artifacts/test5/generated');
assert(/expandedPrompt/.test(bridge) && /visualChecklist/.test(bridge), 'test5 artifacts do not save expanded prompt/checklist receipts');
assert(/coverage/.test(bridge) && /enrichments/.test(bridge), 'test5 artifacts must save coverage/enrichment receipts');
assert(/git', \['commit'/.test(bridge), 'test5 successful generations are not committed');
assert(/TEST5_AUTO_PUSH/.test(bridge) && /git', \['push'/.test(bridge), 'test5 successful generations do not support auto-push');

console.log('test5 contract passed');
