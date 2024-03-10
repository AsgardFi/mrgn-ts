import React from "react";

import { ActionBox } from "~/components/common/ActionBox";

export const ActionBoxLendWrapper = () => {
  return (
    <div className="p-4 space-y-4 w-full">
      <div className="text-center w-full">
        <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <ActionBox showLendingHeader={true} />
    </div>
  );
};
