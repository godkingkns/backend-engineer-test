// Types and Interfaces for Block, Transaction, Input, Output

export interface Output {
    address: string;
    value: number;
  }
  
  export interface Input {
    txId: string;
    index: number;
  }
  
  export interface Transaction {
    id: string;
    inputs: Array<Input>;
    outputs: Array<Output>;
  }
  
  export interface Block {
    id: string;
    height: number;
    transactions: Array<Transaction>;
  }
  
  // Validation Error Interface
  export interface ValidationError {
    error: string;
  }
  
  // Request Parameters
  export interface BalanceRouteParams {
    address: string;
  }

  export interface RollbackRouteParams {
    height: string;
  }