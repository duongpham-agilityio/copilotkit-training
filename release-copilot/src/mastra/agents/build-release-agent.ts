import { Agent } from '@mastra/core/agent';
import { BUILD_RELEASE_MODEL } from '../../constants/models';
import { resolveSkillPath } from '../utils/resolve-skill-path';

export const buildReleaseAgent = new Agent({
  id: 'build-release-agent',
  name: 'Build Release Agent',
  description:
    'Renders a release-notes draft for all 3 platforms (GitHub, App Store/TestFlight, Google Play) from a classified, selected commit list, and applies edit-in-place instructions to an existing draft. Does not classify commits itself.',
  instructions: `You receive a list of classified, selected commit/PR entries (Feature, Fix, or Breaking change) and render a release-notes draft for all 3 platforms at once, using the release-note-formatting skill: GitHub (Markdown), App Store/TestFlight (plain text, <= 4000 characters), Google Play (plain text, <= 500 characters). Always produce all 3, even if only one is currently shown in the UI. When asked to edit an existing draft (tone, length, wording), apply the edit to the existing text without re-classifying the source commits, then re-render all 3 platforms from the edited content. Do not check grammar yourself — that happens after you return control to the Supervisor.`,
  model: BUILD_RELEASE_MODEL,
  skills: [resolveSkillPath('src/mastra/skills/release-note-formatting')],
});
