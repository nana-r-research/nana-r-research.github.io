import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

const allowedEmails = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);

export async function getAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  if (!email || !allowedEmails().includes(email)) return null;
  return { userId, email };
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) notFound();
  return admin;
}
