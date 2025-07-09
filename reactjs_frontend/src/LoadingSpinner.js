import React from "react";

/**
 * PUBLIC_INTERFACE
 * LoadingSpinner - Minimal, modern spinning loader for waiting states.
 * @returns Loader JSX element
 */
function LoadingSpinner({ size = 36 }) {
  return (
    <span
      className="loader-spinner"
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        display: "inline-block",
        verticalAlign: "middle"
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        style={{ display: "block" }}
        aria-hidden="true"
      >
        <circle
          className="loader-spinner-track"
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="#dbeafe"
          strokeWidth="4"
          opacity="0.31"
        />
        <circle
          className="loader-spinner-head"
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="#3F6E8D"
          strokeWidth="4"
          strokeDasharray="30 96"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 24 24"
            to="360 24 24"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </span>
  );
}

export default LoadingSpinner;
