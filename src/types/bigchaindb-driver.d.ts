declare module "bigchaindb-driver" {
  export class Ed25519Keypair {
    publicKey: string;
    privateKey: string;
    constructor(seed?: Buffer);
  }

  export class Connection {
    constructor(url: string, headers?: Record<string, string>);
    postTransactionCommit(transaction: any): Promise<any>;
    searchAssets(search: string): Promise<any[]>;
    searchMetadata(search: string): Promise<any[]>;
    getTransaction(transactionId: string): Promise<any>;
    listOutputs(publicKey: string, spent?: boolean): Promise<any[]>;
  }

  export namespace Transaction {
    function makeCreateTransaction(
      asset: any,
      metadata: any,
      outputs: any[],
      ...issuers: string[]
    ): any;

    function makeTransferTransaction(
      unspentOutputs: any[],
      outputs: any[],
      metadata: any
    ): any;

    function makeOutput(condition: any, amount?: string): any;
    function makeEd25519Condition(publicKey: string, replay?: boolean): any;
    function signTransaction(transaction: any, ...privateKeys: string[]): any;
  }
}
