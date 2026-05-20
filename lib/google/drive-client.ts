import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

import { createOAuthClient } from "@/lib/google/oauth";

// Cria Drive client autenticado com access_token. Cada chamada cria um client
// novo pra evitar mistura de credenciais entre usuarios.
function getDriveClient(accessToken: string): drive_v3.Drive {
  const oauth = createOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth: oauth });
}

export interface DriveFolder {
  id: string;
  name: string;
  parents?: string[];
}

// Lista pastas do Drive do usuario. Limita a 100 pra UI nao explodir.
// Filtra apenas pastas (mimeType folder) que nao estao na lixeira.
export async function listFolders(accessToken: string): Promise<DriveFolder[]> {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name, parents)",
    pageSize: 100,
    orderBy: "name",
  });
  const files = res.data.files ?? [];
  return files
    .filter((f): f is drive_v3.Schema$File & { id: string; name: string } =>
      Boolean(f.id && f.name)
    )
    .map((f) => ({
      id: f.id,
      name: f.name,
      parents: f.parents ?? undefined,
    }));
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

// Lista arquivos numa pasta especifica, filtrando por mimeType e modificados
// apos um certo momento (pra sync incremental).
export async function listFilesInFolder(args: {
  accessToken: string;
  folderId: string;
  mimeTypes: string[];
  modifiedAfter?: string | null;
}): Promise<DriveFile[]> {
  const drive = getDriveClient(args.accessToken);

  const mimeQuery = args.mimeTypes
    .map((mt) => `mimeType='${mt.replace(/'/g, "\\'")}'`)
    .join(" or ");

  const queryParts: string[] = [
    `'${args.folderId}' in parents`,
    "trashed=false",
  ];
  if (mimeQuery) queryParts.push(`(${mimeQuery})`);
  if (args.modifiedAfter) {
    queryParts.push(`modifiedTime > '${args.modifiedAfter}'`);
  }

  const res = await drive.files.list({
    q: queryParts.join(" and "),
    fields: "files(id, name, mimeType, modifiedTime)",
    pageSize: 200,
    orderBy: "modifiedTime desc",
  });

  const files = res.data.files ?? [];
  return files
    .filter(
      (f): f is drive_v3.Schema$File & {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string;
      } => Boolean(f.id && f.name && f.mimeType && f.modifiedTime)
    )
    .map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
    }));
}

// Exporta um Google Doc como texto plano.
export async function getDocText(args: {
  accessToken: string;
  fileId: string;
}): Promise<string> {
  const drive = getDriveClient(args.accessToken);
  const res = await drive.files.export(
    {
      fileId: args.fileId,
      mimeType: "text/plain",
    },
    { responseType: "text" }
  );
  // googleapis retorna text como string quando responseType=text.
  return typeof res.data === "string" ? res.data : String(res.data ?? "");
}
