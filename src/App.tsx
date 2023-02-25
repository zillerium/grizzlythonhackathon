//import 'bootstrap/dist/css/bootstrap.min.css';
import { WalletAdapterNetwork, WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { Button, Container, Row, Col} from 'react-bootstrap';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { UnsafeBurnerWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, Keypair, TransactionInstruction, SystemProgram, Transaction, sendAndConfirmTransaction, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {getAssociatedTokenAddress, createTransferCheckedInstruction, getAccount, getMint} from '@solana/spl-token';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import {Buffer} from 'buffer';
import BN from 'bn.js';
import * as borsh from 'borsh';
require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');
window.Buffer = Buffer;
const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            /**
             * Wallets that implement either of these standards will be available automatically.
             *
             *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
             *     (https://github.com/solana-mobile/mobile-wallet-adapter)
             *   - Solana Wallet Standard
             *     (https://github.com/solana-labs/wallet-standard)
             *
             * If you wish to support a wallet that supports neither of those standards,
             * instantiate its legacy wallet adapter here. Common legacy adapters can be found
             * in the npm package `@solana/wallet-adapter-wallets`.
             */
            new PhantomWalletAdapter(),
            new UnsafeBurnerWalletAdapter(),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

interface MyInstructionType {
  //discriminator: number;
 // amount: number;
  [key: string]: number | bigint | BN;
  
}

class MyInstruction {
  [key: string]: number | bigint | BN;
  constructor(obj: MyInstructionType) {
    for (const key in obj) {
      this[key] = obj[key];
    }
  }
}

const MyInstructionSchema = new Map([
  [
    MyInstruction,
    {
      kind: "struct",
      fields: [
        ["discriminator", "u8"],
        ["amount", "u64"],
      ],
    },
  ],
]);

const encodeIxData = (ix: MyInstructionType = {}) => {
  return Buffer.from(
    borsh.serialize(MyInstructionSchema, new MyInstruction(ix))
  );
};

const Content: FC = () => {

     const { connection } = useConnection();
     console.log("connecton == ", connection);
     const  {publicKey, sendTransaction}  = useWallet();
     const [balance, setBalance] = useState(0);
     const [usdcBalance, setUsdcBalance] = useState(0);
     const [solAddr, setSolAddr] = useState('0x');
     const [solAmount, setSolAmount] = useState(0);
     const [payeeUsdcAddr, setPayeeUsdcAddr] = useState('0x');
     const [payeeUsdcAmount, setPayeeUsdcAmount] = useState(0);
     const [hash, setHash] = useState('0x');
     const [txnSignature, setTxnSignature] = useState('0x');
     const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; 
     const usdcMintKey = new PublicKey(USDC_MINT);
   
   
     const fetchBalance = async () => {
          console.log("publicKey ----", publicKey);
          //const publicKey1 = new PublicKey(publicKey.publicKey);
          if (publicKey) {
             const ata = await getAssociatedTokenAddress(usdcMintKey, publicKey);
             let accountData = await getAccount(connection, ata, "confirmed");
             const balance1 = await connection.getBalance(publicKey);
             //console.log("publicKey1 ----", publicKey1);
             const lamportBalance=(balance1/LAMPORTS_PER_SOL);
             setBalance(lamportBalance);
             console.log("account data ", Number(accountData.amount)/ 10**6);
             const usdcAmount = (Number(accountData.amount)/ 10**6);
             //const usdcAmount = parseFloat(parseFloat(accountData.amount)/ 10**6);
             console.log("usdc ", usdcAmount);
             setUsdcBalance(usdcAmount);
             console.log("balance == "+ balance1);
         } else {
             setBalance(0);
         } 
         //  setBalance(balance1);
     };

     const sendSol = async () => {

        if (!publicKey) throw new WalletNotConnectedError();
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const lamports = await connection.getMinimumBalanceForRentExemption(0);

        console.log("lamports = ", lamports);

        if (publicKey) {
            const fromPublicKey = new PublicKey(publicKey);
            const toPublicKey = new PublicKey(solAddr);
            const k1 = Keypair.generate();
      	    let transaction = new Transaction();
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: fromPublicKey,
	        toPubkey: toPublicKey,
	        lamports: solAmount	   
	      }),
	    );
            const signature = await sendTransaction(transaction, connection, {minContextSlot});
            const signatureResult = await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
            fetchBalance();
            console.log(" signature ", signature);
            setTxnSignature(signature);
        }
    }


     const sendUsdc = async () => {

        if (!publicKey) throw new WalletNotConnectedError();
             const ata = await getAssociatedTokenAddress(usdcMintKey, publicKey);
             let accountData = await getAccount(connection, ata, "confirmed");
        const {
           context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const usdcMint = await getMint(connection, usdcMintKey);
        const payeePublicKey = new PublicKey(payeeUsdcAddr);
        const payerUsdcAddress = await getAssociatedTokenAddress(usdcMintKey, publicKey);
        const payeeUsdcAddress = await getAssociatedTokenAddress(usdcMintKey, payeePublicKey);
     //   const { blockhash } = await connection.getLatestBlockhash("finalized");
        const bigAmount = Number(payeeUsdcAmount);
        const transferInstruction = createTransferCheckedInstruction(
      payerUsdcAddress,
      usdcMintKey,    // This is the address of the token we want to transfer
      payeeUsdcAddress,
      publicKey,
      //bigAmount * 10 ** (await usdcMint).decimals,
      bigAmount ,
      usdcMint.decimals // The token could have any number of decimals
    );

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: publicKey,
    })

   // const orderID = "1";
  //  transferInstruction.keys.push({
  //    pubkey: new PublicKey(orderID),
  //    isSigner: false,
  //    isWritable: false,
  //  });

    tx.add(transferInstruction);
