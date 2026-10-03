package com.lifely.organization;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization_documents")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "doc_type")
    private String docType;

    @Column(name = "file_name")
    private String fileName;

    /** Tên file đã lưu trên đĩa (ngẫu nhiên). Không bao giờ trả ra API. */
    @Column(name = "file_url")
    private String fileUrl;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private Instant uploadedAt;
}
