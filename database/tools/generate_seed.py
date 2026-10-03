#!/usr/bin/env python3
"""Sinh backend/src/main/resources/db/migration/V5__seed_data.sql (dữ liệu DEMO, tất định).

Chạy lại:  pip install bcrypt && python database/tools/generate_seed.py
Mật khẩu demo của mọi tài khoản: Lifely@2027  (CHỈ dùng cho môi trường demo).
Dữ liệu là giả lập; tên bệnh viện là hư cấu, không đại diện cho cơ sở y tế thật.
"""
import math, random, uuid, os
import bcrypt

random.seed(2027)
NS = uuid.UUID("11111111-2222-3333-4444-555555555555")
def uid(name): return str(uuid.uuid5(NS, name))
def q(s): return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"
PASSWORD = "Lifely@2027"
PW_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(10)).decode()

BT = {"O+":1,"O-":2,"A+":3,"A-":4,"B+":5,"B-":6,"AB+":7,"AB-":8}
COMPAT = {  # donor -> recipients
 "O+":["O+","A+","B+","AB+"],"O-":list(BT),"A+":["A+","AB+"],"A-":["A+","A-","AB+","AB-"],
 "B+":["B+","AB+"],"B-":["B+","B-","AB+","AB-"],"AB+":["AB+"],"AB-":["AB+","AB-"]}
# Quận/huyện TP.HCM (tọa độ xấp xỉ khu vực)
DISTRICTS = [("Quận 1",10.7769,106.7009),("Quận 3",10.7840,106.6844),("Quận 5",10.7540,106.6634),
 ("Quận 7",10.7340,106.7220),("Quận 10",10.7730,106.6670),("Bình Thạnh",10.8106,106.7091),
 ("Phú Nhuận",10.7991,106.6800),("Tân Bình",10.8014,106.6526),("Gò Vấp",10.8386,106.6652),("Thủ Đức",10.8494,106.7537)]
def hav(a,b,c,d):
    R=6371.0; p1,p2=math.radians(a),math.radians(c); dp=p2-p1; dl=math.radians(d-b)
    h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))
def jitter(lat,lng,km=1.5):
    return round(lat+random.uniform(-km,km)/111,6), round(lng+random.uniform(-km,km)/111,6)

HO=["Nguyễn","Trần","Lê","Phạm","Hoàng","Huỳnh","Phan","Vũ","Võ","Đặng","Bùi","Đỗ"]
MID=["Văn","Thị","Minh","Quốc","Thanh","Ngọc","Hữu","Anh","Gia","Đức"]
TEN=["An","Bình","Cường","Dũng","Giang","Hà","Hiếu","Khoa","Lan","Linh","Nam","Phúc","Quân","Sơn","Trang","Tuấn","Vy","Yến"]
def name(): return f"{random.choice(HO)} {random.choice(MID)} {random.choice(TEN)}"
def phone(i): return f"09{random.randint(10000000,99999999)}"

out=[]; w=out.append
users=[]  # (id,email,name,phone,role)
def add_user(key,email,full,role,onboarded=True):
    i=uid(key); users.append((i,email,full,role))
    w(f"INSERT INTO users (id,email,password_hash,full_name,phone,status,onboarding_step,onboarding_completed,created_at) VALUES "
      f"({q(i)},{q(email)},{q(PW_HASH)},{q(full)},{q(phone(i))},'ACTIVE',{6 if onboarded else 3},{str(onboarded).upper()},now() - interval '{random.randint(5,200)} days');")
    rid={"DONOR":1,"REQUESTER":2,"ORGANIZATION":3,"ADMIN":4}[role]
    w(f"INSERT INTO user_roles (user_id,role_id) VALUES ({q(i)},{rid});")
    w(f"INSERT INTO privacy_settings (user_id) VALUES ({q(i)});")
    return i

w("-- V5: DỮ LIỆU DEMO (sinh bởi database/tools/generate_seed.py). Không dùng cho production.")
w("-- Mật khẩu mọi tài khoản demo: Lifely@2027")

