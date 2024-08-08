import React from "react";

import Link from "next/link";

import {
  IconCopy,
  IconShare,
  IconBrandXFilled,
  IconBrandTelegram,
  IconBrandDiscordFilled,
  IconBrandReddit,
} from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";

export const PoolShare = () => {
  const [activeGroupPk, groupMap] = useTradeStore((state) => [state.activeGroup, state.groupMap]);
  const copyUrlRef = React.useRef<HTMLInputElement>(null);

  const activeGroup = React.useMemo(() => {
    return activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : null;
  }, [activeGroupPk, groupMap]);

  if (!activeGroup) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="mt-4">
          <IconShare size={16} /> Share {activeGroup.pool.token.meta.tokenSymbol} pool
        </Button>
      </PopoverTrigger>
      <PopoverContent className="pb-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <input
              ref={copyUrlRef}
              className="appearance-none text-xs bg-background border rounded-md w-full overflow-auto px-2 py-1 select-all outline-none"
              value={`${window.location.origin}/trade/${activeGroup.client.group.address.toBase58()}`}
              readOnly
            />
            <button className="cursor-pointer rounded-md p-2 transition-colors hover:bg-accent">
              <IconCopy size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs pl-0.5">
            <span className="-translate-y-0.5 font-medium">Share to:</span>
            <ul className="flex items-center justify-center gap-1">
              <li>
                <Link
                  href=""
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block cursor-pointer rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <IconBrandXFilled size={16} />
                </Link>
              </li>
              <li>
                <Link
                  href=""
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block cursor-pointer rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <IconBrandTelegram size={16} />
                </Link>
              </li>
              <li>
                <Link
                  href=""
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block cursor-pointer rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <IconBrandDiscordFilled size={16} />
                </Link>
              </li>
              <li>
                <Link
                  href=""
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block cursor-pointer rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <IconBrandReddit size={16} />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
