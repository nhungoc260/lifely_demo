package com.lifely.request.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** Chỉ cho sửa thông tin liên hệ, mô tả và GIA HẠN deadline. Nhóm máu/số lượng không đổi sau khi tạo. */
public record UpdateRequestDto(
        @Pattern(regexp = Patterns.PHONE, message = "Enter a valid Vietnamese phone number") String contactPhone,
        @Size(max = 1000) String description,
        Instant deadline) {
}
