package com.lifely.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** ID token (credential) mà Google trả về cho trình duyệt sau khi người dùng chọn tài khoản. */
public record GoogleLoginRequest(@NotBlank @Size(max = 4096) String credential) {
}
