// Test-only reference programs. Never imported by the learner UI or worker.
import { CORE_SOLUTIONS } from './core-solutions.js'
import { ADVANCED_SOLUTIONS } from './advanced-solutions.js'
import { EXPERT_SOLUTIONS } from './expert-solutions.js'
import { SPECIALIST_SOLUTIONS } from './specialist-solutions.js'

const pair = (Python, JavaScript) => ({ Python, JavaScript })
export const SOLUTIONS = {
  ...CORE_SOLUTIONS,
  ...ADVANCED_SOLUTIONS,
  ...EXPERT_SOLUTIONS,
  ...SPECIALIST_SOLUTIONS,
  recursion: pair(`def solve(n):
    if n == 0:
        return 0
    return n % 10 + solve(n // 10)
`, `function solve(n) { return n === 0 ? 0 : n % 10 + solve(Math.floor(n / 10)); }`),
  'recursive-trees': pair(`def solve(n):
    a, b = 1, 1
    for i in range(2, n + 1):
        a, b = b, 1 + a + b
    return b
`, `function solve(n) { let a=1,b=1; for(let i=2;i<=n;i++) [a,b]=[b,1+a+b]; return b; }`),
  induction: pair(`def solve(n):
    return sum(2*i + 1 for i in range(n))
`, `function solve(n) { let s=0; for(let i=0;i<n;i++) s+=2*i+1; return s; }`),
  asymptotics: pair(`def solve(n, k):
    return sum(min(i, k) for i in range(1, n + 1))
`, `function solve(n,k) { let s=0; for(let i=1;i<=n;i++) s+=Math.min(i,k); return s; }`),
  enumeration: pair(`def solve(values, target):
    def visit(i, total):
        if i == len(values):
            return int(total == target)
        return visit(i+1, total) + visit(i+1, total+values[i])
    return visit(0, 0)
`, `function solve(values,target) { function visit(i,s) { return i===values.length ? Number(s===target) : visit(i+1,s)+visit(i+1,s+values[i]); } return visit(0,0); }`),
  'recursive-backtracking': pair(`def solve(n):
    zero, one = 1, 0
    for _ in range(n):
        zero, one = zero + one, zero
    return zero + one
`, `function solve(n) { let z=1,o=0; for(let i=0;i<n;i++) [z,o]=[z+o,z]; return z+o; }`),
  overlap: pair(`def solve(n):
    return 1 if n < 2 else n + 1
`, `function solve(n) { return n<2 ? 1 : n+1; }`),
  'optimal-substructure': pair(`def solve(costs):
    dp = [0] * (len(costs) + 2)
    for i, cost in enumerate(costs):
        dp[i+2] = cost + min(dp[i], dp[i+1])
    return min(dp[-1], dp[-2])
`, `function solve(costs) { let a=0,b=0; for(const x of costs) [a,b]=[b,x+Math.min(a,b)]; return Math.min(a,b); }`),
  'state-sufficiency': pair(`def solve(rewards):
    a, b = 0, 0
    for x, y in rewards:
        a, b = b+x, a+y
    return max(a, b)
`, `function solve(rewards) { let a=0,b=0; for(const [x,y] of rewards) [a,b]=[b+x,a+y]; return Math.max(a,b); }`),
  'state-meaning': pair(`def solve(values):
    out = [0]
    for x in values:
        out.append(out[-1] + x)
    return out
`, `function solve(values) { const out=[0]; for(const x of values) out.push(out.at(-1)+x); return out; }`),
  transitions: pair(`def solve(n):
    dp = [1] + [0]*n
    for i in range(1, n+1):
        dp[i] = sum(dp[i-j] for j in (1,3) if i >= j)
    return dp[n]
`, `function solve(n) { const d=Array(n+1).fill(0);d[0]=1;for(let i=1;i<=n;i++) for(const j of [1,3]) if(i>=j)d[i]+=d[i-j];return d[n]; }`),
  'base-cases': pair(`def solve(rows, cols):
    if not rows or not cols:
        return 0
    d = [1]*cols
    for r in range(1, rows):
        for c in range(1, cols):
            d[c] += d[c-1]
    return d[-1]
`, `function solve(rows,cols) { if(!rows||!cols)return 0; const d=Array(cols).fill(1);for(let r=1;r<rows;r++)for(let c=1;c<cols;c++)d[c]+=d[c-1];return d.at(-1); }`),
  unreachable: pair(`def solve(coins, amount):
    d = [0] + [float('inf')]*amount
    for i in range(1, amount+1):
        for c in coins:
            if c <= i:
                d[i] = min(d[i], d[i-c]+1)
    return -1 if d[amount] == float('inf') else d[amount]
`, `function solve(coins,amount) { const d=Array(amount+1).fill(Infinity);d[0]=0;for(let i=1;i<=amount;i++)for(const c of coins)if(c<=i)d[i]=Math.min(d[i],d[i-c]+1);return d[amount]===Infinity?-1:d[amount]; }`),
  'dependency-order': pair(`def solve(values):
    out = values.copy()
    for i in range(len(out)-2, -1, -1):
        out[i] = min(out[i], out[i+1])
    return out
`, `function solve(values) { const out=[...values];for(let i=out.length-2;i>=0;i--)out[i]=Math.min(out[i],out[i+1]);return out; }`),
  'answer-extraction': pair(`def solve(values):
    if not values:
        return 0
    end = best = values[0]
    for x in values[1:]:
        end = max(x, end+x)
        best = max(best, end)
    return best
`, `function solve(values) { if(!values.length)return 0;let e=values[0],b=e;for(const x of values.slice(1)){e=Math.max(x,e+x);b=Math.max(b,e);}return b; }`),
  'dp-vs-greedy': pair(`def solve(amount):
    d = [0] + [amount+1]*amount
    for i in range(1, amount+1):
        d[i] = 1 + min(d[i-c] for c in (1,3,4) if c<=i)
    return d[amount]
`, `function solve(amount) { const d=Array(amount+1).fill(amount+1);d[0]=0;for(let i=1;i<=amount;i++)for(const c of [1,3,4])if(c<=i)d[i]=Math.min(d[i],d[i-c]+1);return d[amount]; }`),
  memoization: pair(`def solve(n):
    cache = {0: 1}
    def ways(k):
        if k < 0:
            return 0
        if k not in cache:
            cache[k] = sum(ways(k-j) for j in (1,2,3))
        return cache[k]
    return ways(n)
`, `function solve(n) { const memo=new Map([[0,1]]);function f(k){if(k<0)return 0;if(!memo.has(k))memo.set(k,f(k-1)+f(k-2)+f(k-3));return memo.get(k);}return f(n); }`),
  tabulation: pair(`def solve(n):
    d = [1] + [0]*n
    for i in range(1, n+1):
        d[i] = d[i-1] + (d[i-4] if i>=4 else 0)
    return d[n]
`, `function solve(n) { const d=Array(n+1).fill(0);d[0]=1;for(let i=1;i<=n;i++)d[i]=d[i-1]+(i>=4?d[i-4]:0);return d[n]; }`),
  'dense-sparse': pair(`def solve(values):
    sums = {0}
    for x in values:
        sums |= {s+x for s in sums}
    return sorted(sums)
`, `function solve(values) { let sums=new Set([0]);for(const x of values)sums=new Set([...sums,...[...sums].map(s=>s+x)]);return [...sums].sort((a,b)=>a-b); }`),
  'cache-keys': pair(`def solve(grids):
    results = []
    for grid in grids:
        if not grid or not grid[0]:
            results.append(0)
            continue
        d = [0]*len(grid[0])
        d[0] = 1
        for row in grid:
            for c, blocked in enumerate(row):
                if blocked:
                    d[c] = 0
                elif c:
                    d[c] += d[c-1]
        results.append(d[-1])
    return results
`, `function solve(grids) { return grids.map(g=>{if(!g.length||!g[0].length)return 0;const d=Array(g[0].length).fill(0);d[0]=1;for(const row of g)for(let c=0;c<row.length;c++){if(row[c])d[c]=0;else if(c)d[c]+=d[c-1];}return d.at(-1);}); }`),
  'stack-limits': pair(`def solve(values):
    total = 0
    for x in values:
        total += x
    return total
`, `function solve(values) { let s=0;for(const x of values)s+=x;return s; }`),
  'numeric-safety': pair(`def solve(a, b):
    return str(int(a) + int(b))
`, `function solve(a,b) { return (BigInt(a)+BigInt(b)).toString(); }`),
  'modular-counting': pair(`def solve(n, modulus):
    a, b = 0, 1 % modulus
    for _ in range(n):
        a, b = b, (a+b) % modulus
    return a
`, `function solve(n,modulus) { let a=0,b=1%modulus;for(let i=0;i<n;i++)[a,b]=[b,(a+b)%modulus];return a; }`),
  'table-aliasing': pair(`def solve(rows, cols, updates):
    table = [[0]*cols for _ in range(rows)]
    for r, c, value in updates:
        table[r][c] = value
    return table
`, `function solve(rows,cols,updates) { const t=Array.from({length:rows},()=>Array(cols).fill(0));for(const [r,c,v] of updates)t[r][c]=v;return t; }`),
  'differential-testing': pair(`def solve(values):
    best = 0
    for mask in range(1 << len(values)):
        if mask & (mask << 1):
            continue
        best = max(best, sum(x for i,x in enumerate(values) if mask & (1 << i)))
    return best
`, `function solve(values) { let best=0;for(let m=0;m<2**values.length;m++){if(m&(m<<1))continue;let s=0;for(let i=0;i<values.length;i++)if(m&(1<<i))s+=values[i];best=Math.max(best,s);}return best; }`),
  invariants: pair(`def solve(values):
    out = []
    for x in values:
        out.append(max(out[-1], x) if out else x)
    return out
`, `function solve(values) { const out=[];for(const x of values)out.push(out.length?Math.max(out.at(-1),x):x);return out; }`),
  'edge-cases': pair(`def solve(grid):
    if not grid or not grid[0]:
        return 0
    d = [float('inf')]*len(grid[0])
    d[0] = 0
    for row in grid:
        for c, x in enumerate(row):
            d[c] = min(d[c], d[c-1] if c else float('inf')) + x
    return d[-1]
`, `function solve(grid) { if(!grid.length||!grid[0].length)return 0;const d=Array(grid[0].length).fill(Infinity);d[0]=0;for(const row of grid)for(let c=0;c<row.length;c++)d[c]=Math.min(d[c],c?d[c-1]:Infinity)+row[c];return d.at(-1); }`),
  reconstruction: pair(`def solve(n):
    d = [0] + [n+1]*n
    parent = [-1]*(n+1)
    for i in range(1, n+1):
        candidates = [i-j for j in (1,3) if j<=i]
        p = min(candidates, key=lambda p: (d[p], p))
        d[i], parent[i] = d[p]+1, p
    path = []
    while n >= 0:
        path.append(n)
        n = parent[n]
    return path[::-1]
`, `function solve(n) {const d=Array(n+1).fill(n+1),p=Array(n+1).fill(-1);d[0]=0;for(let i=1;i<=n;i++){let q=[i-1,i-3].filter(x=>x>=0).sort((a,b)=>d[a]-d[b]||a-b)[0];d[i]=d[q]+1;p[i]=q;}const path=[];for(let i=n;i>=0;i=p[i])path.push(i);return path.reverse();}`),
  ties: pair(`def solve(values):
    best, ways = 0, 0
    for mask in range(1 << len(values)):
        if mask & (mask << 1):
            continue
        total = sum(x for i,x in enumerate(values) if mask & (1 << i))
        if total > best:
            best, ways = total, 1
        elif total == best:
            ways += 1
    return {'best': best, 'ways': ways}
`, `function solve(values) {let best=0,ways=0;for(let m=0;m<2**values.length;m++){if(m&(m<<1))continue;let s=0;for(let i=0;i<values.length;i++)if(m&(1<<i))s+=values[i];if(s>best){best=s;ways=1;}else if(s===best)ways++;}return {best,ways};}`),
}
