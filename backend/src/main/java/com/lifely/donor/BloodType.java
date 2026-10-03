package com.lifely.donor;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "blood_types")
@Getter
@Setter
@NoArgsConstructor
public class BloodType {

    @Id
    private Short id;

    private String code;
}
