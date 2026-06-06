// SPDX-License-Identifier: Apache-2.0
use std::collections::VecDeque;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatapathConfig {
    pub interfaces: Vec<String>,
    pub ring_buffer_size: usize,
    pub packet_max_size: usize,
}

impl Default for DatapathConfig {
    fn default() -> Self {
        Self {
            interfaces: vec!["eth0".to_string(), "eth1".to_string(), "eth2".to_string()],
            ring_buffer_size: 262_144,
            packet_max_size: 9_516,
        }
    }
}

impl DatapathConfig {
    pub fn from_interface_list(value: &str) -> Self {
        let interfaces = value
            .split(',')
            .map(str::trim)
            .filter(|item| !item.is_empty())
            .map(ToOwned::to_owned)
            .collect();

        Self {
            interfaces,
            ..Self::default()
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PacketRecord {
    pub interface: String,
    pub payload: Vec<u8>,
}

#[derive(Debug, Default)]
pub struct DatapathStats {
    pub enqueued: usize,
    pub processed: usize,
    pub dropped: usize,
}

#[derive(Debug)]
pub struct PacketRing {
    capacity: usize,
    queue: VecDeque<PacketRecord>,
}

impl PacketRing {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            queue: VecDeque::with_capacity(capacity),
        }
    }

    pub fn push(&mut self, record: PacketRecord) -> Result<(), PacketRecord> {
        if self.queue.len() >= self.capacity {
            return Err(record);
        }

        self.queue.push_back(record);
        Ok(())
    }

    pub fn pop(&mut self) -> Option<PacketRecord> {
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
}

impl Datapath {
    pub fn new(config: DatapathConfig) -> Self {
        let ring = PacketRing::new(config.ring_buffer_size);
        Self {
            config,
            ring,
            stats: DatapathStats::default(),
        }
    }

    pub fn process_packet(
        &mut self,
        interface: &str,
        packet: &[u8],
    ) -> Result<ForwardingDecision, DatapathError> {
        if !self.config.interfaces.iter().any(|item| item == interface) {
            self.stats.dropped += 1;
            return Err(DatapathError::UnknownInterface(interface.to_string()));
        }

        if packet.len() > self.config.packet_max_size {
            self.stats.dropped += 1;
            return Err(DatapathError::OversizedPacket {
                size: packet.len(),
                max: self.config.packet_max_size,
            });
        }

        let record = PacketRecord {
            interface: interface.to_string(),
            payload: packet.to_vec(),
        };

        self.ring
            .push(record)
            .map_err(|_| {
                self.stats.dropped += 1;
                DatapathError::RingFull
            })?;

        self.stats.enqueued += 1;
        Ok(ForwardingDecision::Enqueued)
    }

    pub fn flush(&mut self) -> usize {
        let mut drained = 0usize;

        while self.ring.pop().is_some() {
            drained += 1;
            self.stats.processed += 1;
        }

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
}
