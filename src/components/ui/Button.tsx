import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, className = "", ...props }: ButtonProps) {
  const defaultClasses = "px-4 py-2 rounded-md font-medium transition";
  const baseClasses = className || "bg-blue-500 text-white hover:bg-blue-600";
  
  return (
    <button
      className={`${defaultClasses} ${baseClasses}`}
      {...props}
    >
      {children}
    </button>
  );
}
