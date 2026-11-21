function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected an object');
}
function bytes(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1e12) throw Error('Byte counts and budgets must be integers from 0 to 1e12');
  return value;
}
function index(assets) {
  if (!Array.isArray(assets) || assets.length > 500) throw Error('assets must be an array of at most 500 items');
  const result = new Map();
  for (const asset of assets) {
    object(asset);
    if (typeof asset.path !== 'string' || !asset.path.trim() || asset.path.length > 100000) throw Error('Expected a nonempty path');
    if (result.has(asset.path)) throw Error('Duplicate path');
    result.set(asset.path, bytes(asset.bytes));
  }
  return result;
}
export function run(input) {
  object(input);
  if (JSON.stringify(input).length > 200000) throw Error('Input exceeds 200000 serialized characters');
  const budget = bytes(input.budget), assetLimit = bytes(input.assetLimit);
  const growthBudget = Object.hasOwn(input, 'growthBudget') ? bytes(input.growthBudget) : null;
  const before = index(input.before), after = index(input.after);
  const totals = {added:0, removed:0, grown:0, shrunk:0};
  const rows = [...new Set([...before.keys(), ...after.keys()])].sort().map(path => {
    const a = before.get(path) ?? 0, b = after.get(path) ?? 0, delta = b - a;
    const status = !before.has(path) ? 'added' : !after.has(path) ? 'removed' : delta > 0 ? 'grown' : delta < 0 ? 'shrunk' : 'unchanged';
    if (status === 'added') totals.added += b;
    if (status === 'removed') totals.removed += a;
    if (status === 'grown') totals.grown += delta;
    if (status === 'shrunk') totals.shrunk -= delta;
    return {path, before:a, after:b, delta, status, overLimit:after.has(path) && b > assetLimit};
  });
  const previousBytes = [...before.values()].reduce((a,b) => a+b, 0);
  const totalBytes = [...after.values()].reduce((a,b) => a+b, 0);
  const positiveGrowthBytes = totals.added + totals.grown;
  const violations = [];
  if (totalBytes > budget) violations.push({kind:'total-budget',actual:totalBytes,limit:budget,excess:totalBytes-budget});
  if (growthBudget !== null && positiveGrowthBytes > growthBudget)
    violations.push({kind:'growth-budget',actual:positiveGrowthBytes,limit:growthBudget,excess:positiveGrowthBytes-growthBudget});
  for (const row of rows) if (row.overLimit)
    violations.push({kind:'asset-budget',path:row.path,actual:row.after,limit:assetLimit,excess:row.after-assetLimit});
  return {metrics:{totalBytes,totalBudget:budget,passed:violations.length===0,previousBytes,
    netChangeBytes:totalBytes-previousBytes,positiveGrowthBytes},rows,
    accounting:{addedBytes:totals.added,removedBytes:totals.removed,grownBytes:totals.grown,shrunkBytes:totals.shrunk},
    policy:{growthBudget},violations};
}
