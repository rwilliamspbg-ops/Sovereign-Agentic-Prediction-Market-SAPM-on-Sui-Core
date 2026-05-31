# SAPM Formal Verification - Windows-Compatible Makefile
# Usage: make verify build artifacts docs

# PowerShell scripts directory
SCRIPTS_DIR := $(CURDIR)/scripts
VERIFY_SCRIPT := $(SCRIPTS_DIR)/verify.ps1
BUILD_SCRIPT := $(SCRIPTS_DIR)/build.ps1
ARTIFACTS_SCRIPT := $(SCRIPTS_DIR)/artifacts.ps1
DOCS_SCRIPT := $(SCRIPTS_DIR)/docs.ps1

.PHONY: all verify build artifacts docs clean help

all: verify build artifacts docs
	@echo "=========================================="
	@echo "All targets completed!"
	@echo "=========================================="

verify:
powershell -ExecutionPolicy Bypass -File "$(VERIFY_SCRIPT)"

build:
powershell -ExecutionPolicy Bypass -File "$(BUILD_SCRIPT)"

artifacts:
powershell -ExecutionPolicy Bypass -File "$(ARTIFACTS_SCRIPT)"

docs:
powershell -ExecutionPolicy Bypass -File "$(DOCS_SCRIPT)"

clean:
powershell -Command "Get-ChildItem $(CURDIR)/build -Recurse -Force | Remove-Item -Recurse -Force; Get-ChildItem $(CURDIR)/artifacts/*.json.bak -ErrorAction SilentlyContinue | Remove-Item -Force"
	@echo "Cleaned build artifacts..."

help:
	@echo "SAPM Formal Verification Makefile Targets:"
	@echo "  make verify    - Run formal verification (Lean theorems)"
	@echo "  make build     - Build Lean dependencies and compile theorems"
	@echo "  make artifacts - Export JSON artifacts to artifacts/ directory"
	@echo "  make docs      - Generate documentation in docs/ directory"
	@echo "  make clean     - Remove build artifacts"
	@echo "  make all       - Run all targets (verify, build, artifacts, docs)"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - PowerShell 5.1 or later"
	@echo "  - Lean 4 (optional, for actual verification)"
