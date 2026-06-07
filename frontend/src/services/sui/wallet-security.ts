import type { Transaction } from '@mysten/sui/transactions';
import type { WalletExecutionContext } from '@/services/sui/wallet-standard';

export type AttestationData = {
  leafCertificateFingerprint: string;
  issuerFingerprint?: string;
  issuedAt: string;
  nonce: string;
  signature: string;
};

export class WalletSecurityService {
  private readonly maliciousAddressSet = new Set<string>();

  async verifyWalletAuthenticity(address: string): Promise<boolean> {
    await this.loadMaliciousAddresses();
    return !this.maliciousAddressSet.has(address.toLowerCase());
  }

  async signTransactionWithAttestation(
    tx: Transaction,
    context: WalletExecutionContext,
    attestation?: AttestationData,
  ): Promise<Transaction> {
    const walletIsTrusted = await this.verifyWalletAuthenticity(context.account.address);
    if (!walletIsTrusted) {
      throw new Error('Wallet blocked by local threat intel list');
    }

    if (attestation) {
      await this.verifyAttestationChain(attestation);
    }

    return tx;
  }

  private async verifyAttestationChain(attestation: AttestationData): Promise<void> {
    if (!attestation.leafCertificateFingerprint || !attestation.signature || !attestation.nonce) {
      throw new Error('Attestation payload is incomplete');
    }

    const issuedAt = Date.parse(attestation.issuedAt);
    if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 5 * 60_000) {
      throw new Error('Attestation is stale or invalid');
    }
  }

  private async loadMaliciousAddresses(): Promise<void> {
    if (this.maliciousAddressSet.size > 0) {
      return;
    }

    const configured = (process.env.NEXT_PUBLIC_BLOCKED_WALLET_ADDRESSES || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    configured.forEach((address) => this.maliciousAddressSet.add(address));
  }
}
