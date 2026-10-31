import CareGuide from "@/components/CareGuide";

export const metadata = {
  title: "Care Guide · AccessCare Navigator",
};

export default function GuidePage() {
  return (
    <div className="page page--narrow">
      <CareGuide />
    </div>
  );
}