admin=add_user("admin","admin@lifely.demo","Quản trị LIFELY","ADMIN")
# --- Donors: 30 ---
donors=[]  # dict
types_cycle=["O+","O-","A+","A-","B+","B-","AB+","AB-"]
for n in range(30):
    key=f"donor{n}"; email="donor@lifely.demo" if n==0 else f"donor{n}@lifely.demo"
    full="Nguyễn Văn A" if n==0 else name()
    uidv=add_user(key,email,full,"DONOR")
    bt = "O+" if n==0 else (types_cycle[n%8] if n>8 else random.choice(["O+","O+","A+","B+","O-","A-","B-","AB+","AB-"]))
    if n in(1,2): bt="O+"
    dn,dlat,dlng=random.choice(DISTRICTS) if n>2 else DISTRICTS[0 if n==0 else (1 if n==1 else 2)]
    lat,lng=jitter(dlat,dlng)
    avail = "NOT_AVAILABLE" if n in (7,13,21) else "AVAILABLE"
    last = f"CURRENT_DATE - {random.randint(100,400)}" if n%5 else f"CURRENT_DATE - {random.randint(10,60)}"
    total=random.randint(0,12) if n else 5
    did=uid(f"dp{n}")
    donors.append(dict(id=did,user=uidv,bt=bt,lat=lat,lng=lng,avail=avail,district=dn,n=n))
    w(f"INSERT INTO donor_profiles (id,user_id,blood_type_id,city,district,latitude,longitude,last_donation_date,availability_status,total_donations) VALUES "
      f"({q(did)},{q(uidv)},{BT[bt]},'TP. Hồ Chí Minh',{q(dn)},{lat},{lng},{last},{q(avail)},{total});")
    for k in range(min(total,3)):
        w(f"INSERT INTO donation_history (donor_id,donated_on,location,source) VALUES ({q(did)},CURRENT_DATE - {90*(k+1)+random.randint(0,20)},{q(random.choice(['Bệnh viện Trung Tâm','Trung tâm Hiến máu Demo']))},'SELF_REPORTED');")

# --- Organizations: 8 ---
ORGS=[("LIFELY General Hospital","HOSPITAL","VERIFIED",0),("Central Hospital","HOSPITAL","VERIFIED",1),
 ("Trung tâm Hiến máu Demo Quận 5","BLOOD_CENTER","VERIFIED",2),("Bệnh viện Demo Bình Thạnh","HOSPITAL","VERIFIED",5),
 ("Bệnh viện Demo Thủ Đức","HOSPITAL","VERIFIED",9),("Phòng khám Demo Tân Bình","CLINIC","VERIFIED",7),
 ("Hội Chữ thập đỏ Demo Gò Vấp","NGO","UNDER_REVIEW",8),("Bệnh viện Demo Quận 7","HOSPITAL","PENDING",3)]
orgs=[]
for n,(nm,tp,st,di) in enumerate(ORGS):
    email="hospital@lifely.demo" if n==0 else f"org{n}@lifely.demo"
    ou=add_user(f"org{n}",email,f"Đại diện {nm}","ORGANIZATION")
    dn,dlat,dlng=DISTRICTS[di]; lat,lng=jitter(dlat,dlng,0.3); oid=uid(f"org{n}")
    orgs.append(dict(id=oid,user=ou,name=nm,lat=lat,lng=lng,district=dn,status=st))
    ver = f"{q(admin)},now() - interval '30 days'" if st=="VERIFIED" else "NULL,NULL"
    w(f"INSERT INTO organizations (id,owner_user_id,name,type,address,city,district,latitude,longitude,phone,email,contact_person,verification_status,verified_by,verified_at) VALUES "
      f"({q(oid)},{q(ou)},{q(nm)},{q(tp)},{q(f'{random.randint(1,300)} Đường Demo, {dn}')},'TP. Hồ Chí Minh',{q(dn)},{lat},{lng},{q(phone(n))},{q(email)},{q(name())},{q(st)},{ver});")
    if st!="PENDING":
        w(f"INSERT INTO organization_documents (organization_id,doc_type,file_name,file_url) VALUES ({q(oid)},'OPERATING_LICENSE','giay-phep-hoat-dong.pdf','/demo/giay-phep-{n}.pdf');")

