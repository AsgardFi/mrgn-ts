import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import {ActiveBankInfo} from "@mrgnlabs/marginfi-v2-ui-state";

// ================ development utils ================

export const FAUCET_PROGRAM_ID = new PublicKey("4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt");

export function makeAirdropCollateralIx(
  amount: number,
  mint: PublicKey,
  tokenAccount: PublicKey,
  faucet: PublicKey
): TransactionInstruction {
  const [faucetPda] = PublicKey.findProgramAddressSync([Buffer.from("faucet")], FAUCET_PROGRAM_ID);

  const keys = [
    { pubkey: faucetPda, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: faucet, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: FAUCET_PROGRAM_ID,
    data: Buffer.from([1, ...new BN(amount).toArray("le", 8)]),
    keys,
  });
}

export function isWholePosition(activeBankInfo: ActiveBankInfo, amount: number): boolean {
  const positionTokenAmount =
    Math.floor(activeBankInfo.position.amount * Math.pow(10, activeBankInfo.tokenMintDecimals)) /
    Math.pow(10, activeBankInfo.tokenMintDecimals);
  return amount >= positionTokenAmount;
}

export { OKXWalletAdapter } from "./OKXWalletAdapter";
