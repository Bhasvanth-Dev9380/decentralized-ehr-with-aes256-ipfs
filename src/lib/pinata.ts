import axios from "axios";

const PINATA_API_KEY = process.env.PINATA_API_KEY!;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY!;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

/**
 * Upload encrypted file buffer to Pinata (IPFS)
 */
export async function uploadToPinata(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ ipfsHash: string; pinataUrl: string }> {
  const FormData = (await import("form-data")).default;
  const formData = new FormData();

  formData.append("file", fileBuffer, {
    filename: fileName,
    contentType: "application/octet-stream",
  });

  const metadata = JSON.stringify({ name: fileName });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({ cidVersion: 1 });
  formData.append("pinataOptions", options);

  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    }
  );

  const ipfsHash = response.data.IpfsHash;
  return {
    ipfsHash,
    pinataUrl: `${PINATA_GATEWAY}/${ipfsHash}`,
  };
}

/**
 * Download file from Pinata (IPFS) by hash
 */
export async function downloadFromPinata(ipfsHash: string): Promise<Buffer> {
  const response = await axios.get(`${PINATA_GATEWAY}/${ipfsHash}`, {
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data);
}
