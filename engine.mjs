
function obj(v){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected an object');return v;}
function arr(v,label='array'){if(!Array.isArray(v)||v.length>500)throw Error(label+' must be an array with at most 500 items');return v;}
function str(v){if(typeof v!=='string'||!v.trim()||v.length>100000)throw Error('Expected nonempty text (max 100000 characters)');return v;}
function num(v,label='number',min=-1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||Math.abs(v)>1e12)throw Error(label+' must be a finite number in range');return v;}
function bool(v){if(typeof v!=='boolean')throw Error('Expected a boolean');return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Expected YYYY-MM-DD');const t=Date.parse(v+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return t;}
export function run(x){obj(x);if(JSON.stringify(x).length>200000)throw Error('Input exceeds 200 KB limit');

num(x.budget,'budget',0);num(x.assetLimit,'asset limit',0);const index=a=>{const m=new Map();for(const f of arr(a,'assets')){str(f.path);num(f.bytes,'bytes',0);if(m.has(f.path))throw Error('Duplicate path');m.set(f.path,f.bytes);}return m;};const a=index(x.before),b=index(x.after);const total=[...b.values()].reduce((p,c)=>p+c,0);const rows=[...new Set([...a.keys(),...b.keys()])].sort().map(path=>({path,before:a.get(path)||0,after:b.get(path)||0,delta:(b.get(path)||0)-(a.get(path)||0),overLimit:(b.get(path)||0)>x.assetLimit}));return {metrics:{totalBytes:total,totalBudget:x.budget,passed:total<=x.budget&&!rows.some(r=>r.overLimit)},rows};

}
