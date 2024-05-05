import Link from "next/link";

import { IconArrowRight } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

export const Ecosystem = () => {
  return (
    <div className="container max-w-7xl flex items-center justify-between gap-4">
      <video autoPlay muted>
        <source src="/videos/ecosystem.mp4" type="video/mp4" />
      </video>
      <div className="space-y-6 max-w-sm">
        <h3 className="text-4xl font-medium">A full ecosystem powered by marginfi SDK</h3>
        <p className="text-muted-foreground">
          We&apos;re always working to push new products on top of our protocol, and so is our community.
        </p>
        <Link className="inline-block" href="https://app.marginfi.com/ecosystem">
          <Button>
            View Ecosystem <IconArrowRight size={18} className="ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