# --- Requesters: 11 ---
reqs=[]
for n in range(11):
    email="requester@lifely.demo" if n==0 else f"requester{n}@lifely.demo"
    reqs.append(add_user(f"req{n}",email,name(),"REQUESTER"))

# --- Requests: 20 ---
# (key, bt, units, urgency, status, org_idx, hours_left, confirmed_target)
R=[("scenario","O+",5,"CRITICAL","PARTIALLY_FULFILLED",0,1.705,2),
 ("r1","O-",2,"CRITICAL","DONORS_CONTACTED",1,2.5,0),("r2","A+",3,"URGENT","PARTIALLY_FULFILLED",3,20,1),
 ("r3","B+",2,"URGENT","MATCHING",2,30,0),("r4","AB+",1,"NORMAL","DONORS_CONTACTED",4,70,0),
 ("r5","O+",4,"CRITICAL","PARTIALLY_FULFILLED",5,3.2,1),("r6","A-",2,"URGENT","DONORS_CONTACTED",1,18,0),
 ("r7","B-",1,"NORMAL","MATCHING",0,90,0),("r8","O+",2,"URGENT","FULFILLED",0,-5,2),
 ("r9","A+",3,"NORMAL","FULFILLED",1,-30,3),("r10","B+",1,"CRITICAL","FULFILLED",3,-2,1),
 ("r11","O-",2,"URGENT","CANCELLED",None,-10,0),("r12","AB-",1,"NORMAL","CANCELLED",None,-20,0),
 ("r13","A+",2,"URGENT","EXPIRED",2,-48,0),("r14","B+",2,"NORMAL","EXPIRED",4,-72,1),
 ("r15","O+",2,"URGENT","PENDING_VERIFICATION",None,12,0),("r16","AB+",1,"NORMAL","PENDING_VERIFICATION",None,40,0),
 ("r17","A-",1,"CRITICAL","VERIFIED",5,4,0),("r18","O-",3,"URGENT","MATCHING",1,16,0),("r19","B-",2,"NORMAL","DONORS_CONTACTED",2,60,0)]
requests=[]
for n,(k,bt,units,urg,st,oi,hrs,conf) in enumerate(R):
    rid=uid("rq-"+k); org=orgs[oi] if oi is not None else None
    if org: lat,lng,hn,dn=org["lat"],org["lng"],org["name"],org["district"]
    else:
        dn,dlat,dlng=random.choice(DISTRICTS); lat,lng=jitter(dlat,dlng,0.5); hn=f"Phòng khám Demo {dn}"
    requester = org["user"] if org else reqs[n%len(reqs)]
    if k=="scenario": requester=orgs[0]["user"]
    if k in("r1","r2","r5"): requester=reqs[0] if k=="r1" else requester
    verified = st not in("PENDING_VERIFICATION","CREATED")
    esc = 1 if conf==0 else 2
    requests.append(dict(id=rid,key=k,bt=bt,units=units,st=st,lat=lat,lng=lng,hrs=hrs,conf=conf,requester=requester,org=org,urg=urg,verified=verified))
    interval=f"now() + interval '{int(hrs*3600)} seconds'"
    w(f"INSERT INTO blood_requests (id,requester_id,organization_id,blood_type_id,units_required,units_confirmed,urgency,status,hospital_name,city,district,latitude,longitude,deadline,contact_phone,description,verified,verified_by,escalation_level,cancel_reason,created_at) VALUES "
      f"({q(rid)},{q(requester)},{q(org['id']) if org else 'NULL'},{BT[bt]},{units},0,{q(urg)},{q(st)},{q(hn)},'TP. Hồ Chí Minh',{q(dn)},{lat},{lng},{interval},{q(phone(n))},"
      f"{q('Yêu cầu demo. Thông tin bệnh nhân không được lưu trong hệ thống.')},{str(verified).upper()},{q(admin) if verified else 'NULL'},{esc},{q('Người tạo yêu cầu đã hủy') if st=='CANCELLED' else 'NULL'},now() - interval '{abs(int(hrs*3600))+7200} seconds' - interval '1 hour');")
    # lịch sử trạng thái
    flow=["CREATED"]
    if st!="CREATED": flow.append("PENDING_VERIFICATION")
    if verified: flow+=["VERIFIED","MATCHING"]
    if st in("DONORS_CONTACTED","PARTIALLY_FULFILLED","FULFILLED"): flow.append("DONORS_CONTACTED")
    if st in("PARTIALLY_FULFILLED","FULFILLED"): flow.append("PARTIALLY_FULFILLED")
    if st=="FULFILLED": flow.append("FULFILLED")
    if st in("CANCELLED","EXPIRED"): flow=["CREATED","PENDING_VERIFICATION"]+(["VERIFIED","MATCHING"] if st=="EXPIRED" else [])+[st]
    if st=="PENDING_VERIFICATION": flow=["CREATED","PENDING_VERIFICATION"]
    if st=="VERIFIED": flow=["CREATED","PENDING_VERIFICATION","VERIFIED"]
    prev=None
    for m,s in enumerate(dict.fromkeys(flow)):
        w(f"INSERT INTO request_status_history (request_id,from_status,to_status,note,actor_id,created_at) VALUES ({q(rid)},{q(prev)},{q(s)},NULL,{q(requester)},now() - interval '{abs(int(hrs*3600))+7200+ (10-m)*60} seconds');")
        prev=s

