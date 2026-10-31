import { Hero } from "../components/landing/Hero";
import { Marquee } from "../components/landing/Marquee";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8">
      <Hero />
      <Marquee />
    </div>
  );
}
