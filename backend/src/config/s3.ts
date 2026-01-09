import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || 'my1eparty-documents';

// Upload file to S3
export async function uploadToS3(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; key: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return { success: true, key };
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<{ success: boolean }> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  return { success: true };
}

// Get pre-signed URL for file download
export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await awsGetSignedUrl(s3Client, command, { expiresIn });
  return url;
}
