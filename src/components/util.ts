import { WalletSelector } from "@near-wallet-selector/core";
import { Buffer } from "buffer";
import {
  MultichainContract,
  NearEthAdapter,
  nearAccountFromWallet,
} from "near-ca";

export async function signatureFromTxHash(
  txHash: string,
): Promise<[string, string]> {
  const url: string = "https://rpc.testnet.near.org";

  const payload = {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "EXPERIMENTAL_tx_status",
    params: {
      tx_hash: txHash,
      sender_account_id: "ethdenver2024.testnet",
    },
  };

  // Make the POST request with the fetch API
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const jsonResponse = await response.json();

  // Extract receipts_outcome
  const receiptsOutcome = jsonResponse.result.receipts_outcome;

  // Map to get SuccessValue
  const successValues = receiptsOutcome.map(
    // eslint-disable-next-line
    (outcome: any) => outcome.outcome.status.SuccessValue,
  );

  // Select the middle element
  const middleIndex = Math.floor(successValues.length / 2) - 1;
  const middleSuccessValue = successValues[middleIndex];

  // Decode from base64
  const decodedValue = Buffer.from(middleSuccessValue, "base64").toString(
    "utf-8",
  );

  console.log(decodedValue);
  return JSON.parse(decodedValue);
}

export async function initializeAdapter(
  selector: WalletSelector,
): Promise<NearEthAdapter> {
  const nearWallet = await selector.wallet();
  const account = await nearAccountFromWallet(nearWallet);
  const adapter = await NearEthAdapter.fromConfig({
    mpcContract: new MultichainContract(
      account,
      process.env.NEXT_PUBLIC_NEAR_MULTICHAIN_CONTRACT!,
    ),
    derivationPath: "ethereum,1",
  });
  return adapter;
}
