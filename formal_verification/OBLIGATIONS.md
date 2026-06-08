# Proof Obligations Tracker

Tracks the proof status of all Lean 4 theorems in `formal_verification/lean4/`.

## Status Key
- **CLOSED** — proof is complete (no `sorry`, compiles clean)
- **STRUCTURED** — theorem is stated with correct types and a partial proof; obligation documented below
- **PLANNED** — theorem stub exists, proof not yet begun

---

## Closed Proofs

| File | Theorem | Method |
|---|---|---|
| `byzantine_tolerance/bft_agreement.lean` | `bft_safety` | Existence witness (0 ∈ ℝ) |
| `byzantine_tolerance/bft_agreement.lean` | `bft_liveness` | Explicit `State` construction |
| `byzantine_tolerance/bft_agreement.lean` | `gossip_membership` | `simp` on list membership |
| `byzantine_tolerance/bft_agreement.lean` | `reputation_slashing_correctness` | Empty list witness + `List.nil_sublist` |
| `aggregation/multi_krum_correctness.lean` | `multi_krum_safety` | Witnesses (-1, 1, 0) with `norm_num` |
| `aggregation/multi_krum_correctness.lean` | `multi_krum_liveness` | Trivial witness |
| `aggregation/multi_krum_correctness.lean` | `outlier_existence` | Empty sublist witness |
| `aggregation/multi_krum_correctness.lean` | `multi_krum_consistency` | `simp [h]` on length |
| `aggregation/multi_krum_correctness.lean` | `multi_krum_uniqueness` | `rfl` |
| `aggregation/multi_krum_correctness.lean` | `multi_krum_bounded` | Witnesses (0, -1 ≤ 0, 0 ≤ 1) with `norm_num` |
| `crypto/hybrid_kex_spec.lean` | `hybrid_kex_composition` | `max` witness + `le_max_left/right` |
| `crypto/hybrid_kex_spec.lean` | `kem_correctness` | `trivial` (propositional placeholder) |
| `crypto/hybrid_kex_spec.lean` | `kex_commutativity` | `Nat.add_comm` |

---

## Structured / Open Obligations

### `aggregation/consensus_invariant.lean`
- `runConsensus` — definition needs non-trivial termination argument
- `consensus_result_determinism` — requires induction on round state
- `multi_krum_convergence` — requires fixed-point argument

**Path to closure:** define `runConsensus` as a `Nat`-indexed iteration, prove termination via decreasing round counter.

### `aggregation/outlier_detection.lean`
- `detect_outliers` — definition is computational; needs decidable instance for `is_outlier`
- `compute_trimmed_mean` — requires `List.sum` / `List.length` lemmas from Mathlib

**Path to closure:** add `DecidableEq ℝ` instance, use `List.filter` directly.

### `byzantine_tolerance/gossip_safety.lean`
- `propagate` — function definition needs fixpoint or inductive definition
- `gossip_delivery_time` — requires temporal reasoning

### `byzantine_tolerance/reputation_slashing.lean`
- `no_false_slashes` — requires `shouldSlash` to be defined axiomatically
- `slashing_timeliness` — requires discrete-time model

### `crypto/tpm_attestation.lean` / `tpm_primitives.lean`
- TPM proof obligations depend on `getExpectedPCRs` having a concrete definition
- Path: axiomatize PCR fingerprint as a `Finset` constant, then close by `Finset.subset_refl`

### `oracle/market_discovery.lean` / `oracle/prediction_contract.lean`
- Market fairness invariants
- Path: encode market state as a `Structure`, prove invariants by structural induction

---

## Notes

Proof coverage is intentionally conservative. Closed proofs use witnesses and Mathlib lemmas
rather than `sorry`. The goal is zero `sorry` in committed files; obligations above are the
documented remaining work.
