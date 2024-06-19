import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  ActiveBankInfo,
  ExtendedBankInfo,
  ExtendedBankMetadata,
  makeExtendedBankInfo,
  makeExtendedBankMetadata,
  fetchTokenAccounts,
  TokenAccountMap,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiClient, getConfig, BankMap, Bank, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import {
  Wallet,
  TokenMetadata,
  loadTokenMetadatas,
  loadBankMetadatas,
  getValueInsensitive,
} from "@mrgnlabs/mrgn-common";

type TradeGroupsCache = {
  [group: string]: [string, string];
};

type TradeStoreState = {
  initialized: boolean;

  groupsCache: TradeGroupsCache;

  // array of marginfi groups
  groups: PublicKey[];

  // array of extended bank objects (excluding USDC)
  banks: ExtendedBankInfo[];
  banksIncludingUSDC: ExtendedBankInfo[];
  collateralBanks: {
    [group: string]: ExtendedBankInfo;
  };

  // marginfi client, initialized when viewing an active group
  marginfiClient: MarginfiClient | null;

  // active group, currently being viewed / traded
  activeGroup: {
    token: ExtendedBankInfo;
    usdc: ExtendedBankInfo;
  } | null;

  nativeSolBalance: number;

  // fetch groups / banks
  fetchTradeState: ({ connection, wallet }: { connection: Connection; wallet: Wallet }) => void;

  // set active banks and initialize marginfi client
  setActiveBank: ({
    bankPk,
    connection,
    wallet,
  }: {
    bankPk: PublicKey;
    connection: Connection;
    wallet: Wallet;
  }) => void;

  resetActiveGroup: () => void;
};

const { programId } = getConfig();

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function createTradeStore() {
  return create<TradeStoreState>(stateCreator);
}

const stateCreator: StateCreator<TradeStoreState, [], []> = (set, get) => ({
  initialized: false,
  groupsCache: {},
  groups: [],
  banks: [],
  banksIncludingUSDC: [],
  collateralBanks: {},
  marginfiClient: null,
  activeGroup: null,
  nativeSolBalance: 0,

  fetchTradeState: async ({ connection, wallet }) => {
    try {
      // fetch groups

      const result = await fetchBanksAndTradeGroups(wallet, connection);

      if (!result) throw new Error("Error fetching banks & groups");

      set((state) => {
        return {
          ...state,
          initialized: true,
          groupsCache: result.tradeGroups,
          groups: result.groups,
          banks: result.tokenBanks,
          banksIncludingUSDC: result.allBanks,
          collateralBanks: result.collateralBanks,
          nativeSolBalance: result.nativeSolBalance,
        };
      });
    } catch (error) {
      console.error(error);
    }
  },

  setActiveBank: async ({ bankPk, wallet, connection }) => {
    try {
      const bpk = new PublicKey(bankPk);
      let bank = get().banksIncludingUSDC.find((bank) => new PublicKey(bank.address).equals(bpk));
      if (!bank) {
        console.log("iets working");
        const result = await fetchBanksAndTradeGroups(wallet, connection);

        if (!result) throw new Error("Error fetching banks & groups");

        set((state) => {
          return {
            ...state,
            initialized: true,
            groupsCache: result.tradeGroups,
            groups: result.groups,
            banks: result.tokenBanks,
            banksIncludingUSDC: result.allBanks,
            collateralBanks: result.collateralBanks,
            nativeSolBalance: result.nativeSolBalance,
          };
        });

        bank = result.allBanks.find((bank) => new PublicKey(bank.address).equals(bpk));

        if (!bank) return;
      }

      const group = new PublicKey(bank.info.rawBank.group);
      const bankKeys = get().groupsCache[group.toBase58()].map((bank) => new PublicKey(bank));
      const marginfiClient = await MarginfiClient.fetch(
        {
          environment: "production",
          cluster: "mainnet",
          programId,
          groupPk: group,
        },
        wallet,
        connection,
        {
          preloadedBankAddresses: bankKeys,
        }
      );
      const groupsBanksKeys = get().groupsCache[group.toBase58()];
      const groupsBanks = get().banksIncludingUSDC.filter((bank) =>
        groupsBanksKeys.includes(new PublicKey(bank.address).toBase58())
      );

      set((state) => {
        return {
          ...state,
          marginfiClient,
          activeGroup: {
            token: groupsBanks[1],
            usdc: groupsBanks[0],
          },
        };
      });
    } catch (error) {
      console.error(error);
    }
  },

  resetActiveGroup: () => {
    set((state) => {
      return {
        ...state,
        marginfiClient: null,
        activeGroup: null,
      };
    });
  },
});

