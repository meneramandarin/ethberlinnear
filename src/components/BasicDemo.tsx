"use client";
import { useCallback, useEffect, useState } from "react";
import {
  MultichainContract,
  NearEthAdapter,
  nearAccountFromWallet,
} from "near-ca";
import { useMbWallet } from "@mintbase-js/react";
import { Web3WalletTypes } from "@walletconnect/web3wallet";
import { NearEthTxData, useWalletConnect } from "@/providers/walletConnectProvider";

export const BasicDemo = () => {
  const [uri, setUri] = useState("");

  const { initializeWallet, web3wallet, handleRequest, onSessionProposal } = useWalletConnect();
  const [adapter, setAdapter] = useState<NearEthAdapter>();
  const { selector } = useMbWallet();
  const callbackUrl = `${window.location.origin}/callback`;

  const connectEVM = useCallback(async () => {
    if (!selector) return;
    try {
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
    } catch (err: unknown) {
      console.error("Cannot connect to EVM without Near wallet connection!", (err as Error).message);
    }
  }, [selector]);

  const triggerNearTx = useCallback(async (txData: NearEthTxData) => {
    try {
      const wallet = await selector.wallet();
      console.log("Triggering Near Tx on wallet", txData, wallet);
      
      await wallet.signAndSendTransaction({
        callbackUrl,
        ...txData.nearPayload
      });
    } catch (err: unknown) {
      console.error("Cannot connect to EVM without Near wallet connection!", (err as Error).message);
    }
  }, [callbackUrl, selector]);
  
  useEffect(() => {
    if (web3wallet) {
      const handleAuthRequest = (request: Web3WalletTypes.AuthRequest) => console.log("auth_request", request);
      const handleProposalExpire = (request: Web3WalletTypes.ProposalExpire) => console.log("proposal_expire", request);
      const handleSessionAuthenticate = (request: Web3WalletTypes.SessionAuthenticate) => console.log("session_authenticate", request);
      const handleSessionProposal = async (request: Web3WalletTypes.SessionProposal) => {
        console.log("session_proposal", request);
        onSessionProposal(request);
      };
      const handleSessionRequest = async (request: Web3WalletTypes.SessionRequest) => {
        console.log("session_request", request);
        const txData = await handleRequest(request);
        if (!txData) {
          console.log("No need to do this.")
          return;
        }
        triggerNearTx(txData)
      };
      const handleSessionRequestExpire = (request: Web3WalletTypes.SessionRequestExpire) => console.log("session_request_expire", request);

      web3wallet.on("auth_request", handleAuthRequest);
      web3wallet.on("proposal_expire", handleProposalExpire);
      web3wallet.on("session_authenticate", handleSessionAuthenticate);
      web3wallet.on("session_proposal", handleSessionProposal);
      web3wallet.on("session_request", handleSessionRequest);
      web3wallet.on("session_request_expire", handleSessionRequestExpire);

      // Cleanup function to remove event listeners when the component unmounts or web3wallet changes
      return () => {
        web3wallet.off("auth_request", handleAuthRequest);
        web3wallet.off("proposal_expire", handleProposalExpire);
        web3wallet.off("session_authenticate", handleSessionAuthenticate);
        web3wallet.off("session_proposal", handleSessionProposal);
        web3wallet.off("session_request", handleSessionRequest);
        web3wallet.off("session_request_expire", handleSessionRequestExpire);
      };
    }
  }, [web3wallet, handleRequest, onSessionProposal, triggerNearTx]);

  useEffect(() => {
    connectEVM();
  }, [selector, connectEVM]);

  useEffect(() => {
    if (uri) {
      localStorage.setItem("wc-uri", uri);
    }
  }, [uri]);


  // const handleSendTx = async () => {
  //   if (!adapter) {
  //     console.error("NearEth Connection Undefined! Please connect to EVM");
  //     return;
  //   }

  //   try {
  //     const wallet = await selector.wallet();
  //     const { requestPayload, transaction } = await adapter.getSignatureRequestPayload({
  //       to: "0xdeADBeeF0000000000000000000000000b00B1e5",
  //       value: 1n,
  //       chainId: 11155111,
  //     });

  //     localStorage.setItem("tx", JSON.stringify(transaction));
  //     await wallet.signAndSendTransaction({
  //       callbackUrl,
  //       ...requestPayload
  //     });
  //   } catch (err) {
  //     console.error("Error sending transaction:", err);
  //   }
  // };

  return (
    <div className="mx-6 sm:mx-24 mt-4 mb-4">
      <div className="w-full flex flex-col justify-center items-center">
        <div className="w-full flex flex-col justify-center items-center space-y-8">
          <h1 className="text-[40px]">Basic Tx Example</h1>
          <div className="flex flex-col justify-center items-center space-y-4">
            {adapter && (
              <div className="mt-4 p-4 border rounded bg-gray-100">
                <div>Adapter: {adapter.address}</div>
              </div>
            )}
            {/* <button
              onClick={handleSendTx}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
            >
              Send (Dummy) Tx
            </button> */}
          </div>
          <div className='flex flex-col items-center'>
            <form
              className='flex flex-col items-center'
              onSubmit={(e) => {
                e.preventDefault(); // Prevent the default form submit behavior
                initializeWallet(uri); // Use the URI from state when the form is submitted
              }}
            >
            <input
              type='text'
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder='Enter WalletConnect URI'
              required // Makes sure the input is not empty
            />
            <button type='submit'>Connect</button>
      </form>
    </div>
        </div>
      </div>
    </div>
  );
};
