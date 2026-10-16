#!/bin/bash
export PGPASSWORD=lifely_dev_password; P="psql -h localhost -U lifely -d lifely -qAt"
ORG=$($P -c "select id from organizations where verification_status='VERIFIED' limit 1")
SLOT=$($P -c "insert into donation_slots(organization_id,starts_at,ends_at,capacity) values('$ORG', now()+interval '7 days', now()+interval '7 days 1 hour', 5) returning id" | head -1)
mapfile -t DONORS < <($P -c "select id from donor_profiles limit 25")
echo "slot=$SLOT capacity=5 donors=${#DONORS[@]}"
rm -f /tmp/res_*; i=0
for d in "${DONORS[@]}"; do i=$((i+1)); (
 $P > /tmp/res_$i 2>&1 <<SQL
BEGIN;
WITH s AS (UPDATE donation_slots SET booked_count=booked_count+1
           WHERE id='$SLOT' AND status='ACTIVE' AND booked_count<capacity AND starts_at>now() RETURNING id)
INSERT INTO appointments(slot_id,donor_id) SELECT id,'$d' FROM s;
COMMIT;
SQL
) & done; wait
OK=$($P -c "select count(*) from appointments where slot_id='$SLOT'")
echo "đặt thành công: $OK | bị từ chối do hết chỗ: $(( ${#DONORS[@]} - OK ))"
$P -F' ' -c "select 'booked_count='||booked_count||' capacity='||capacity from donation_slots where id='$SLOT'"
echo "--- ghi đè vượt sức chứa trực tiếp:"; $P -c "update donation_slots set booked_count=6 where id='$SLOT'" 2>&1 | head -1
echo "--- đặt trùng cùng người/cùng khung giờ:"; $P -c "insert into appointments(slot_id,donor_id) values('$SLOT','${DONORS[0]}')" 2>&1 | head -1
