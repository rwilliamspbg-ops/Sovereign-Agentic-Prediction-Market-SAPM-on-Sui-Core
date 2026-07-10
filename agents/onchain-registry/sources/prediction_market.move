// SPDX-License-Identifier: Apache-2.0
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
    const STATUS_HALTED: u8    = 3;

    const OUTCOME_NONE: u8 = 0;
    const OUTCOME_YES:  u8 = 1;
    const OUTCOME_NO:   u8 = 2;

    const MIN_STAKE_MIST: u64 = 10_000_000; // 0.01 SUI minimum position
    const MAX_POSITION_MIST: u64 = 10_000_000_000; // 100 SUI cap per single position

    // ─── Error codes ─────────────────────────────────────────────────────────

    const E_MARKET_NOT_OPEN:     u64 = 2001;
    const E_INVALID_SIDE:        u64 = 2002;
    const E_STAKE_TOO_SMALL:     u64 = 2003;
    const E_STAKE_TOO_LARGE:    u64 = 2004;
    const E_MARKET_ALREADY_DONE: u64 = 2005;
    const E_INVALID_OUTCOME:     u64 = 2006;
    const E_MARKET_NOT_RESOLVED: u64 = 3001;
    const E_WRONG_SIDE:          u64 = 3002;
    const E_ZERO_WINNING_POOL:   u64 = 3003;
    const E_MARKET_NOT_CANCELLED:u64 = 4001;
    const E_MARKET_HALTED:       u64 = 3002;

    // ─── Structs ─────────────────────────────────────────────────────────────

    public struct MarketCap has key { id: object::UID }

    public struct PredictionMarket has key {
        id: object::UID,
        creator: address,
        question: vector<u8>,
        yes_pool: Balance<SUI>,
        no_pool:  Balance<SUI>,
        /// Total shares outstanding on the winning side (tracked at open_position time)
        yes_shares_total: u64,
        no_shares_total:  u64,
        status: u8,
        outcome: u8,
        resolution_epoch: u64,
        total_trades: u64,
        /// Circuit breaker state (0 = normal, 1 = tripped)
        circuit_breaker_tripped: bool,
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

    public struct MarketHalted has copy, drop {
        market_id: address,
        reason: vector<u8>,
    }

    public struct CircuitBreakerTripped has copy, drop {
        market_id: address,
        reason: vector<u8>,
    }

    // ─── Market lifecycle ────────────────────────────────────────────────────

    /// Create a new binary prediction market (shared object).
    /// Returns a MarketCap to the creator for administrative actions.
    public fun create_market(
        question: vector<u8>,
        resolution_epoch: u64,
        ctx: &mut TxContext,
    ) : MarketCap {
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
            circuit_breaker_tripped: false,
        };
        event::emit(MarketCreated {
            market_id: market_addr,
            creator: tx_context::sender(ctx),
            question: market.question,
            resolution_epoch,
        });
        transfer::share_object(market);
        
        let cap = MarketCap { id: object::new(ctx) };
        transfer::transfer(cap, tx_context::sender(ctx));
        cap
    }

    /// Open a YES or NO position. `side` must be OUTCOME_YES (1) or OUTCOME_NO (2).
    public fun open_position(
        market: &mut PredictionMarket,
        side: u8,
        stake: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_NOT_OPEN);
        assert!(market.status != STATUS_HALTED, E_MARKET_HALTED);
        assert!(not market.circuit_breaker_tripped, E_MARKET_HALTED);
        assert!(side == OUTCOME_YES || side == OUTCOME_NO, E_INVALID_SIDE);
        let stake_val = coin::value(&stake);
        assert!(stake_val >= MIN_STAKE_MIST, E_STAKE_TOO_SMALL);
        assert!(stake_val <= MAX_POSITION_MIST, E_STAKE_TOO_LARGE);

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

    /// Resolve the market. Requires MarketCap.
    public fun resolve_market(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        outcome: u8,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
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

    /// Trip the circuit breaker. Requires MarketCap.
    public fun trip_circuit_breaker(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        reason: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        market.circuit_breaker_tripped = true;
        event::emit(CircuitBreakerTripped {
            market_id: object::uid_to_address(&market.id),
            reason,
        });
    }

    /// Halt a market. Requires MarketCap.
    public fun halt_market(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        reason: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        market.status = STATUS_HALTED;
        event::emit(MarketHalted {
            market_id: object::uid_to_address(&market.id),
            reason,
        });
    }

    /// Cancel the market. Requires MarketCap.
    public fun cancel_market(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);

        market.status = STATUS_CANCELLED;
        event::emit(MarketCancelled {
            market_id: object::uid_to_address(&market.id),
        });
    }

    // ─── Position redemption ─────────────────────────────────────────────────

    /// Redeem a winning position after market resolution.
    public fun redeem_position(
        market: &mut PredictionMarket,
        position: Position,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_RESOLVED, E_MARKET_NOT_RESOLVED);
        assert!(position.side == market.outcome, E_WRONG_SIDE);

        let Position { id, market_id: _, trader, side, shares } = position;
        object::delete(id);

        let winning_shares_total = if (market.outcome == OUTCOME_YES) {
            market.yes_shares_total
        } else {
            market.no_shares_total
        };
        assert!(winning_shares_total > 0, E_ZERO_WINNING_POOL);

        let total_pot = balance::value(&market.yes_pool) + balance::value(&market.no_pool);
        
        // FIX: Use u128 for intermediate multiplication to prevent overflow
        let payout_mist = (((shares as u128) * (total_pot as u128)) / (winning_shares_total as u128));
        let payout_mist_u64 = payout_mist as u64;

        // Extract payout from the winning pool
        let payout_balance = if (market.outcome == OUTCOME_YES) {
            balance::split(&mut market.yes_pool, payout_mist_u64)
        } else {
            balance::split(&mut market.no_pool, payout_mist_u64)
        };

        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, trader);

        event::emit(PositionRedeemed {
            market_id: object::uid_to_address(&market.id),
            trader,
            shares,
            payout_mist: payout_mist_u64,
        });
    }

    /// Refund a position from a cancelled market.
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
    public fn get_no_shares(market: &PredictionMarket): u64     { market.no_shares_total }

    public fun get_implied_yes_prob(market: &PredictionMarket): u64 {
        let yes   = balance::value(&market.yes_pool);
        let no    = balance::value(&market.no_pool);
        let total = yes + no;
        if (total == 0) { return 50 };
        (yes * 100) / total
    }
}