import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { DEEPBOOK_PREDICT_PACKAGE_ID } from '@/lib/sui-config';

export type DeepBookStatus = {
  rpcReachable: boolean;
  packageConfigured: boolean;
  packageReachable: boolean;
  packageId: string;
  error?: string;
};

export class DeepBookService {
  private readonly client: SuiClient;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
  }

  async getStatus(): Promise<DeepBookStatus> {
    try {
      await this.client.getLatestSuiSystemState();
    } catch (error) {
      return {
        rpcReachable: false,
        packageConfigured: Boolean(DEEPBOOK_PREDICT_PACKAGE_ID),
        packageReachable: false,
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
        error: error instanceof Error ? error.message : 'Unable to reach Sui RPC',
      };
    }

    if (!DEEPBOOK_PREDICT_PACKAGE_ID) {
      return {
        rpcReachable: true,
        packageConfigured: false,
        packageReachable: false,
        packageId: '',
        error: 'Set NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID to enable DeepBook Predict package checks.',
      };
    }

    try {
      const pkg = await this.client.getObject({
        id: DEEPBOOK_PREDICT_PACKAGE_ID,
        options: { showType: true },
      });

      return {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: Boolean(pkg.data),
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
      };
    } catch (error) {
      return {
        rpcReachable: true,
        packageConfigured: true,
        packageReachable: false,
        packageId: DEEPBOOK_PREDICT_PACKAGE_ID,
        error: error instanceof Error ? error.message : 'Unable to load DeepBook package',
      };
    }
  }
}

export const deepbookService = new DeepBookService('testnet');