console.log("tx, ", tx);

            const signature = await sendTransaction(tx, connection, {minContextSlot});
            const signatureResult = await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
            fetchBalance();
            console.log(" signature ", signature);
            setTxnSignature(signature);
    }

 const transferSol = async () => {

        if (!publicKey) throw new WalletNotConnectedError();

             const programId = new PublicKey('7XyzLTMw7nBzoZnYoxauCzv11ruJee3HqjbxCyDfYb52'); //transfer sol
        const {
           context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const fromPublicKey = new PublicKey(publicKey);
            const toPublicKey = new PublicKey(solAddr);

    const amount = new BN(solAmount * LAMPORTS_PER_SOL);
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: publicKey,
    })
 //const blockhashInfo = await connection.getLatestBlockhash();
// const tx = new Transaction({
//     ...blockhashInfo, feePayer: publicKey,
// });  

console.log("from pub key ", fromPublicKey.toString());
console.log("from pub key ", publicKey.toString());
console.log("to pub key ", toPublicKey.toString());
console.log("system programid ", SystemProgram.programId.toString());

      const transactionInstruction = 
         new TransactionInstruction({
        programId,
        keys: [
          {pubkey: publicKey, isSigner: false, isWritable: true},
          {pubkey: toPublicKey, isSigner: false, isWritable: true},
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: true},
          // add any additional keys here
        ],
        data: encodeIxData({ discriminator: 0, amount }), 
      }); 

      tx.add(transactionInstruction);
      const simResult = await connection.simulateTransaction(tx);
      console.log(simResult);     
