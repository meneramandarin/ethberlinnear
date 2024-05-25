"use client";
import { useCallback, useEffect, useState } from "react";
import { useMbWallet } from "@mintbase-js/react";
import { Web3WalletTypes } from "@walletconnect/web3wallet";
import { NearEthTxData, useWalletConnect } from "@/providers/walletConnectProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { initializeAdapter } from "./util";
import { NearEthAdapter } from "near-ca";

export const BasicDemo = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionHashes = searchParams?.get('transactionHashes');
  const [uri, setUri] = useState("");
  const [txData, setTxData] = useState<NearEthTxData>();
  const [adapter, setAdapter] = useState<NearEthAdapter>();
  const { initializeWallet, web3wallet, handleRequest, onSessionProposal, respondRequest } = useWalletConnect();
  const { selector } = useMbWallet();

  const triggerNearTx = useCallback(async (txData: NearEthTxData) => {
    try {
      const wallet = await selector.wallet();
        console.log("Triggering Near Tx on wallet", txData, wallet);
        // const callbackUrl = `${window.location.origin}/callback`;
        wallet.signAndSendTransaction({
          // callbackUrl,
          ...txData.nearPayload
        });
    } catch (err: unknown) {
      console.error("Cannot connect to EVM without Near wallet connection!", (err as Error).message);
    }
  }, [selector]);

  const connectEvm = useCallback(async () => {
    if (!selector) {
      console.log("NO FOKING SELECTOR");
      return
    }
    if (!adapter) {
      const adapter = await initializeAdapter(selector);
      setAdapter(adapter)
    }
  }, [adapter, selector]);
  
  useEffect(() => {
    if (web3wallet && adapter) {
      const handleAuthRequest = (request: Web3WalletTypes.AuthRequest) => console.log("auth_request", request);
      const handleProposalExpire = (request: Web3WalletTypes.ProposalExpire) => console.log("proposal_expire", request);
      const handleSessionAuthenticate = (request: Web3WalletTypes.SessionAuthenticate) => console.log("session_authenticate", request);
      const handleSessionProposal = async (request: Web3WalletTypes.SessionProposal) => {
        console.log("session_proposal", request);
        onSessionProposal(request, adapter!);
      };
      const handleSessionRequest = async (request: Web3WalletTypes.SessionRequest) => {
        console.log("session_request", request);
        const txData = await handleRequest(request, adapter);
        localStorage.setItem("txData", JSON.stringify(txData));
        setTxData(txData)
        if (!txData) {
          console.log("No need to do this.")
          return;
        }
        console.log("handled request partially")
        // triggerNearTx(txData)
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
  }, [web3wallet, handleRequest, onSessionProposal, triggerNearTx, adapter]);

  useEffect(() => {
    if (uri) {
      localStorage.setItem("wc-uri", uri);
    }
  }, [uri]);

  useEffect(() => {
    const handleRequestResponse = async () => {
      if (!adapter) {
        await connectEvm();
      }
      if (transactionHashes) {
        const nearTxHash = Array.isArray(transactionHashes) ? transactionHashes[0] : transactionHashes;
        console.log('Near Tx Hash from URL:', nearTxHash);
        let txDataString = localStorage.getItem("txData");
        if (!txDataString) {
          console.error("No TxData (or tx) in local storage... FROWN");
          return;
        }
        const txData = JSON.parse(txDataString) as NearEthTxData;
        console.log("Loaded Tx Data", txData)
        const requestString = localStorage.getItem("wc-request");
        if (!requestString) {
          console.error("Lost request data... FROWN!");
          return;
        }
        const request = JSON.parse(requestString) as Web3WalletTypes.SessionRequest;
        console.log("LOADED REQUEST:", request)
        // constructed all relevant parts to respond to request!
        console.log("Responding to request with all relevant data");
        try {
          await respondRequest(request, txData, nearTxHash, adapter!);
          // ONLY AFTER SUCCESS!
          // localStorage.removeItem("wc-request");
          // localStorage.removeItem("txData");
          router.replace(window.location.pathname);
        } catch (error) {
          console.error("Error responding to request:", error);
        }
      }
    };

    handleRequestResponse();
  }, [transactionHashes, respondRequest, router, adapter, connectEvm]);

  return (
    <div className="mx-6 sm:mx-24 mt-4 mb-4">
      <div className="w-full flex flex-col justify-center items-center">
        <div className="w-full flex flex-col justify-center items-center space-y-8">
          <h1 className="text-[40px]">Basic Tx Example</h1>
          <div className="flex flex-col justify-center items-center space-y-4">
            <button
              onClick={connectEvm}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
            >
              Connect EVM
            </button>
            {adapter && (
              <div className="mt-4 p-4 border rounded bg-gray-100">
                <div>Adapter: {adapter.address}</div>
              </div>
            )}
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
      <button
              style={{
                display: txData == undefined ? 'none' : 'block'
              }}
              onClick={() => {triggerNearTx(txData!)}}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
            >
              Send Near Tx
            </button>
    </div>
        </div>
      </div>
    </div>
  );
};
