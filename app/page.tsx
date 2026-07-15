import Link from "next/link";
import { ArrowRight, Eye, Heart, Link2, MessageCircle, Sparkles, Upload, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, sampleProducts, sampleRoomImage } from "@/lib/roomly";

const transformations = [
  {
    title: "Sage loft refresh",
    price: 1240,
    votes: 312,
    label: "Layout A won by 68%",
  },
  {
    title: "Small bedroom reset",
    price: 860,
    votes: 189,
    label: "Remixed 41 times",
  },
  {
    title: "Rental living room",
    price: 1518,
    votes: 427,
    label: "TikTok-ready share card",
  },
];

const steps = [
  { icon: Upload, title: "Upload your room", text: "Start with an empty room or a lived-in photo." },
  { icon: Link2, title: "Paste a store link", text: "Roomly extracts metadata when permitted, with a manual fallback." },
  { icon: Sparkles, title: "Place and share", text: "Drag, scale, rotate, compare, vote, and remix layouts." },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-[#f7f1e9] text-[#24211d]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2 text-xl font-black">
          <span className="grid size-9 place-items-center rounded-full bg-[#27372e] text-sm text-white">R</span>
          Roomly
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-[#6f665d] md:flex">
          <a href="#how">How it works</a>
          <a href="#rooms">Transformations</a>
          <a href="#share">Share</a>
        </nav>
        <Button render={<Link href="/draw" />} nativeButton={false} className="bg-[#27372e] text-white hover:bg-[#36483d]">
          Open editor <ArrowRight />
        </Button>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 lg:grid-cols-[0.95fr_1.05fr] lg:pb-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dfe8d9] px-4 py-2 text-sm font-black text-[#455845]">
            <Sparkles className="size-4" />
            Approximate room visualization, ready in seconds
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-normal text-[#211f1b] md:text-7xl">
            Design your room in seconds.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#6d645a]">
            Upload a real room photo, paste a furniture link, and place a clean product cutout into your space.
            Roomly is fast, visual, playful, and built for shareable before-and-after decisions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link href="/draw" />} nativeButton={false} size="lg" className="h-12 bg-[#27372e] px-5 text-white hover:bg-[#36483d]">
              Start with demo room <ArrowRight />
            </Button>
            <Button render={<Link href="/draw" />} nativeButton={false} size="lg" variant="outline" className="h-12 border-[#cbbdac] bg-[#fffaf4] px-5">
              Upload my room
            </Button>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["No login", "first design"],
              ["JSON canvas", "reopen edits"],
              ["Manual fallback", "no scraping lock-in"],
            ].map(([value, label]) => (
              <div key={value} className="rounded-lg border border-[#dfd1c0] bg-[#fffaf4] p-3">
                <p className="text-lg font-black">{value}</p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#82776b]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-xl border border-[#d7cabb] bg-[#fffaf4] p-3 shadow-2xl shadow-[#9f8b731f]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#ede2d3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sampleRoomImage} alt="Roomly room preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sampleProducts[0].cutoutUrl} alt="Sofa cutout" className="absolute bottom-[18%] left-[29%] w-[42%] drop-shadow-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sampleProducts[2].cutoutUrl} alt="Coffee table cutout" className="absolute bottom-[9%] left-[39%] w-[24%] drop-shadow-xl" />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#314032] shadow">
                {formatMoney(1240)} living room makeover
              </div>
              <div className="absolute bottom-4 right-4 rounded-lg bg-[#27372e]/92 px-4 py-3 text-white shadow">
                <p className="text-xs font-bold text-[#d9e5d4]">Scale warning</p>
                <p className="text-sm font-black">Sofa fits this 12 ft wall</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-8 left-8 hidden rounded-lg border border-[#d7cabb] bg-white p-4 shadow-xl md:block">
            <div className="flex items-center gap-3">
              <Vote className="size-5 text-[#63745d]" />
              <div>
                <p className="text-sm font-black">Layout A vs B</p>
                <p className="text-xs font-bold text-[#796f64]">Friends vote before you buy.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-[#dfd1c0] bg-[#fffaf4] py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="rounded-lg border border-[#e2d5c6] bg-white p-6">
              <step.icon className="size-6 text-[#65745f]" />
              <h2 className="mt-5 text-xl font-black">{step.title}</h2>
              <p className="mt-2 font-semibold leading-7 text-[#756b60]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="rooms" className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#65745f]">Public transformations</p>
            <h2 className="mt-2 text-4xl font-black">Seeded rooms that feel worth sharing.</h2>
          </div>
          <Button render={<Link href="/draw" />} nativeButton={false} variant="outline" className="border-[#cbbdac] bg-[#fffaf4]">
            Remix a room
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {transformations.map((room, index) => (
            <article key={room.title} className="overflow-hidden rounded-lg border border-[#d7cabb] bg-[#fffaf4]">
              <div className="relative aspect-[4/3] bg-[#efe5d9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sampleRoomImage} alt="" className="h-full w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sampleProducts[index % sampleProducts.length].cutoutUrl}
                  alt=""
                  className="absolute bottom-[12%] left-[28%] w-[44%] drop-shadow-2xl"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-black">{room.title}</h3>
                <p className="mt-1 text-sm font-bold text-[#756b60]">{formatMoney(room.price)} approximate makeover</p>
                <div className="mt-4 flex items-center justify-between text-xs font-black text-[#65745f]">
                  <span className="flex items-center gap-1"><Heart className="size-4" /> {room.votes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="size-4" /> {room.label}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="share" className="bg-[#26362d] py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#c9d8c3]">Made for sharing</p>
            <h2 className="mt-3 text-4xl font-black">Before/after sliders, public links, remix buttons, and simple voting.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["TikTok-ready cards", "Instagram room reveals", "X layout polls"].map((item) => (
              <div key={item} className="rounded-lg bg-white/10 p-5">
                <Eye className="size-6 text-[#d9e8d3]" />
                <p className="mt-4 font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
