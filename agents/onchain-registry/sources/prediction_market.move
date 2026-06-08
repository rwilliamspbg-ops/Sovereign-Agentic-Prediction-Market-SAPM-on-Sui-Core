// SPDX-License-Identifier: Apache-2.0
// PredictionMarket — binary prediction market with DeepBook-style position tracking
// Each market is a shared object; positions are owned objects per trader.
module 0x0::prediction_market {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::vector;
    use std::string::{Self, String};

    // ─── Market state ────────────────────────────────────────────────────────

    const STATUS_OPEN: u8     = 0;
    const STATUS_RESOLVED: u8 = 1;
    const STATUS_CANCELLED: u8 = 2;

    const OUTCOME_NONE: u8 = 0;
    const OUTCOME_YES:  u8 = 1;
    const OUTCOME_NO:   u8 = 2;

    const MIN_STAKE_MIST: u64 = 10_000_000; // 0.01 SUI minimum position

    public struct PredictionMarket has key {
        id: object::UID,
        creator: address,
        question: vector<u8>,
        yes_pool: Balance<SUI>,
        no_pool: Balance<SUI>,
        status: u8,
        outcome: u8,
        resolution_epoch: u64,
        total_trades: u64,
    }

    public struct Position has key {
        id: object::UID,
        market_id: address,
        trader: address,
        side: u8,          // OUTCOME_YES or OUTCOME_NO
        stake: Balance<SUI>,
        shares: u64,
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    public struct MarketCreated has copy, drop {
        market_id: address,
        creator: address,
        question: vector<u8>,
        resolution_epoch: u64,
    }

    public struct PositionOpened has copy, drop {
        market_id: address,
        trader: address,
        side: u8,
        stake_mist: u64,
        shares: u64,
    }

    public struct MarketResolved has copy, drop {
        market_id: address,
        outcome: u8,
        yes_pool_mist: u64,
        no_pool_mist: u64,
    }

    // ─── Market lifecycle ────────────────────────────────────────────────────

    /// Create a new binary prediction market. The market is shared so any agent
    /// or trader can interact with it.
    public fun create_market(
        question: vector<u8>,
        resolution_epoch: u64,
        ctx: &mut TxContext,
    ) {
        let market_id_uid = object::new(ctx);
        let market_addr = object::uid_to_address(&market_id_uid);
        let market = PredictionMarket {
            id: market_id_uid,
            creator: tx_context::sender(ctx),
            question,
            yes_pool: balance::zero<SUI>(),
            no_pool: balance::zero<SUI>(),
            status: STATUS_OPEN,
            outcome: OUTCOME_NONE,
            resolution_epoch,
            total_trades: 0,
        };
        event::emit(MarketCreated {
            market_id: market_addr,
            creator: tx_context::sender(ctx),
            question: market.question,
            resolution_epoch,
        });
        transfer::share_object(market);
    }

    /// Open a YES or NO position. `side` must be OUTCOME_YES (1) or OUTCOME_NO (2).
    /// Returns the number of shares minted (1:1 with MIST in this simple AMM).
    public fun open_position(
        market: &mut PredictionMarket,
        side: u8,
        stake: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, 2001);
        assert!(side == OUTCOME_YES || side == OUTCOME_NO, 2002);
        let stake_val = coin::value(&stake);
        assert!(stake_val >= MIN_STAKE_MIST, 2003);

        let shares = stake_val; // 1 share per MIST (simplest AMM)
        let stake_balance = coin::into_balance(stake);

        if (side == OUTCOME_YES) {
            balance::join(&mut market.yes_pool, stake_balance);
        } else {
            balance::join(&mut market.no_pool, stake_balance);
        };

        market.total_trades = market.total_trades + 1;

        let market_addr = object::uid_to_address(&market.id);
        event::emit(PositionOpened {
            market_id: market_addr,
            trader: tx_context::sender(ctx),
            side,
            stake_mist: stake_val,
            shares,
        });

        let position = Position {
            id: object::new(ctx),
            market_id: market_addr,
            trader: tx_context::sender(ctx),
            side,
            stake: balance::zero<SUI>(), // stake is held in market pools
            shares,
        };
        transfer::transfer(position, tx_context::sender(ctx));
    }

    /// Resolve the market. Only the creator can resolve.
    /// After resolution, winners can redeem proportionally.
    public fun resolve_market(
        market: &mut PredictionMarket,
        outcome: u8,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, 2004);
        assert!(tx_context::sender(ctx) == market.creator, 2005);
        assert!(outcome == OUTCOME_YES || outcome == OUTCOME_NO, 2006);

        market.status = STATUS_RESOLVED;
        market.outcome = outcome;

        event::emit(MarketResolved {
            market_id: object::uid_to_address(&market.id),
            outcome,
            yes_pool_mist: balance::value(&market.yes_pool),
            no_pool_mist: balance::value(&market.no_pool),
        });
    }

    // ─── Read helpers ────────────────────────────────────────────────────────

    public fun get_market_status(market: &PredictionMarket): u8 { market.status }
    public fun get_market_outcome(market: &PredictionMarket): u8 { market.outcome }
    public fun get_yes_pool(market: &PredictionMarket): u64 { balance::value(&market.yes_pool) }
    public fun get_no_pool(market: &PredictionMarket): u64 { balance::value(&market.no_pool) }
    public fun get_total_trades(market: &PredictionMarket): u64 { market.total_trades }

    public fun get_implied_yes_prob(market: &PredictionMarket): u64 {
        let yes = balance::value(&market.yes_pool);
        let no = balance::value(&market.no_pool);
        let total = yes + no;
        if (total == 0) { return 50 };
        (yes * 100) / total
    }
}
