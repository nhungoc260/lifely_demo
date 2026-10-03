package com.lifely.admin.dto;

import com.lifely.request.dto.RequestResponse;

public record AdminRequestRow(RequestResponse request, String requesterName, String requesterEmail) {
}
