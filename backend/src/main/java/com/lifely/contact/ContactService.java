package com.lifely.contact;

import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.common.Sanitizer;
import com.lifely.mail.MailService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ContactService {

    private final ContactMessageRepository repository;
    private final MailService mail;

    public ContactService(ContactMessageRepository repository, MailService mail) {
        this.repository = repository;
        this.mail = mail;
    }

    /** Lưu vào DB trước (không bao giờ mất tin), rồi mới báo cho admin qua email. */
    @Transactional
    public void submit(ContactRequest req, AuthUser userOrNull) {
        String message = Sanitizer.plain(req.message());
        String name = Sanitizer.plain(req.name());
        if (message == null || message.length() < 10 || name == null) {
            throw AppException.badRequest("INVALID_MESSAGE", "Please write a message of at least 10 characters");
        }
        ContactMessage m = new ContactMessage();
        m.setUserId(userOrNull == null ? null : userOrNull.getId());
        m.setName(name);
        m.setEmail(req.email().trim().toLowerCase());
        m.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().trim());
        m.setMessage(message);
        m = repository.save(m);

        mail.sendToAdmin("[LIFELY] Tin nhan lien he moi tu " + name,
                "Ban co mot tin nhan lien he moi tren LIFELY.\n\n"
                        + "Ten: " + name + "\nEmail: " + m.getEmail()
                        + (m.getPhone() == null ? "" : "\nSDT: " + m.getPhone())
                        + (m.getUserId() == null ? "\nNguoi gui: khach" : "\nNguoi gui: thanh vien da dang ky")
                        + "\n\nNoi dung:\n" + message
                        + "\n\nXem va xu ly trong trang Admin > Messages.");
    }

    @Transactional(readOnly = true)
    public PageResponse<ContactMessageDto> list(ContactStatus status, int page, int size) {
        Specification<ContactMessage> spec = (root, q, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
        Page<ContactMessage> result = repository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), Sort.by("createdAt").descending()));
        return PageResponse.of(result, ContactMessageDto::from);
    }

    @Transactional
    public ContactMessageDto updateStatus(UUID adminId, UUID id, ContactStatus status) {
        ContactMessage m = repository.findById(id)
                .orElseThrow(() -> AppException.notFound("MESSAGE_NOT_FOUND", "Message not found"));
        m.setStatus(status);
        if (status == ContactStatus.RESOLVED) {
            m.setHandledBy(adminId);
            m.setHandledAt(Instant.now());
        }
        return ContactMessageDto.from(repository.save(m));
    }
}
