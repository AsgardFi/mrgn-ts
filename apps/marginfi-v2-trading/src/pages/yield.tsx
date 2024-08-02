import React from "react";

import Link from "next/link";
import Image from "next/image";

import Fuse from "fuse.js";
import { IconSortDescending, IconArrowRight, IconSearch } from "@tabler/icons-react";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeading } from "~/components/common/PageHeading";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Loader } from "~/components/ui/loader";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

type Pool = {
  bank: ExtendedBankInfo;
  collateralBank: ExtendedBankInfo;
  totalDeposits: number;
  searchTerms: {
    bank: {
      symbol: string;
      name: string;
      mintAddress: string;
    };
    collateralBank: {
      symbol: string;
      name: string;
      mintAddress: string;
    };
  };
};

enum SortOptions {
  TotalDeposits = "totalDeposits",
  LendingRate = "lendingRate",
  BorrowingRate = "borrowingRate",
  Supplied = "supplied",
}

const sortOptions = [
  {
    label: "Total Deposits",
    value: "totalDeposits",
  },
  {
    label: "Lending APY",
    value: "lendingRate",
  },
  {
    label: "Borrowing APY",
    value: "borrowingRate",
  },
  {
    label: "Supplied",
    value: "supplied",
  },
];

let fuse: Fuse<Pool> | null = null;

