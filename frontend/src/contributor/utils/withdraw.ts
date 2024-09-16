import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, } from "@solana/web3.js";
import IDL from "./capstone.json";
import { Buffer } from "buffer";
import VaultWallet from './vault.json'



export default async function initialize(
  connectedPublicKey: PublicKey,
  provider: any,
  baseAccount: any,
) {

  const generate = JSON.stringify(IDL);
  const b = JSON.parse(generate);
  const program = new Program(b, provider);

  const fundraiser = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("fundraiser"), baseAccount.publicKey.toBuffer()],
    program.programId
  )[0];

  const vaultKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(VaultWallet));


  const confirm = async (signature: string): Promise<string> => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block,
    });
    console.log(signature);
    return signature;
  };

  const initialize = async () => {
    const initInstruction = await program.methods
      .check_contributions()
      .accountsPartial({
        maker: baseAccount.publicKey, // baseAccount as maker
        fundraiser: fundraiser,
        vault: vaultKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction(); // Make sure to await this

    // Create a new transaction and add the awaited instruction
    const transaction = new anchor.web3.Transaction().add(initInstruction);

    const { blockhash } = await provider.connection.getLatestBlockhash();

    // Set the recent blockhash in the transaction
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.wallet.publicKey;

    try {
      const signature = await provider.sendAndConfirm(transaction, [baseAccount, vaultKeypair]).then(confirm); // baseAccount passed as signer
      console.log("Transaction sent with signature:", signature);
      return signature;
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  };

  
  return initialize();
}
