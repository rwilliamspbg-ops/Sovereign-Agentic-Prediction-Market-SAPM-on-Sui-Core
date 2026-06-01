module 0x3::registry2 {
    use std::vector;
    use sui::object;
    use sui::transfer;
    use sui::tx_context::TxContext;

    /// A Sui object that stores a vector of pubkeys (each pubkey is vector<u8>).
    public struct PubkeyRegistry has key {
        id: object::UID,
        pubkeys: vector<vector<u8>>,
    }

    /// Create and publish a shared `PubkeyRegistry` object. Returns nothing;
    /// the published object will be visible on-chain and can be queried by object id.
    public entry fun init_registry(ctx: &mut TxContext) {
        let id = object::new(ctx);
        let v: vector<vector<u8>> = vector[];
        transfer::share_object(PubkeyRegistry { id, pubkeys: v });
    }

    public fun add_key(reg: &mut PubkeyRegistry, key: vector<u8>) {
        vector::push_back(&mut reg.pubkeys, key);
    }

    // marker to ensure package digest differs for fresh publishes
    public fun fresh_marker() {
        // no-op
    }
}
