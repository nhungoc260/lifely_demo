package com.lifely.organization;

import java.util.List;

/** Danh sách thành viên của tổ chức; {@code owner} cho biết người đang xem có phải chủ tài khoản không. */
public record StaffOverview(boolean owner, List<StaffMember> members) {
}
