import * as screens from "../screens";

export type EthOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
};

export const ethOnrampFlow: EthOnrampScreen[] = [
  {
    comp: screens.CreateEthAccount,
    title: "Step 1: Sign in",
    description:
      "Sign in with email or social and we'll create a Solana wallet for you, or connect your wallet and bridge funds.",
    titleSize: "lg",
  },
  {
    comp: screens.BridgeToken,
    title: "Step 1. Bridge your assets",
    description:
      "Bridge your assets to Solana. You'll need SOL for transaction fees and can swap for other tokens next.",
    titleSize: "sm",
  },
  {
    comp: screens.JupiterSwap,
    title: "Step 2. Swap your tokens",
    description:
      "Swap your tokens and start earning permissionless yield today. Make sure you keep some SOL for transaction fees.",
    titleSize: "sm",
  },
  {
    comp: screens.DepositToken,
    title: "Step 3. Make a deposit!",
    description: "Make your first deposit into marginfi and start earning permissionless yield today.",
    titleSize: "sm",
  },
];

export const installWallet: EthOnrampScreen = {
  comp: screens.InstallWallet,
  title: "Installing wallet",
  description: "Refresh if installed",
  titleSize: "lg",
};

export const successBridge: EthOnrampScreen = {
  comp: screens.SuccessScreen,
  title: "Bridge complete",
  description: "DeBridge bridging successful",
  titleSize: "sm",
};
