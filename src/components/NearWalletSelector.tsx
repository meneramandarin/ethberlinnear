"use client";
import { useMbWallet } from "@mintbase-js/react";

export const NearWalletConnector = () => {
  const { isConnected, selector, connect, activeAccountId } = useMbWallet();

  const handleSignout = async () => {
    const wallet = await selector.wallet();
    return wallet.signOut();
  };

  const handleSignIn = async () => {
    return connect();
  };

  if (!isConnected) {
    return (
      <button
        className="bg-white text-black rounded p-3 hover:bg-[#e1e1e1]"
        onClick={handleSignIn}
      >
        Connect NEAR Wallet
      </button>
    );
  }

  return (
    <div>
      <span className="mr-5">{activeAccountId}</span>
      <button
        className="bg-white text-black rounded p-3 hover:bg-[#e1e1e1]"
        onClick={handleSignout}
      >
        {" "}
        Disconnect{" "}
      </button>
    </div>
  );
};
