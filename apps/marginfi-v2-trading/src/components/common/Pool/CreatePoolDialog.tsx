import React from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import { z } from "zod";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { IconUpload, IconPlus, IconSearch, IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { useDebounce } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { cn, getTokenImageURL } from "~/utils";

import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

enum CreatePoolState {
  SEARCH = "initial",
  MINT = "mint",
  FORM = "form",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

const formSchema = z.object({
  mint: z.instanceof(PublicKey),
  name: z.string().min(3),
  symbol: z.string(),
  oracle: z.instanceof(PublicKey),
});

export const CreatePoolDialog = ({ trigger }: CreatePoolDialogProps) => {
  const router = useRouter();
  const [filteredBanks, resetFilteredBanks, searchBanks, resetActiveGroup] = useTradeStore((state) => [
    state.filteredBanks,
    state.resetFilteredBanks,
    state.searchBanks,
    state.resetActiveGroup,
  ]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.SEARCH);
  const [isSearchingDasApi, setIsSearchingDasApi] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const mintAddressRef = React.useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchTokenInfo = React.useCallback(async () => {
    if (!mintAddressRef.current) return;
    setIsSearchingDasApi(true);

    const mintAddress = mintAddressRef.current.value;

    try {
      const mint = new PublicKey(mintAddress);
      const fetchTokenReq = await fetch(`/api/asset-search?address=${mint.toBase58()}`);

      if (!fetchTokenReq.ok) {
        throw new Error("Failed to fetch token info");
      }

      const tokenInfo = await fetchTokenReq.json();

      if (!tokenInfo || tokenInfo.interface !== "FungibleToken") {
        throw new Error("Invalid token mint address");
      }

      console.log("mint", mint.toBase58());
      console.log("name", tokenInfo.content.metadata.name);
      console.log("supply", tokenInfo.content.metadata.symbol);
      console.log("image", tokenInfo.content.files[0].cdn_uri);
      console.log("decimals", tokenInfo.token_info.decimals);

      setIsSearchingDasApi(false);
    } catch (e) {
      console.error(e);
      setIsSearchingDasApi(false);
    }
  }, [setCreatePoolState, mintAddressRef]);

  React.useEffect(() => {
    if (!searchQuery.length) {
      resetFilteredBanks();
      return;
    }
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  React.useEffect(() => {
    if (isOpen) {
      setCreatePoolState(CreatePoolState.SEARCH);
      setSearchQuery("");
      resetActiveGroup();
    }
  }, [isOpen, resetActiveGroup, setCreatePoolState, setSearchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button>
            <IconPlus size={18} /> Create Pool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl">
        {createPoolState === CreatePoolState.SEARCH && (
          <>
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <h2 className="text-3xl font-medium">Search pools</h2>
              <p className="text-lg text-muted-foreground">
                First search for an existing pool, before creating a new one.
              </p>
            </div>
            <div className="space-y-12">
              <div className="relative w-full max-w-2xl mx-auto">
                <IconSearch
                  size={18}
                  className={cn(
                    "absolute inset-y-0 left-5 h-full text-muted-foreground transition-colors md:left-6",
                    searchQuery.length && "text-primary"
                  )}
                />
                <div className="bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
                  <Input
                    ref={searchInputRef}
                    placeholder="Search tokens by name, symbol, or mint address..."
                    className="py-2 pr-6 pl-12 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                {debouncedSearchQuery.length > 1 && filteredBanks.length === 0 && (
                  <div className="text-center text-muted-foreground w-full space-y-4">
                    <p>No results found for &quot;{debouncedSearchQuery}&quot;</p>
                  </div>
                )}

                {filteredBanks.length > 0 && (
                  <div className="space-y-3">
                    {filteredBanks.slice(0, 5).map((bank, index) => (
                      <button
                        onClick={() => {
                          resetActiveGroup();
                          router.push(`/pools/${bank.address.toBase58()}`);
                          setIsOpen(false);
                        }}
                        className="flex flex-col items-center w-full gap-4 even:bg-background-gray px-4 py-3 rounded-lg cursor-pointer hover:bg-background-gray-light/50 md:flex-row md:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <Image
                            src={getTokenImageURL(bank.meta.tokenSymbol)}
                            width={32}
                            height={32}
                            alt={bank.meta.tokenSymbol}
                            className="rounded-full"
                          />
                          <h3>
                            {bank.meta.tokenName} ({bank.meta.tokenSymbol})
                          </h3>
                        </div>
                        <div className="flex items-center gap-12 text-sm md:ml-auto md:text-right">
                          <p className="space-x-1.5">
                            <strong className="font-medium">Price:</strong>{" "}
                            <span className="font-mono text-sm text-muted-foreground">
                              {usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}
                            </span>
                          </p>
                          <p className="space-x-1.5">
                            <strong className="font-medium">Deposits:</strong>{" "}
                            <span className="font-mono text-sm text-muted-foreground">
                              {usdFormatter.format(
                                bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                              )}
                            </span>
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {debouncedSearchQuery.length > 1 && (
                  <div className="flex justify-center pt-8">
                    <Button onClick={() => setCreatePoolState(CreatePoolState.MINT)} variant="secondary">
                      <IconPlus size={18} /> Create new pool
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {createPoolState === CreatePoolState.MINT && (
          <>
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <h2 className="text-3xl font-medium">Token mint address</h2>
              <p className="text-lg text-muted-foreground">
                Enter the mint address of the token you'd like to create a pool for.
              </p>
            </div>
            <form
              className={cn(
                "space-y-12 w-full flex flex-col items-center",
                isSearchingDasApi && "pointer-events-none animate-pulsate"
              )}
              onSubmit={(e) => {
                e.preventDefault();
                fetchTokenInfo();
              }}
            >
              <div className="w-full bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
                <Input
                  disabled={isSearchingDasApi}
                  ref={mintAddressRef}
                  placeholder="Token mint address..."
                  className="py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <Button disabled={isSearchingDasApi} type="submit" variant="secondary">
                {!isSearchingDasApi && (
                  <>
                    Continue <IconArrowRight size={18} />
                  </>
                )}
                {isSearchingDasApi && (
                  <>
                    <IconLoader2 size={18} className="animate-spin" /> Fetching token info...
                  </>
                )}
              </Button>
            </form>
          </>
        )}
        {createPoolState === CreatePoolState.FORM && (
          <>
            <div className="text-center space-y-2 max-w-md mx-auto">
              <h2 className="text-3xl font-medium">Create a Pool</h2>
              <p className="text-muted-foreground">Create a permissionless pool with marginfi.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2 items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-lg py-8 px-12 text-muted-foreground hover:bg-secondary/20">
                <IconUpload />
                <p className="text-sm text-center">Drag and drop your image here or click to select a file</p>
                <input className="hidden" type="file" />
              </div>
              <form className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <Label className="font-medium" htmlFor="address">
                      Token Address
                    </Label>
                    <Input id="address" placeholder="Enter token address" required type="text" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <Label className="font-medium" htmlFor="name">
                      Name
                    </Label>
                    <Input id="name" placeholder="Enter token name" required type="text" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <Label className="font-medium" htmlFor="symbol">
                      Symbol
                    </Label>
                    <Input id="symbol" placeholder="Enter token symbol" required type="text" />
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="font-medium" htmlFor="symbol">
                        Oracle
                      </Label>
                      <Link href="#" target="_blank" rel="noreferrer">
                        <Button variant="link" size="sm" className="px-0 py-1">
                          More info
                        </Button>
                      </Link>
                    </div>
                    <Input id="symbol" placeholder="Enter oracle symbol" required type="text" />
                  </div>
                </div>
                <Button className="w-full" type="submit">
                  Create Pool
                </Button>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
