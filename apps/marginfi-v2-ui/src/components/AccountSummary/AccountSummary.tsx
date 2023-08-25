import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC } from "react";
import { UserStats } from "./UserStats";
import { useMrgnlendStore } from "~/store";
import dynamic from "next/dynamic";

const GlobalStats = dynamic(async () => (await import("./GlobalStats")).GlobalStats, { ssr: false });

const AccountSummary: FC = () => {
  const [isStoreInitialized, accountSummary, protocolStats, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.accountSummary,
    state.protocolStats,
    state.selectedAccount,
  ]);
  const wallet = useWallet();

  return (
    <div className="flex flex-col lg:flex-row w-full justify-between items-center">
      <div className="hidden lg:block w-full h-[118px]">
        <GlobalStats
          tvl={protocolStats.tvl}
          pointsTotal={protocolStats.pointsTotal}
          borrows={protocolStats.borrows}
          deposits={protocolStats.deposits}
        />
      </div>

      <div className="w-full">
        {wallet.connected && (
          <UserStats
            accountSummary={isStoreInitialized && selectedAccount ? accountSummary : null}
            healthFactor={accountSummary.healthFactor}
          />
        )}
      </div>
    </div>
  );
};

export { AccountSummary };
