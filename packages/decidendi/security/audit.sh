#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "═══════════════════════════════════════════════════════"
echo "  Decidendi Smart Contract Security Audit"
echo "═══════════════════════════════════════════════════════"
echo ""

cd "$PROJECT_DIR"

REPORT_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORT_DIR"

# ─── 1. Slither Static Analysis ────────────────────────────────
echo "╔═══ Step 1: Slither Static Analysis ═══╗"
echo ""

if command -v slither &> /dev/null; then
    echo "Running Slither on contracts..."
    slither contracts/ \
        --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/" \
        --exclude naming-convention,external-function \
        --json "$REPORT_DIR/slither-report.json" \
        2>&1 | tee "$REPORT_DIR/slither-output.txt" || true
    echo ""
    echo "  Slither report: $REPORT_DIR/slither-report.json"
else
    echo "  WARNING: Slither not installed. Install with: pip install slither-analyzer"
    echo "  Skipping Slither analysis."
fi
echo ""

# ─── 2. Mythril Symbolic Execution ─────────────────────────────
echo "╔═══ Step 2: Mythril Symbolic Execution ═══╗"
echo ""

if command -v myth &> /dev/null; then
    for contract in contracts/DecidendiEscrow.sol contracts/CommissionRegistry.sol contracts/DecidendiArbiter.sol; do
        name=$(basename "$contract" .sol)
        echo "Analyzing $name..."
        myth analyze "$contract" \
            --solc-args "--allow-paths node_modules" \
            --execution-timeout 300 \
            --max-depth 30 \
            -o json > "$REPORT_DIR/mythril-${name}.json" 2>&1 || true
        echo "  Report: $REPORT_DIR/mythril-${name}.json"
    done
else
    echo "  WARNING: Mythril not installed. Install with: pip install mythril"
    echo "  Skipping Mythril analysis."
fi
echo ""

# ─── 3. Foundry Tests with Gas Report ──────────────────────────
echo "╔═══ Step 3: Foundry Tests + Gas Report ═══╗"
echo ""

if command -v forge &> /dev/null; then
    echo "Running Foundry tests..."
    forge test -vvv --gas-report 2>&1 | tee "$REPORT_DIR/forge-test-report.txt" || true
    echo ""
    echo "  Test report: $REPORT_DIR/forge-test-report.txt"
else
    echo "  WARNING: Foundry not installed."
fi
echo ""

# ─── 4. Summary ────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  Audit Complete. Reports in: $REPORT_DIR/"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Review priority:"
echo "  1. Slither high/medium findings"
echo "  2. Mythril vulnerabilities"
echo "  3. Gas optimization opportunities"
echo ""
echo "For professional audit, share the following:"
echo "  - contracts/ directory"
echo "  - security/threat-model.md"
echo "  - security/reports/ directory"