# --- Matches + notifications ---
mcount=0; ncount=0
def donor_lookup(): return [d for d in donors if d["avail"]=="AVAILABLE"]
for r in requests:
    if r["st"] in("PENDING_VERIFICATION","CREATED"): continue
    cands=[d for d in donors if r["bt"] in COMPAT[d["bt"]]]
    for d in cands: d["dist"]=hav(d["lat"],d["lng"],r["lat"],r["lng"])
    if r["key"]=="scenario":
        # Donor A (donor@lifely.demo) gần nhất, rồi B, C; hai donor khác đã xác nhận
        o=[d for d in cands if d["bt"]=="O+"]
        ordered=sorted(o,key=lambda d:d["dist"])
        forced=[donors[0],donors[1],donors[2]]
        rest=[d for d in ordered if d not in forced]
        chosen=forced+rest[:9]
    else:
        chosen=sorted(cands,key=lambda d:d["dist"])[:random.randint(5,9)]
    accepted=0
    for idx,d in enumerate(chosen):
        mid=uid(f"m-{r['key']}-{d['n']}")
        dist=round(d["dist"],2)
        score=round(max(60,min(99,100-dist*2.2-(0 if d['bt']==r['bt'] else 6)+random.uniform(-2,2))),2)
        if r["key"]=="scenario" and d["n"] in(0,1,2): score={0:95,1:91,2:87}[d["n"]]; dist={0:2.1,1:3.8,2:6.2}[d["n"]]
        if r["key"]=="scenario" and d["n"] in(0,1,2): st="CONTACTED"
        elif r["st"]=="FULFILLED": st="COMPLETED" if accepted<r["units"] else "EXPIRED"; 
        elif accepted<r["conf"]: st="ACCEPTED"
        elif r["st"] in("CANCELLED",): st="CANCELLED"
        elif r["st"]=="EXPIRED": st="EXPIRED"
        else: st=random.choice(["CONTACTED","CONTACTED","PENDING","REJECTED"])
        if st in("ACCEPTED","COMPLETED"): accepted+=1
        if r["st"]=="FULFILLED" and accepted>r["units"]: st="EXPIRED"
        contacted = "now() - interval '40 minutes'" if st!="PENDING" else "NULL"
        responded = "now() - interval '20 minutes'" if st in("ACCEPTED","REJECTED","COMPLETED") else "NULL"
        lvl=1 if dist<=5 else 2 if dist<=10 else 3
        w(f"INSERT INTO matches (id,request_id,donor_id,matching_score,distance_km,escalation_level,status,contacted_at,responded_at) VALUES ({q(mid)},{q(r['id'])},{q(d['id'])},{score},{dist},{lvl},{q(st)},{contacted},{responded});")
        w(f"INSERT INTO match_events (match_id,event_type,metadata) VALUES ({q(mid)},'CREATED','{{\"score\": {score}}}');")
        if st!="PENDING": w(f"INSERT INTO match_events (match_id,event_type) VALUES ({q(mid)},'CONTACTED');")
        if st in("ACCEPTED","REJECTED","COMPLETED"): w(f"INSERT INTO match_events (match_id,event_type) VALUES ({q(mid)},{q(st)});")
        mcount+=1
        if st in("CONTACTED","PENDING","ACCEPTED","COMPLETED"):
            ttl=("Emergency request near you" if r["urg"]!="NORMAL" else "Blood request near you")
            w(f"INSERT INTO notifications (user_id,type,title,message,is_read,reference_type,reference_id,created_at) VALUES "
              f"({q(d['user'])},'NEW_MATCH',{q(ttl)},{q(f'{r['bt']} blood needed, {dist} km away')},{str(st in('ACCEPTED','COMPLETED') or random.random()<0.35).upper()},'REQUEST',{q(r['id'])},now() - interval '{random.randint(5,600)} minutes');")
            ncount+=1
        if st in("ACCEPTED","COMPLETED"):
            w(f"INSERT INTO donation_history (donor_id,donated_on,location,source,match_id) SELECT {q(d['id'])},CURRENT_DATE,{q('LIFELY match')},'LIFELY_MATCH',{q(mid)} WHERE {str(st=='COMPLETED').upper()};")
    # đồng bộ units_confirmed với số match đã ACCEPTED/COMPLETED
    w(f"UPDATE blood_requests SET units_confirmed = (SELECT count(*) FROM matches WHERE request_id={q(r['id'])} AND status IN ('ACCEPTED','COMPLETED')) WHERE id={q(r['id'])};")
    # thông báo cho requester
    w(f"INSERT INTO notifications (user_id,type,title,message,is_read,reference_type,reference_id) VALUES ({q(r['requester'])},'REQUEST_VERIFIED','Request verified',{q('Your '+r['bt']+' request is now being coordinated')},FALSE,'REQUEST',{q(r['id'])});")
    ncount+=1
