package server.services;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.dtos.Contracts.ContractRequest;
import server.dtos.Contracts.ContractResponse;
import server.models.Contract;
import server.models.Employee;
import server.models.enums.ContractStatus;
import server.models.enums.ContractType;
import server.repositories.ContractRepository;
import server.repositories.EmployeeRepository;
import server.utils.ApiResponse;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContractService {
    private final ContractRepository contractRepository;
    private final EmployeeRepository employeeRepository;

    // Mapping: Contract => ContractResponse
    private ContractResponse mapToResponse(Contract contract) {
        ContractResponse dto = new ContractResponse();
        dto.setId(contract.getId());
        dto.setContractCode(contract.getContractCode());
        dto.setEmployeeId(contract.getEmployee().getId());
        dto.setEmployeeName(contract.getEmployee().getLastName() + " " + contract.getEmployee().getFirstName());
        dto.setStartDate(contract.getStartDate());
        dto.setEndDate(contract.getEndDate());
        dto.setType(contract.getType().name());
        dto.setStatus(contract.getStatus().name());
        dto.setFileUrl(contract.getFileUrl());
        dto.setNote(contract.getNote());
        return dto;
    }

    // Mapping: ContractRequest => Contract
    private void mapRequestToEntity(ContractRequest req, Contract entity) {
        entity.setContractCode(req.getContractCode());
        entity.setStartDate(req.getStartDate());
        entity.setEndDate(req.getEndDate());
        entity.setType(ContractType.valueOf(req.getType()));
        entity.setStatus(ContractStatus.valueOf(req.getStatus()));
        entity.setFileUrl(req.getFileUrl());
        entity.setNote(req.getNote());
        // set employee
        Employee emp = employeeRepository.findById(req.getEmployeeId()).orElse(null);
        entity.setEmployee(emp);
    }

    // Lấy danh sách hợp đồng (tìm kiếm, phân trang, filter tuỳ ý)
    public ApiResponse<List<ContractResponse>> getAll() {
        List<Contract> list = contractRepository.findAll();
        List<ContractResponse> dtos = list.stream().map(this::mapToResponse).collect(Collectors.toList());
        return ApiResponse.success(dtos, "List contract success");
    }

    public ApiResponse<ContractResponse> getById(Long id) {
        Optional<Contract> contract = contractRepository.findById(id);
        if (contract.isPresent()) {
            return ApiResponse.success(mapToResponse(contract.get()), "Contract detail success");
        } else {
            return ApiResponse.notfound("Contract not found");
        }
    }

    @Transactional
    public ApiResponse<ContractResponse> create(ContractRequest req) {
        if (contractRepository.existsByContractCode(req.getContractCode())) {
            return ApiResponse.badRequest("Contract code already exists");
        }
        Contract entity = new Contract();
        mapRequestToEntity(req, entity);
        Contract saved = contractRepository.save(entity);
        return ApiResponse.created(mapToResponse(saved), "Create contract success");
    }

    @Transactional
    public ApiResponse<ContractResponse> update(Long id, ContractRequest req) {
        Optional<Contract> opt = contractRepository.findById(id);
        if (opt.isEmpty()) return ApiResponse.notfound("Contract not found");
        Contract entity = opt.get();
        mapRequestToEntity(req, entity);
        Contract saved = contractRepository.save(entity);
        return ApiResponse.success(mapToResponse(saved), "Update contract success");
    }

    @Transactional
    public ApiResponse<?> delete(Long id) {
        if (!contractRepository.existsById(id)) return ApiResponse.notfound("Contract not found");
        contractRepository.deleteById(id);
        return ApiResponse.success(null, "Delete contract success");
    }

    // Thêm các API filter nâng cao nếu cần...
}
