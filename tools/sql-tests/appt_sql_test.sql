\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
BEGIN;
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM organizations WHERE verification_status='VERIFIED' AND owner_user_id IS NOT NULL LIMIT 1) org,
  (SELECT d.id FROM donor_profiles d WHERE d.blood_type_id IS NOT NULL AND (last_donation_date IS NULL OR last_donation_date<current_date-200) LIMIT 1) donor;
SELECT 'org/donor ok: '||(org IS NOT NULL)||'/'||(donor IS NOT NULL) FROM t;
UPDATE organizations SET inventory_auto_add=TRUE WHERE id=(SELECT org FROM t);
INSERT INTO donation_slots(organization_id,starts_at,ends_at,capacity) SELECT org, now()+interval '23 hours', now()+interval '24 hours', 2 FROM t;
-- openSlots / slotSql
SELECT 'openSlots: '||count(*) FROM donation_slots s JOIN organizations o ON o.id=s.organization_id WHERE s.status='ACTIVE' AND s.starts_at>now() AND s.starts_at<now()+(30*interval '1 day') AND o.verification_status='VERIFIED';
-- book: overlap + seat + insert
SELECT 'overlap: '||count(*) FROM appointments a JOIN donation_slots s2 ON s2.id=a.slot_id WHERE a.donor_id=(SELECT donor FROM t) AND a.status IN ('BOOKED','CHECKED_IN','SCREENED') AND s2.starts_at<now()+interval '30 days' AND s2.ends_at>now();
WITH seat AS (UPDATE donation_slots SET booked_count=booked_count+1 WHERE organization_id=(SELECT org FROM t) AND status='ACTIVE' AND booked_count<capacity AND starts_at>now() RETURNING id)
INSERT INTO appointments(slot_id,donor_id) SELECT id,(SELECT donor FROM t) FROM seat;
SELECT 'đặt lịch: '||count(*)||' lịch, booked_count='||(SELECT max(booked_count) FROM donation_slots WHERE organization_id=(SELECT org FROM t) AND starts_at>now() AND starts_at<now()+interval '2 days') FROM appointments WHERE donor_id=(SELECT donor FROM t) AND status='BOOKED';
-- mineSql
SELECT 'mine: '||count(*) FROM (SELECT a.id, a.slot_id, s.organization_id, o.name, o.address, s.starts_at, s.ends_at, a.status, a.created_at FROM appointments a JOIN donation_slots s ON s.id=a.slot_id JOIN organizations o ON o.id=s.organization_id WHERE a.donor_id=(SELECT donor FROM t) ORDER BY s.starts_at DESC LIMIT 100) x;
-- cancel lock query
SELECT 'cancel-lock: '||count(*) FROM (SELECT a.slot_id, s.starts_at, o.name FROM appointments a JOIN donation_slots s ON s.id=a.slot_id JOIN organizations o ON o.id=s.organization_id WHERE a.donor_id=(SELECT donor FROM t) FOR UPDATE OF a) x;
-- nhắc lịch (UPDATE ... FROM ... RETURNING), chạy 2 lần: lần 2 không nhắc lại
WITH r AS (UPDATE appointments a SET reminder_sent_at=now() FROM donation_slots s WHERE a.slot_id=s.id AND a.status='BOOKED' AND a.reminder_sent_at IS NULL AND s.status='ACTIVE' AND s.starts_at>now() AND s.starts_at<=now()+(24*interval '1 hour') RETURNING a.id, a.donor_id, s.starts_at, s.organization_id)
SELECT 'nhắc lịch lần 1: '||count(*) FROM r;
WITH r AS (UPDATE appointments a SET reminder_sent_at=now() FROM donation_slots s WHERE a.slot_id=s.id AND a.status='BOOKED' AND a.reminder_sent_at IS NULL AND s.status='ACTIVE' AND s.starts_at>now() AND s.starts_at<=now()+(24*interval '1 hour') RETURNING a.id)
SELECT 'nhắc lịch lần 2: '||count(*)||' (kỳ vọng 0)' FROM r;
-- orgAppointments
SELECT 'orgAppointments: '||count(*) FROM (SELECT a.id, a.slot_id, u.full_name, bt.code, a.status, s.starts_at, a.handled_at, a.created_at FROM appointments a JOIN donation_slots s ON s.id=a.slot_id JOIN donor_profiles dp ON dp.id=a.donor_id JOIN users u ON u.id=dp.user_id LEFT JOIN blood_types bt ON bt.id=dp.blood_type_id WHERE s.organization_id=(SELECT org FROM t) ORDER BY a.created_at) x;
-- DONATED không được phép nếu thiếu donation_id (CHECK)
SAVEPOINT s1;
DO $$ BEGIN UPDATE appointments SET status='DONATED' WHERE donor_id=(SELECT donor FROM t); EXCEPTION WHEN check_violation THEN RAISE NOTICE 'CHECK ck_appt_donated_has_history chặn DONATED thiếu bản ghi hiến: OK'; END $$;
ROLLBACK TO s1;
-- recordDonation
INSERT INTO donation_history(donor_id,donated_on,location,source,verification_level,confirmed_by_user_id,confirmed_by_org_id,confirmed_by_org_name,confirmed_at)
 SELECT donor, current_date, 'X', 'APPOINTMENT','ORG_VERIFIED',(SELECT owner_user_id FROM organizations WHERE id=t.org), org, (SELECT name FROM organizations WHERE id=t.org), now() FROM t;
