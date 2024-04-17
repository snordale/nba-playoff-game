import { put } from "@vercel/blob";

async function blobEx() {
  const { url } = await put("articles/blob.txt", "Hello World!", {
    access: "public",
  });
}
