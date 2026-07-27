import type { Metadata } from "next";
import { LandingPage } from "@/features/marketing/components/landing-page";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP_NAME} — Decision layer for scouts`,
  description:
    "OmniScout is a multi-sport intelligence platform for scouting workflows: explainable roles, trajectory, recruitment fit, and honest sample limits.",
};

export default function RootPage() {
  return <LandingPage />;
}
