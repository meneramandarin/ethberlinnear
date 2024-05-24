"use client";
import { useMbWallet } from "@mintbase-js/react";
import { Core } from "@walletconnect/core";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { Web3Wallet, Web3WalletTypes } from "@walletconnect/web3wallet";
import { MultichainContract, NearContractFunctionPayload, NearEthAdapter, RecoveryData, nearAccountFromWallet } from "near-ca";
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
  initializeAdapter: () => void;
  handleRequest: (request: Web3WalletTypes.SessionRequest) => Promise<NearEthTxData | undefined>;
  respondRequest: (
    request: Web3WalletTypes.SessionRequest, 
    txData: NearEthTxData, 
    nearTxHash: string
  ) => void;
  onSessionProposal: (request: Web3WalletTypes.SessionProposal) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletConnect = (): WalletContextType => {
  const context = useContext(WalletContext);
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

  const initializeWallet = async (uri?: string) => {
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
    
    // Attempt to pair using the provided URI
    if (uri) {
      try {
        await web3wallet.pair({ uri });
      } catch (error) {
        console.warn("Pairing may already exist:", error);
      }
    }
  };

  const initializeAdapter = async () => {
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
  };

  const reinstantiateWeb3WalletAndAdapter = async () => {
    const uri = localStorage.getItem("wc-uri")!;
    await initializeWallet(uri);
    localStorage.removeItem("wc-uri")!;
    await initializeAdapter();
  };

  const onSessionProposal = async ({
    id,
    params,
    // verifyContext,
  }: Web3WalletTypes.SessionProposal) => {
    if (!web3wallet) {
      console.warn("No web3wallet available: can not respond to session_proposal");
      return;
    }
    if (!adapter) {
      console.warn("No adapter available -- trying again");
      await initializeAdapter();
      if (!adapter) {
        console.error("STILL No adapter available -- WTF MATE.");
        return;
      }
    }
    console.log("Respond to Session Proposal")
    const supportedChainIds = [1, 100, 11155111];
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
    console.log("Connected!");
    // web3wallet!.on("session_request", handleRequest);
  };

  const handleRequest = async (request: Web3WalletTypes.SessionRequest): Promise<NearEthTxData | undefined> => {
    // set wc-request to storage (it will be lost after signing)
    localStorage.setItem("wc-request", JSON.stringify(request));
    if (!web3wallet || !adapter) {
      console.error("handleRequest: One of web3wallet or adapter is undefined", web3wallet, adapter);
      return;
    }
    console.log("SessionRequest", JSON.stringify(request));
    const txData: NearEthTxData = await adapter.handleSessionRequest(request);
    
    // Can not stringify `bigint` primitive type.
    if (!(typeof txData.evmMessage === "string")) {
      txData.evmMessage = serializeTransaction(txData.evmMessage);
    }
    localStorage.setItem("txData", JSON.stringify(txData))
    return txData;
  };

  const respondRequest = async (
    request: Web3WalletTypes.SessionRequest, 
    txData: NearEthTxData, 
    nearTxHash: string
  ) => {
    console.log("Responding to request", request, txData, nearTxHash);
    if (!web3wallet || !adapter) {
      console.warn("respondRequest: One of web3wallet or adapter is undefined", web3wallet, adapter);
      await reinstantiateWeb3WalletAndAdapter();
      if (!web3wallet || !adapter) {
        console.error("Even after retry - one not available", web3wallet, adapter);
        return;
      }
    }
    console.log("Got all the sheet");
    // const request = JSON.parse(requestString) as Web3WalletTypes.SessionRequest;
    // Retrieve (r, s) values for ECDSA signature (from Near TxReceipt)
    // const [big_r, big_s] = await signatureFromTxHash(
    //   "https://rpc.testnet.near.org",
    //   nearTxHash
    // );
    // console.log("retrieved signature from Near MPC Contract", big_r, big_s);
    // const signature = await adapter.recoverSignature(txData.recoveryData, {big_r, big_s});
    // console.log("Recovered Hex Signature", signature)
    // web3wallet.respondSessionRequest({
    //   topic: request.topic,
    //   response: {
    //     id: request.id,
    //     jsonrpc: "2.0",
    //     result: signature,
    //   },
    // });
    // // Remove Local storage related to this.
    // localStorage.removeItem("wc-request");
    // localStorage.removeItem("txData");
    // return signature
    // console.log("EVM Signature", signature);
  };

  return (
    <WalletContext.Provider
      value={{
        web3wallet,
        initializeWallet,
        initializeAdapter,
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
