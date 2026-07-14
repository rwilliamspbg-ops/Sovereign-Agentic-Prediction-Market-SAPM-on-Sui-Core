// SPDX-License-Identifier: Apache-2.0
module 0x0::registry {
    use std::vector;
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;

    public struct RegistryCap has key { id: object::UID }

    public struct PubkeyRegistry has key {
        id: object::UID,
        pubkeys: vector<vector<u8>>,
        admin: address,
        total_keys: u64,
    }

    public struct KeyAdded has copy, drop {
        registry_id: address,
        key_index: u64,
        added_by: address,
    }

    public struct KeyRemoved has copy, drop {
        registry_id: address,
        key_index: u64,
        removed_by: address,
    }

    const E_KEY_NOT_FOUND: u64 = 1002;

    public fun init_registry(ctx: &mut TxContext) {
        let reg_id = object::new(ctx);
        let cap_id = object::new(ctx);
        let v: vector<vector<u8>> = vector[];
        let registry = PubkeyRegistry {
            id: reg_id,
            pubkeys: v,
            admin: tx_context::sender(ctx),
            total_keys: 0,
        };
        transfer::share_object(registry);
        transfer::transfer(RegistryCap { id: cap_id }, tx_context::sender(ctx));
    }

    public fun add_key(reg: &mut PubkeyRegistry, _cap: &RegistryCap, key: vector<u8>, ctx: &mut TxContext) {
        let idx = vector::length(&reg.pubkeys);
        vector::push_back(&mut reg.pubkeys, key);
        reg.total_keys = reg.total_keys + 1;

        event::emit(KeyAdded {
            registry_id: object::uid_to_address(&reg.id),
            key_index: idx,
            added_by: tx_context::sender(ctx),
        });
    }

    public fun remove_key(
        reg: &mut PubkeyRegistry,
        _cap: &RegistryCap,
        index: u64,
        ctx: &mut TxContext,
    ) {
        assert!(index < vector::length(&reg.pubkeys), E_KEY_NOT_FOUND);
        vector::remove(&mut reg.pubkeys, index);
        reg.total_keys = reg.total_keys - 1;

        event::emit(KeyRemoved {
            registry_id: object::uid_to_address(&reg.id),
            key_index: index,
            removed_by: tx_context::sender(ctx),
        });
    }

    public fun get_registry_stats(reg: &PubkeyRegistry): (u64, address) {
        (reg.total_keys, reg.admin)
    }

    public fun get_key_count(reg: &PubkeyRegistry): u64 {
        vector::length(&reg.pubkeys)
    }
}
