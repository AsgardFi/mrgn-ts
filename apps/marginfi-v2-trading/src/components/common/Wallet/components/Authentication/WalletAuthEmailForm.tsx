import React from "react";

import { IconLoader2 } from "@tabler/icons-react";

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

type WalletAuthEmailFormProps = {
  loading: boolean;
  active: boolean;
  onSubmit: (email: string) => void;
};

export const WalletAuthEmailForm = ({ loading, active, onSubmit }: WalletAuthEmailFormProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();

        if (!inputRef.current?.value || loading) {
          return;
        }

        onSubmit(inputRef.current?.value);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input ref={inputRef} id="email" type="email" placeholder="example@example.com" className="text-lg h-12" />
      </div>
      <Button type="submit" size="lg" disabled={!active}>
        {loading && <IconLoader2 className="absolute left-2 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
};
