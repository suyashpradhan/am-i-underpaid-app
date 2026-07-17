import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PostHogProvider } from "@posthog/react";
import App from "./App";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const posthogToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not configured.");
}

const convex = new ConvexReactClient(convexUrl);

const posthogOptions = {
  api_host: posthogHost as string,
  defaults: "2026-05-30",
  autocapture: false,
  capture_pageview: true,
  capture_pageleave: true,
  disable_session_recording: false,
  person_profiles: "never",
  persistence: "sessionStorage",
} as const;

const application = (
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {posthogToken && posthogHost ? (
      <PostHogProvider apiKey={posthogToken} options={posthogOptions}>
        {application}
      </PostHogProvider>
    ) : (
      application
    )}
  </StrictMode>,
);
