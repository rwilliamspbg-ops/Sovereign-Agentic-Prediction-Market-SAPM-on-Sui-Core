// SPDX-License-Identifier: Apache-2.0
module 0x0::prediction_market {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    const STATUS_OPEN: u8      = 0;
    const STATUS_RESOLVED: u8  = 1;
    const STATUS_CANCELLED: u8 = 2;
    const STATUS_HALTED: u8    = 3;

    const OUTCOME_NONE: u8 = 0;
    const OUTCOME_YES:  u8 = 1;
    const OUTCOME_NO:   u8 = 2;

    const MIN_STAKE_MIST: u64 = 10_000_000;
    const MAX_POSITION_MIST: u64 = 10_000_000_000;

    const FEE_BASIS_POINTS: u64 = 250;
    const FEE_DENOMINATOR: u64 = 10000;

    const E_MARKET_NOT_OPEN:     u64 = 2001;
    const E_INVALID_SIDE:        u64 = 2002;
    const E_STAKE_TOO_SMALL:     u64 = 2003;
    const E_STAKE_TOO_LARGE:     u64 = 2004;
    const E_MARKET_ALREADY_DONE: u64 = 2005;
    const E_INVALID_OUTCOME:     u64 = 2006;
    const E_MARKET_NOT_RESOLVED: u64 = 3001;
    const E_WRONG_SIDE:          u64 = 3002;
    const E_ZERO_WINNING_POOL:   u64 = 3003;
    const E_MARKET_HALTED:       u64 = 3004;
    const E_MARKET_NOT_CANCELLED:u64 = 4001;
    const E_INVALID_FEE:         u64 = 5002;

    public struct MarketCap has key { id: object::UID }

    public struct AdminCap has key { id: object::UID }

    public struct FeeConfig has key {
        id: object::UID,
        fee_basis_points: u64,
        treasury_address: address,
        total_fees_collected: u64,
    }

    public struct PredictionMarket has key {
        id: object::UID,
        creator: address,
        question: vector<u8>,
        yes_pool: Balance<SUI>,
        no_pool:  Balance<SUI>,
        yes_shares_total: u64,
        no_shares_total:  u64,
        status: u8,
        outcome: u8,
        resolution_epoch: u64,
        total_trades: u64,
        circuit_breaker_tripped: bool,
        fees_collected: u64,
    }

    public struct Position has key {
        id: object::UID,
        market_id: address,
        trader: address,
        side: u8,
        shares: u64,
    }

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
        fee_mist: u64,
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

    public struct FeeCollected has copy, drop {
        market_id: address,
        trader: address,
        fee_mist: u64,
        treasury: address,
    }

    public struct FeeConfigUpdated has copy, drop {
        fee_basis_points: u64,
        treasury_address: address,
    }

    public fun init_prediction_market(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        let fee_config = FeeConfig {
            id: object::new(ctx),
            fee_basis_points: FEE_BASIS_POINTS,
            treasury_address: tx_context::sender(ctx),
            total_fees_collected: 0,
        };
        transfer::share_object(fee_config);
    }

    public fun update_fee_config(
        _admin: &AdminCap,
        fee_config: &mut FeeConfig,
        new_fee_basis_points: u64,
        new_treasury_address: address,
        _ctx: &mut TxContext,
    ) {
        assert!(new_fee_basis_points <= 1000, E_INVALID_FEE);
        fee_config.fee_basis_points = new_fee_basis_points;
        fee_config.treasury_address = new_treasury_address;

        event::emit(FeeConfigUpdated {
            fee_basis_points: new_fee_basis_points,
            treasury_address: new_treasury_address,
        });
    }

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
            no_pool:  balance::zero<SUI>(),
            yes_shares_total: 0,
            no_shares_total:  0,
            status: STATUS_OPEN,
            outcome: OUTCOME_NONE,
            resolution_epoch,
            total_trades: 0,
            circuit_breaker_tripped: false,
            fees_collected: 0,
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
    }

    public fun open_position(
        market: &mut PredictionMarket,
        fee_config: &mut FeeConfig,
        side: u8,
        mut stake: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_NOT_OPEN);
        assert!(!market.circuit_breaker_tripped, E_MARKET_HALTED);
        assert!(side == OUTCOME_YES || side == OUTCOME_NO, E_INVALID_SIDE);
        let stake_val = coin::value(&stake);
        assert!(stake_val >= MIN_STAKE_MIST, E_STAKE_TOO_SMALL);
        assert!(stake_val <= MAX_POSITION_MIST, E_STAKE_TOO_LARGE);

        let fee_amount = (stake_val * fee_config.fee_basis_points) / FEE_DENOMINATOR;
        let net_stake_val = stake_val - fee_amount;

        let shares = net_stake_val;

        if (fee_amount > 0) {
            let fee_coin = coin::split(&mut stake, fee_amount, ctx);
            transfer::public_transfer(fee_coin, fee_config.treasury_address);
            fee_config.total_fees_collected = fee_config.total_fees_collected + fee_amount;
            market.fees_collected = market.fees_collected + fee_amount;

            event::emit(FeeCollected {
                market_id: object::uid_to_address(&market.id),
                trader: tx_context::sender(ctx),
                fee_mist: fee_amount,
                treasury: fee_config.treasury_address,
            });
        };

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
            fee_mist: fee_amount,
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

    public fun resolve_market(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        outcome: u8,
        _ctx: &mut TxContext,
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

    public fun trip_circuit_breaker(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        reason: vector<u8>,
        _ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        market.circuit_breaker_tripped = true;
        event::emit(CircuitBreakerTripped {
            market_id: object::uid_to_address(&market.id),
            reason,
        });
    }

    public fun halt_market(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        reason: vector<u8>,
        _ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        market.status = STATUS_HALTED;
        event::emit(MarketHalted {
            market_id: object::uid_to_address(&market.id),
            reason,
        });
    }

    public fun cancel_market(
        _cap: &MarketCap,
        market: &mut PredictionMarket,
        _ctx: &mut TxContext,
    ) {
        assert!(market.status == STATUS_OPEN, E_MARKET_ALREADY_DONE);
        market.status = STATUS_CANCELLED;
        event::emit(MarketCancelled {
            market_id: object::uid_to_address(&market.id),
        });
    }

    public fun redeem_position(
        market: &mut PredictionMarket,
        fee_config: &FeeConfig,
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

        let shares_u128 = shares as u128;
        let total_pot_u128 = total_pot as u128;
        let winning_u128 = winning_shares_total as u128;
        let gross_payout = (shares_u128 * total_pot_u128) / winning_u128;

        let fee_bps = (fee_config.fee_basis_points as u128);
        let fee_denom = (FEE_DENOMINATOR as u128);
        let redemption_fee = (gross_payout * fee_bps) / fee_denom;
        let net_payout = gross_payout - redemption_fee;
        let net_payout_u64 = (net_payout as u64);
        let fee_u64 = (redemption_fee as u64);

        if (fee_u64 > 0) {
            let fee_balance = if (market.outcome == OUTCOME_YES) {
                balance::split(&mut market.yes_pool, fee_u64)
            } else {
                balance::split(&mut market.no_pool, fee_u64)
            };
            let fee_coin_val = coin::from_balance(fee_balance, ctx);
            transfer::public_transfer(fee_coin_val, fee_config.treasury_address);
        };

        let payout_balance = if (market.outcome == OUTCOME_YES) {
            balance::split(&mut market.yes_pool, net_payout_u64)
        } else {
            balance::split(&mut market.no_pool, net_payout_u64)
        };
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, trader);

        event::emit(PositionRedeemed {
            market_id: object::uid_to_address(&market.id),
            trader,
            shares,
            payout_mist: net_payout_u64,
        });
    }

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

    public fun get_market_status(market: &PredictionMarket): u8  { market.status }
    public fun get_market_outcome(market: &PredictionMarket): u8  { market.outcome }
    public fun get_yes_pool(market: &PredictionMarket): u64       { balance::value(&market.yes_pool) }
    public fun get_no_pool(market: &PredictionMarket): u64        { balance::value(&market.no_pool) }
    public fun get_total_trades(market: &PredictionMarket): u64   { market.total_trades }
    public fun get_yes_shares(market: &PredictionMarket): u64     { market.yes_shares_total }
    public fun get_no_shares(market: &PredictionMarket): u64      { market.no_shares_total }
    public fun get_fees_collected(market: &PredictionMarket): u64 { market.fees_collected }

    public fun get_fee_config(fee_config: &FeeConfig): (u64, address, u64) {
        (fee_config.fee_basis_points, fee_config.treasury_address, fee_config.total_fees_collected)
    }

    public fun get_implied_yes_prob(market: &PredictionMarket): u64 {
        let yes   = balance::value(&market.yes_pool);
        let no    = balance::value(&market.no_pool);
        let total = yes + no;
        if (total == 0) { return 50 };
        (yes * 100) / total
    }
}
