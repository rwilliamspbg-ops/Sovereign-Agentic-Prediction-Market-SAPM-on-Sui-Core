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

    /// Capability to manage incentives and agent reputation.
    public struct IncentivesCap has key { id: object::UID }

    /// Agent staking and reputation tracking
    public struct AgentStake has key {
        id: object::UID,
        agent: address,
        stake: Balance<SUI>,
        reputation: u64,  // 0-100 scale
        total_reports: u64,
        correct_reports: u64,
        slash_count: u64,
    }

    /// Agent reputation tracker (shared object)
    public struct ReputationRegistry has key {
        id: object::UID,
        total_agents: u64,
        total_rewards_distributed: u64,
        total_slashes_applied: u64,
    }

    /// Risk parameters for the incentive system.
    public struct RiskParameters has key {
        id: object::UID,
        min_unstake_reputation: u64,
        max_slash_amount_percent: u64,
        reward_decay_rate: u64,
    }

    // ─── Events ──────────────────────────────────────────────────────────────
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

    // ─── Initialization ─────────────────────────────────────────────────────

    /// Initialize reputation registry. Returns the management capability.
    public fun init_reputation_registry(ctx: &mut TxContext) {
        let registry = ReputationRegistry {
            id: object::new(ctx),
            total_agents: 0,
            total_rewards_distributed: 0,
            total_slashes_applied: 0,
        };
        transfer::share_object(registry);
        transfer::transfer(IncentivesCap { id: object::new(ctx) }, ctx.sender());
    }

    /// Initialize risk parameters. Returns the management capability.
    public fun init_risk_parameters(ctx: &mut TxContext) : RiskParameters {
        let rp = RiskParameters {
            id: object::new(ctx),
            min_unstake_reputation: 50,
            max_slash_amount_percent: 20, // Max 20% slash per event
            reward_decay_rate: 1,
        };
        transfer::share_object(rp);
        rp
    }

    // ─── Agent Management ──────────────────────────────────────────────────

    /// Agent stakes SUI to become a predictor
    public fun stake(
        amount: Coin<SUI>,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext,
    ) {
        let amount_val = coin::value(&amount);
        assert!(amount_val >= 1_000_000_000, 1001);  // Minimum 1 SUI
        
        let agent_stake = AgentStake {
            id: object::new(ctx),
            agent: tx_context::sender(ctx),
            stake: coin::into_balance(amount),
            reputation: 50,  // Start at neutral 50/100
            total_reports: 0,
            correct_reports: 0,
            slash_count: 0,
        };

        registry.total_agents = registry.total_agents + 1;
        
        event::emit(AgentStaked {
            agent: tx_context::sender(ctx),
            amount: amount_val,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });

        transfer::share_object(agent_stake);
    }

    /// Update risk parameters. Requires IncentivesCap.
    public fun update_risk_parameters(
        cap: &IncentivesCap,
        params: RiskParameters,
        ctx: &mut TxContext,
    ) {
        let old_params = object::take(params);
        delete(old_params);
        transfer::share_object(RiskParameters {
            id: object::new(ctx),
            min_unstake_reputation: params.min_unstake_reputation,
            max_slash_amount_percent: params.max_slash_amount_percent,
            reward_decay_rate: params.reward_decay_rate,
        });
    }

    /// Slash an agent for Byzantine behavior. Requires IncentivesCap.
    public fun slash_agent(
        cap: &IncentivesCap,
        stake: &mut AgentStake,
        amount: u64,
        reason: vector<u8>,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext,
    ) {
        let available = balance::value(&stake.stake);
        // Cap the slash amount to a percentage of current stake to prevent total wipeout in one go
        let max_slashable = (available * 20) / 100; // 20% cap
        let slash_amount = if (amount > max_slashable) {
            max_slashable
        } else {
            amount
        };

        // Ensure we don't slash more than available
        let actual_slash = if (slash_amount > available) {
            available
        } else {
            slash_amount
        };

        // Reduce reputation
        let reputation_penalty = 15;
        stake.reputation = if (stake.reputation > reputation_penalty) {
            stake.reputation - reputation_penalty
        } else {
            0
        };

        stake.slash_count = stake.slash_count + 1;
        registry.total_slashes_applied = registry.total_slashes_applied + 1;

        // Send slashed amount to treasury (burn)
        transfer::public_transfer(
            coin::from_balance(balance::split(&mut stake.stake, actual_slash), ctx),
            @0x0  // Treasury address
        );

        event::emit(AgentSlashed {
            agent: stake.agent,
            slash_amount: actual_slash,
            reason,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Reward an agent for honest reporting. Requires IncentivesCap.
    public fun reward_honest_agent(
        cap: &IncentivesCap,
        stake: &mut AgentStake,
        reward: Coin<SUI>,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext,
    ) {
        let reward_val = coin::value(&reward);
        let reward_balance = coin::into_balance(reward);
        balance::join(&mut stake.stake, reward_balance);

        let reputation_gain = 5;
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
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Record a report and update stats. Requires IncentivesCap.
    public fun record_report(
        cap: &IncentivesCap,
        stake: &mut AgentStake,
        was_correct: bool,
        _registry: &mut ReputationRegistry,
        _ctx: &mut TxContext,
    ) {
        let old_reputation = stake.reputation;
        stake.total_reports = stake.total_reports + 1;
        
        if (was_correct) {
            stake.correct_reports = stake.correct_reports + 1;
            let accuracy_bonus = 2;
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
            let accuracy_penalty = 5;
            stake.reputation = if (stake.reputation > accuracy_penalty) {
                0
            } else {
                stake.reputation - accuracy_penalty
            };

            event::emit(ReputationUpdated {
                agent: stake.agent,
                old_reputation,
                new_reputation: stake.reputation,
                change_reason: b"inaccurate_report",
            });
        }
    }

    // ─── Getters ────────────────────────────────────────────────────────────

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

    /// Unstake (requires minimum reputation of 50)
    public fun unstake(
        stake: AgentStake,
        ctx: &mut TxContext,
    ) {
        assert!(stake.reputation >= 50, 1002);
        let AgentStake { id, agent, stake: balance_stake, reputation: _, total_reports: _, correct_reports: _, slash_count: _ } = stake;
        object::delete(id);
        let coin = coin::from_balance(balance_stake, ctx);
        transfer::public_transfer(coin, agent);
    }

    public fun get_registry_stats(registry: &ReputationRegistry): (u64, u64, u64) {
        (registry.total_agents, registry.total_rewards_distributed, registry.total_slashes_applied)
    }
}