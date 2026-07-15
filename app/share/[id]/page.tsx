import Link from "next/link";
import { ArrowRight, Heart, RotateCcw, Share2, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSampleDesign, formatMoney } from "@/lib/roomly";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const design = createSampleDesign();
  const total = design.placed.reduce((sum, item) => sum + item.price, 0);

  return (
    <main className="min-h-dvh bg-[#f7f1e9] text-[#24211d]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2 text-xl font-black">
          <span className="grid size-9 place-items-center rounded-full bg-[#27372e] text-sm text-white">R</span>
          Roomly
        </Link>
        <Button render={<Link href="/draw" />} nativeButton={false} className="bg-[#27372e] text-white hover:bg-[#36483d]">
          Remix this room <ArrowRight />
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-xl border border-[#d7cabb] bg-[#fffaf4] p-3 shadow-xl shadow-[#9f8b731f]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#efe5d9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={design.roomImage} alt="Shared Roomly design" className="h-full w-full object-cover" />
            {design.placed.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.imageUrl}
                alt={item.name}
                className="absolute drop-shadow-2xl"
                style={{
                  left: `${(item.x / 1400) * 100}%`,
                  top: `${(item.y / 900) * 100}%`,
                  width: `${(item.width / 1400) * 100}%`,
                }}
              />
            ))}
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#314032]">
              Approximate visualization
            </div>
          </div>
        </div>

        <aside className="rounded-xl bg-[#26362d] p-6 text-white">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#d4e5cd]">
            <Share2 className="size-4" /> Public room
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight">{formatMoney(total)} bedroom makeover</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#d9e3d4]">
            Shared project `{id}`. Supabase-backed persistence can hydrate exact project JSON here; this MVP shows the demo fallback.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/10 p-4">
              <Vote className="size-5 text-[#d9e8d3]" />
              <p className="mt-3 text-2xl font-black">68%</p>
              <p className="text-xs font-bold text-[#d9e3d4]">prefer Layout A</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <Heart className="size-5 text-[#d9e8d3]" />
              <p className="mt-3 text-2xl font-black">312</p>
              <p className="text-xs font-bold text-[#d9e3d4]">reactions</p>
            </div>
          </div>
          <Button render={<Link href="/draw" />} nativeButton={false} className="mt-6 w-full bg-white text-[#26362d] hover:bg-[#edf3ea]">
            <RotateCcw /> Remix in Roomly
          </Button>
        </aside>
      </section>
    </main>
  );
}
