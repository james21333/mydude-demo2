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
assert(/holding-wand/.test(app) && /holding-wand/.test(css), 'hand-held wands need a visible hand grip/clasp so they do not look detached');
assert(/grip-wand-shaft/.test(app) && /grip-wand-shaft/.test(css), 'hand-held staff must pass through the hand grip near the staff middle, not put the wrong end in the hand');
assert(/wand-handle-in-hand/.test(app) && /wand-handle-in-hand/.test(css), 'wand/staff handle segment must be explicitly aligned inside the hand grip, not just any shaft segment');
assert(/test5-dude-foot/.test(app) && /test5-dude-foot/.test(css), 'foot-worn props such as boots/flames must be nested in an explicit foot anchor');
assert(/--dude-body/.test(bridge) && /--dude-arm/.test(bridge) && /--dude-hand/.test(bridge) && /--dude-leg/.test(bridge) && /--dude-foot/.test(bridge), 'React/CSS blueprint prompt must require explicit body/arm/hand/leg/foot colors');
assert(/--dude-body/.test(css) && /--dude-arm/.test(css) && /--dude-hand/.test(css) && /--dude-leg/.test(css) && /--dude-foot/.test(css), 'renderer must apply explicit body/arm/hand/leg/foot colors');
assert(/mushroomStem/.test(bridge) && /wizardRobe/.test(bridge), 'mushroom wizard fallback must distinguish mushroom stem/body colors from wizard robe colors');
assert(/function validateReactCssFaithfulness\s*\(/.test(bridge), 'React/CSS blueprint must be validated for prompt-faithfulness before acceptance');
assert(/generateTest5ReactCssCharacter\s*\([^)]*repairNote/.test(bridge) && /reactCssRepairNotes/.test(bridge), 'React/CSS blueprint failures must go through a bounded LLM critique/repair loop');
assert(/mushroomCap/.test(bridge) && /mushroomGills/.test(bridge), 'mushroom prompts must require explicit cap and gill details in the blueprint');
assert(/suppressUnrequestedAnimalParts/.test(bridge), 'mushroom/non-animal prompts must suppress unrequested dog/animal parts');
assert(/head-mushroom[\s\S]*test5-dude-mushroom-cap/.test(css), 'mushroom head renderer must draw a real cap shape, not only a rounded head');
assert(/test5-dude-mushroom-gills/.test(app) && /test5-dude-mushroom-gills/.test(css), 'mushroom head renderer must include visible gills/underside');
assert(/test5-dude-mushroom-spots/.test(app) && /test5-dude-mushroom-spots/.test(css), 'mushroom cap spots must be attached to the mushroom cap');
assert(/skipPreset: true/.test(bridge), 'test5 sanitizer must skip baked quality presets to prove fresh generation');
assert(/artifacts\/test5\/generated/.test(bridge), 'test5 artifacts are not saved under artifacts/test5/generated');
assert(/expandedPrompt/.test(bridge) && /visualChecklist/.test(bridge), 'test5 artifacts do not save expanded prompt/checklist receipts');
assert(/coverage/.test(bridge) && /enrichments/.test(bridge), 'test5 artifacts must save coverage/enrichment receipts');
assert(/git', \['commit'/.test(bridge), 'test5 successful generations are not committed');
assert(/TEST5_AUTO_PUSH/.test(bridge) && /git', \['push'/.test(bridge), 'test5 successful generations do not support auto-push');

console.log('test5 contract passed');
