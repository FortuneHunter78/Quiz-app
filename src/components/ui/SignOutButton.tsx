"use client";

import { signOut } from "next-auth/react";
import { Button } from "./Button";

export function SignOutButton() {
  return (
    <Button 
      onClick={() => signOut()}
      className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:border-red-400"
    >
      Выйти
    </Button>
  );
}