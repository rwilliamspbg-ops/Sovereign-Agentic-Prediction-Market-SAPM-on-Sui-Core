// SAPM deployed Move package (Registry + incentives + prediction_market)
export const SUI_PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID ||
  '0x746797ce439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8';
export const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet';

export const SUISCAN_PACKAGE_URL = `https://suiscan.xyz/${SUI_NETWORK}/object/${SUI_PACKAGE_ID}`;
export const SUISCAN_TX_URL = (digest: string) =>
  `https://suiscan.xyz/${SUI_NETWORK}/tx/${digest}`;

// ─── DeepBook Predict (testnet, predict-testnet-4-16 branch) ─────────────────
// Source: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
export const DEEPBOOK_PREDICT_PACKAGE_ID =
  process.env.NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID ||
  '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
export const DEEPBOOK_PREDICT_REGISTRY =
  '0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64';
export const DEEPBOOK_PREDICT_OBJECT_ID =
  '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';
export const DEEPBOOK_PREDICT_SERVER = 'https://predict-server.testnet.mystenlabs.com';
export const DEEPBOOK_PREDICT_DUSDC_TYPE =
  '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC';
export const DEEPBOOK_SANDBOX_URL = 'https://github.com/MystenLabs/deepbook-sandbox';

// ─── Walrus (testnet) ─────────────────────────────────────────────────────────
export const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space';
export const WALRUS_PUBLISHER_URL = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space';

export type ResourceCategory = {
  title: string;
  description: string;
  links: Array<{ label: string; url: string }>;
};

export const SUI_RESOURCE_HUB: ResourceCategory[] = [
  {
    title: 'Getting Started',
    description: 'Core docs, SDKs, and ecosystem tooling for Sui builders.',
    links: [
      { label: 'Founder Starter Pack', url: 'https://www.sui.io/founder-starter-pack' },
      { label: 'Sui Docs', url: 'https://docs.sui.io/' },
      { label: 'Mysten TypeScript SDK', url: 'https://sdk.mystenlabs.com/sui' },
      { label: 'Awesome Sui', url: 'https://github.com/sui-foundation/awesome-sui' },
      { label: 'Sui Move Bootcamp', url: 'https://github.com/MystenLabs/sui-move-bootcamp' },
      { label: 'Sui Pilot', url: 'https://github.com/contract-hero/sui-pilot' },
      { label: 'OpenZeppelin Move Libraries', url: 'https://app.notion.com/OpenZeppelin-s-audited-Move-Libraries-and-Tools-36d6d9dcb4e980539272ded72c2856f6?pvs=21' },
    ],
  },
  {
    title: 'Walrus',
    description: 'Storage, sites, privacy, memory tooling, and community support.',
    links: [
      { label: 'Walrus Docs', url: 'https://docs.wal.app/' },
      { label: 'Walrus Getting Started', url: 'https://docs.wal.app/docs/getting-started' },
      { label: 'Walrus Client CLI', url: 'https://docs.wal.app/docs/walrus-client' },
      { label: 'Walrus HTTP API', url: 'https://docs.wal.app/docs/http-api/storing-blobs' },
      { label: 'Walrus TypeScript SDK', url: 'https://sdk.mystenlabs.com/walrus' },
      { label: 'Public Aggregators and Publishers', url: 'https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers' },
      { label: 'Walrus Sites Docs', url: 'https://docs.wal.app/docs/sites' },
      { label: 'Install Site Builder CLI', url: 'https://docs.wal.app/docs/sites/getting-started/installing-the-site-builder' },
      { label: 'Publish a Site', url: 'https://docs.wal.app/docs/sites/getting-started/publishing-your-first-site' },
      { label: 'MemWal Docs', url: 'https://docs.memwal.ai/' },
      { label: 'MemWal Playground', url: 'https://docs.memwal.ai/' },
      { label: 'MemWal GitHub', url: 'https://github.com/MystenLabs/MemWal' },
      { label: 'MemWal Workshop', url: 'https://youtu.be/GncjVUEJw9Y?si=tzWeNi_3gAIkVT6f' },
      { label: 'MemWal Walkthrough', url: 'https://app.notion.com/3666d9dcb4e9801dadb0e67ad368235e?pvs=21' },
      { label: 'Seal Docs', url: 'https://seal-docs.wal.app/' },
      { label: 'Sui Stack Messaging', url: 'https://github.com/MystenLabs/sui-stack-messaging' },
      { label: 'Walrus Telegram Group', url: 'https://go.sui.io/ofw-walrus-tg' },
      { label: 'Walrus Developers Discord', url: 'https://discord.com/invite/walrusprotocol' },
    ],
  },
  {
    title: 'DeepBook',
    description: 'Predict and on-chain market infra primitives for Sui finance apps.',
    links: [
      { label: 'DeepBook Predict (Testnet)', url: 'https://github.com/MystenLabs/deepbookv3/tree/predict-testnet-4-16/packages/predict' },
      { label: 'DeepBook Sandbox', url: 'https://github.com/MystenLabs/deepbook-sandbox' },
      { label: 'DeepBook v3 Docs', url: 'https://docs.sui.io/onchain-finance/deepbookv3/deepbook' },
      { label: 'DeepBook Margin Docs', url: 'https://docs.sui.io/onchain-finance/deepbook-margin' },
      { label: 'DeepBook Telegram Group', url: 'https://go.sui.io/ofw-deepbook-tg' },
    ],
  },
];
