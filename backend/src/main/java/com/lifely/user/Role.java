package com.lifely.user;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
public class Role {

    public static final String DONOR = "ROLE_DONOR";
    public static final String REQUESTER = "ROLE_REQUESTER";
    public static final String ORGANIZATION = "ROLE_ORGANIZATION";
    public static final String ADMIN = "ROLE_ADMIN";

    @Id
    private Short id;

    private String name;
}
