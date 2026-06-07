// SPDX-License-Identifier: Apache-2.0
use std::env;
use std::time::Instant;

use sapm_datapath::{benchmark, Datapath, DatapathConfig};

const BENCH_RING_MIN: usize = 1_048_576;
fn parse_iterations(args: &[String]) -> usize {
    let mut idx = 0usize;
    while idx < args.len() {
        let item = &args[idx];
        if item == "--iterations" || item == "-n" {
            if idx + 1 < args.len() {
                if let Ok(value) = args[idx + 1].parse::<usize>() {
                    return value;
                }
            }
            return 50_000;
        }
        if let Ok(value) = item.parse::<usize>() {
            return value;
        }
        idx += 1;
    }
    50_000
}
fn main() {
    let mut args = env::args().skip(1);
    match args.next().as_deref() {
        Some("bench") => {
            let rest = args.collect::<Vec<_>>();
            let iterations = parse_iterations(&rest);

            let mut config = DatapathConfig::from_env();
            if env::var("SAPM_RING_BUFFER_SIZE").is_err() {
                config.ring_buffer_size = config.ring_buffer_size.max(BENCH_RING_MIN);
            }

            let mut datapath = Datapath::new(config.clone());
            let started = Instant::now();
            let processed = benchmark(&mut datapath, iterations);
            let elapsed = started.elapsed();

            println!(
                "config mode={:?} interfaces={:?} ring_buffer_size={} packet_max_size={}",
                config.mode,
                config.interfaces,
                config.ring_buffer_size,
                config.packet_max_size
            );
            println!("processed={processed} iterations={iterations} elapsed_ms={}", elapsed.as_millis());
            println!(
                "stats enqueued={} processed={} dropped={}",
                datapath.stats().enqueued,
                datapath.stats().processed,
                datapath.stats().dropped,
            );
        }
        Some("validate") | None => {
            let config = DatapathConfig::from_env();
            println!(
                "mode={:?} interfaces={:?} ring_buffer_size={} packet_max_size={}",
                config.mode,
                config.interfaces,
                config.ring_buffer_size,
                config.packet_max_size
            );
        }
        Some(other) => {
            eprintln!("unknown command: {other}");
            eprintln!("usage: cargo run --manifest-path rust-datapath/Cargo.toml -- [validate|bench [--iterations N|N]]");
            std::process::exit(2);
        }
    }
}
