# SAPM Rust Datapath

This crate provides a small, runnable datapath scaffold for the AF_XDP workstream.

## Commands

```bash
cargo test --manifest-path rust-datapath/Cargo.toml
cargo run --manifest-path rust-datapath/Cargo.toml -- validate
cargo run --manifest-path rust-datapath/Cargo.toml -- bench --iterations 50000
```

## AF_XDP Runtime Flags

```bash
export SAPM_DATAPATH_MODE=af_xdp
export SAPM_AF_XDP_IFACES=eth0,eth1,eth2
export SAPM_RING_BUFFER_SIZE=262144
export SAPM_PACKET_MAX_SIZE=9516
cargo run --manifest-path rust-datapath/Cargo.toml -- validate
```

## Benchmark Tuning

The benchmark command applies a bench-safe ring buffer minimum when
`SAPM_RING_BUFFER_SIZE` is unset. You can override settings explicitly:

```bash
export SAPM_RING_BUFFER_SIZE=1048576
export SAPM_BENCH_FLUSH_INTERVAL=16384
cargo run --manifest-path rust-datapath/Cargo.toml -- bench --iterations 1000000
```
