"use client";
import { NearEthTxData, useWalletConnect } from '@/providers/walletConnectProvider';
import { Web3WalletTypes } from '@walletconnect/web3wallet';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Callback = () => {
  const router = useRouter();
  const { transactionHashes } = router.query;
  const { respondRequest } = useWalletConnect();

  useEffect(() => {
    const handleRequestResponse = async () => {
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
          await respondRequest(request, txData, nearTxHash);
          // ONLY AFTER SUCCESS!
          localStorage.removeItem("wc-request");
          localStorage.removeItem("txData");
        } catch (error) {
          console.error("Error responding to request:", error);
        }
      }
    };

    handleRequestResponse();
  }, [transactionHashes, respondRequest]);

  return (
    <div>
      <h1>Callback Page</h1>
      <p>Handling the callback logic...</p>
      {transactionHashes && <p>Transaction Hashe(s): {transactionHashes}</p>}
    </div>
  );
};

export default Callback;