console.log("tx === ", tx);
            const signature = await sendTransaction(tx, connection, {minContextSlot});
            const signatureResult = await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
            console.log(" signature ", signature);
            setTxnSignature(signature);
}



     const sayhello = async () => {

        if (!publicKey) throw new WalletNotConnectedError();

             const programId = new PublicKey('CUgnHsgaoxjjzzxRvuTTanZrYrLkMKd3YHWox7dXCVtM'); //hello world
        const {
           context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: publicKey,
    })
      tx.add(
         new TransactionInstruction({
        programId,
        keys: [
          {pubkey: publicKey, isSigner: false, isWritable: true},
          // add any additional keys here
        ],
        data: Buffer.from([]),
      })
    );

     console.log("tx, ", tx);

            const signature = await sendTransaction(tx, connection, {minContextSlot});
            const signatureResult = await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
            console.log(" signature ", signature);
            setTxnSignature(signature);
    }

    useEffect(() => {
        fetchBalance();
    }, [connection, publicKey]);

     const handleShowBalance = async () => {
       if (!connection) {
         return;
       }
     //  const wallet=useWallet()
//       const SOLANA_HOST = clusterApiUrl("devnet");
  //     let lamportBalance;
    //   if (wallet?.publicKey) {
         //  const balance = await connection.getBalance(wallet.publicKey);
        //   lamportBalance=(balance/LAMPORTS_PER_SOL);
        //   setBalance(lamportBalance);
    //   }
    
     };
            //<WalletMultiButton />

    return (
        <div >
            <Container>
               <Row>
                   <h1 className="text-light"> Connect to a Wallet</h1>
               </Row>
               <Row>
                   <Col xs={6}>
                       
                    <WalletMultiButton />
                   </Col>
               </Row>
               <Row>
                   <Col xs={4}>
                       <Button variant="primary" onClick={handleShowBalance}>Show Balances</Button>
                   </Col>
                   <Col xs={4} className="text-light">{balance != null ? `Sol Balance: ${balance}`: 'connecting ...'}</Col>
                   <Col xs={4} className="text-light">{balance != null ? `Lamports Per Sol: ${LAMPORTS_PER_SOL}`: 'connecting ...'}</Col>
               </Row>
               <Row>
                   <Col xs={4}>
                   </Col>
                   <Col xs={4} className="text-light">{usdcBalance != null ? `USDC Balance: ${usdcBalance}`: 'connecting ...'}</Col>
               </Row>
               <Row>
                   <Col xs={3}>
                       <Button variant="primary" onClick={sendSol}>Send Sol</Button>
                   </Col>
                   <Col xs={3}>
                       <input placeholder="solAmount" onChange={(e)=>setSolAmount(parseFloat(e.target.value))} />
                   </Col>
                   <Col xs={3}>
                       <input placeholder="wallet address" onChange={(e)=>setSolAddr(e.target.value)} />
                   </Col>
                   <Col xs={3} className="text-light">eg 4dGDp3BuTaXiqJwwJhh9abUBBm6hMhRkidttr5N4Cemm</Col>
               </Row>
               <Row>
                   <Col xs={3}>
                       <Button variant="primary" onClick={sendUsdc}>Send Usdc</Button>
                   </Col>
                   <Col xs={3}>
                       <input placeholder="usdc Amount" onChange={(e)=>setPayeeUsdcAmount(parseFloat(e.target.value))} />
                   </Col>
                   <Col xs={3}>
                       <input placeholder="wallet address" onChange={(e)=>setPayeeUsdcAddr(e.target.value)} />
                   </Col>
                   <Col xs={3} className="text-light">eg 4dGDp3BuTaXiqJwwJhh9abUBBm6hMhRkidttr5N4Cemm</Col>
               </Row>
               <Row>
                  <Col xs={6} className="text-light">{txnSignature && (
                    <a href={`https://explorer.solana.com/tx/${txnSignature}?cluster=devnet`} target="_blank">
                    {txnSignature}
                    </a>
                    )}
                   </Col>
               </Row>
               <Row>
                  <Col xs={6} >
<p>CUgnHsgaoxjjzzxRvuTTanZrYrLkMKd3YHWox7dXCVtM</p>
                       <Button variant="primary" onClick={sayhello}> say hello - CUgnHsgaoxjjzzxRvuTTanZrYrLkMKd3YHWox7dXCVtM</Button>
                   </Col>
               </Row>
               <Row>
                  <Col xs={6} >
<p>BQUQkVyEduQDViakCN6Gdy3UE2x4gFM753ZwFDZfRGm</p>
                       <Button variant="primary" onClick={transferSol}> transfer sol BQUQkVyEduQDViakCN6Gdy3UE2x4gFM753ZwFDZfRGm</Button>
                   </Col>
               </Row>
            </Container>       
        </div>
    );
};
