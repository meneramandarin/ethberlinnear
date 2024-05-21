// pages/callback.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Callback = () => {
  const router = useRouter();
  const { transactionHashes } = router.query;

  useEffect(() => {
    if (transactionHashes) {
      // Handle the transactionHashes here
      console.log('Transaction Hashes:', transactionHashes);
      // You can add logic to process the transactionHashes, such as making an API call
    }
  }, [transactionHashes]);

  return (
    <div>
      <h1>Callback Page</h1>
      <p>Handling the callback logic...</p>
      {transactionHashes && <p>Transaction Hashes: {transactionHashes}</p>}
    </div>
  );
};

export default Callback;
