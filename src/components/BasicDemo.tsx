"use client";
import { 
  useEffect,
  // createContext, 
  // useContext, 
  useState } from "react";
// Only for demo purposes!
import {
  // MPCSignature,
  MultichainContract,
  NearEthAdapter,
  nearAccountFromWallet,
  signatureFromTxHash,
} from "near-ca";
import { useMbWallet } from "@mintbase-js/react";
import { useSearchParams } from "next/navigation";
// import { Web3Wallet, Web3WalletTypes } from "@walletconnect/web3wallet";

// interface WalletContextType {
//   web3wallet: InstanceType<typeof Web3Wallet> | null;
//   adapter: NearEthAdapter | undefined;
//   initializeWallet: (uri: string) => void;
//   handleRequest: (request: Web3WalletTypes.SessionRequest) => void;
//   onSessionProposal: (request: Web3WalletTypes.SessionProposal) => void;
// }

// const WalletContext = createContext<WalletContextType | undefined>(undefined);

// export const useWalletConnect = (): WalletContextType => {
//   const context = useContext(WalletContext);
//   if (!context) {
//     throw new Error("useWallet must be used within a WalletProvider");
//   }
//   return context;
// };

export const BasicDemo = () => {
  const [adapter, setAdapter] = useState<NearEthAdapter>();
  const { selector } = useMbWallet();
  const searchParams = useSearchParams();
  const transactionHashes = searchParams?.get('transactionHashes');

  const connectEVM = async () => {
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
      setAdapter(adapter)
    } catch (err: unknown) {
      console.log("Can't connect to evm without Near wallet connection!", (err as Error).message)
    }
  };

  useEffect(() => {
    if (selector === undefined) {
      return;
    }
    if (adapter === undefined) {
      connectEVM()
    }
  }, [adapter, selector]);

  useEffect(() => {
    const doThing = async (transactionHashes: string) => {
      const transaction = JSON.parse(localStorage.getItem("tx")!);
      if (adapter !== undefined && transaction !== undefined) {
        const [big_r, big_s] = await signatureFromTxHash(
          "https://rpc.testnet.near.org", 
          transactionHashes
        );
        const signedTx = adapter.reconstructSignature({signature: {big_r, big_s}, transaction});
        // TODO use sig router
        const hash = await adapter.relaySignedTransaction(signedTx)
        console.log("EVM Hash", hash);
      } else {
        console.log("One of adapter or tx", adapter, transaction);
      }
    }
    if (transactionHashes && adapter) {
      // Log the transactionHashes to verify it's being received
      console.log('Transaction Hashes:', transactionHashes);
      doThing(transactionHashes)
    } else {
      console.log("One of adapter or txHash", adapter, transactionHashes);
    }
  }, [adapter, transactionHashes]);



  const handleSendTx = async () => {
    if (adapter === undefined) {
      throw new Error("NearEth Connection Undefined! Please connect to EVM")
      // Could call connect evm here I guess...
    }
    const wallet = await selector.wallet();
    const {requestPayload, transaction} = await adapter.getSignatureRequestPayload({
      to: "0xdeADBeeF0000000000000000000000000b00B1e5",
      value: 1n,
      chainId: 11155111,
    })
    localStorage.setItem("tx", JSON.stringify(transaction));
    // const callbackUrl = `${window.location.origin}/callback`;
    wallet.signAndSendTransaction({
      ...requestPayload, 
      // callbackUrl
    })
  };

  return (
    <div className="mx-6 sm:mx-24 mt-4 mb-4">
      <div className="w-full flex flex-col justify-center items-center">
        <div className="w-full flex flex-col justify-center items-center space-y-8">
          <div className="flex flex-col justify-center items-center space-y-8 text-[40px]">
            Basic Tx Example
          </div>
          <div className="flex flex-col justify-center items-center space-y-4">
            {adapter && (
              <div className="mt-4 p-4 border rounded bg-gray-100">
                <div>Adapter: {adapter.address}</div>
              </div>
            )}
            <button
              onClick={handleSendTx}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
            >
              Send Tx
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
