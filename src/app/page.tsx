import type { Metadata } from "next";
import { LandingPage } from "@/features/marketing/components/landing-page";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP_NAME} — Multi-sport intelligence for scouts`,
  description:
    "OmniScout is a multi-sport intelligence platform for soccer, basketball, and American football: explainable roles, trajectory, recruitment fit, and honest sample limits.",
};

export default function RootPage() {
  return <LandingPage />;
}
