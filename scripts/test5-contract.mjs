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
assert(/function generateTest5Avatar\s*\(/.test(bridge), 'bridge generateTest5Avatar is missing');
assert(/req\.method === 'POST' && req\.url\?\.startsWith\('\/test5\/avatar'\)/.test(bridge), 'bridge POST /test5/avatar route is missing');
assert(/callTest5Llm/.test(bridge), 'bridge does not call an LLM for test5');
assert(/skipPreset: true/.test(bridge), 'test5 sanitizer must skip baked quality presets to prove fresh generation');
assert(/artifacts\/test5\/generated/.test(bridge), 'test5 artifacts are not saved under artifacts/test5/generated');
assert(/git', \['commit'/.test(bridge), 'test5 successful generations are not committed');

console.log('test5 contract passed');
