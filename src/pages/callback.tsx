// pages/callback.js
import { NearEthTxData, useWalletConnect } from '@/providers/walletConnectProvider';
import { Web3WalletTypes } from '@walletconnect/web3wallet';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Callback = () => {
  const router = useRouter();
  const { transactionHashes } = router.query;
  const { respondRequest } = useWalletConnect();

  useEffect(() => {
    if (transactionHashes) {
      console.log('Parsed Near Tx Hashe(s) from URL:', transactionHashes);
      let txDataString = localStorage.getItem("txData");
      let txData: NearEthTxData;
      if (!txDataString) {
        // cheeky alternative path:
        const transaction = localStorage.getItem("tx");
        if (!transaction) {
          console.error("No TxData (or tx) in local storage... FROWN");
          return;
        }
        txData = {
          evmMessage: transaction,
          nearPayload: {signerId: "", receiverId: "", actions: []},
          recoveryData: {
            type: "eth_sendTransaction",
            data: transaction as `0x${string}`
          }
        }
        localStorage.removeItem("tx");
      } else {
        txData = JSON.parse(txDataString) as NearEthTxData;
        localStorage.removeItem("txData");
      }
      const requestString = localStorage.getItem("wc-request");
      if (!requestString) {
        console.error("Lost request data... FROWN!");
        return;
      }
      const request = JSON.parse(requestString) as Web3WalletTypes.SessionRequest;
      
      // constructed all relevant parts to respond to request!
      console.log("Responding to request with all relevant data");
      respondRequest(request, txData, transactionHashes[0])
    }
  }, [respondRequest, transactionHashes]);

  return (
    <div>
      <h1>Callback Page</h1>
      <p>Handling the callback logic...</p>
      {transactionHashes && <p>Transaction Hashe(s): {transactionHashes}</p>}
    </div>
  );
};

export default Callback;
