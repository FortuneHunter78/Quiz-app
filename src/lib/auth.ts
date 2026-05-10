import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  if (args.length === 0) return getServerSession(authOptions);
  return getServerSession(args[0], args[1], authOptions);
}
