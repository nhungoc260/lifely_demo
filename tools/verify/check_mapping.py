import re,glob,os,subprocess,collections
import pathlib; ROOT=pathlib.Path(__file__).resolve().parents[2]; J=str(ROOT/'backend/src/main/java/com/lifely')
def snake(n): return re.sub(r'(?<!^)(?=[A-Z])','_',n).lower()
# DB schema from real PostgreSQL
q="SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public'"
rows=subprocess.run(['psql','-h','localhost','-U','lifely','-d','lifely','-tA','-F','|','-c',q],env={**os.environ,'PGPASSWORD':'lifely_dev_password'},capture_output=True,text=True).stdout.strip().split('\n')
db=collections.defaultdict(dict)
for r in rows:
    t,c,d=r.split('|'); db[t][c]=d
OK={ 'UUID':{'uuid'},'String':{'character varying','text'},'int':{'integer','smallint'},'long':{'bigint','integer'},
 'Short':{'smallint'},'BigDecimal':{'numeric'},'Instant':{'timestamp with time zone'},'LocalDate':{'date'},
 'boolean':{'boolean'},'Map<String, Object>':{'jsonb'}}
problems=0; checked=0
for f in glob.glob(J+'/**/*.java',recursive=True):
    t=open(f).read()
    if '@Entity' not in t: continue
    cls=re.search(r'public class (\w+)',t).group(1)
    tbl=re.search(r'@Table\(name\s*=\s*"(\w+)"',t).group(1)
    if tbl not in db: print("MISSING TABLE",cls,tbl); problems+=1; continue
    lines=t.split('\n'); i=0; pending=[]
    for ln in lines:
        s=ln.strip()
        if s.startswith('@'): pending.append(s); continue
        m=re.match(r'private\s+(?!static)([\w.<>, ?]+?)\s+(\w+)\s*(=.*)?;',s)
        if m:
            typ,name=m.group(1).strip(),m.group(2); ann=' '.join(pending); pending=[]
            if '@Transient' in ann or '@ManyToMany' in ann or '@OneToMany' in ann: continue   # quan hệ qua bảng nối, không phải cột
            checked+=1
            col=re.search(r'@(?:Column|JoinColumn)\(.*?name\s*=\s*"(\w+)"',ann)
            col=col.group(1) if col else snake(name)
            if col not in db[tbl]: print(f"  BAD COLUMN {cls}.{name} -> {tbl}.{col} (not in database)"); problems+=1; continue
            dbt=db[tbl][col]
            if '@ManyToOne' in ann:
                if dbt not in ('smallint','uuid','integer'): print(f"  BAD FK TYPE {cls}.{name} {dbt}"); problems+=1
                continue
            if '@Enumerated' in ann or typ in('AvailabilityStatus','UserStatus','Urgency','RequestStatus','MatchStatus','ContactStatus','ReportTarget','ReportReason','ReportStatus','NotificationType','OrgType','OrgVerificationStatus'):
                if dbt!='character varying': print(f"  BAD ENUM COL {cls}.{name} {dbt}"); problems+=1
                continue
            ok=OK.get(typ)
            if ok is None: print(f"  ? unmapped java type {typ} for {cls}.{name}"); continue
            if dbt not in ok: print(f"  TYPE MISMATCH {cls}.{name}: java {typ} vs db {dbt}"); problems+=1
        elif s and not s.startswith('//') and not s.startswith('*') and not s.startswith('/*'): pending=[]
print(f"checked {checked} entity fields against the real PostgreSQL schema; problems: {problems}")
