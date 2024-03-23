"use client";
import { useState } from "react";
// Only for demo purposes!
import {
  MultichainContract,
  NearEthAdapter,
  nearAccountFromWallet,
} from "near-ca";
import { useMbWallet } from "@mintbase-js/react";
import { signatureFromTxHash } from "./util";

// EVM Config
const evm = {
  providerUrl: process.env.NEXT_PUBLIC_NODE_URL!,
  scanUrl: process.env.NEXT_PUBLIC_SCAN_URL!,
  gasStationUrl: process.env.NEXT_PUBLIC_GAS_STATION_URL!,
};

export const OpenSeaExample = () => {
  const [collectionSlug, setCollectionSlug] = useState("");
  const { selector } = useMbWallet();
  const handleBuyNFTClick = async () => {
    console.log("Buying NFT from collection:", collectionSlug);
    const wallet = await selector.wallet();
    console.log(wallet)
    const account = await nearAccountFromWallet(wallet);

    console.log("Near Account", account.accountId);

    const adapter = await NearEthAdapter.fromConfig({
      evm,
      near: {
        mpcContract: new MultichainContract(
          account,
          process.env.NEXT_PUBLIC_NEAR_MULTICHAIN_CONTRACT!,
        ),
        derivationPath: "ethereum,1",
      },
    });

    console.log("ETH Account Address", adapter.ethPublicKey());
    const { transaction, requestPayload } =
      await adapter.getSignatureRequestPayload({
        // TODO - this is just a sendETH transaction.
        //  for the opensea example refer to the logic defined here:
        //  https://github.com/Mintbase/near-ca/blob/main/examples/opensea.ts
        receiver: "0xdeADBeeF0000000000000000000000000b00B1e5",
        amount: 0.000001,
      });
    console.log("payload that should go to Near MPC Contract", requestPayload);

    // // TODO - send request Payload to wallet and extract the signature { big_r, big_s }.
    // const outcome = await wallet.signAndSendTransaction({
    //   // TODO need to add callbackUrl here and retrieve signature from this transaction execution.
    //   ...requestPayload
    // });

    // Transaction was successfull, but we lost the state from here. Need to keep the transaction and recover the txHash to continue.
    // // TODO - should be able to read signature from outcome (type: FinalExecutionOutcome)
    // console.log("OUTCOME", outcome);
    // console.log("OUTCOME JSON", JSON.stringify(outcome));

    // The following line should be replaced by the above "successValue" of outcome.
    // Here is an example from my MB Wallet:
    // https://testnet.nearblocks.io/txns/HNe5Kq2GxeTQh2xDMx5wHyubnvnpgxGozgu98wDbTjiU#execution
    const [big_r, big_s] = await signatureFromTxHash(
      "HNe5Kq2GxeTQh2xDMx5wHyubnvnpgxGozgu98wDbTjiU",
    );

    const txHash = await adapter.relayTransaction({
      transaction,
      signature: { big_r, big_s },
    });
    console.log("EVM Transaction Hash", txHash);
  };

  return (
    <div className="mx-6 sm:mx-24 mt-4 mb-4">
      <div className="w-full flex flex-col justify-center items-center">
        <div className="w-full flex flex-col justify-center items-center space-y-8">
          <div className="flex flex-col justify-center items-center space-y-8 text-[40px]">
            Buy NFT From Collection Example
          </div>
          <div className="flex flex-col justify-center items-center space-y-4">
            {/* Text Field for Collection Slug */}
            <input
              type="text"
              value={collectionSlug}
              onChange={(e) => setCollectionSlug(e.target.value)}
              placeholder="wutangkillabeez-1"
              className="text-center"
            />
            {/* Button to Buy NFT */}
            <button
              onClick={handleBuyNFTClick}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition duration-300"
            >
              Buy NFT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
