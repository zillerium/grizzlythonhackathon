// Client
console.log("My address:", pg.wallet.publicKey.toString());
const balance = await pg.connection.getBalance(pg.wallet.publicKey);
console.log(`My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);
//creating a new transaction
const transaction = new web3.Transaction();

// adding hello world transaction instruction to the program 
transaction.add(
  new web3.TransactionInstruction({
    keys:[],
    programId:new web3.PublicKey(pg.PROGRAM_ID),

  }),
);
//send transaction to solana cluster 
// send the transaction to the Solana cluster
console.log("Sending transaction...");
const txHash = await web3.sendAndConfirmTransaction(
  pg.connection,
  transaction,
  [pg.wallet.keypair],
);
console.log("Transaction sent with hash:", txHash);