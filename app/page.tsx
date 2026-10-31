import IntakeForm from "@/components/IntakeForm";
import { Cobweb, MoonMark } from "@/components/Icons";

export default function Home() {
  return (
    <div className="page page--narrow">
      <section className="hero" aria-labelledby="hero-title">
        <Cobweb className="hero__web" />
        <p className="eyebrow reveal">
          <MoonMark size={16} />
          No more calling around in the dark
        </p>
        <h1 id="hero-title" className="display reveal" style={{ ["--i" as string]: 1 }}>
          Find care that&rsquo;s <em>ready</em> for you.
        </h1>
        <p className="lede reveal" style={{ ["--i" as string]: 1 }}>
          Tell us what you need once. We check every clinic&rsquo;s accessibility for you, then book the visit or hand
          you a script that does the advocating.
        </p>
      </section>
      <IntakeForm />
    </div>
  );
}
