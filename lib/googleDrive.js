import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

export async function uploadToDrive(buffer, fileName, mimeType = "application/pdf") {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : [],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink,
  };
}

export async function deleteFromDrive(fileId) {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  await drive.files.delete({ fileId });
}
