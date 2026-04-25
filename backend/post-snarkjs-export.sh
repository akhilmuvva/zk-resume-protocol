#!/usr/bin/env bash
# post-snarkjs-export.sh
# ─────────────────────────────────────────────────────────────────────
# Run AFTER: snarkjs zkey export solidityverifier <zkey> contracts/ResumeVerifier.sol
#
# Purpose:
#   snarkjs generates bare `uint[` types in the exported Solidity verifier.
#   This violates solhint explicit-types and can cause ABI ambiguity.
#   This script replaces all bare `uint[` with `uint256[` in the
#   auto-generated files ONLY — it does not touch ResumeRegistry.sol.
#
# Usage:
#   chmod +x post-snarkjs-export.sh
#   ./post-snarkjs-export.sh
#
# Safety:
#   - Only modifies MockVerifier.sol and IResumeVerifier.sol
#   - Uses word-boundary regex to avoid corrupting identifiers like
#     `uint8`, `uint128`, etc.
#   - Creates .bak backups before modifying
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

CONTRACTS_DIR="$(cd "$(dirname "$0")" && pwd)/contracts"
TARGETS=("MockVerifier.sol" "IResumeVerifier.sol")

echo "🔧 Post-snarkjs export: Normalising uint[] → uint256[] ..."

for file in "${TARGETS[@]}"; do
  target="$CONTRACTS_DIR/$file"

  if [[ ! -f "$target" ]]; then
    echo "  ⚠️  Skipping $file — not found at $target"
    continue
  fi

  # Create a timestamped backup
  backup="${target}.$(date +%Y%m%d_%H%M%S).bak"
  cp "$target" "$backup"
  echo "  📦 Backup: $backup"

  # Replace `uint[` and `uint ` (function param declarations) but NOT
  # `uint8`, `uint16`, `uint32`, `uint64`, `uint128`, `uint256` etc.
  # The regex ` uint\[` and ` uint ` catches parameter declarations.
  #
  # BSD sed (macOS) needs '' after -i; GNU sed (Linux) accepts -i alone.
  if sed --version 2>/dev/null | grep -q GNU; then
    # GNU sed (Linux / Git Bash on Windows)
    sed -i \
      -e 's/\buint\[/uint256[/g' \
      -e 's/\buint \[/uint256[/g' \
      "$target"
  else
    # BSD sed (macOS)
    sed -i '' \
      -e 's/\buint\[/uint256[/g' \
      -e 's/\buint \[/uint256[/g' \
      "$target"
  fi

  changed=$(diff "$backup" "$target" | grep -c "^[<>]" || true)
  echo "  ✅ $file — $changed line(s) changed"
done

echo ""
echo "✅ Done. Run 'npx hardhat compile' to verify."
echo "   Backups can be removed with: rm contracts/*.bak"
