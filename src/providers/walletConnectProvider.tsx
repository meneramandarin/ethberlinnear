"use client";
import { useMbWallet } from "@mintbase-js/react";
import { Core } from "@walletconnect/core";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { Web3Wallet, Web3WalletTypes } from "@walletconnect/web3wallet";
import { MultichainContract, NearContractFunctionPayload, NearEthAdapter, RecoveryData, nearAccountFromWallet, signatureFromTxHash } from "near-ca";
import React, { createContext, useContext, useState } from "react";
import { TransactionSerializable, serializeTransaction } from "viem";

export interface NearEthTxData {

  evmMessage: string | TransactionSerializable;
  nearPayload: NearContractFunctionPayload;
  recoveryData: RecoveryData;
}

interface WalletContextType {
  web3wallet: InstanceType<typeof Web3Wallet> | null;
  adapter: NearEthAdapter | undefined;
  initializeWallet: (uri: string) => void;
  handleRequest: (request: Web3WalletTypes.SessionRequest) => Promise<NearEthTxData | undefined>;
  respondRequest: (txHash: string) => void;
  onSessionProposal: (request: Web3WalletTypes.SessionProposal) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletConnect = (): WalletContextType => {
  const context = useContext(WalletContext);
  console.log(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export const WalletConnectProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { selector } = useMbWallet();
  const [web3wallet, setWeb3Wallet] = useState<InstanceType<
    typeof Web3Wallet
  > | null>(null);
  const [adapter, setAdapter] = useState<NearEthAdapter>();

  const createWalletAndAdapter = async () => {
    const core = new Core({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    });

    const web3wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: "Mintbase Wallet",
        description: "Near Wallet Connect to EVM.",
        url: "wallet.mintbase.xyz",
        icons: [],
      },
    });
    setWeb3Wallet(web3wallet);

    const nearWallet = await selector.wallet();
    const account = await nearAccountFromWallet(nearWallet);
    const adapter = await NearEthAdapter.fromConfig({
      mpcContract: new MultichainContract(
        account,
        process.env.NEXT_PUBLIC_NEAR_MULTICHAIN_CONTRACT!,
      ),
      derivationPath: "ethereum,1",
    });

    setAdapter(adapter)
    console.log("Set wallet and adapter", web3wallet, adapter);
  }

  const initializeWallet = async (uri: string) => {
    if (!web3wallet) {
      await createWalletAndAdapter()
    }
    
    // Attempt to pair using the provided URI
    try {
      await web3wallet!.pair({ uri });
    } catch (error) {
      console.error("Error during pairing:", error);
    }
  };

  const onSessionProposal = async ({
    id,
    params,
    // verifyContext,
  }: Web3WalletTypes.SessionProposal) => {
    if (!web3wallet) return;
    const wallet = await selector.wallet();
    const account = await nearAccountFromWallet(wallet);
    const adapter = await NearEthAdapter.fromConfig({
      mpcContract: new MultichainContract(
        account,
        process.env.NEXT_PUBLIC_NEAR_MULTICHAIN_CONTRACT!,
      ),
      derivationPath: "ethereum,1",
    });

    setAdapter(adapter);
    const supportedChainIds = [1, 100, 11155111];
    // const supportedChainIds = [11155111,43113,5,80001,420];
    // TODO - This big gross thing could live in near-ca:
    // cf: https://github.com/Mintbase/near-ca/issues/47
    const approvedNamespaces = buildApprovedNamespaces({
      proposal: params,
      supportedNamespaces: {
        eip155: {
          chains: supportedChainIds.map((id) => `eip155:${id}`),
          methods: [
            "eth_accounts",
            "eth_requestAccounts",
            "eth_sendRawTransaction",
            "eth_sign",
            "eth_signTransaction",
            "eth_signTypedData",
            "eth_signTypedData_v3",
            "eth_signTypedData_v4",
            "eth_sendTransaction",
            "personal_sign",
            "wallet_switchEthereumChain",
            "wallet_addEthereumChain",
            "wallet_getPermissions",
            "wallet_requestPermissions",
            "wallet_registerOnboarding",
            "wallet_watchAsset",
            "wallet_scanQRCode",
            "wallet_sendCalls",
            "wallet_getCallsStatus",
            "wallet_showCallsStatus",
            "wallet_getCapabilities",
          ],
          events: [
            "chainChanged",
            "accountsChanged",
            "message",
            "disconnect",
            "connect",
          ],
          accounts: supportedChainIds.map(
            (id) => `eip155:${id}:${adapter.address}`
          ),
        },
      },
    });
    await web3wallet.approveSession({
      id: id,
      namespaces: approvedNamespaces,
    });
    web3wallet.on("session_request", handleRequest);
  };

  const handleRequest = async (request: Web3WalletTypes.SessionRequest): Promise<NearEthTxData | undefined> => {
    localStorage.setItem("wc-request", JSON.stringify(request));
    if (!web3wallet || !adapter) {
      console.error("One of web3wallet or adapter doesn't exist", web3wallet, adapter);
      await createWalletAndAdapter();
      console.log("These should both exist now", web3wallet, adapter);
    }
    console.log("SessionRequest", JSON.stringify(request));
    const txData: NearEthTxData =
      await adapter!.handleSessionRequest(request);
    if (!(typeof txData.evmMessage === "string")) {
      txData.evmMessage = serializeTransaction(txData.evmMessage);
    }
    localStorage.setItem("txData", JSON.stringify(txData))
    return txData;
  };

  const respondRequest = async (txHash: string) => {
    console.log("Responding to request");
    // debugger
    if (!web3wallet || !adapter) {
      console.error("One of web3wallet or adapter doesn't exist", web3wallet, adapter);
      await createWalletAndAdapter();
      console.log("These should both exist now", web3wallet, adapter);
    }
    const txDataString = localStorage.getItem("txData");
    if (!txDataString) {
      console.error("No TxData... FROWN...");
      return 
    }
    const txData = JSON.parse(txDataString) as NearEthTxData;

    const requestString = localStorage.getItem("wc-request");
    if (!requestString) {
      console.error("Lost request data... FROWN!");
      return;
    }
    const request = JSON.parse(requestString) as Web3WalletTypes.SessionRequest;

    const [big_r, big_s] = await signatureFromTxHash(
      "https://rpc.testnet.near.org",
      txHash
    );
    console.log("retrieved signature froml Near MPC Contract")
    const signature = await adapter!.recoverSignature(txData.recoveryData, {big_r, big_s});
    console.log("Recovered Hex Signature")
    web3wallet!.respondSessionRequest({
      topic: request.topic,
      response: {
        id: request.id,
        jsonrpc: "2.0",
        result: signature,
      },
    });
    localStorage.removeItem("txData");
    
  };

  return (
    <WalletContext.Provider
      value={{
        web3wallet,
        initializeWallet,
        adapter,
        handleRequest,
        respondRequest,
        onSessionProposal,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
