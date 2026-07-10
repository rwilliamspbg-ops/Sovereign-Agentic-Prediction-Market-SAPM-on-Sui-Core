// SPDX-License-Identifier: Apache-2.0
module 0x0::registry {
    use std::vector;
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Capability to manage the PubkeyRegistry.
    public struct RegistryCap has key { id: object::UID }

    /// A Sui object that stores a vector of pubkeys (each pubkey is vector<u8>).
    public struct PubkeyRegistry has key {
        id: object::UID,
        pubkeys: vector<vector<u8>>,
    }

    /// Create and publish a shared `PubkeyRegistry` object. Returns the management capability.
    public fun init_registry(ctx: &mut TxContext) {
        let id = object::new(ctx);
        let v: vector<vector<u8>> = vector[];
        transfer::share_object(PubkeyRegistry { id, pubkeys: v });
        transfer::transfer(RegistryCap { id }, ctx.sender());
    }

    /// Add a new public key to the registry. Requires RegistryCap.
    public fun add_key(reg: &mut PubkeyRegistry, _cap: &RegistryCap, key: vector<u8>) {
        vector::push_back(&mut reg.pubkeys, key);
    }

    /// Fresh marker for versioning
    public fun fresh_marker() {
        // no-op
    }
}