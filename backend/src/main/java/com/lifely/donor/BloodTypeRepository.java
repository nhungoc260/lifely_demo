package com.lifely.donor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BloodTypeRepository extends JpaRepository<BloodType, Short> {

    Optional<BloodType> findByCode(String code);

    List<BloodType> findByCodeIn(Collection<String> codes);
}
