#!/usr/bin/env bash
# Tạo / làm mới dữ liệu demo (giả). Chạy lại được nhiều lần.
#   DEMO_PASSWORD=... PGPASSWORD=... ./tools/demo/seed_demo.sh          # tạo hoặc làm mới
#   PGPASSWORD=... ./tools/demo/seed_demo.sh --clear                      # xóa dữ liệu demo
# Biến kết nối (mặc định cho môi trường dev): PGHOST=localhost PGPORT=5432 PGUSER=lifely PGDATABASE=lifely
# Mật khẩu demo KHÔNG được ghi trong repo: bạn tự chọn qua DEMO_PASSWORD (>= 8 ký tự). Cần: psql, python3 + gói bcrypt (pip install bcrypt).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-lifely}" PGDATABASE="${PGDATABASE:-lifely}"
: "${PGPASSWORD:?Hãy đặt PGPASSWORD (mật khẩu database)}"

if [[ "${1:-}" == "--clear" ]]; then
  psql -q -v ON_ERROR_STOP=1 -f "$here/clear_demo.sql"
  echo "Đã xóa dữ liệu demo."
  exit 0
fi

: "${DEMO_PASSWORD:?Hãy đặt DEMO_PASSWORD (mật khẩu cho các tài khoản demo, ít nhất 8 ký tự)}"
if [[ ${#DEMO_PASSWORD} -lt 8 ]]; then echo "DEMO_PASSWORD phải có ít nhất 8 ký tự" >&2; exit 1; fi
hash="$(python3 -c 'import os,bcrypt; print(bcrypt.hashpw(os.environ["DEMO_PASSWORD"].encode(), bcrypt.gensalt(10)).decode())')"
psql -q -v ON_ERROR_STOP=1 -v hash="$hash" -f "$here/seed_demo.sql"
echo "Đã tạo/làm mới dữ liệu demo. Tài khoản (mật khẩu = giá trị DEMO_PASSWORD bạn vừa đặt):"
psql -At -c "select '  '||email||'  ['||string_agg(replace(r.name,'ROLE_',''),',')||']' from users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where u.is_demo and u.email like 'demo-%@lifely.demo' group by u.email order by u.email"
