'use client';

export default function Leaderboard() {
  const topTraders = [
    { rank: 1, address: '0x1234...5678', winRate: '78%', totalTrades: 245, roi: '+145%' },
    { rank: 2, address: '0x9abc...def0', winRate: '75%', totalTrades: 189, roi: '+132%' },
    { rank: 3, address: '0x5678...9abc', winRate: '72%', totalTrades: 156, roi: '+118%' },
    { rank: 4, address: '0xabcd...ef12', winRate: '68%', totalTrades: 203, roi: '+95%' },
    { rank: 5, address: '0xef12...3456', winRate: '65%', totalTrades: 167, roi: '+82%' },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#e2e8f0' }}>
        🏆 Leaderboard
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Top prediction market traders on SAPM.
      </p>

      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Rank</th>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Address</th>
              <th style={{ padding: '1rem', textAlign: 'center', color: '#e2e8f0', fontWeight: '600' }}>Win Rate</th>
              <th style={{ padding: '1rem', textAlign: 'center', color: '#e2e8f0', fontWeight: '600' }}>Trades</th>
              <th style={{ padding: '1rem', textAlign: 'right', color: '#e2e8f0', fontWeight: '600' }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {topTraders.map((trader, idx) => (
              <tr key={idx} style={{ borderBottom: idx < topTraders.length - 1 ? '1px solid #334155' : 'none' }}>
                <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                  {trader.rank === 1 ? '🥇' : trader.rank === 2 ? '🥈' : trader.rank === 3 ? '🥉' : '#'} {trader.rank}
                </td>
                <td style={{ padding: '1rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{trader.address}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#34d399' }}>{trader.winRate}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#cbd5e1' }}>{trader.totalTrades}</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#34d399', fontWeight: '600' }}>{trader.roi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
