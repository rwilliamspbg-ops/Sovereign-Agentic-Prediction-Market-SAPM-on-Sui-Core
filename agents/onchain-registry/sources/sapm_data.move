// SPDX-License-Identifier: Apache-2.0
module 0x0::sapm_data {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    public struct DataCap has key { id: object::UID }

    public struct DataFeeConfig has key {
        id: object::UID,
        record_fee_mist: u64,
        snapshot_fee_mist: u64,
        treasury_address: address,
        total_record_fees: u64,
        total_snapshot_fees: u64,
    }

    public struct TradeRecord has key, store {
        id: object::UID,
        market_id: address,
        agent: address,
        side: u8,
        amount: u64,
        price: u64,
        timestamp: u64,
    }

    public struct MarketSnapshot has key, store {
        id: object::UID,
        market_id: address,
        yes_pool: u64,
        no_pool: u64,
        total_trades: u64,
        timestamp: u64,
    }

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

    public struct DataFeeCollected has copy, drop {
        fee_type: vector<u8>,
        amount: u64,
        payer: address,
        treasury: address,
    }

    const E_INSUFFICIENT_FEE: u64 = 6001;

    public fun init_data_module(ctx: &mut TxContext) {
        let cap = DataCap { id: object::new(ctx) };
        transfer::transfer(cap, tx_context::sender(ctx));

        let fee_config = DataFeeConfig {
            id: object::new(ctx),
            record_fee_mist: 1_000_000,
            snapshot_fee_mist: 2_000_000,
            treasury_address: tx_context::sender(ctx),
            total_record_fees: 0,
            total_snapshot_fees: 0,
        };
        transfer::share_object(fee_config);
    }

    public fun update_data_fees(
        _cap: &DataCap,
        fee_config: &mut DataFeeConfig,
        new_record_fee: u64,
        new_snapshot_fee: u64,
        new_treasury: address,
        _ctx: &mut TxContext,
    ) {
        fee_config.record_fee_mist = new_record_fee;
        fee_config.snapshot_fee_mist = new_snapshot_fee;
        fee_config.treasury_address = new_treasury;
    }

    public fun create_trade_record(
        _cap: &DataCap,
        fee_config: &mut DataFeeConfig,
        fee_payment: Coin<SUI>,
        market_id: address,
        agent: address,
        side: u8,
        amount: u64,
        price: u64,
        ctx: &mut TxContext,
    ) {
        let fee_val = coin::value(&fee_payment);
        assert!(fee_val >= fee_config.record_fee_mist, E_INSUFFICIENT_FEE);

        transfer::public_transfer(fee_payment, fee_config.treasury_address);
        fee_config.total_record_fees = fee_config.total_record_fees + fee_val;

        event::emit(DataFeeCollected {
            fee_type: b"trade_record",
            amount: fee_val,
            payer: tx_context::sender(ctx),
            treasury: fee_config.treasury_address,
        });

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

    public fun create_market_snapshot(
        _cap: &DataCap,
        fee_config: &mut DataFeeConfig,
        fee_payment: Coin<SUI>,
        market_id: address,
        yes_pool: u64,
        no_pool: u64,
        total_trades: u64,
        ctx: &mut TxContext,
    ) {
        let fee_val = coin::value(&fee_payment);
        assert!(fee_val >= fee_config.snapshot_fee_mist, E_INSUFFICIENT_FEE);

        transfer::public_transfer(fee_payment, fee_config.treasury_address);
        fee_config.total_snapshot_fees = fee_config.total_snapshot_fees + fee_val;

        event::emit(DataFeeCollected {
            fee_type: b"market_snapshot",
            amount: fee_val,
            payer: tx_context::sender(ctx),
            treasury: fee_config.treasury_address,
        });

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

    public fun get_data_fee_config(fee_config: &DataFeeConfig): (u64, u64, address, u64, u64) {
        (
            fee_config.record_fee_mist,
            fee_config.snapshot_fee_mist,
            fee_config.treasury_address,
            fee_config.total_record_fees,
            fee_config.total_snapshot_fees,
        )
    }
}
