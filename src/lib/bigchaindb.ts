import * as driver from "bigchaindb-driver";

const BIGCHAINDB_URL = process.env.BIGCHAINDB_URL || "http://localhost:9984/api/v1/";

const conn = new driver.Connection(BIGCHAINDB_URL);

// Application keypair for signing transactions
const appKeypair = new driver.Ed25519Keypair();

export interface AssetData {
  type: string;
  [key: string]: any;
}

export interface MetaData {
  [key: string]: any;
}

/**
 * Create a new asset on BigchainDB
 */
export async function createAsset(asset: AssetData, metadata: MetaData) {
  const tx = driver.Transaction.makeCreateTransaction(
    asset,
    metadata,
    [
      driver.Transaction.makeOutput(
        driver.Transaction.makeEd25519Condition(appKeypair.publicKey)
      ),
    ],
    appKeypair.publicKey
  );

  const signedTx = driver.Transaction.signTransaction(tx, appKeypair.privateKey);

  try {
    const postedTx = await conn.postTransactionCommit(signedTx);
    return postedTx;
  } catch (error) {
    console.error("BigchainDB create error:", error);
    throw error;
  }
}

/**
 * Search assets by key-value
 */
export async function searchAssets(searchTerm: string) {
  try {
    const assets = await conn.searchAssets(searchTerm);
    return assets;
  } catch (error) {
    console.error("BigchainDB search error:", error);
    return [];
  }
}

/**
 * Search metadata
 */
export async function searchMetadata(searchTerm: string) {
  try {
    const metadata = await conn.searchMetadata(searchTerm);
    return metadata;
  } catch (error) {
    console.error("BigchainDB metadata search error:", error);
    return [];
  }
}

/**
 * Get transaction by ID
 */
export async function getTransaction(txId: string) {
  try {
    const tx = await conn.getTransaction(txId);
    return tx;
  } catch (error) {
    console.error("BigchainDB get transaction error:", error);
    return null;
  }
}

/**
 * Store a file hash record on BigchainDB
 */
export async function storeFileRecord(
  patientId: string,
  fileName: string,
  ipfsHash: string,
  uploadedBy: string
) {
  const asset = {
    type: "medical_record",
    patientId,
    fileName,
    ipfsHash,
    uploadedBy,
    timestamp: new Date().toISOString(),
  };

  const metadata = {
    action: "file_upload",
    patientId,
    ipfsHash,
  };

  return createAsset(asset, metadata);
}

/**
 * Log an access event on BigchainDB
 */
export async function logAccessEvent(
  patientId: string,
  doctorId: string,
  doctorName: string,
  fileName: string,
  ipfsHash: string,
  accessGranted: boolean
) {
  const asset = {
    type: "access_log",
    patientId,
    doctorId,
    doctorName,
    fileName,
    ipfsHash,
    accessGranted,
    timestamp: new Date().toISOString(),
  };

  const metadata = {
    action: "access_request",
    patientId,
    doctorId,
    granted: accessGranted,
  };

  return createAsset(asset, metadata);
}

/**
 * Get all file records for a patient
 */
export async function getPatientFileRecords(patientId: string) {
  const assets = await searchAssets(patientId);
  return assets.filter(
    (a: any) => a.data?.type === "medical_record" && a.data?.patientId === patientId
  );
}

/**
 * Get all access logs for a patient
 */
export async function getPatientAccessLogs(patientId: string) {
  const assets = await searchAssets(patientId);
  return assets.filter(
    (a: any) => a.data?.type === "access_log" && a.data?.patientId === patientId
  );
}

export { conn, appKeypair };
