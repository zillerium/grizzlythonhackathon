//import 'bootstrap/dist/css/bootstrap.min.css';
import { WalletAdapterNetwork, WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { Button, Container, Row, Col} from 'react-bootstrap';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { UnsafeBurnerWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {getAssociatedTokenAddress, createTransferCheckedInstruction, getAccount, getMint} from '@solana/spl-token';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import {Buffer} from 'buffer';
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
             const usdcAmount = (Number(accountData.amount)/ 10**6).toFixed(2);
             console.log("usdc ", usdcAmount);
             setUsdcBalance(parseFloat(usdcAmount));
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
        }
    }


     const sendUsdc = async () => {

        if (!publicKey) throw new WalletNotConnectedError();
             const ata = await getAssociatedTokenAddress(usdcMintKey, publicKey);
             let accountData = await getAccount(connection, ata, "confirmed");
  //      const {
    //        context: { slot: minContextSlot },
      //      value: { blockhash, lastValidBlockHeight }
     //   } = await connection.getLatestBlockhashAndContext();

        const usdcMint = await getMint(connection, usdcMintKey);
        const payeePublicKey = new PublicKey(payeeUsdcAddr);
        const payerUsdcAddress = await getAssociatedTokenAddress(usdcMintKey, publicKey);
        const payeeUsdcAddress = await getAssociatedTokenAddress(usdcMintKey, payeePublicKey);
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        const bigAmount = Number(payeeUsdcAmount);
        const transferInstruction = createTransferCheckedInstruction(
      payerUsdcAddress,
      usdcMintKey,    // This is the address of the token we want to transfer
      payeeUsdcAddress,
      publicKey,
      bigAmount * 10 ** (await usdcMint).decimals,
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
   const serializedTransaction = tx.serialize({
      requireAllSignatures: false,
    });

    const base64 = serializedTransaction.toString("base64");

//            const signature = await sendTransaction(transaction, connection, {minContextSlot});
  //          const signatureResult = await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
    //        fetchBalance();
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
                   <Col xs={4} className="text-light">{usdcBalance != null ? `USDC Balance: ${usdcBalance.toFixed(2)}`: 'connecting ...'}</Col>
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
            </Container>       
        </div>
    );
};