UPDATE donor_profiles SET total_donations=total_donations+1, last_donation_date=current_date WHERE id=(SELECT donor FROM t);
UPDATE appointments SET status='DONATED', handled_at=now(), donation_id=(SELECT id FROM donation_history WHERE donor_id=(SELECT donor FROM t) AND source='APPOINTMENT' LIMIT 1) WHERE donor_id=(SELECT donor FROM t);
SELECT 'DONATED với donation_id: OK';
-- Inventory: addDonatedUnit + sổ biến động + update khóa dòng
WITH ins AS (INSERT INTO blood_inventory(organization_id,blood_type,units,low_threshold,updated_at) SELECT org,'A+',1,10,now() FROM t
  ON CONFLICT (organization_id,blood_type) DO UPDATE SET units=LEAST(blood_inventory.units+1,100000), updated_at=now() RETURNING units)
INSERT INTO inventory_movements(organization_id,blood_type,delta,units_after,reason,reference_type,reference_id,actor_user_id) SELECT (SELECT org FROM t),'A+',1,units,'DONATION_CONFIRMED','APPOINTMENT',NULL,NULL FROM ins;
SELECT units FROM blood_inventory WHERE organization_id=(SELECT org FROM t) AND blood_type='A+' FOR UPDATE;
SELECT 'ledger rows: '||count(*) FROM inventory_movements WHERE organization_id=(SELECT org FROM t);
SELECT 'movements query: '||count(*) FROM (SELECT blood_type, delta, units_after, reason, reference_type, created_at FROM inventory_movements WHERE organization_id=(SELECT org FROM t) ORDER BY created_at DESC LIMIT 100) m;
-- RequestCreateGuard
SELECT 'advisory lock: '||count(*) FROM (SELECT pg_advisory_xact_lock(hashtextextended('create-request:test',0))) t2;
-- Idempotency index
SAVEPOINT s2;
INSERT INTO blood_requests(requester_id,blood_type_id,units_required,urgency,status,hospital_name,city,latitude,longitude,deadline,contact_phone,idempotency_key)
 SELECT id,1,1,'NORMAL','CREATED','H','C',10.7,106.7,now()+interval '1 day','0901234567','key-12345678' FROM users WHERE email='requester@lifely.demo';
DO $$ BEGIN
 INSERT INTO blood_requests(requester_id,blood_type_id,units_required,urgency,status,hospital_name,city,latitude,longitude,deadline,contact_phone,idempotency_key)
 SELECT id,1,1,'NORMAL','CREATED','H','C',10.7,106.7,now()+interval '1 day','0901234567','key-12345678' FROM users WHERE email='requester@lifely.demo';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'idempotency: khóa trùng bị unique index chặn: OK'; END $$;
ROLLBACK TO s2;
-- units_received CHECK
DO $$ BEGIN UPDATE blood_requests SET units_received=units_required+1 WHERE id=(SELECT id FROM blood_requests LIMIT 1); EXCEPTION WHEN check_violation THEN RAISE NOTICE 'units_received > units_required bị CHECK chặn: OK'; END $$;
ROLLBACK;
