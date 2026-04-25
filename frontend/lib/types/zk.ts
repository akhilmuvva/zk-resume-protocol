/**
 * ZK Resume Protocol — SnarkJS & Circomlib Types
 */

export interface SnarkProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: "groth16";
  curve: "bn128";
}

export interface VerificationKey {
  protocol: "groth16";
  curve: "bn128";
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][][];
  IC: string[][];
}

export interface CircomlibPoseidon {
  (inputs: bigint[]): any;
  F: {
    toString: (val: any) => string;
    toObject: (val: any) => bigint;
  };
}

export interface CircomlibJS {
  buildPoseidon: () => Promise<CircomlibPoseidon>;
}

export interface SnarkJSGroth16 {
  fullProve: (
    input: Record<string, string | number | bigint>,
    wasm: Uint8Array,
    zkey: Uint8Array
  ) => Promise<{ proof: SnarkProof; publicSignals: string[] }>;
  
  verify: (
    vkey: VerificationKey,
    publicSignals: string[],
    proof: SnarkProof
  ) => Promise<boolean>;

  exportSolidityCallData: (
    proof: SnarkProof,
    publicSignals: string[]
  ) => Promise<string>;
}

export interface SnarkJS {
  groth16: SnarkJSGroth16;
}
