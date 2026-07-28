import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const featureRoot = dirname(fileURLToPath(import.meta.url));
const componentRoot = resolve(featureRoot, 'components');
const svgNodeShapeFiles = [
  'EarnedNodeShape.tsx',
  'AnnotationShape.tsx',
  'VirtualBrtClusterShape.tsx',
];

test('interactive SVG groups use a web-safe pointer wrapper without accessibility props', () => {
  const interactionSource = readFileSync(
    resolve(componentRoot, 'InteractiveSvgGroup.tsx'),
    'utf8',
  );
  const webInteractionSource = readFileSync(
    resolve(componentRoot, 'InteractiveSvgGroup.web.tsx'),
    'utf8',
  );
  assert.match(
    interactionSource,
    /<G onPress=/,
  );
  assert.match(
    webInteractionSource,
    /<g onClick=/,
  );

  for (const file of svgNodeShapeFiles) {
    const source = readFileSync(resolve(componentRoot, file), 'utf8');

    assert.match(
      source,
      /<InteractiveSvgGroup onActivate=/,
      `${file} must preserve web and native pointer selection`,
    );
    assert.doesNotMatch(
      source,
      /\b(?:accessible|accessibility\w+|focusable|nativeID|onBlur|onFocus|onKeyDown|role|tabIndex)\b/,
      `${file} must not pass DOM accessibility or keyboard props to an SVG <G>`,
    );
  }
});

test('the visually hidden accessible list retains real keyboard-selectable controls', () => {
  const source = readFileSync(
    resolve(componentRoot, 'ConstellationAccessibleList.tsx'),
    'utf8',
  );

  assert.match(source, /hiddenVisually[\s\S]*?<Pressable/);
  assert.match(source, /<Pressable[\s\S]*?onPress=\{\(\) => onSelect\(node\.selectionKey\)\}/);
  assert.doesNotMatch(source, /if \(hiddenVisually\)[\s\S]*?return \(\s*<Text/);
});
