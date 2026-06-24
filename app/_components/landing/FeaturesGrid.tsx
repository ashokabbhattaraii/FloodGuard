"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "Real-Time Monitoring",
    body: "Continuous flood-risk tracking across rivers, drains, and flood-prone zones — refreshed every 30 seconds for maximum accuracy.",
    tag: "Infrastructure", wide: true, accentColor: "#0369a1",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#0369a1" strokeWidth="1.2"/><circle cx="12" cy="12" r="4" stroke="#0369a1" strokeWidth="1.2" opacity="0.4"/><circle cx="12" cy="12" r="1.8" fill="#0369a1"/><path d="M3 12H1M23 12h-2M12 3V1M12 23v-2" stroke="#0369a1" strokeWidth="1" strokeLinecap="round"/></svg>,
  },
  {
    title: "Instant Push Notifications",
    body: "AWS SNS fires SMS, email, and browser push within seconds of a threshold breach.",
    tag: "Alerting", wide: false, accentColor: "#ff4c4c",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#ff4c4c" strokeWidth="1.2" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#ff4c4c" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    title: "Community Reporting",
    body: "Residents submit photo-verified flood incidents, geo-tagged and queued for authority review.",
    tag: "Community", wide: false, accentColor: "#4caf50",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="12" rx="2" stroke="#4caf50" strokeWidth="1.2"/><circle cx="12" cy="13" r="3" stroke="#4caf50" strokeWidth="1.2"/><circle cx="18" cy="9" r="1.2" fill="#4caf50"/></svg>,
  },
  {
    title: "AWS Cloud Architecture",
    body: "Serverless Lambda backend, RDS for structured data, S3 for media, CloudFront CDN, and CloudWatch monitoring — 99.9% uptime.",
    tag: "Cloud", wide: true, accentColor: "#f5a623",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 19a4 4 0 0 1-1-7.87A5.5 5.5 0 0 1 16.5 7a4 4 0 0 1 3.5 6" stroke="#f5a623" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    title: "Evacuation Coordination",
    body: "Authorities manage shelter capacity, publish evacuation routes, and coordinate response in real time.",
    tag: "Response", wide: false, accentColor: "#0369a1",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 7H21l-5.8 4.2 2.2 7L12 16l-5.4 4.2 2.2-7L3 9h6.8L12 2z" stroke="#0369a1" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  },
  {
    title: "Predictive Flood Modelling",
    body: "ML models combine historical rainfall, river flow, and terrain data to predict flood events hours in advance.",
    tag: "AI/ML", wide: false, accentColor: "#0369a1",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 20l5-8 4.5 4 4-9L22 13" stroke="#0369a1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="4" cy="20" r="1.5" fill="#0369a1" opacity="0.5"/><circle cx="22" cy="13" r="1.5" fill="#0369a1"/></svg>,
  },
];

export default function FeaturesGrid() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".fg-head", { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: ".fg-head", start: "top 90%", once: true } });

      gsap.fromTo(".fg-card",
        { y: 44, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.1,
          scrollTrigger: { trigger: ".fg-grid", start: "top 82%", once: true } });

      // draw connector lines
      gsap.fromTo(".fg-connector",
        { strokeDashoffset: 600, opacity: 0 },
        { strokeDashoffset: 0, opacity: 1, duration: 1.4, ease: "power2.inOut", stagger: 0.15,
          scrollTrigger: { trigger: ".fg-grid", start: "top 80%", once: true } });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="relative py-28 md:py-32 px-[6%] lg:px-[8%] overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[150px]"
        style={{ background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-[1200px] mx-auto">
        <div className="fg-head text-center mb-16" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[100px] glass-1 mb-6">
            <span className="text-[11px] text-accent tracking-[0.15em] uppercase font-medium">Platform Features</span>
          </div>
          <h2 className="text-[clamp(34px,5vw,64px)] font-[800] text-app leading-[1.08]">
            Built for resilient response<br/>at cloud scale.
          </h2>
          <p className="mt-4 text-[16px] text-app-muted max-w-xl mx-auto leading-relaxed">
            Every layer — from data ingestion to community alerts — connected in one secure, real-time cloud platform.
          </p>
        </div>

        {/* Connector overlay (decorative, desktop only) */}
        <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0"
          preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="fg-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line className="fg-connector" x1="33%" y1="34%" x2="67%" y2="34%"
            stroke="url(#fg-line)" strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "dash-flow 1s linear infinite" }} />
          <line className="fg-connector" x1="33%" y1="66%" x2="67%" y2="66%"
            stroke="url(#fg-line)" strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "dash-flow 1s linear infinite" }} />
          <line className="fg-connector" x1="50%" y1="34%" x2="50%" y2="66%"
            stroke="url(#fg-line)" strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "dash-flow 1s linear infinite" }} />
        </svg>

        <div className="fg-grid grid grid-cols-1 md:grid-cols-3 gap-4 relative z-[1]">
          {features.map((f) => (
            <div key={f.title}
              className={`fg-card group relative glass-1 rounded-[16px] p-6 flex flex-col gap-4 overflow-hidden noise hover:-translate-y-1 hover:shadow-[0_20px_48px_-16px_rgba(3,105,161,0.25)] transition-all duration-500 ${f.wide ? "md:col-span-2" : "md:col-span-1"}`}
              style={{ opacity: 0 }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-[16px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 30% 30%, ${f.accentColor}14 0%, transparent 65%)` }} />
              {/* Top accent line on hover */}
              <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(to right, transparent, ${f.accentColor}, transparent)` }} />

              <div className="relative z-10 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-[11px] glass-2 flex items-center justify-center transition-all duration-400 group-hover:scale-110"
                    style={{ boxShadow: `0 0 0 0 ${f.accentColor}00` }}>
                    {f.icon}
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2.5 py-1 rounded-[100px] border"
                    style={{ color: f.accentColor, borderColor: `${f.accentColor}40`, background: `${f.accentColor}0d` }}>
                    {f.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-[17px] font-[500] text-app mb-2">{f.title}</h3>
                  <p className="text-[13px] text-app-muted leading-[1.75]">{f.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
