import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WORKSPACE_LINKS, isWorkspaceLinkActive } from '../../components/layout/workspace-navigation.ts';
import { WORKSPACE_LIGHT, WORKSPACE_DARK } from '../../constants/workspace.ts';
import { LIGHT_THEME, DARK_THEME } from '../../constants/colors.ts';

const read = (path: string) => readFileSync(path, 'utf8');
test('route matching selects one existing destination, including Sources and legacy reflection routes', () => {
  for (const [path, view, label] of [
    ['/notes', 'sources', 'Sources'], ['/notes', 'my-library', 'Notes'], ['/notes/note-id', undefined, 'Notes'],
    ['/journal/id', undefined, 'Reflections'], ['/reflections/id', undefined, 'Reflections'], ['/entries/reflection', undefined, 'Reflections'], ['/entries/reflection/id', undefined, 'Reflections'],
    ['/goals/id/vault', undefined, 'Goals'], ['/projects/id', undefined, 'Projects'], ['/calendar', undefined, 'Calendar'],
    ['/constellation', undefined, 'Roots'], ['/circles', undefined, 'Circles'],
  ]) assert.deepEqual(WORKSPACE_LINKS.filter((item) => isWorkspaceLinkActive(item, path!, view)).map((item) => item.label), [label]);
});

test('workspace theme is scoped and does not mutate public or native theme constants', () => {
  assert.equal(LIGHT_THEME.accent.primary, '#63C174');
  assert.equal(DARK_THEME.background.page, '#111111');
  assert.equal(WORKSPACE_LIGHT.background.card, '#FFFFFF');
  assert.equal(WORKSPACE_LIGHT.accent.primary, '#315743');
  assert.equal(WORKSPACE_DARK.background.page, '#191D1B');
  const native = read('components/layout/WorkspaceShell.tsx');
  assert.match(native, /<AppNavigation/);
  assert.doesNotMatch(native, /localStorage|dialog|WorkspaceThemeContext|workspace-v2.css/);
  assert.doesNotMatch(read('app/_layout.tsx'), /WorkspaceShell|WORKSPACE_LIGHT|WORKSPACE_DARK/);
});

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map((value) => parseInt(value, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); }
test('core text, selected navigation and primary controls meet AA contrast in both themes', () => {
  for (const colors of [WORKSPACE_LIGHT, WORKSPACE_DARK]) {
    for (const text of [colors.text.primary, colors.text.secondary, colors.text.muted]) {
      assert.ok(contrast(text, colors.background.card) >= 4.5);
      assert.ok(contrast(text, colors.background.page) >= 4.5);
    }
    assert.ok(contrast(colors.text.accent, colors.background.selectedRow) >= 4.5);
    assert.ok(contrast(colors.text.onAccent, colors.accent.primary) >= 4.5);
  }
});
