import re,glob
import pathlib; ROOT=pathlib.Path(__file__).resolve().parents[2]; J=str(ROOT/'backend/src/main/java/com/lifely')
jt={}
def split_top(s):
    out=[];d=0;cur=''
    for ch in s:
        if ch in '<(': d+=1
        if ch in '>)': d-=1
        if ch==',' and d==0: out.append(cur); cur=''
        else: cur+=ch
    out.append(cur); return out
for f in glob.glob(J+'/**/*.java',recursive=True):
    t=open(f).read()
    for m in re.finditer(r'(?:public\s+)?record\s+(\w+)\s*\(((?:[^()]|\([^()]*\))*)\)',t):
        name,body=m.group(1),m.group(2); fields={}
        for p in split_top(body):
            p=re.sub(r'@\w+(\((?:[^()]|\([^()]*\))*\))?','',p).strip()
            if not p: continue
            typ,fname=p.rsplit(None,1); fields[fname]=typ.strip()
        jt[name]=fields
ts={}
T=open(str(ROOT/'frontend/types/domain.ts')).read()
for m in re.finditer(r'export interface (\w+)\s*\{(.*?)\n\}',T,re.S):
    fields={}
    for ln in m.group(2).split('\n'):
        mm=re.match(r'\s*(\w+)\??:\s*(.+?);?\s*$',ln)
        if mm: fields[mm.group(1)]=mm.group(2).rstrip(';')
    ts[m.group(1)]=fields
# inline nested interfaces in AdminDashboard handled separately
PAIRS={'RequestResponse':'BloodRequest','PublicRequestSummary':'PublicRequest','DonorMatchResponse':'DonorMatch',
 'DonorProfileResponse':'DonorProfile','OrganizationDto':'Organization','NotificationDto':'AppNotification',
 'AdminUserDto':'AdminUser','RequestMatchEntry':'RequestMatchEntry','MatchExplanation':'MatchExplanation',
 'ReportDto':'Report','AuditLogDto':'AuditLogEntry','ContactMessageDto':'ContactMessage','UserSummary':'UserSummary',
 'HistoryEntry':'HistoryEntry','RequesterDashboard':'RequesterDashboard','DonorDashboardResponse':'DonorDashboard',
 'OrganizationDashboard':'OrgDashboard','AuthResponse':'AuthResponse','PrivacyDto':'Privacy','DonationEntry':'DonationEntry',
 'Ring':'CoverageRing','RequestChangedEvent':'RequestChangedEvent','NotificationCreatedEvent':'NotificationEvent',
 'AdminRequestRow':'AdminRequestRow','DocumentDto':'OrgDocument'}
def kind(jtype):
    b=jtype.split('<')[0].split('.')[-1]
    if b in('UUID','String','Instant','LocalDate'): return 'string'
    if b in('int','long','double','Double','Integer','Long','BigDecimal','float'): return 'number'
    if b in('boolean','Boolean'): return 'boolean'
    if b in('List','Set'): return 'array'
    return 'other'
def tkind(t):
    t=t.strip()
    if t.endswith('[]'): return 'array'
    if t.startswith('string') or t=='string | null' or t.startswith('"'): return 'string'
    if t.startswith('number'): return 'number'
    if t.startswith('boolean'): return 'boolean'
    return 'other'
bad=0; checked=0
for jn,tn in PAIRS.items():
    if jn not in jt: print(f"  ? Java record {jn} not found"); bad+=1; continue
    if tn not in ts: print(f"  ? TS interface {tn} not found"); bad+=1; continue
    jf,tf=jt[jn],ts[tn]; checked+=1
    for k in jf:
        if k not in tf: print(f"  MISSING in TS {tn}: backend sends '{k}' ({jf[k]})"); bad+=1
        else:
            a,b=kind(jf[k]),tkind(tf[k])
            if 'other' not in (a,b) and a!=b: print(f"  TYPE MISMATCH {jn}.{k}: java {jf[k]} vs ts {tf[k]}"); bad+=1
    for k in tf:
        if k not in jf: print(f"  EXTRA in TS {tn}: frontend expects '{k}' but backend record {jn} has no such field"); bad+=1
print(f"contract pairs checked: {checked}; mismatches: {bad}")
