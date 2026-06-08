// SPDX-License-Identifier: Apache-2.0
use std::collections::VecDeque;
use std::env;

const DEFAULT_BENCH_FLUSH_INTERVAL: usize = 16_384;
const DEFAULT_BACKPRESSURE_HIGH_WATERMARK_PCT: u8 = 85;
const DEFAULT_BACKPRESSURE_LOW_WATERMARK_PCT: u8 = 60;
const DEFAULT_CIRCUIT_BREAKER_LATENCY_THRESHOLD_MS: u64 = 5;
const DEFAULT_CIRCUIT_BREAKER_WINDOW_SIZE: usize = 32;
const DEFAULT_CIRCUIT_BREAKER_COOLDOWN_TICKS: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatapathMode {
    Simulated,
    AfXdp,
}

impl DatapathMode {
    pub fn from_env() -> Self {
        match env::var("SAPM_DATAPATH_MODE") {
            Ok(value) if value.eq_ignore_ascii_case("af_xdp") => Self::AfXdp,
            _ => Self::Simulated,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatapathConfig {
    pub mode: DatapathMode,
    pub interfaces: Vec<String>,
    pub ring_buffer_size: usize,
    pub packet_max_size: usize,
    pub backpressure_high_watermark_pct: u8,
    pub backpressure_low_watermark_pct: u8,
    pub circuit_breaker_latency_threshold_ms: u64,
    pub circuit_breaker_window_size: usize,
    pub circuit_breaker_cooldown_ticks: usize,
}

impl Default for DatapathConfig {
    fn default() -> Self {
        Self {
            mode: DatapathMode::from_env(),
            interfaces: vec!["eth0".to_string(), "eth1".to_string(), "eth2".to_string()],
            ring_buffer_size: 262_144,
            packet_max_size: 9_516,
            backpressure_high_watermark_pct: DEFAULT_BACKPRESSURE_HIGH_WATERMARK_PCT,
            backpressure_low_watermark_pct: DEFAULT_BACKPRESSURE_LOW_WATERMARK_PCT,
            circuit_breaker_latency_threshold_ms: DEFAULT_CIRCUIT_BREAKER_LATENCY_THRESHOLD_MS,
            circuit_breaker_window_size: DEFAULT_CIRCUIT_BREAKER_WINDOW_SIZE,
            circuit_breaker_cooldown_ticks: DEFAULT_CIRCUIT_BREAKER_COOLDOWN_TICKS,
        }
    }
}

impl DatapathConfig {
    pub fn from_env() -> Self {
        let mut config = Self::default();

        if let Ok(list) = env::var("SAPM_AF_XDP_IFACES") {
            let ifaces = list
                .split(',')
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>();
            if !ifaces.is_empty() {
                config.interfaces = ifaces;
            }
        }

        if let Ok(size) = env::var("SAPM_RING_BUFFER_SIZE") {
            if let Ok(value) = size.parse::<usize>() {
                config.ring_buffer_size = value;
            }
        }

        if let Ok(size) = env::var("SAPM_PACKET_MAX_SIZE") {
            if let Ok(value) = size.parse::<usize>() {
                config.packet_max_size = value;
            }
        }

        if let Ok(value) = env::var("SAPM_BACKPRESSURE_HIGH_WATERMARK_PCT") {
            if let Ok(parsed) = value.parse::<u8>() {
                config.backpressure_high_watermark_pct = parsed.min(100);
            }
        }

        if let Ok(value) = env::var("SAPM_BACKPRESSURE_LOW_WATERMARK_PCT") {
            if let Ok(parsed) = value.parse::<u8>() {
                config.backpressure_low_watermark_pct = parsed.min(100);
            }
        }

        if config.backpressure_low_watermark_pct > config.backpressure_high_watermark_pct {
            config.backpressure_low_watermark_pct = config.backpressure_high_watermark_pct;
        }

        if let Ok(value) = env::var("SAPM_CIRCUIT_BREAKER_LATENCY_THRESHOLD_MS") {
            if let Ok(parsed) = value.parse::<u64>() {
                config.circuit_breaker_latency_threshold_ms = parsed.max(1);
            }
        }

        if let Ok(value) = env::var("SAPM_CIRCUIT_BREAKER_WINDOW_SIZE") {
            if let Ok(parsed) = value.parse::<usize>() {
                config.circuit_breaker_window_size = parsed.max(1);
            }
        }

        if let Ok(value) = env::var("SAPM_CIRCUIT_BREAKER_COOLDOWN_TICKS") {
            if let Ok(parsed) = value.parse::<usize>() {
                config.circuit_breaker_cooldown_ticks = parsed.max(1);
            }
        }

        config
    }

    pub fn from_interface_list(value: &str) -> Self {
        let interfaces = value
            .split(',')
            .map(str::trim)
            .filter(|item| !item.is_empty())
            .map(ToOwned::to_owned)
            .collect();

        Self {
            mode: DatapathMode::from_env(),
            interfaces,
            ..Self::default()
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PacketSlot {
    interface_index: usize,
    payload_len: usize,
}

#[derive(Debug, Default)]
pub struct DatapathStats {
    pub enqueued: usize,
    pub processed: usize,
    pub dropped: usize,
    pub throttled: usize,
    pub backpressure_drops: usize,
    pub circuit_open_drops: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatapathSignal {
    Healthy,
    Throttle,
    Fallback,
}

#[derive(Debug)]
pub struct PacketRing {
    capacity: usize,
    queue: VecDeque<PacketSlot>,
}

impl PacketRing {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            queue: VecDeque::with_capacity(capacity),
        }
    }

    fn push(&mut self, slot: PacketSlot) -> Result<(), PacketSlot> {
        if self.queue.len() >= self.capacity {
            return Err(slot);
        }

        self.queue.push_back(slot);
        Ok(())
    }

    fn pop(&mut self) -> Option<PacketSlot> {
        self.queue.pop_front()
    }

    pub fn len(&self) -> usize {
        self.queue.len()
    }
}

#[derive(Debug)]
pub enum DatapathError {
    UnknownInterface(String),
    OversizedPacket { size: usize, max: usize },
    RingFull,
    BackpressureActive,
    CircuitOpen,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ForwardingDecision {
    Enqueued,
    Dropped,
}

#[derive(Debug)]
pub struct Datapath {
    config: DatapathConfig,
    ring: PacketRing,
    stats: DatapathStats,
    circuit_state: CircuitState,
    cooldown_ticks_remaining: usize,
    backpressure_active: bool,
    latency_samples_ms: VecDeque<u64>,
}

impl Datapath {
    pub fn new(config: DatapathConfig) -> Self {
        let ring = PacketRing::new(config.ring_buffer_size);
        Self {
            config,
            ring,
            stats: DatapathStats::default(),
            circuit_state: CircuitState::Closed,
            cooldown_ticks_remaining: 0,
            backpressure_active: false,
            latency_samples_ms: VecDeque::new(),
        }
    }

    fn ring_usage_pct(&self) -> u8 {
        if self.config.ring_buffer_size == 0 {
            return 100;
        }

        let pct = (self.ring.len() * 100) / self.config.ring_buffer_size;
        pct.min(100) as u8
    }

    fn update_backpressure(&mut self) {
        let usage = self.ring_usage_pct();

        if usage >= self.config.backpressure_high_watermark_pct {
            self.backpressure_active = true;
        }

        if self.backpressure_active && usage <= self.config.backpressure_low_watermark_pct {
            self.backpressure_active = false;
        }
    }

    fn tick_circuit(&mut self) {
        if self.circuit_state == CircuitState::Open {
            if self.cooldown_ticks_remaining > 0 {
                self.cooldown_ticks_remaining -= 1;
            }

            if self.cooldown_ticks_remaining == 0 {
                self.circuit_state = CircuitState::HalfOpen;
            }
        }
    }

    fn average_latency_ms(&self) -> u64 {
        if self.latency_samples_ms.is_empty() {
            return 0;
        }

        let total = self.latency_samples_ms.iter().copied().sum::<u64>();
        total / self.latency_samples_ms.len() as u64
    }

    pub fn record_latency_sample(&mut self, latency_ms: u64) {
        self.latency_samples_ms.push_back(latency_ms);
        while self.latency_samples_ms.len() > self.config.circuit_breaker_window_size {
            self.latency_samples_ms.pop_front();
        }

        let avg = self.average_latency_ms();
        if avg > self.config.circuit_breaker_latency_threshold_ms {
            self.circuit_state = CircuitState::Open;
            self.cooldown_ticks_remaining = self.config.circuit_breaker_cooldown_ticks;
        } else if self.circuit_state == CircuitState::HalfOpen {
            self.circuit_state = CircuitState::Closed;
        }
    }

    pub fn circuit_state(&self) -> CircuitState {
        self.circuit_state
    }

    pub fn is_backpressure_active(&self) -> bool {
        self.backpressure_active
    }

    pub fn operational_signal(&self) -> DatapathSignal {
        match self.circuit_state {
            CircuitState::Open => DatapathSignal::Fallback,
            _ if self.backpressure_active => DatapathSignal::Throttle,
            _ => DatapathSignal::Healthy,
        }
    }

    pub fn process_packet(
        &mut self,
        interface: &str,
        packet: &[u8],
    ) -> Result<ForwardingDecision, DatapathError> {
        self.tick_circuit();
        self.update_backpressure();

        if self.circuit_state == CircuitState::Open {
            self.stats.dropped += 1;
            self.stats.circuit_open_drops += 1;
            return Err(DatapathError::CircuitOpen);
        }

        if self.backpressure_active {
            self.stats.dropped += 1;
            self.stats.throttled += 1;
            self.stats.backpressure_drops += 1;
            return Err(DatapathError::BackpressureActive);
        }

        let interface_index = if let Some(index) = self
            .config
            .interfaces
            .iter()
            .position(|item| item == interface)
        {
            index
        } else {
            self.stats.dropped += 1;
            return Err(DatapathError::UnknownInterface(interface.to_string()));
        };

        if packet.len() > self.config.packet_max_size {
            self.stats.dropped += 1;
            return Err(DatapathError::OversizedPacket {
                size: packet.len(),
                max: self.config.packet_max_size,
            });
        }

        let slot = PacketSlot {
            interface_index,
            payload_len: packet.len(),
        };

        self.ring
            .push(slot)
            .map_err(|_| {
                self.stats.dropped += 1;
                DatapathError::RingFull
            })?;

        self.stats.enqueued += 1;
        if self.circuit_state == CircuitState::HalfOpen {
            self.circuit_state = CircuitState::Closed;
        }
        self.update_backpressure();
        Ok(ForwardingDecision::Enqueued)
    }

    pub fn flush(&mut self) -> usize {
        let mut drained = 0usize;

        while let Some(slot) = self.ring.pop() {
            let _ = slot.interface_index;
            let _ = slot.payload_len;
            drained += 1;
            self.stats.processed += 1;
        }

        self.update_backpressure();

        drained
    }

    pub fn stats(&self) -> &DatapathStats {
        &self.stats
    }

    pub fn ring_len(&self) -> usize {
        self.ring.len()
    }
}

pub fn benchmark(datapath: &mut Datapath, iterations: usize) -> usize {
    let mut accepted = 0usize;
    let flush_interval = env::var("SAPM_BENCH_FLUSH_INTERVAL")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_BENCH_FLUSH_INTERVAL);

    for index in 0..iterations {
        let interface = match index % 3 {
            0 => "eth0",
            1 => "eth1",
            _ => "eth2",
        };
        let packet = vec![(index % 251) as u8; 64 + (index % 256)];
        if datapath.process_packet(interface, &packet).is_ok() {
            accepted += 1;
        }
        if (index + 1) % flush_interval == 0 {
            datapath.flush();
        }
    }

    datapath.flush();
    accepted
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn process_packet_accepts_known_interfaces() {
        let mut datapath = Datapath::new(DatapathConfig::default());
        assert_eq!(
            datapath.process_packet("eth0", &[1, 2, 3]).unwrap(),
            ForwardingDecision::Enqueued
        );
        assert_eq!(datapath.ring_len(), 1);
    }

    #[test]
    fn rejects_unknown_interface() {
        let mut datapath = Datapath::new(DatapathConfig::default());
        let err = datapath.process_packet("lo", &[1, 2, 3]).unwrap_err();
        assert!(matches!(err, DatapathError::UnknownInterface(_)));
    }

    #[test]
    fn rejects_oversized_packet() {
        let mut datapath = Datapath::new(DatapathConfig {
            packet_max_size: 4,
            ..DatapathConfig::default()
        });
        let err = datapath.process_packet("eth0", &[1, 2, 3, 4, 5]).unwrap_err();
        assert!(matches!(err, DatapathError::OversizedPacket { .. }));
    }

    #[test]
    fn benchmark_runs() {
        let mut datapath = Datapath::new(DatapathConfig::default());
        let processed = benchmark(&mut datapath, 1_000);
        assert_eq!(processed, 1_000);
    }

    #[test]
    fn circuit_breaker_opens_on_latency_spike() {
        let mut datapath = Datapath::new(DatapathConfig {
            circuit_breaker_latency_threshold_ms: 2,
            circuit_breaker_window_size: 2,
            circuit_breaker_cooldown_ticks: 2,
            ..DatapathConfig::default()
        });

        datapath.record_latency_sample(1);
        datapath.record_latency_sample(10);
        assert_eq!(datapath.circuit_state(), CircuitState::Open);

        let err = datapath.process_packet("eth0", &[1, 2, 3]).unwrap_err();
        assert!(matches!(err, DatapathError::CircuitOpen));
        assert_eq!(datapath.operational_signal(), DatapathSignal::Fallback);
    }

    #[test]
    fn backpressure_throttles_until_usage_drops() {
        let mut datapath = Datapath::new(DatapathConfig {
            ring_buffer_size: 4,
            backpressure_high_watermark_pct: 50,
            backpressure_low_watermark_pct: 25,
            ..DatapathConfig::default()
        });

        assert!(datapath.process_packet("eth0", &[1]).is_ok());
        assert!(datapath.process_packet("eth0", &[1]).is_ok());

        let err = datapath.process_packet("eth0", &[1]).unwrap_err();
        assert!(matches!(err, DatapathError::BackpressureActive));
        assert!(datapath.is_backpressure_active());
        assert_eq!(datapath.operational_signal(), DatapathSignal::Throttle);

        datapath.flush();
        assert!(!datapath.is_backpressure_active());
    }
}
