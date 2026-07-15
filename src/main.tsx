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

if (!posthogToken || !posthogHost) {
  throw new Error("PostHog environment variables are not configured.");
}

const convex = new ConvexReactClient(convexUrl);

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST as string,
  defaults: "2026-05-30",
} as const;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string}
      options={posthogOptions}
    >
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </PostHogProvider>
  </StrictMode>,
);
