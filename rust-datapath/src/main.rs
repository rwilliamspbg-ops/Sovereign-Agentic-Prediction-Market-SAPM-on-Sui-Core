use std::env;
use std::time::Instant;

use sapm_datapath::{benchmark, Datapath, DatapathConfig};

fn main() {
    let mut args = env::args().skip(1);
    match args.next().as_deref() {
        Some("bench") => {
            let iterations = args
                .next()
                .and_then(|value| value.parse::<usize>().ok())
                .unwrap_or(50_000);

            let mut datapath = Datapath::new(DatapathConfig::default());
            let started = Instant::now();
            let processed = benchmark(&mut datapath, iterations);
            let elapsed = started.elapsed();

            println!("processed={processed} iterations={iterations} elapsed_ms={}", elapsed.as_millis());
            println!(
                "stats enqueued={} processed={} dropped={}",
                datapath.stats().enqueued,
                datapath.stats().processed,
                datapath.stats().dropped,
            );
        }
        Some("validate") | None => {
            let config = DatapathConfig::default();
            println!("interfaces={:?} ring_buffer_size={} packet_max_size={}", config.interfaces, config.ring_buffer_size, config.packet_max_size);
        }
        Some(other) => {
            eprintln!("unknown command: {other}");
            eprintln!("usage: cargo run --manifest-path rust-datapath/Cargo.toml -- [validate|bench [iterations]]");
            std::process::exit(2);
        }
    }
}
