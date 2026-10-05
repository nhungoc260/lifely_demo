import re,glob,os,collections
import pathlib; ROOT=pathlib.Path(__file__).resolve().parents[2]; J=str(ROOT/'backend/src/main/java/com/lifely')
files={f:open(f).read() for f in glob.glob(J+'/**/*.java',recursive=True)}
# ---------------- 1) bean graph + cycles ----------------
beans={}   # simple name -> set(dependency simple names)
BEANANN=('@Service','@Component','@RestController','@Controller','@Configuration','@RestControllerAdvice')
for f,t in files.items():
    if not any(a in t for a in BEANANN): continue
    m=re.search(r'public\s+(?:final\s+)?class\s+(\w+)',t)
    if not m: continue
    cls=m.group(1)
    deps=set()
    for c in re.finditer(r'(?:public\s+)?'+cls+r'\s*\(((?:[^()]|\([^()]*\))*)\)\s*(?:throws[^{]*)?\{',t):
        params=[];depth=0;cur=''
        for ch in c.group(1):
            if ch=='<': depth+=1
            if ch=='>': depth-=1
            if ch==',' and depth==0: params.append(cur); cur=''
            else: cur+=ch
        params.append(cur)
        for p in params:
            p=re.sub(r'@\w+(\([^)]*\))?','',p).strip()
            if not p: continue
            typ=p.rsplit(' ',1)[0].split('<')[0].strip().split('.')[-1]
            deps.add(typ)
    beans[cls]=deps
# @Bean methods in @Configuration create beans that depend on method params: treat as config deps (skip), they don't create cycles with services
graph={k:{d for d in v if d in beans} for k,v in beans.items()}
cycles=[]
def dfs(n,path,seen):
    for d in graph.get(n,()):
        if d in path: cycles.append(path[path.index(d):]+[d]); continue
        if d in seen: continue
        seen.add(d); dfs(d,path+[d],seen)
for b in graph: dfs(b,[b],{b})
uniq={tuple(sorted(c[:-1])) for c in cycles}
print(f"[1] beans: {len(beans)}, injection edges: {sum(len(v) for v in graph.values())}, constructor-injection CYCLES: {len(uniq)}")
for c in uniq: print("    CYCLE:"," -> ".join(c))
# ---------------- 2) duplicate / ambiguous endpoints ----------------
eps=collections.defaultdict(list)
for f,t in files.items():
    if '@RestController' not in t: continue
    base=re.search(r'@RequestMapping\("([^"]+)"\)',t); base=base.group(1) if base else ''
    for m in re.finditer(r'@(Get|Post|Put|Delete|Patch)Mapping(?:\(([^)]*)\))?',t):
        p=re.search(r'"([^"]*)"',m.group(2) or ''); path=p.group(1) if p else ''
        full=path if path.startswith('/api') else base+path
        eps[(m.group(1).upper(),re.sub(r'\{[^}]+\}','{}',full))].append(os.path.basename(f))
dups={k:v for k,v in eps.items() if len(v)>1}
print(f"[2] endpoints: {len(eps)}, duplicates (would crash startup with 'Ambiguous mapping'): {len(dups)}")
for k,v in dups.items(): print("    DUP",k,v)
# literal-vs-variable overlaps are fine in Spring (literal wins); list them for information
lit=[(m,p) for (m,p) in eps if p.endswith(('/coverage','/dashboard','/export','/me'))]
# ---------------- 3) JPQL + derived-query property validation ----------------
ents={}
for f,t in files.items():
    if '@Entity' in t:
        cls=re.search(r'public class (\w+)',t).group(1)
        fields={}
        for m in re.finditer(r'private\s+(?!static)([\w.<>, ?]+?)\s+(\w+)\s*(?:=.*)?;',t): fields[m.group(2)]=m.group(1).strip()
        ents[cls]=fields
