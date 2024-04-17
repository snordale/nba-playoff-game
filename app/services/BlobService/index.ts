import { put } from "@vercel/blob";

async function blobEx() {
  const { url } = await put("articles/blob.txt", "Hello World!", {
    access: "public",
  });
}


async function createUser() {
  const { url } = await put("users/user.txt", "Hello User!", {
    access: "public",
  });
}