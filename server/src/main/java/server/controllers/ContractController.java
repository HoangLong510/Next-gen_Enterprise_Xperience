package server.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import server.dtos.Contracts.ContractRequest;
import server.services.ContractService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
public class ContractController {
    private final ContractService contractService;

    @GetMapping
    public ApiResponse<?> getAll() {
        return contractService.getAll();
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getById(@PathVariable Long id) {
        return contractService.getById(id);
    }

    @PostMapping
    public ApiResponse<?> create(@Valid @RequestBody ContractRequest req, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) return ApiResponse.badRequest(bindingResult);
        return contractService.create(req);
    }

    @PutMapping("/{id}")
    public ApiResponse<?> update(@PathVariable Long id, @Valid @RequestBody ContractRequest req, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) return ApiResponse.badRequest(bindingResult);
        return contractService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return contractService.delete(id);
    }
}