# thông báo hệ thống đủ 100+
for d in donors:
    w(f"INSERT INTO notifications (user_id,type,title,message,is_read) VALUES ({q(d['user'])},'SYSTEM','Welcome to LIFELY','Complete your donor profile so we can match you with nearby requests.',TRUE);"); ncount+=1
# báo cáo mẫu
w(f"INSERT INTO reports (reporter_id,target_type,target_id,reason,description,status) VALUES ({q(donors[3]['user'])},'REQUEST',{q(requests[15]['id'])},'FAKE_REQUEST','Thông tin liên hệ không khớp bệnh viện','OPEN');")
w(f"INSERT INTO reports (reporter_id,target_type,target_id,reason,description,status) VALUES ({q(donors[4]['user'])},'REQUEST',{q(requests[16]['id'])},'SPAM','Yêu cầu bị đăng lặp','INVESTIGATING');")
w(f"INSERT INTO audit_logs (user_id,action,entity_type,entity_id,metadata) VALUES ({q(admin)},'ORGANIZATION_VERIFIED','ORGANIZATION',{q(orgs[0]['id'])},'{{\"source\":\"seed\"}}');")
print(f"users={len(users)} donors={len(donors)} orgs={len(orgs)} requests={len(requests)} matches={mcount} notifications={ncount}")
path=os.path.join(os.path.dirname(__file__),"..","..","backend","src","main","resources","db","migration","V5__seed_data.sql")
open(path,"w",encoding="utf-8").write("\n".join(out)+"\n")
