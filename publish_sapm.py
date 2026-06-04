#!/usr/bin/env python3
"""
SAPM Package Publisher - Creates and publishes the contract to Sui Testnet
"""

import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path

def create_move_package(tmpdir):
    """Create a fresh Move package"""
    pkg_dir = Path(tmpdir) / "sapm_pkg"
    sources_dir = pkg_dir / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)
    
    # Create Move.toml
    move_toml = """[package]
name = "sapm_registry_testnet"
version = "1.0.0"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }

[addresses]
"""
    (pkg_dir / "Move.toml").write_text(move_toml)
    
    # Create registry.move
    registry_move = """module 0x0::registry {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::TxContext;

    /// SAPM Prediction Market Registry
    public struct PubkeyRegistry has key {
        id: object::UID,
        pubkeys: vector<vector<u8>>,
    }

    public entry fun init_registry(ctx: &mut TxContext) {
        let id = object::new(ctx);
        transfer::share_object(PubkeyRegistry { 
            id, 
            pubkeys: vector[]
        });
    }

    public fun add_key(reg: &mut PubkeyRegistry, key: vector<u8>) {
        reg.pubkeys.push_back(key);
    }

    public fun fresh_marker() {
        // version marker
    }
}
"""
    (sources_dir / "registry.move").write_text(registry_move)
    
    return pkg_dir

def publish_package(pkg_dir):
    """Publish the package using sui client"""
    os.chdir(pkg_dir)
    
    print("[*] Publishing SAPM Registry to Sui Testnet...")
    print(f"[*] Package directory: {pkg_dir}")
    
    try:
        result = subprocess.run(
            ["sui", "client", "publish", "--with-unpublished-dependencies", "--gas-budget", "100000000"],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        output = result.stdout + result.stderr
        
        if result.returncode == 0:
            print("[✓] Publication successful!")
            print("\n" + "="*60)
            print(output)
            print("="*60)
            
            # Extract package ID
            for line in output.split('\n'):
                if 'Package ID:' in line or 'package at:' in line.lower():
                    print(f"\n[✓] {line}")
                    # Try to extract the hex ID
                    if '0x' in line:
                        package_id = line.split('0x')[-1].split()[0]
                        if len(package_id) >= 60:
                            print(f"\n[SUCCESS] Your Package ID: 0x{package_id}\n")
                            return f"0x{package_id}"
            
            return None
        else:
            print(f"[✗] Publication failed with return code {result.returncode}")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return None
            
    except FileNotFoundError:
        print("[✗] Error: 'sui' command not found")
        print("[!] Please ensure Sui CLI is installed and in PATH")
        return None
    except subprocess.TimeoutExpired:
        print("[✗] Error: Publication timed out (>5 minutes)")
        return None
    except Exception as e:
        print(f"[✗] Error: {e}")
        return None

def main():
    print("\n" + "="*60)
    print("  SAPM Registry Smart Contract Publisher")
    print("="*60 + "\n")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            pkg_dir = create_move_package(tmpdir)
            print(f"[✓] Created Move package at: {pkg_dir}")
            
            package_id = publish_package(pkg_dir)
            
            if package_id:
                print(f"\n[✓] SAPM Registry published successfully!")
                print(f"[✓] Package ID: {package_id}")
                print(f"\nSave this Package ID for your trading agents:")
                print(f"  export SAPM_PACKAGE_ID={package_id}")
                return 0
            else:
                print("\n[✗] Failed to extract Package ID from output")
                return 1
                
        except Exception as e:
            print(f"[✗] Error: {e}")
            return 1

if __name__ == "__main__":
    exit(main())
