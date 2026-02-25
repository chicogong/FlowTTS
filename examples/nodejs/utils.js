import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import tencentcloud from "tencentcloud-sdk-nodejs";

const TrtcClient = tencentcloud.trtc.v20190722.Client;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the project root directory path.
 */
export function projectRoot() {
  return resolve(__dirname, "../..");
}

/**
 * Load environment variables from project root .env file.
 * Returns { secretId, secretKey, sdkAppId, endpoint }.
 */
export function loadConfig() {
  config({ path: resolve(projectRoot(), ".env") });

  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const sdkAppId = parseInt(
    process.env.TENCENTCLOUD_SDK_APP_ID ||
      process.env.SDKAPPID ||
      "1400000000",
    10
  );
  const endpoint =
    process.env.TENCENTCLOUD_ENDPOINT || "trtc.ai.tencentcloudapi.com";

  if (!secretId || !secretKey) {
    console.error(
      "Error: TENCENTCLOUD_SECRET_ID and TENCENTCLOUD_SECRET_KEY are required"
    );
    process.exit(1);
  }

  return { secretId, secretKey, sdkAppId, endpoint };
}

/**
 * Create a Tencent Cloud TRTC client.
 * @param {object} cfg - Config from loadConfig()
 * @param {string} [endpointOverride] - Override the default endpoint
 */
export function createClient(cfg, endpointOverride) {
  return new TrtcClient({
    credential: {
      secretId: cfg.secretId,
      secretKey: cfg.secretKey,
    },
    region: "ap-beijing",
    profile: {
      httpProfile: {
        endpoint: endpointOverride || cfg.endpoint,
        reqTimeout: 120,
      },
    },
  });
}

/**
 * Convert raw PCM data to WAV format by prepending a 44-byte WAV header.
 * @param {Buffer} pcmBuffer - Raw PCM audio data
 * @param {number} [sampleRate=24000] - Sample rate in Hz
 * @param {number} [channels=1] - Number of audio channels
 * @param {number} [bitsPerSample=16] - Bits per sample
 * @returns {Buffer} WAV format audio data
 */
export function pcmToWav(
  pcmBuffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);
  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);
  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Sub-chunk size
  header.writeUInt16LE(1, 20); // Audio format (PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}
