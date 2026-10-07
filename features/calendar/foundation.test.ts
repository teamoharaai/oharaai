import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('Home does not mount the social feed and Circles owns it', () => {
  const home = read('app/(app)/dashboard.tsx');
  const circlesRoute = read('app/(app)/circles.tsx');
  assert.doesNotMatch(home, /CirclesScreen|useCircles|fetchFeed/);
  assert.match(circlesRoute, /CirclesScreen/);
});

test('hidden account panes cannot initialize Circles requests', () => {
  const avatarMenu = read('components/layout/AvatarMenu.tsx');
  assert.match(avatarMenu, /\{savedOpen \? <OharaModal/);
  assert.match(avatarMenu, /\{circlesOpen \? <OharaModal/);
});

test('calendar projection is bounded, read-only, and keeps date-only items all day', () => {
  const route = read('app/api/calendar/items+api.ts');
  const projection = read('lib/db/calendar.ts');
  assert.match(route, /cannot exceed 63 days/);
  assert.doesNotMatch(projection, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  assert.match(projection, /sourceType: 'milestone'[\s\S]*allDay: true/);
  assert.match(projection, /sourceType: 'goal_deadline'[\s\S]*allDay: true/);
});

test('Apple Calendar permission is user-triggered, not requested on mount', () => {
  const provider = read('features/calendar/providers/apple-eventkit.ts');
  const hook = read('features/calendar/hooks/useCalendarItems.ts');
  assert.match(provider, /requestCalendarPermissionsAsync/);
  assert.match(hook, /const connect = useCallback/);
  assert.doesNotMatch(hook.match(/useEffect\([\s\S]*?\);/)?.[0] ?? '', /requestAccess/);
});
