export type ValidationErrorCode =
  | 'WALLET_DISCONNECTED'
  | 'ODDS_OUT_OF_RANGE'
  | 'MISSING_APPROVAL';

export type ValidationResult = {
  valid: boolean;
  code?: ValidationErrorCode;
  message?: string;
};

export type StakeValidationInput = {
  walletConnected: boolean;
  odds: number;
  minOdds: number;
  maxOdds: number;
  hasUserApproval: boolean;
  actionId: string;
};

export class StateValidatorService {
  isWalletConnected(connected: boolean): ValidationResult {
    if (connected) {
      return { valid: true };
    }

    return {
      valid: false,
      code: 'WALLET_DISCONNECTED',
      message: 'Agent Error: Staking failed because wallet connection was lost. Please reconnect.',
    };
  }

  areOddsWithinRange(odds: number, minOdds: number, maxOdds: number): ValidationResult {
    if (Number.isFinite(odds) && odds >= minOdds && odds <= maxOdds) {
      return { valid: true };
    }

    return {
      valid: false,
      code: 'ODDS_OUT_OF_RANGE',
      message: `Agent Error: Proposed odds ${odds.toFixed(2)} are outside allowed range ${minOdds.toFixed(2)}-${maxOdds.toFixed(2)}.`,
    };
  }

  hasUserApproval(hasApproval: boolean, actionId: string): ValidationResult {
    if (hasApproval) {
      return { valid: true };
    }

    return {
      valid: false,
      code: 'MISSING_APPROVAL',
      message: `Agent Action ${actionId} requires explicit user approval before execution.`,
    };
  }

  validateStake(input: StakeValidationInput): ValidationResult {
    const walletCheck = this.isWalletConnected(input.walletConnected);
    if (!walletCheck.valid) {
      return walletCheck;
    }

    const oddsCheck = this.areOddsWithinRange(input.odds, input.minOdds, input.maxOdds);
    if (!oddsCheck.valid) {
      return oddsCheck;
    }

    const approvalCheck = this.hasUserApproval(input.hasUserApproval, input.actionId);
    if (!approvalCheck.valid) {
      return approvalCheck;
    }

    return { valid: true };
  }
}

export const stateValidatorService = new StateValidatorService();