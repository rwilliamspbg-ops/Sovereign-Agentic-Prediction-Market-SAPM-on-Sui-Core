#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

echo "=== Bootstrap toolchains: Rust (rustup) and Lean 4 (quickinstall) ==="

# Install Rust via rustup (non-interactive)
if command -v rustc >/dev/null 2>&1; then
  echo "rustc already installed: $(rustc --version)"
else
  echo "Installing rustup and Rust (stable)"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  export PATH="$HOME/.cargo/bin:$PATH"
  rustup default stable || true
fi

echo "Rust version:" $(rustc --version || echo "rustc not found")


# Attempt Lean 4 quickinstall or elan installer as a fallback
if command -v lean >/dev/null 2>&1; then
  echo "lean already installed: $(lean --version)"
else
  echo "Attempting Lean 4 quickinstall (may prompt interactively)"
  set +e
  curl -fsSL https://raw.githubusercontent.com/leanprover/quickinstall/master/install.sh | bash
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    echo "quickinstall failed (code $rc); attempting elan installer fallback"
    set +e
    curl -fsSL https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y
    rc2=$?
    set -e
    if [ $rc2 -ne 0 ]; then
      echo "elan installer also failed (code $rc2). Please install Lean manually: https://leanprover.github.io/"
    fi
  fi
fi

echo "Lean version:" $(lean --version 2>/dev/null || echo "lean not found")

# If elan installed binaries exist, ensure they're reachable via ~/.local/bin
if [ -d "$HOME/.elan/bin" ]; then
  mkdir -p "$HOME/.local/bin"
  for b in lean lake leanc leanmake leanpkg elan; do
    if [ -x "$HOME/.elan/bin/$b" ] && [ ! -e "$HOME/.local/bin/$b" ]; then
      ln -s "$HOME/.elan/bin/$b" "$HOME/.local/bin/$b" || true
    fi
  done
  echo "Linked elan binaries into $HOME/.local/bin"
fi

export PATH="$HOME/.elan/bin:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
echo "Updated PATH for this session."

# Link cargo/rustup-managed tools into ~/.local/bin so they're on PATH
if [ -d "$HOME/.cargo/bin" ]; then
  mkdir -p "$HOME/.local/bin"
  for b in rustc cargo rustfmt rustup clippy rust-analyzer; do
    if [ -x "$HOME/.cargo/bin/$b" ] && [ ! -e "$HOME/.local/bin/$b" ]; then
      ln -s "$HOME/.cargo/bin/$b" "$HOME/.local/bin/$b" || true
    fi
  done
  echo "Linked cargo binaries into $HOME/.local/bin"
fi

# Persist PATH updates to ~/.profile for new shells
PROFILE="$HOME/.profile"
MARKER="# SAPM toolchain additions - added by scripts/bootstrap_toolchains.sh"
if ! grep -Fq "$MARKER" "$PROFILE" 2>/dev/null; then
  cat >> "$PROFILE" <<EOF

$MARKER
export PATH="\$HOME/.elan/bin:\$HOME/.cargo/bin:\$HOME/.local/bin:\$PATH"
if [ -f "\$HOME/.cargo/env" ]; then
  . "\$HOME/.cargo/env"
fi
EOF
  echo "Appended PATH exports to $PROFILE"
else
  echo "Profile already contains toolchain exports; skipping append."
fi

echo "Bootstrap script complete."
