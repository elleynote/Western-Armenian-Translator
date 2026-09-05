import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { HomeTranslatorExperience } from "@/components/HomeTranslatorExperience";

export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  }
};

export default function Home() {
  return (
    <SiteFrame>
      <HomeTranslatorExperience />
    </SiteFrame>
  );
}
