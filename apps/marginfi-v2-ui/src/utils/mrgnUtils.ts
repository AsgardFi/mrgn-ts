import { useEffect, useRef } from "react";
import numeral from "numeral";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import { TOKEN_PROGRAM_ID, aprToApy, ceil, floor, percentFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, Emissions, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ProcessTransactionError } from "@mrgnlabs/marginfi-client-v2";

import { LendingModes } from "~/types";

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

export function computeBankRateRaw(bank: ExtendedBankInfo, lendingMode: LendingModes) {
  const isInLendingMode = lendingMode === LendingModes.LEND;

  const interestRate = isInLendingMode ? bank.info.state.lendingRate : bank.info.state.borrowingRate;
  const emissionRate = isInLendingMode
    ? bank.info.state.emissions == Emissions.Lending
      ? bank.info.state.emissionsRate
      : 0
    : bank.info.state.emissions == Emissions.Borrowing
    ? bank.info.state.emissionsRate
    : 0;

  const aprRate = interestRate + emissionRate;
  const apyRate = aprToApy(aprRate);

  return apyRate;
}

export function computeBankRate(bank: ExtendedBankInfo, lendingMode: LendingModes) {
  const apyRate = computeBankRateRaw(bank, lendingMode);
  return percentFormatter.format(apyRate);
}

export function computeClosePositionTokenAmount(activeBankInfo: ActiveBankInfo): number {
  const closePositionTokenAmount = activeBankInfo.position.isLending
    ? floor(activeBankInfo.position.amount, activeBankInfo.info.state.mintDecimals)
    : ceil(activeBankInfo.position.amount, activeBankInfo.info.state.mintDecimals);
  return closePositionTokenAmount;
}

export function isWholePosition(activeBankInfo: ActiveBankInfo, amount: number): boolean {
  const closePositionTokenAmount = computeClosePositionTokenAmount(activeBankInfo);
  return amount >= closePositionTokenAmount;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function getInitHealthColor(health: number): string {
  if (health >= 0.5) {
    return "#75BA80"; // green color " : "#",
  } else if (health >= 0.25) {
    return "#b8b45f"; // yellow color
  } else {
    return "#CF6F6F"; // red color
  }
}

export function getMaintHealthColor(health: number): string {
  if (health >= 0.5) {
    return "#75BA80"; // green color " : "#",
  } else if (health >= 0.25) {
    return "#b8b45f"; // yellow color
  } else {
    return "#CF6F6F"; // red color
  }
}

export function getLiquidationPriceColor(currentPrice: number, liquidationPrice: number): string {
  const safety = liquidationPrice / currentPrice;
  let color: string;
  if (safety >= 0.5) {
    color = "#75BA80";
  } else if (safety >= 0.25) {
    color = "#B8B45F";
  } else {
    color = "#CF6F6F";
  }
  return color;
}

export const clampedNumeralFormatter = (value: number) => {
  if (value === 0) {
    return "0";
  } else if (value < 0.01) {
    return "< 0.01";
  } else {
    return numeral(value).format("0.00a");
  }
};

export function extractErrorString(error: any, fallback?: string): string {
  if (error instanceof ProcessTransactionError) {
    if (error.message === "Bank deposit capacity exceeded") return "We've reached maximum capacity for this asset";
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback ?? "Unrecognized error";
}

export function getTokenImageURL(tokenSymbol: string): string {
  return `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${tokenSymbol}.png`;
}

const oraclesWithMaxAgeOverMin = [
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    maxAge: 300,
  },
  {
    address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    maxAge: 120,
  },
  {
    address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    maxAge: 180,
  },
  {
    address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    maxAge: 180,
  },
  {
    address: "LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
    maxAge: 180,
  },
  {
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    maxAge: 600,
  },
];

export function isBankOracleStale(bank: ExtendedBankInfo) {
  const oracle = oraclesWithMaxAgeOverMin.find(
    (oracle) => oracle.address.toLowerCase() === bank.info.rawBank.mint.toBase58().toLowerCase()
  );
  const maxAge = oracle ? oracle.maxAge : 60;
  const currentTime = Math.round(Date.now() / 1000);
  const oracleTime = Math.round(
    bank.info.oraclePrice.timestamp ? bank.info.oraclePrice.timestamp.toNumber() : new Date().getTime()
  );
  const isStale = currentTime - oracleTime > maxAge;

  console.log(
    "bank oracle info: ",
    bank.meta.tokenSymbol,
    "oracle timestamp: ",
    oracleTime,
    "current time: ",
    currentTime,
    "diff: ",
    currentTime - oracleTime,
    "max age: ",
    maxAge
  );

  return isStale;
}
