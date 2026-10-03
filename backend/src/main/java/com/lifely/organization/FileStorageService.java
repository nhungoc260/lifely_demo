package com.lifely.organization;

import com.lifely.common.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Lưu tài liệu xác minh tổ chức trên đĩa cục bộ (prototype). Tên file lưu là UUID ngẫu nhiên,
 * kiểm tra kích thước và "magic bytes" (không tin Content-Type do client gửi).
 * Production nên chuyển sang object storage riêng tư (S3/GCS) và quét mã độc.
 */
@Service
public class FileStorageService {

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final Path root;

    public FileStorageService(@Value("${lifely.storage.dir:./uploads}") String dir) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public record Stored(String storedName, String contentType) {
    }

    public Stored store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("EMPTY_FILE", "Please choose a file to upload");
        }
        if (file.getSize() > MAX_BYTES) {
            throw AppException.badRequest("FILE_TOO_LARGE", "File must be 5 MB or smaller");
        }
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(8);
            String ext = detectExtension(head);
            String storedName = UUID.randomUUID() + "." + ext;
            Path target = root.resolve(storedName).normalize();
            if (!target.startsWith(root)) {
                throw AppException.badRequest("INVALID_FILE", "Invalid file name");
            }
            try (InputStream again = file.getInputStream()) {
                Files.copy(again, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return new Stored(storedName, contentTypeFor(ext));
        } catch (IOException e) {
            throw new AppException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "UPLOAD_FAILED",
                    "Could not store the file");
        }
    }

    public Resource load(String storedName) {
        Path p = root.resolve(storedName).normalize();
        if (!p.startsWith(root) || !Files.exists(p)) {
            throw AppException.notFound("FILE_NOT_FOUND", "File not found");
        }
        return new FileSystemResource(p);
    }

    public String contentTypeOf(String storedName) {
        int dot = storedName.lastIndexOf('.');
        return contentTypeFor(dot < 0 ? "" : storedName.substring(dot + 1));
    }

    private static String detectExtension(byte[] h) {
        if (h.length >= 4 && h[0] == '%' && h[1] == 'P' && h[2] == 'D' && h[3] == 'F') return "pdf";
        if (h.length >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "png";
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        throw AppException.badRequest("UNSUPPORTED_FILE", "Only PDF, PNG or JPG files are allowed");
    }

    private static String contentTypeFor(String ext) {
        return switch (ext) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg" -> "image/jpeg";
            default -> "application/octet-stream";
        };
    }
}
