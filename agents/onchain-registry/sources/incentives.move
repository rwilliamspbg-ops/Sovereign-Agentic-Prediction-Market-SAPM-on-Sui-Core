module 0x0::incentives {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::vector;

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

    /// Events for tracking
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

    /// Initialize reputation registry
    public entry fun init_reputation_registry(ctx: &mut TxContext) {
        let registry = ReputationRegistry {
            id: object::new(ctx),
            total_agents: 0,
            total_rewards_distributed: 0,
            total_slashes_applied: 0,
        };
        transfer::share_object(registry);
    }

    /// Agent stakes SUI to become a predictor
    /// Minimum stake: 1 SUI (1_000_000_000 MIST)
    public entry fun stake(
        amount: Coin<SUI>,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext
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
            timestamp: tx_context::epoch_timestamp(ctx),
        });

        transfer::share_object(agent_stake);
    }

    /// Slash an agent for Byzantine behavior
    /// Removes portion of stake and reduces reputation
    public fun slash_agent(
        stake: &mut AgentStake,
        amount: u64,
        reason: vector<u8>,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext
    ) {
        let available = balance::value(&stake.stake);
        let slash_amount = if (amount > available) {
            available  // Slash up to what's available
        } else {
            amount
        };

        // Slash 20% of position
        let slashed = balance::split(&mut stake.stake, slash_amount);
        
        // Reduce reputation
        let reputation_penalty = 15;  // Lose 15 points
        stake.reputation = if (stake.reputation > reputation_penalty) {
            stake.reputation - reputation_penalty
        } else {
            0
        };

        stake.slash_count = stake.slash_count + 1;
        registry.total_slashes_applied = registry.total_slashes_applied + 1;

        // Send slashed amount to treasury (burn)
        transfer::public_transfer(
            coin::from_balance(slashed, ctx),
            @0x0  // Treasury address (can be updated)
        );

        event::emit(AgentSlashed {
            agent: stake.agent,
            slash_amount,
            reason,
            timestamp: tx_context::epoch_timestamp(ctx),
        });
    }

    /// Reward an agent for honest reporting
    /// Adds to stake and increases reputation
    public entry fun reward_honest_agent(
        stake: &mut AgentStake,
        reward: Coin<SUI>,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext
    ) {
        let reward_val = coin::value(&reward);
        
        // Add reward to stake
        let reward_balance = coin::into_balance(reward);
        balance::join(&mut stake.stake, reward_balance);

        // Increase reputation (up to max 100)
        let reputation_gain = 5;  // Gain 5 points
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
            timestamp: tx_context::epoch_timestamp(ctx),
        });
    }

    /// Record a report and update stats
    public fun record_report(
        stake: &mut AgentStake,
        was_correct: bool,
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext
    ) {
        stake.total_reports = stake.total_reports + 1;
        
        if (was_correct) {
            stake.correct_reports = stake.correct_reports + 1;
            
            // Bonus reputation for accuracy
            let accuracy_bonus = 2;
            stake.reputation = if (stake.reputation + accuracy_bonus > 100) {
                100
            } else {
                stake.reputation + accuracy_bonus
            };
        } else {
            // Penalty for inaccuracy
            let accuracy_penalty = 5;
            stake.reputation = if (stake.reputation > accuracy_penalty) {
                stake.reputation - accuracy_penalty
            } else {
                0
            };
        }
    }

    /// Get agent reputation (read-only)
    public fun get_reputation(stake: &AgentStake): u64 {
        stake.reputation
    }

    /// Get agent stake balance
    public fun get_stake_balance(stake: &AgentStake): u64 {
        balance::value(&stake.stake)
    }

    /// Get agent accuracy (correct_reports / total_reports)
    public fun get_accuracy(stake: &AgentStake): u64 {
        if (stake.total_reports == 0) {
            50  // Default neutral if no reports
        } else {
            (stake.correct_reports * 100) / stake.total_reports
        }
    }

    /// Calculate agent score (reputation + accuracy)
    public fun calculate_agent_score(stake: &AgentStake): u64 {
        let accuracy = get_accuracy(stake);
        let reputation = stake.reputation;
        
        // Weighted score: 60% reputation, 40% accuracy
        (reputation * 60 + accuracy * 40) / 100
    }

    /// Unstake (requires minimum reputation of 50)
    public entry fun unstake(
        stake: AgentStake,
        ctx: &mut TxContext
    ) {
        assert!(stake.reputation >= 50, 1002);  // Minimum reputation to unstake
        
        let AgentStake {
            id,
            agent,
            stake: balance_stake,
            reputation: _,
            total_reports: _,
            correct_reports: _,
            slash_count: _,
        } = stake;

        object::delete(id);
        
        let coin = coin::from_balance(balance_stake, ctx);
        transfer::public_transfer(coin, agent);
    }

    /// Get registry stats (read-only)
    public fun get_registry_stats(registry: &ReputationRegistry): (u64, u64, u64) {
        (
            registry.total_agents,
            registry.total_rewards_distributed,
            registry.total_slashes_applied
        )
    }
}
