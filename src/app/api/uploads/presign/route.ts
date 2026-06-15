import {NextResponse} from "next/server";
import {headers} from "next/headers";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {auth} from "@/lib/auth";
import {getS3Client, getS3Config, publicUrl} from "@/lib/s3";
import {presignSchema} from "@/lib/validation/auction";

// Dateiendung pro erlaubtem Bildtyp
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  // Nur eingeloggte Nutzer dürfen Upload-URLs anfordern
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) {
    return NextResponse.json({error: "unauthorized"}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({error: "invalid"}, {status: 400});
  }

  const {contentType, size} = parsed.data;
  const key = `auctions/${crypto.randomUUID()}.${EXTENSION[contentType]}`;

  // ContentType + ContentLength werden mitsigniert -> Browser muss exakt diese
  // Werte senden (begrenzt damit zugleich die Upload-Größe).
  const command = new PutObjectCommand({
    Bucket: getS3Config().bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {expiresIn: 60});

  return NextResponse.json({uploadUrl, publicUrl: publicUrl(key)});
}
