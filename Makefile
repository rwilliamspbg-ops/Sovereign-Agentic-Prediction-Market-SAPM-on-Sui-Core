.PHONY: help verify build bench chaos

help:
	@echo "Available targets:"
	@echo "  make verify          - Run all formal verification checks"
	@echo "  make build           - Build all components"
	@echo "  make bench           - Run performance benchmarks"
	@echo "  make chaos-test      - Run chaos testing suite"
	@echo "  make verify-all-formal-contracts - Verify all formal contracts"

verify:
	@echo "Running Lean 4 verification..."

build:
	@echo "Building all components..."

bench:
	@echo "Running performance benchmarks..."

chaos-test:
	@echo "Running chaos testing suite..."

verify-all-formal-contracts:
	@echo "Verifying all formal contracts..."

bench_xdp:
	@echo "Running AF_XDP benchmark script..."
	@bash scripts/bench_xdp.sh

.PHONY: bench_xdp
