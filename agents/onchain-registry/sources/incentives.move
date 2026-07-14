// SPDX-License-Identifier: Apache-2.0
module 0x0::incentives {
    use std::vector;
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};

    public struct IncentivesCap has key { id: object::UID }

    public struct AgentStake has key {
        id: object::UID,
        agent: address,
        stake: Balance<SUI>,
        reputation: u64,
        total_reports: u64,
        correct_reports: u64,
        slash_count: u64,
        stake_epoch: u64,
        unstake_request_epoch: u64,
    }

    public struct ReputationRegistry has key {
        id: object::UID,
        total_agents: u64,
        total_rewards_distributed: u64,
        total_slashes_applied: u64,
        total_slashed_amount: u64,
        treasury_address: address,
    }

    public struct RiskParameters has key {
        id: object::UID,
        min_unstake_reputation: u64,
        max_slash_amount_percent: u64,
        reward_decay_rate: u64,
        unstake_cooldown_ms: u64,
        min_stake_mist: u64,
    }

    public struct AgentStaked has copy, drop {
        agent: address,
        amount: u64,
        timestamp: u64,
    }

    public struct AgentSlashed has copy, drop {
        agent: address,
        slash_amount: u64,
        reason: vector<u8>,
        timestamp: u64,
    }

    public struct AgentRewarded has copy, drop {
        agent: address,
        reward_amount: u64,
        reputation_gained: u64,
        timestamp: u64,
    }

    public struct ReputationUpdated has copy, drop {
        agent: address,
        old_reputation: u64,
        new_reputation: u64,
        change_reason: vector<u8>,
    }

    public struct UnstakeRequested has copy, drop {
        agent: address,
        amount: u64,
        epoch: u64,
    }

    public struct TreasuryUpdated has copy, drop {
        old_treasury: address,
        new_treasury: address,
    }

    public struct SlashFeeCollected has copy, drop {
        agent: address,
        amount: u64,
        treasury: address,
    }

    const E_MIN_STAKE: u64 = 1001;
    const E_LOW_REPUTATION: u64 = 1002;
    const E_COOLDOWN_NOT_MET: u64 = 1003;
    const E_INVALID_PERCENT: u64 = 1005;

    const UNSTAKE_COOLDOWN_MS: u64 = 86400000;

    public fun init_reputation_registry(ctx: &mut TxContext) {
        let registry = ReputationRegistry {
            id: object::new(ctx),
            total_agents: 0,
            total_rewards_distributed: 0,
            total_slashes_applied: 0,
            total_slashed_amount: 0,
            treasury_address: tx_context::sender(ctx),
        };
        transfer::share_object(registry);
        transfer::transfer(IncentivesCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    public fun init_risk_parameters(ctx: &mut TxContext) {
        let rp = RiskParameters {
            id: object::new(ctx),
            min_unstake_reputation: 50,
            max_slash_amount_percent: 20,
            reward_decay_rate: 1,
            unstake_cooldown_ms: UNSTAKE_COOLDOWN_MS,
            min_stake_mist: 1_000_000_000,
        };
        transfer::share_object(rp);
    }

    public fun update_treasury(
        _cap: &IncentivesCap,
        registry: &mut ReputationRegistry,
        new_treasury: address,
        _ctx: &mut TxContext,
    ) {
        let old = registry.treasury_address;
        registry.treasury_address = new_treasury;
        event::emit(TreasuryUpdated {
            old_treasury: old,
            new_treasury: new_treasury,
        });
    }

    public fun update_risk_params(
        _cap: &IncentivesCap,
        params: &mut RiskParameters,
        new_min_unstake_rep: u64,
        new_max_slash_pct: u64,
        new_cooldown_ms: u64,
        _ctx: &mut TxContext,
    ) {
        assert!(new_max_slash_pct <= 100, E_INVALID_PERCENT);
        params.min_unstake_reputation = new_min_unstake_rep;
        params.max_slash_amount_percent = new_max_slash_pct;
        params.unstake_cooldown_ms = new_cooldown_ms;
    }

    public fun stake(
        amount: Coin<SUI>,
        registry: &mut ReputationRegistry,
        params: &RiskParameters,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let amount_val = coin::value(&amount);
        assert!(amount_val >= params.min_stake_mist, E_MIN_STAKE);

        let agent_stake = AgentStake {
            id: object::new(ctx),
            agent: tx_context::sender(ctx),
            stake: coin::into_balance(amount),
            reputation: 50,
            total_reports: 0,
            correct_reports: 0,
            slash_count: 0,
            stake_epoch: clock::timestamp_ms(clock),
            unstake_request_epoch: 0,
        };

        registry.total_agents = registry.total_agents + 1;

        event::emit(AgentStaked {
            agent: tx_context::sender(ctx),
            amount: amount_val,
            timestamp: clock::timestamp_ms(clock),
        });

        transfer::transfer(agent_stake, tx_context::sender(ctx));
    }

    public fun slash_agent(
        _cap: &IncentivesCap,
        stake: &mut AgentStake,
        amount: u64,
        reason: vector<u8>,
        registry: &mut ReputationRegistry,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let available = balance::value(&stake.stake);
        let max_slashable = (available * registry.total_slashes_applied) / 100;
        let cap_pct = if (max_slashable == 0) { 20 } else {
            let risk_pct = 20;
            risk_pct
        };
        let max_slash = (available * cap_pct) / 100;
        let slash_amount = if (amount > max_slash) { max_slash } else { amount };

        let actual_slash = if (slash_amount > available) { available } else { slash_amount };

        let reputation_penalty: u64 = 15;
        stake.reputation = if (stake.reputation > reputation_penalty) {
            stake.reputation - reputation_penalty
        } else {
            0
        };

        stake.slash_count = stake.slash_count + 1;
        registry.total_slashes_applied = registry.total_slashes_applied + 1;
        registry.total_slashed_amount = registry.total_slashed_amount + actual_slash;

        let slashed_coin = coin::from_balance(balance::split(&mut stake.stake, actual_slash), ctx);
        transfer::public_transfer(slashed_coin, registry.treasury_address);

        event::emit(SlashFeeCollected {
            agent: stake.agent,
            amount: actual_slash,
            treasury: registry.treasury_address,
        });

        event::emit(AgentSlashed {
            agent: stake.agent,
            slash_amount: actual_slash,
            reason,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    public fun reward_honest_agent(
        _cap: &IncentivesCap,
        stake: &mut AgentStake,
        reward: Coin<SUI>,
        registry: &mut ReputationRegistry,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        let reward_val = coin::value(&reward);
        let reward_balance = coin::into_balance(reward);
        balance::join(&mut stake.stake, reward_balance);

        let reputation_gain: u64 = 5;
        stake.reputation = if (stake.reputation + reputation_gain > 100) {
            100
        } else {
            stake.reputation + reputation_gain
        };

        stake.correct_reports = stake.correct_reports + 1;
        registry.total_rewards_distributed = registry.total_rewards_distributed + reward_val;

        event::emit(AgentRewarded {
            agent: stake.agent,
            reward_amount: reward_val,
            reputation_gained: reputation_gain,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    public fun record_report(
        _cap: &IncentivesCap,
        stake: &mut AgentStake,
        was_correct: bool,
        _registry: &mut ReputationRegistry,
        _ctx: &mut TxContext,
    ) {
        let old_reputation = stake.reputation;
        stake.total_reports = stake.total_reports + 1;

        if (was_correct) {
            stake.correct_reports = stake.correct_reports + 1;
            let accuracy_bonus: u64 = 2;
            stake.reputation = if (stake.reputation + accuracy_bonus > 100) {
                100
            } else {
                stake.reputation + accuracy_bonus
            };

            event::emit(ReputationUpdated {
                agent: stake.agent,
                old_reputation,
                new_reputation: stake.reputation,
                change_reason: b"accurate_report",
            });
        } else {
            let accuracy_penalty: u64 = 5;
            stake.reputation = if (stake.reputation > accuracy_penalty) {
                stake.reputation - accuracy_penalty
            } else {
                0
            };

            event::emit(ReputationUpdated {
                agent: stake.agent,
                old_reputation,
                new_reputation: stake.reputation,
                change_reason: b"inaccurate_report",
            });
        }
    }

    public fun request_unstake(
        stake: &mut AgentStake,
        params: &RiskParameters,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(stake.reputation >= params.min_unstake_reputation, E_LOW_REPUTATION);
        stake.unstake_request_epoch = clock::timestamp_ms(clock);

        event::emit(UnstakeRequested {
            agent: stake.agent,
            amount: balance::value(&stake.stake),
            epoch: clock::timestamp_ms(clock),
        });
    }

    public fun unstake(
        stake: AgentStake,
        params: &RiskParameters,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(stake.reputation >= params.min_unstake_reputation, E_LOW_REPUTATION);
        assert!(stake.unstake_request_epoch > 0, E_COOLDOWN_NOT_MET);
        let elapsed = clock::timestamp_ms(clock) - stake.unstake_request_epoch;
        assert!(elapsed >= params.unstake_cooldown_ms, E_COOLDOWN_NOT_MET);

        let AgentStake {
            id,
            agent,
            stake: balance_stake,
            reputation: _,
            total_reports: _,
            correct_reports: _,
            slash_count: _,
            stake_epoch: _,
            unstake_request_epoch: _,
        } = stake;
        object::delete(id);
        let coin = coin::from_balance(balance_stake, ctx);
        transfer::public_transfer(coin, agent);
    }

    public fun get_reputation(stake: &AgentStake): u64 {
        stake.reputation
    }

    public fun get_stake_balance(stake: &AgentStake): u64 {
        balance::value(&stake.stake)
    }

    public fun get_accuracy(stake: &AgentStake): u64 {
        if (stake.total_reports == 0) {
            50
        } else {
            (stake.correct_reports * 100) / stake.total_reports
        }
    }

    public fun calculate_agent_score(stake: &AgentStake): u64 {
        let accuracy = get_accuracy(stake);
        let reputation = stake.reputation;
        (reputation * 60 + accuracy * 40) / 100
    }

    public fun get_registry_stats(registry: &ReputationRegistry): (u64, u64, u64, u64, address) {
        (
            registry.total_agents,
            registry.total_rewards_distributed,
            registry.total_slashes_applied,
            registry.total_slashed_amount,
            registry.treasury_address,
        )
    }

    public fun get_risk_params(params: &RiskParameters): (u64, u64, u64, u64, u64) {
        (
            params.min_unstake_reputation,
            params.max_slash_amount_percent,
            params.reward_decay_rate,
            params.unstake_cooldown_ms,
            params.min_stake_mist,
        )
    }
}
