"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import "@near-wallet-selector/modal-ui/styles.css";
import "../styles.css";

import { NearWalletConnector } from "@/components/NearWalletSelector";
import { MintbaseWalletContextProvider } from "@mintbase-js/react";
import { SocialMedias } from "@/components/Social";
import { WalletConnectProvider } from "@/providers/walletConnectProvider";

const inter = Inter({ subsets: ["latin"] });

const MintbaseWalletSetup = {
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  network: process.env.NEXT_PUBLIC_NETWORK,
  callbackUrl: process.env.NEXT_PUBLIC_CALLBACK_URL,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MintbaseWalletContextProvider {...MintbaseWalletSetup}>
      <WalletConnectProvider>
      <html lang="en">
        <body className={inter.className}>


          <div class="overflow-hidden">
              <div class="px-4 pb-5 pt-7 ring-1 ring-zinc-950/5 dark:ring-white/5">
                  <div class="mx-auto flex items-center justify-between px-2 sm:px-4 lg:max-w-7xl">
                      <div class="flex items-center gap-2 sm:gap-4"><a aria-label="Home" href="/">
                          X
                      </a></div>
                      <div class="flex items-center gap-4 sm:gap-8">
                        <NearWalletConnector />
                      </div>
                  </div>
              </div>
              <div class="px-4">
                {children}
              </div>
          </div>
        </body>
      </html></WalletConnectProvider>
    </MintbaseWalletContextProvider>
  );
}
