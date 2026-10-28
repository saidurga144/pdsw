import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { User } from "@/types";
import { normalizeRole } from "@/lib/role-utils";

export const GET = withAuth(async (req, { user }) => {
  const short = user.userId.startsWith("usr-w-")
    ? `0x${user.userId.replace("usr-w-", "")}`
    : user.userId;

  const fallbackUser: User = {
    id: user.userId,
    name: user.fullName || `Citizen (${short})`,
    email: user.email,
    role: normalizeRole(user.role),
    walletAddress: user.email.includes("@pdsw.eth") ? undefined : undefined,
    jurisdiction: user.jurisdiction || "National Jurisdiction",
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`,
  };

  return NextResponse.json({ success: true, user: fallbackUser });
});
