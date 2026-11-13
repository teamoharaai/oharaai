import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Deterministic hook dispatcher for async ordering, using the actual hook code.
// Browser suites cover React rendering; database suites cover authorization.
function mount(path: string, exported: string, fetch: (url: string, init?: any) => Promise<Response>, initialArgs: any[]) {
  const slots: any[] = []; let index = 0; let effects: Array<() => void> = []; let args = initialArgs;
  const same = (a: any[], b?: any[]) => b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(value: any) { const i = index++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], (next: any) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(value: any) { const i = index++; return slots[i] ??= { current: value }; },
    useCallback(fn: any, deps: any[]) { const i = index++; if (!same(deps, slots[i]?.deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn: any, deps: any[]) { const i = index++; if (!same(deps, slots[i]?.deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', source)((name: string) => {
    if (name === 'react') return react;
    if (name === '@/lib/api/client') return { authedFetch: fetch };
    throw new Error(`Unexpected runtime import: ${name}`);
  }, module, module.exports);
  return { render(next = args) { args = next; index = 0; effects = []; const value = module.exports[exported](...args); effects.forEach((effect) => effect()); return value; } };
}
const response = (items: any[]) => Response.json({ vault: { id: 'v' }, items });
const item = { id: 'source', title: 'Original', itemType: 'link' };
function deferred() { let resolve!: (value: Response) => void; const promise = new Promise<Response>((done) => { resolve = done; }); return { promise, resolve }; }

for (const [name, path] of [
  ['useVault', 'features/goals/hooks/useVault.ts'],
  ['useProjectVault', 'features/projects/hooks/useProjectVault.ts'],
]) {
  test(`${name}: a late read cannot resurrect a deleted Source`, async () => {
    let slow = false; const pending = deferred();
    const hook = mount(path, name, async (_url, init) => init?.method === 'DELETE' ? new Response(null, { status: 204 }) : slow ? pending.promise : response([item]), ['parent']);
    await hook.render().refresh(); assert.equal(hook.render().items.length, 1);
    slow = true; const oldRead = hook.render().refresh();
    await hook.render().removeItem(item.id);
    pending.resolve(response([item])); await oldRead;
    assert.equal(hook.render().items.length, 0); assert.equal(hook.render().loading, false);
  });
  test(`${name}: a late read cannot revert a confirmed Source edit`, async () => {
    let slow = false; const pending = deferred();
    const hook = mount(path, name, async (_url, init) => init?.method === 'PUT' ? Response.json({ item: { ...item, title: 'Saved edit' } }) : slow ? pending.promise : response([item]), ['parent']);
    await hook.render().refresh(); slow = true; const oldRead = hook.render().refresh();
    await hook.render().updateItem(item.id, { title: 'Saved edit' });
    pending.resolve(response([item])); await oldRead;
    assert.equal(hook.render().items[0].title, 'Saved edit');
  });
  test(`${name}: changing parent rejects old reads and old mutation results`, async () => {
    const read = deferred(); const write = deferred();
    const hook = mount(path, name, async (_url, init) => init?.method === 'PUT' ? write.promise : read.promise, ['old-parent']);
    const old = hook.render(); const loading = old.refresh(); const saving = old.updateItem(item.id, { title: 'Old scope' });
    hook.render(['new-parent']);
    read.resolve(response([item])); write.resolve(Response.json({ item })); await Promise.all([loading, saving]);
    assert.deepEqual(hook.render().items, []);
  });
  test(`${name}: newer successful read wins over an older failed response`, async () => {
    const first = deferred(); let reads = 0;
    const hook = mount(path, name, async () => ++reads === 1 ? first.promise : response([item]), ['parent']);
    const old = hook.render().refresh(); await hook.render().refresh(); first.resolve(new Response(null, { status: 503 })); await old;
    assert.equal(hook.render().items.length, 1); assert.equal(hook.render().error, null);
  });
  test(`${name}: returning to the same parent does not accept a previous visit's write`, async () => {
    const write = deferred();
    const hook = mount(path, name, async (_url, init) => init?.method === 'PUT' ? write.promise : response([{ ...item, title: 'Current visit' }]), ['parent']);
    const saving = hook.render().updateItem(item.id, { title: 'Previous visit' });
    hook.render(['other-parent']); hook.render(['parent']);
    await hook.render().refresh();
    write.resolve(Response.json({ item: { ...item, title: 'Previous visit' } })); await saving;
    assert.equal(hook.render().items[0].title, 'Current visit');
  });
}
