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

    // ─── Market state ────────────────────────────────────────────────────────

    const STATUS_OPEN: u8      = 0;
    const STATUS_RESOLVED: u8  = 1;
    const STATUS_CANCELLED: u8 = 2;

    const OUTCOME_NONE: u8 = 0;
    const OUTCOME_YES:  u8 = 1;
    const OUTCOME_NO:   u8 = 2;

    const MIN_STAKE_MIST: u64 = 10_000_000; // 0.01 SUI minimum position

    // ─── Error codes ─────────────────────────────────────────────────────────

    const E_MARKET_NOT_OPEN:     u64 = 2001;
    const E_INVALID_SIDE:        u64 = 2002;
    const E_STAKE_TOO_SMALL:     u64 = 2003;
    const E_MARKET_ALREADY_DONE: u64 = 2004;
    const E_NOT_CREATOR:         u64 = 2005;
    const E_INVALID_OUTCOME:     u64 = 2006;
    const E_MARKET_NOT_RESOLVED: u64 = 3001;
    const E_WRONG_SIDE:          u64 = 3002;
    const E_ZERO_WINNING_POOL:   u64 = 3003;
    const E_MARKET_NOT_CANCELLED:u64 = 4001;

    // ─── Structs ─────────────────────────────────────────────────────────────

    public struct PredictionMarket has key {
        id: object::UID,
        creator: address,
        question: vector<u8>,
        yes_pool: Balance<SUI>,
        no_pool: Balance<SUI>,
        /// Total shares outstanding on the winning side (tracked at open_position time)
        yes_shares_total: u64,
        no_shares_total: u64,
        status: u8,
        outcome: u8,
        resolution_epoch: u64,
        total_trades: u64,
    }

    public struct Position has key {
        id: object::UID,
        market_id: address,
        trader: address,
        side: u8,   // OUTCOME_YES or OUTCOME_NO
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

    public struct PositionRedeemed has copy, drop {
        market_id: address,
        trader: address,
        shares: u64,
        payout_mist: u64,
    }

    public struct PositionCancelled has copy, drop {
        market_id: address,
        trader: address,
        refund_mist: u64,
    }

    public struct MarketCancelled has copy, drop {
        market_id: address,
    }

    // ─── Market lifecycle ────────────────────────────────────────────────────

    /// Create a new binary prediction market (shared object).
    public fun create_market(
        question: vector<u8>,
        resolution_epoch: u64,
        ctx: &mut TxContext,
    ) {
        let market_id_uid = object::new(ctx);
        let market_addr   = object::uid_to_address(&market_id_uid);
        let market = PredictionMarket {
            id: market_id_uid,
            creator: tx_context::sender(ctx),
            question,
            yes_pool: balance::zero<SUI>(),
            no_pool:  balance::zero<SUI>(),
            yes_shares_total: 0,
            no_shares_total:  0,
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
    /// Shares are minted 1:1 with MIST staked (simplest constant-product AMM).
    public fun open_position(
        market: &mut PredictionMarket,
        side: u8,
        stake: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_NOT_OPEN);
        assert!(side == OUTCOME_YES || side == OUTCOME_NO, E_INVALID_SIDE);
        let stake_val = coin::value(&stake);
        assert!(stake_val >= MIN_STAKE_MIST, E_STAKE_TOO_SMALL);

        let shares        = stake_val; // 1 share per MIST
        let stake_balance = coin::into_balance(stake);

        if (side == OUTCOME_YES) {
            balance::join(&mut market.yes_pool, stake_balance);
            market.yes_shares_total = market.yes_shares_total + shares;
        } else {
            balance::join(&mut market.no_pool, stake_balance);
            market.no_shares_total = market.no_shares_total + shares;
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
            shares,
        };
        transfer::transfer(position, tx_context::sender(ctx));
    }

    /// Resolve the market. Only the creator can resolve.
    public fun resolve_market(
        market: &mut PredictionMarket,
        outcome: u8,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        assert!(tx_context::sender(ctx) == market.creator, E_NOT_CREATOR);
        assert!(outcome == OUTCOME_YES || outcome == OUTCOME_NO, E_INVALID_OUTCOME);

        market.status  = STATUS_RESOLVED;
        market.outcome = outcome;

        event::emit(MarketResolved {
            market_id: object::uid_to_address(&market.id),
            outcome,
            yes_pool_mist: balance::value(&market.yes_pool),
            no_pool_mist:  balance::value(&market.no_pool),
        });
    }

    /// Cancel the market. Only the creator can cancel while still OPEN.
    /// After cancellation, all traders can reclaim their stakes via cancel_position.
    public fun cancel_market(
        market: &mut PredictionMarket,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        assert!(tx_context::sender(ctx) == market.creator, E_NOT_CREATOR);

        market.status = STATUS_CANCELLED;
        event::emit(MarketCancelled {
            market_id: object::uid_to_address(&market.id),
        });
    }

    // ─── Position redemption ─────────────────────────────────────────────────

    /// Redeem a winning position after market resolution.
    ///
    /// Payout formula (pro-rata):
    ///   total_pot  = yes_pool + no_pool
    ///   payout     = (position.shares * total_pot) / winning_shares_total
    ///
    /// The Position object is consumed (destroyed) — double redemption is impossible.
    public fun redeem_position(
        market: &mut PredictionMarket,
        position: Position,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_RESOLVED, E_MARKET_NOT_RESOLVED);
        assert!(position.side == market.outcome, E_WRONG_SIDE);

        let Position { id, market_id: _, trader, side: _, shares } = position;
        object::delete(id);

        let winning_shares_total = if (market.outcome == OUTCOME_YES) {
            market.yes_shares_total
        } else {
            market.no_shares_total
        };
        assert!(winning_shares_total > 0, E_ZERO_WINNING_POOL);

        let total_pot = balance::value(&market.yes_pool) + balance::value(&market.no_pool);
        // Integer arithmetic: payout = shares * total_pot / winning_shares_total
        // Multiply first to preserve precision; safe because shares <= winning_shares_total <= total_pot
        let payout_mist = (shares * total_pot) / winning_shares_total;

        // Extract payout from the winning pool (loser funds flow in here proportionally)
        let payout_balance = if (market.outcome == OUTCOME_YES) {
            balance::split(&mut market.yes_pool, payout_mist)
        } else {
            balance::split(&mut market.no_pool, payout_mist)
        };

        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, trader);

        event::emit(PositionRedeemed {
            market_id: object::uid_to_address(&market.id),
            trader,
            shares,
            payout_mist,
        });
    }

    /// Refund a position from a cancelled market.
    /// The Position stake equals position.shares MIST (1:1 minting ratio).
    public fun cancel_position(
        market: &mut PredictionMarket,
        position: Position,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_CANCELLED, E_MARKET_NOT_CANCELLED);

        let Position { id, market_id: _, trader, side, shares } = position;
        object::delete(id);

        let refund_balance = if (side == OUTCOME_YES) {
            balance::split(&mut market.yes_pool, shares)
        } else {
            balance::split(&mut market.no_pool, shares)
        };

        let refund_coin = coin::from_balance(refund_balance, ctx);
        transfer::public_transfer(refund_coin, trader);

        event::emit(PositionCancelled {
            market_id: object::uid_to_address(&market.id),
            trader,
            refund_mist: shares,
        });
    }

    // ─── Read helpers ────────────────────────────────────────────────────────

    public fun get_market_status(market: &PredictionMarket): u8  { market.status }
    public fun get_market_outcome(market: &PredictionMarket): u8  { market.outcome }
    public fun get_yes_pool(market: &PredictionMarket): u64       { balance::value(&market.yes_pool) }
    public fun get_no_pool(market: &PredictionMarket): u64        { balance::value(&market.no_pool) }
    public fun get_total_trades(market: &PredictionMarket): u64   { market.total_trades }
    public fun get_yes_shares(market: &PredictionMarket): u64     { market.yes_shares_total }
    public fun get_no_shares(market: &PredictionMarket): u64      { market.no_shares_total }

    public fun get_implied_yes_prob(market: &PredictionMarket): u64 {
        let yes   = balance::value(&market.yes_pool);
        let no    = balance::value(&market.no_pool);
        let total = yes + no;
        if (total == 0) { return 50 };
        (yes * 100) / total
    }
}
