import { Link } from "react-router-dom";
import { Briefcase, CalendarDays, Car, Package, Radio } from "lucide-react";

function PreviewStat({ label, value }) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 py-2 text-sm">
      <span className="font-semibold text-white/56">{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  );
}

function CreatorPreviewCards({ onSelectType }) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">
        Crea algo increíble
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          className="min-h-80 overflow-hidden rounded-[1.1rem] border border-neonCyan/25 bg-[radial-gradient(circle_at_50%_12%,rgba(255,79,216,.55),transparent_30%),linear-gradient(180deg,rgba(124,58,237,.42),rgba(7,11,20,.96))] text-left"
          type="button"
          onClick={() => onSelectType("event")}
        >
          <div className="flex h-full flex-col justify-end p-4">
            <p className="text-xl font-black text-white">Festival Malabo 2026</p>
            <PreviewStat label="Arena Blanca" value="" />
            <PreviewStat label="19 de Julio" value="19:00" />
            <PreviewStat label="Entrada" value="2500 XAF" />
            <p className="mt-2 text-sm font-black text-white">+243 invitados</p>
          </div>
        </button>

        <button
          className="min-h-80 rounded-[1.1rem] border border-green-400/25 bg-[radial-gradient(circle_at_50%_75%,rgba(34,197,94,.26),transparent_32%),linear-gradient(180deg,rgba(15,118,110,.26),rgba(7,11,20,.96))] p-4 text-left"
          type="button"
          onClick={() => onSelectType("job")}
        >
          <Briefcase className="h-7 w-7 text-green-400" />
          <p className="mt-8 text-2xl font-black text-white">EVO TAXI</p>
          <p className="mt-5 text-sm font-semibold text-white">Buscamos conductores</p>
          <p className="mt-5 text-sm font-semibold text-white/66">Salario:</p>
          <p className="text-xl font-black text-green-400">150.000 CFA</p>
          <Car className="mt-10 h-14 w-14 text-neonYellow/70" />
        </button>

        <button
          className="min-h-80 rounded-[1.1rem] border border-neonOrange/25 bg-[radial-gradient(circle_at_50%_78%,rgba(249,115,22,.3),transparent_34%),linear-gradient(180deg,rgba(120,53,15,.34),rgba(7,11,20,.96))] p-4 text-left"
          type="button"
          onClick={() => onSelectType("pallets")}
        >
          <Package className="h-7 w-7 text-neonOrange" />
          <p className="mt-12 text-2xl font-black text-white">ConectaPalet</p>
          <p className="mt-6 text-sm font-semibold text-white">Venta:</p>
          <p className="text-2xl font-black text-neonYellow">100 palets europeos</p>
        </button>

        <Link
          className="min-h-80 rounded-[1.1rem] border border-neonPink/25 bg-[radial-gradient(circle_at_50%_20%,rgba(255,48,64,.38),transparent_34%),linear-gradient(180deg,rgba(255,79,216,.2),rgba(7,11,20,.96))] p-4 text-left"
          to="/lives/start"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-liveRed px-3 py-1 text-xs font-black text-white shadow-live">
            <Radio className="h-3.5 w-3.5" />
            LIVE
          </span>
          <p className="mt-24 text-xl font-black text-white">Live Streaming</p>
          <p className="mt-2 text-sm font-semibold text-white/70">Hablando del ecosistema EVO</p>
          <PreviewStat label="Invitados" value="3" />
          <PreviewStat label="Tema" value="Negocios" />
          <PreviewStat label="Público" value="Público" />
        </Link>
      </div>
    </section>
  );
}

export default CreatorPreviewCards;