bad=0; scanned=0
for f,t in files.items():
    if 'Repository' not in os.path.basename(f): continue
    repo=re.search(r'interface (\w+)Repository\s+extends\s+JpaRepository<(\w+),',t)
    if not repo: continue
    ent=repo.group(2); scanned+=1
    # derived methods (skip statements annotated with @Query)
    stmts=[x for x in t.split(';') if '@Query' not in x]
    for m in re.finditer(r'\b(?:find|count|exists|delete)(?:All)?By(\w+?)\s*\(','\n'.join(stmts)):
        expr=m.group(1)
        order=re.search(r'OrderBy(.*)$',expr)
        if order:
            for o in [x for x in re.split(r'(?:Asc|Desc)',order.group(1)) if x]:
                pr=o[0].lower()+o[1:]
                if pr not in ents.get(ent,{}): print(f"    BAD OrderBy property '{pr}' in {repo.group(1)}Repository"); bad+=1
        expr=re.sub(r'(OrderBy.*)$','',expr)
        for part in re.split(r'(?<=[a-z])(?:And|Or)(?=[A-Z])',expr):
            part=re.sub(r'(IgnoreCase|In|Not|True|False|Before|After|IsNull|NotNull|Like|Containing)+$','',part)
            if not part: continue
            prop=part[0].lower()+part[1:]
            if prop not in ents.get(ent,{}):
                print(f"    BAD derived-query property '{prop}' in {repo.group(1)}Repository (entity {ent})"); bad+=1
    for m in re.finditer(r'OrderBy(\w+?)(?:Asc|Desc)',t):
        pass
    # JPQL alias.field
    for q in re.finditer(r'@Query\((?:value\s*=\s*)?("""(.*?)"""|"(.*?)")',t,re.S):
        jpql=q.group(2) or q.group(3)
        aliases={}
        for a in re.finditer(r'(?:from|join)\s+([\w.]+)\s+(\w+)',jpql):
            aliases[a.group(2)]=a.group(1).split('.')[-1]
        for a in re.finditer(r',\s*([\w.]+)\s+(\w+)\s+(?:where|,)',jpql): aliases[a.group(2)]=a.group(1).split('.')[-1]
        for a in re.finditer(r'\b(\w+)\.(\w+)(?:\.(\w+))?',jpql):
            al,fld,sub=a.group(1),a.group(2),a.group(3)
            if al in aliases and aliases[al] in ents:
                if fld not in ents[aliases[al]]:
                    print(f"    BAD JPQL field {al}.{fld} (entity {aliases[al]}) in {os.path.basename(f)}"); bad+=1
print(f"[3] derived-query / JPQL property problems: {bad}  (repositories scanned: {scanned})")
# ---------------- 4) @Value / property keys vs application.yml ----------------
import yaml
y=yaml.safe_load(open(str(ROOT/'backend/src/main/resources/application.yml')))
def flat(d,pre=''):
    out={}
    for k,v in d.items():
        key=f"{pre}{k}"
        if isinstance(v,dict): out.update(flat(v,key+'.'))
        else: out[key]=v
    return out
props=flat(y); miss=0
for f,t in files.items():
    for m in re.finditer(r'@Value\("\$\{([\w.\-]+)(?::([^}]*))?\}"\)',t):
        k,default=m.group(1),m.group(2)
        if k not in props and default is None:
            print(f"    @Value key without default and not in yml: {k} ({os.path.basename(f)})"); miss+=1
    for m in re.finditer(r'@ConfigurationProperties\(prefix\s*=\s*"([\w.\-]+)"\)',t):
        pre=m.group(1)
        if not any(k.startswith(pre+'.') for k in props): print(f"    config prefix {pre} has no keys in yml"); miss+=1
print(f"[4] property problems: {miss}")
# ---------------- 5) role names used ----------------
roles=set()
for t in files.values():
    for m in re.finditer(r"hasRole\('(\w+)'\)|hasAnyRole\(([^)]*)\)",t):
        for r in re.findall(r"'(\w+)'",m.group(0)): roles.add(r)
print("[5] roles referenced in @PreAuthorize:",sorted(roles),"| valid set: DONOR REQUESTER ORGANIZATION ADMIN ->",roles<= {'DONOR','REQUESTER','ORGANIZATION','ADMIN'})