export { createTradeStore };
export type { TradeStoreState };

const fetchBanksAndTradeGroups = async (wallet: Wallet, connection: Connection) => {
  const tradeGroups: TradeGroupsCache = await fetch(
    "https://storage.googleapis.com/mrgn-public/mfi-trade-groups.json"
  ).then((res) => res.json());

  if (!tradeGroups) {
    console.error("Failed to fetch trade groups");
    return;
  }

  const tokenMetadataMap = await loadTokenMetadatas(
    "https://storage.googleapis.com/mrgn-public/mfi-trade-metadata-cache.json"
  );

  const bankMetadataMap = await loadBankMetadatas(
    "https://storage.googleapis.com/mrgn-public/mfi-bank-metadata-cache.json"
  );

  const groups = Object.keys(tradeGroups).map((group) => new PublicKey(group));
  const allBanks: ExtendedBankInfo[] = [];
  const banksWithPriceAndToken: {
    bank: Bank;
    oraclePrice: OraclePrice;
    tokenMetadata: TokenMetadata;
  }[] = [];

  await Promise.all(
    groups.map(async (group) => {
      const bankKeys = tradeGroups[group.toBase58()].map((bank) => new PublicKey(bank));
      const marginfiClient = await MarginfiClient.fetch(
        {
          environment: "production",
          cluster: "mainnet",
          programId,
          groupPk: group,
        },
        wallet,
        connection,
        {
          preloadedBankAddresses: bankKeys,
        }
      );
      const banksIncludingUSDC = Array.from(marginfiClient.banks.values());

      banksIncludingUSDC.forEach((bank) => {
        const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
        if (!oraclePrice) {
          return;
        }

        const bankMetadata = bankMetadataMap[bank.address.toBase58()];
        if (bankMetadata === undefined) {
          return;
        }

        try {
          const tokenMetadata = getValueInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
          if (!tokenMetadata) {
            return;
          }

          banksWithPriceAndToken.push({ bank, oraclePrice, tokenMetadata });
        } catch (err) {
          console.error("error fetching token metadata: ", err);
        }
      });
    })
  );

  let nativeSolBalance = 0;
  let tokenAccountMap: TokenAccountMap | null = null;
  if (wallet?.publicKey) {
    const [tokenData] = await Promise.all([
      fetchTokenAccounts(
        connection,
        wallet.publicKey,
        banksWithPriceAndToken.map((bank) => ({ mint: bank.bank.mint, mintDecimals: bank.bank.mintDecimals }))
      ),
    ]);

    nativeSolBalance = tokenData.nativeSolBalance;
    tokenAccountMap = tokenData.tokenAccountMap;
  }

  const [extendedBankInfos, extendedBankMetadatas] = banksWithPriceAndToken.reduce(
    (acc, { bank, oraclePrice, tokenMetadata }) => {
      let userData;
      if (wallet?.publicKey) {
        const tokenAccount = tokenAccountMap!.get(bank.mint.toBase58());
        if (!tokenAccount) {
          return acc;
        }
        userData = {
          nativeSolBalance,
          tokenAccount,
          marginfiAccount: null,
        };
      }
      acc[0].push(makeExtendedBankInfo(tokenMetadata, bank, oraclePrice, undefined, userData));
      acc[1].push(makeExtendedBankMetadata(new PublicKey(bank.address), tokenMetadata));

      return acc;
    },
    [[], []] as [ExtendedBankInfo[], ExtendedBankMetadata[]]
  );

  allBanks.push(...extendedBankInfos);

  const collateralBanks: {
    [group: string]: ExtendedBankInfo;
  } = {};

  for (let i = 0; i < allBanks.length - 1; i++) {
    collateralBanks[allBanks[i + 1].info.rawBank.address.toBase58()] = allBanks[i];
  }

  const tokenBanks = allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT));

  return {
    allBanks,
    tokenBanks,
    collateralBanks,
    tradeGroups,
    groups,
    nativeSolBalance,
  };
};