export default function PortfolioPage() {
  const [initialized, banks, allBanks, collateralBanks, resetActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.banksIncludingUSDC,
    state.collateralBanks,
    state.resetActiveGroup,
  ]);
  const isMobile = useIsMobile();
  const { connected } = useWalletContext();
  const [sort, setSort] = React.useState<SortOptions>(SortOptions.TotalDeposits);
  const [search, setSearch] = React.useState("");

  const sortPools = React.useCallback(
    (pools: Pool[]) => {
      const sortedPools = pools.sort((a, b) => {
        switch (sort) {
          case SortOptions.TotalDeposits:
            return b.totalDeposits - a.totalDeposits;
          case SortOptions.LendingRate:
            return b.bank.info.state.lendingRate - a.bank.info.state.lendingRate;
          case SortOptions.BorrowingRate:
            return b.bank.info.state.borrowingRate - a.bank.info.state.borrowingRate;
          case SortOptions.Supplied:
            return (
              ((b.bank.isActive && b.bank.position?.amount) || 0) - ((a.bank.isActive && a.bank.position?.amount) || 0)
            );
          default:
            return 0;
        }
      });

      if (!search) return sortedPools;

      const filteredBanks = fuse?.search(search).map((result) => result.item);
      return filteredBanks || sortedPools;
    },
    [sort, search]
  );

  const pools: Pool[] = React.useMemo(() => {
    const sortedPools = sortPools(
      banks.map((bank) => {
        const collateralBank = collateralBanks[bank.address.toBase58()];
        const bankDepositsUsd = bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber();
        const collateralBankDepositsUsd =
          collateralBank.info.state.totalDeposits * collateralBank.info.oraclePrice.priceRealtime.price.toNumber();
        const totalDeposits = bankDepositsUsd + collateralBankDepositsUsd;
        return {
          bank,
          collateralBank,
          totalDeposits,
          searchTerms: {
            bank: {
              symbol: bank.meta.tokenSymbol,
              name: bank.meta.tokenName,
              mintAddress: bank.info.rawBank.mint.toBase58(),
            },
            collateralBank: {
              symbol: collateralBank.meta.tokenSymbol,
              name: collateralBank.meta.tokenName,
              mintAddress: collateralBank.info.rawBank.mint.toBase58(),
            },
          },
        };
      })
    );

    fuse = new Fuse(sortedPools, {
      includeScore: true,
      threshold: 0.2,
      keys: [
        {
          name: "searchTerms.bank.symbol",
          weight: 0.7,
        },
        {
          name: "searchTerms.collateralBank.symbol",
          weight: 0.7,
        },
        {
          name: "searchTerms.bank.name",
          weight: 0.3,
        },
        {
          name: "searchTerms.collateralBank.name",
          weight: 0.3,
        },
        {
          name: "searchTerms.bank.mintAddress",
          weight: 0.1,
        },
        {
          name: "searchTerms.collateralBank.mintAddress",
          weight: 0.1,
        },
      ],
    });
    return sortedPools;
  }, [banks, collateralBanks, sortPools]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading yield farming..." className="mt-8" />}
        {initialized && (
          <>
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading heading="Yield farming" body={<p>Supply liquidity and earn yield.</p>} links={[]} />
            </div>

            <div className="flex justify-center items-center w-full max-w-4xl mx-auto mb-16 mt-8">
              <div className="w-full relative">
                <Input
                  placeholder={isMobile ? "Search tokens..." : "Search tokens by name, symbol, or mint address..."}
                  className="pl-10 py-2.5 text-lg rounded-full h-auto bg-transparent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <IconSearch
                  size={18}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </div>

            <div className="w-full hidden lg:block">
              <div
                className={cn(
                  "text-sm grid xl:text-base gap-4 text-muted-foreground mb-8",
                  connected ? "grid-cols-7" : "grid-cols-6"
                )}
              >
                <div className="pl-4">Pool</div>
                <div className="pl-3 text-foreground flex items-center gap-1">
                  <IconSortDescending size={20} /> Total Deposits
                </div>
                <div className="text-right xl:text-left">Lending Rate (APY)</div>
                <div className="text-right xl:text-left">Borrow Rate (APY)</div>
                <div className="text-center">Created by</div>
                {connected && <div>Supplied</div>}
                <div />
              </div>
              <div>
                {pools.map(({ bank, collateralBank }) => {
                  return (
                    <div className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4">
                      <Link
                        href={`/trade/${bank.address.toBase58()}`}
                        className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center -space-x-2.5">
                          <Image
                            src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
                            alt={collateralBank.meta.tokenSymbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <Image
                            src={getTokenImageURL(bank.info.state.mint.toBase58())}
                            alt={bank.meta.tokenSymbol}
                            width={24}
                            height={24}
                            className="rounded-full bg-background"
                          />
                        </div>
                        <span>
                          {bank.meta.tokenSymbol}/{collateralBank.meta.tokenSymbol}
                        </span>
                        <div className="flex items-center gap-1 text-mrgn-green">
                          <span>Trade</span>
                          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                      <div
                        className={cn(
                          "grid gap-4 pt-2 pb-4 border-b items-center",
                          connected ? "grid-cols-7" : "grid-cols-6"
                        )}
                        key={bank.address.toBase58()}
                      >
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(bank.info.state.mint.toBase58())}
                            alt={bank.meta.tokenSymbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          {bank.meta.tokenSymbol}
                        </div>
                        <div className="flex flex-col xl:gap-2 xl:flex-row xl:items-baseline">
                          <span className="text-xl">{numeralFormatter(bank.info.state.totalDeposits)}</span>
                          <span className="text-sm text-muted-foreground">
                            {usdFormatter.format(
                              bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                            )}
                          </span>
                        </div>

                        <div className="text-mrgn-success text-right w-32">
                          {percentFormatter.format(aprToApy(bank.info.state.lendingRate))}
                        </div>
                        <div className="text-mrgn-warning text-right w-32">
                          {percentFormatter.format(aprToApy(bank.info.state.borrowingRate))}
                        </div>
                        <div className="flex justify-center">
                          <Link href="https://x.com/marginfi" target="_blank">
                            <Image
                              src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
                              width={20}
                              height={20}
                              alt="marginfi"
                              className="rounded-full"
                            />
                          </Link>
                        </div>
                        {connected && (
                          <div className="pl-2 text-lg flex flex-col xl:gap-1 xl:flex-row xl:items-baseline">
                            {bank.isActive && bank.position.isLending && (
                              <>
                                {numeralFormatter(bank.position.amount)}
                                <span className="text-muted-foreground text-sm">{bank.meta.tokenSymbol}</span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          {bank.isActive && bank.position.isLending && (
                            <ActionBoxDialog requestedBank={bank} requestedAction={ActionType.Withdraw}>
                              <Button className="bg-background border text-foreground hover:bg-accent">Withdraw</Button>
                            </ActionBoxDialog>
                          )}
                          <ActionBoxDialog requestedBank={bank} requestedAction={ActionType.Deposit}>
                            <Button className="bg-background border text-foreground hover:bg-accent">Supply</Button>
                          </ActionBoxDialog>
                        </div>
                      </div>
                      <div
                        className={cn("grid gap-4 pt-4 pb-2 items-center", connected ? "grid-cols-7" : "grid-cols-6")}
                        key={collateralBank.address.toBase58()}
                      >
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
                            alt={collateralBank.meta.tokenSymbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          {collateralBank.meta.tokenSymbol}
                        </div>
                        <div className="flex flex-col xl:gap-2 xl:flex-row xl:items-baseline">
                          <span className="text-xl">{numeralFormatter(collateralBank.info.state.totalDeposits)}</span>
                          <span className="text-sm text-muted-foreground">
                            {usdFormatter.format(
                              collateralBank.info.state.totalDeposits *
                                collateralBank.info.oraclePrice.priceRealtime.price.toNumber()
                            )}
                          </span>
                        </div>

                        <div className="text-mrgn-success text-right w-32">
                          {percentFormatter.format(aprToApy(collateralBank.info.state.lendingRate))}
                        </div>
                        <div className="text-mrgn-warning text-right w-32">
                          {percentFormatter.format(aprToApy(collateralBank.info.state.borrowingRate))}
                        </div>
                        <div className="flex justify-center">
                          <Link href="https://x.com/marginfi" target="_blank">
                            <Image
                              src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
                              width={20}
                              height={20}
                              alt="marginfi"
                              className="rounded-full"
                            />
                          </Link>
                        </div>
                        {connected && (
                          <div className="pl-2 text-lg flex flex-col xl:gap-1 xl:flex-row xl:items-baseline">
                            {collateralBank.isActive && collateralBank.position.isLending && (
                              <>
                                {numeralFormatter(collateralBank.position.amount)}
                                <span className="text-muted-foreground text-sm">{collateralBank.meta.tokenSymbol}</span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          {collateralBank.isActive && collateralBank.position.isLending && (
                            <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Withdraw}>
                              <Button className="bg-background border text-foreground hover:bg-accent">Withdraw</Button>
                            </ActionBoxDialog>
                          )}
                          <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Deposit}>
                            <Button className="bg-background border text-foreground hover:bg-accent">Supply</Button>
                          </ActionBoxDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:hidden">
              {pools.map(({ bank, collateralBank }) => {
                return (
                  <div className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4">
                    <Link
                      href={`/trade/${bank.address.toBase58()}`}
                      className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center -space-x-2.5">
                        <Image
                          src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
                          alt={collateralBank.meta.tokenSymbol}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <Image
                          src={getTokenImageURL(bank.info.state.mint.toBase58())}
                          alt={bank.meta.tokenSymbol}
                          width={24}
                          height={24}
                          className="rounded-full bg-background"
                        />
                      </div>
                      <span>
                        {bank.meta.tokenSymbol}/{collateralBank.meta.tokenSymbol}
                      </span>
                      <div className="flex items-center gap-1 text-mrgn-green">
                        <span>Trade</span>
                        <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                    <div className="pt-2 pb-4 border-b items-center" key={bank.address.toBase58()}>
                      <div className="flex items-center gap-2">
                        <Image
                          src={getTokenImageURL(bank.info.state.mint.toBase58())}
                          alt={bank.meta.tokenSymbol}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        {bank.meta.tokenSymbol}
                      </div>
                      <div className="grid grid-cols-3 gap-2 my-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">
                            Total
                            <br /> Deposits
                          </span>
                          <div className="flex flex-col">
                            <span>{numeralFormatter(bank.info.state.totalDeposits)}</span>
                            <span className="text-muted-foreground text-sm">
                              {usdFormatter.format(
                                bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">
                            Lending
                            <br /> Rate (APY)
                          </span>
                          <span className="text-mrgn-success">
                            {percentFormatter.format(aprToApy(bank.info.state.lendingRate))}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">
                            Borrowing
                            <br /> Rate (APY)
                          </span>
                          <span className="text-mrgn-warning">
                            {percentFormatter.format(aprToApy(bank.info.state.borrowingRate))}
                          </span>
                        </div>
                      </div>
                      {bank.isActive && bank.position.isLending && (
                        <div className="text-sm mb-4">
                          <span className="text-muted-foreground">Supplied</span>{" "}
                          {numeralFormatter(bank.position.amount)} <span>{bank.meta.tokenSymbol}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {bank.isActive && bank.position.isLending && (
                          <ActionBoxDialog requestedBank={bank} requestedAction={ActionType.Withdraw}>
                            <Button className="w-full bg-background border text-foreground hover:bg-accent">
                              Withdraw
                            </Button>
                          </ActionBoxDialog>
                        )}
                        <ActionBoxDialog requestedBank={bank} requestedAction={ActionType.Deposit}>
                          <Button className="w-full bg-background border text-foreground hover:bg-accent">
                            Supply
                          </Button>
                        </ActionBoxDialog>
                      </div>
                    </div>
                    <div className="pt-4 pb-2 items-center">
                      <div className="flex items-center gap-2">
                        <Image
                          src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
                          alt={collateralBank.meta.tokenSymbol}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        {collateralBank.meta.tokenSymbol}
                      </div>
                      <div className="grid grid-cols-3 gap-2 my-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">
                            Total
                            <br /> Deposits
                          </span>
                          <div className="flex flex-col">
                            <span>{numeralFormatter(bank.info.state.totalDeposits)}</span>
                            <span className="text-muted-foreground text-sm">
                              {usdFormatter.format(
                                bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">
                            Lending
                            <br /> Rate (APY)
                          </span>
                          <span className="text-mrgn-success">
                            {percentFormatter.format(aprToApy(bank.info.state.lendingRate))}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">
                            Borrowing
                            <br /> Rate (APY)
                          </span>
                          <span className="text-mrgn-warning">
                            {percentFormatter.format(aprToApy(bank.info.state.borrowingRate))}
                          </span>
                        </div>
                      </div>
                      {collateralBank.isActive && collateralBank.position.isLending && (
                        <div className="text-sm mb-4">
                          <span className="text-muted-foreground">Supplied</span>{" "}
                          {numeralFormatter(collateralBank.position.amount)}{" "}
                          <span>{collateralBank.meta.tokenSymbol}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {collateralBank.isActive && collateralBank.position.isLending && (
                          <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Withdraw}>
                            <Button className="w-full bg-background border text-foreground hover:bg-accent">
                              Withdraw
                            </Button>
                          </ActionBoxDialog>
                        )}
                        <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Deposit}>
                          <Button className="w-full bg-background border text-foreground hover:bg-accent">
                            Supply
                          </Button>
                        </ActionBoxDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
