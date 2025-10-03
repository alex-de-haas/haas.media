import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

export default function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className={`spinner-3 ${sizeClasses[size]} rounded-full bg-gray-800 relative`}>
        <div className="absolute w-full h-full bg-gray-800 rounded-full animate-ping"></div>
        <div className="absolute w-full h-full bg-gray-800 rounded-full animate-ping delay-200"></div>
      </div>
    </div>
  );
}
