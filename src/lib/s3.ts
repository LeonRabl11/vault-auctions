import {DeleteObjectCommand, S3Client} from "@aws-sdk/client-s3";

// Env strikt lesen — fehlende Werte sollen früh und klar fehlschlagen.
function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ist nicht gesetzt (siehe .env.example).`);
  }
  return value;
}

export function getS3Config() {
  return {
    region: env("AWS_REGION"),
    bucket: env("AWS_S3_BUCKET"),
  };
}

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: env("AWS_REGION"),
      credentials: {
        accessKeyId: env("AWS_ACCESS_KEY_ID"),
        secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }
  return cachedClient;
}

// Öffentlich erreichbare URL (Virtual-Hosted-Style) für einen Object-Key.
export function publicUrl(key: string): string {
  const {region, bucket} = getS3Config();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// Prefix unseres Buckets — gegen das Speichern von Fremd-URLs.
function bucketPrefix(): string {
  const {region, bucket} = getS3Config();
  return `https://${bucket}.s3.${region}.amazonaws.com/`;
}

// Stammt die URL aus unserem Bucket? (nur eigene Uploads speichern)
export function isOwnBucketUrl(url: string): boolean {
  return url.startsWith(bucketPrefix());
}

// Objekt anhand seiner öffentlichen URL löschen (Best-Effort; Fremd-URLs ignoriert).
export async function deleteObjectByUrl(url: string): Promise<void> {
  const prefix = bucketPrefix();
  if (!url.startsWith(prefix)) return;
  const key = url.slice(prefix.length);
  await getS3Client().send(
    new DeleteObjectCommand({Bucket: getS3Config().bucket, Key: key}),
  );
}
