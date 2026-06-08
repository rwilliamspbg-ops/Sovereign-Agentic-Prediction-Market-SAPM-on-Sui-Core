# Testnet Execution Record - 2026-06-08

This record captures the full real testnet execution performed for SAPM on 2026-06-08, including publish, shared object initialization, and a live state-changing call.

## Summary

- Network: testnet
- Wallet address used: 0x37c30ef353cac79873290e6fabb5ff2851eeaeb8d804ae7768d7a3516dd6eaf4
- Outcome: successful on-chain publish and successful live mutation of shared registry state.

## Transaction Results

- Faucet transfer digest:
  - 6UiX2pc2kRPAY7e3nJ7o4wjK2QZJaQaAsJtEExgNuyfD
- Published package digest:
  - EqyVmTFegJVTSkLmf2v2VMC8o1cz17dKSGtQKjTuBwak
- New package ID:
  - 0xee0b87415139cc95ec2b9c684f0abb0b6befeb21a02a7ca246c16dd8e25b8188
- init_registry tx digest (shared object created):
  - AsXALc619zQEBmTc9sf9d1LbQnhDqEYozimnP6D1AwxL
- Shared registry object ID:
  - 0x505c72a3abd9a42d6641593a502fbc4c90dd81b3899b94a37392b96d2f1c6bee
- add_key tx digest (real state mutation):
  - CKyf9c453r5t6asfGaabbgNCpCgUktW7rEgrNZjtzCwy

## Post-Mutation Verification

- Registry object type matched expected package type:
  - 0xee0b87415139cc95ec2b9c684f0abb0b6befeb21a02a7ca246c16dd8e25b8188::registry::PubkeyRegistry
- Registry pubkeys contained the expected value from add_key:
  - AQIDBA== (bytes [1,2,3,4])

## Explorer Links

- Package publish tx:
  - https://suiexplorer.com/txblock/EqyVmTFegJVTSkLmf2v2VMC8o1cz17dKSGtQKjTuBwak?network=testnet
- Package object:
  - https://suiexplorer.com/object/0xee0b87415139cc95ec2b9c684f0abb0b6befeb21a02a7ca246c16dd8e25b8188?network=testnet
- Init tx:
  - https://suiexplorer.com/txblock/AsXALc619zQEBmTc9sf9d1LbQnhDqEYozimnP6D1AwxL?network=testnet
- Shared registry object:
  - https://suiexplorer.com/object/0x505c72a3abd9a42d6641593a502fbc4c90dd81b3899b94a37392b96d2f1c6bee?network=testnet
- Add-key tx:
  - https://suiexplorer.com/txblock/CKyf9c453r5t6asfGaabbgNCpCgUktW7rEgrNZjtzCwy?network=testnet

## Frontend Runtime Configuration

Use the following values in frontend environment configuration:

- NEXT_PUBLIC_SUI_PACKAGE_ID=0xee0b87415139cc95ec2b9c684f0abb0b6befeb21a02a7ca246c16dd8e25b8188
- NEXT_PUBLIC_SUI_MARKET_OBJECT_IDS=0x505c72a3abd9a42d6641593a502fbc4c90dd81b3899b94a37392b96d2f1c6bee
- NEXT_PUBLIC_SUI_NETWORK=testnet

## Validation Notes

- Targeted frontend test run passed after final test stabilization:
  - 7 test suites passed
  - 99 tests passed
