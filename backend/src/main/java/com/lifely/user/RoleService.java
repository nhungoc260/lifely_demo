package com.lifely.user;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Cho một tài khoản thường (người hiến hoặc người cần máu) bật thêm vai trò còn lại,
 * để cùng một đăng nhập vừa hiến máu vừa tạo yêu cầu cho người nhà.
 * Quyền luôn được đọc lại từ DB ở mỗi request nên có hiệu lực ngay, không cần cấp lại token.
 */
@Service
public class RoleService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DonorProfileRepository donorProfileRepository;
    private final AuditService auditService;

    public RoleService(UserRepository userRepository, RoleRepository roleRepository,
                       DonorProfileRepository donorProfileRepository, AuditService auditService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.donorProfileRepository = donorProfileRepository;
        this.auditService = auditService;
    }

    @Transactional
    public User addRole(UUID userId, String roleKey) {
        if (!"DONOR".equals(roleKey) && !"REQUESTER".equals(roleKey)) {
            throw AppException.badRequest("INVALID_ROLE", "Chỉ có thể thêm vai trò hiến máu hoặc cần máu");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng"));
        if (user.hasRole(Role.ORGANIZATION) || user.hasRole(Role.ADMIN)) {
            throw AppException.forbidden("ROLE_NOT_ALLOWED", "Tài khoản tổ chức hoặc quản trị không thể thêm vai trò này");
        }
        String roleName = "ROLE_" + roleKey;
        if (!user.hasRole(roleName)) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> AppException.badRequest("INVALID_ROLE", "Vai trò không hợp lệ"));
            user.getRoles().add(role);
            user = userRepository.save(user);
            auditService.log(userId, AuditAction.ROLE_ADDED, "USER", userId, Map.of("role", roleKey));
        }
        if (Role.DONOR.equals(roleName) && donorProfileRepository.findByUserId(userId).isEmpty()) {
            donorProfileRepository.save(new DonorProfile(userId));
        }
        return user;
    }
}
