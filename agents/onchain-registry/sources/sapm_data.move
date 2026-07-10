// SPDX-License-Identifier: Apache-2.0
module 0x0::sapm_data {
    use sui::object;
    use sui::tx_context::{Self, TxContext};
    use sui::event;

    /// Capability to allow agents to post data/trades for archival.
    public struct DataCap has key { id: object::UID }

    /// Immutable record of a trade performed by an agent.
    public struct TradeRecord has key, store {
        id: object::UID,
        market_id: address,
        agent: address,
        side: u8, // 1 for YES, 2 for NO
        amount: u64,
        price: u64,
        timestamp: u64,
    }

    /// Snapshot of a market state for Walrus archival.
    public struct MarketSnapshot has key, store {
        id: object::UID,
        market_id: address,
        yes_pool: u64,
        no_pool: u64,
        total_trades: u64,
        timestamp: u64,
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    public struct TradeEmitted has copy, drop {
        market_id: address,
        agent: address,
        side: u8,
        amount: u64,
        price: u64,
    }

    public struct SnapshotEmitted has copy, drop {
        market_id: address,
        timestamp: u64,
    }

    // ─── Data Recording ─────────────────────────────────────────────────────

    /// Create a trade record. Requires DataCap.
    public fun create_trade_record(
        _cap: &DataCap,
        market_id: address,
        agent: address,
        side: u8,
        amount: u64,
        price: u64,
        ctx: &mut TxContext,
    ) {
        let trade_id = object::new(ctx);
        let record = TradeRecord {
            id: trade_id,
            market_id,
            agent,
            side,
            amount,
            price,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        };
        
        event::emit(TradeEmitted {
            market_id,
            agent,
            side,
            amount,
            price,
        });
        
        transfer::share_object(record);
    }

    /// Create a market snapshot. Requires DataCap.
    public fun create_market_snapshot(
        _cap: &DataCap,
        market_id: address,
        yes_pool: u64,
        no_pool: u64,
        total_trades: u64,
        ctx: &mut TxContext,
    ) {
        let snapshot_id = object::new(ctx);
        let snapshot = MarketSnapshot {
            id: snapshot_id,
            market_id,
            yes_pool,
            no_pool,
            total_trades,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        };

        event::emit(SnapshotEmitted {
            market_id,
            timestamp: snapshot.timestamp,
        });

        transfer::share_object(snapshot);
    }

    /// Initialize the data module. Returns the management capability.
    public fun init_data_module(ctx: &mut TxContext) : DataCap {
        let cap = DataCap { id: object::new(ctx) };
        transfer::transfer(cap, ctx.sender());
        cap
    }
}