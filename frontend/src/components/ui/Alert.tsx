import React from "react";

interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type = "info", message }) => {
  const bgColors: Record<string, string> = {
    info: "bg-blue-100 border-blue-400 text-blue-700",
    success: "bg-green-100 border-green-400 text-green-700",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700",
    error: "bg-red-100 border-red-400 text-red-700",
  };
  const className = `${bgColors[type]} border-l-4 p-4 rounded`;
  return <div className={className}>{message}</div>;
};
