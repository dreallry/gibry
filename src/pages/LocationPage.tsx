import { MapPin, Clock, Phone, Mail, ExternalLink, Navigation } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

export default function LocationPage() {
  const infoCards = [
    { icon: MapPin, title: "Alamat", color: "#a67c52", content: <><p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>Jl. Tegal Rotan Raya No.9 A,<br />Sawah Baru, Kec. Ciputat,<br />Kota Tangerang Selatan,<br />Banten 15412</p><a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium mt-2 hover:underline" style={{ color: "var(--color-primary)" }}><Navigation size={10} /> Buka di Maps</a></> },
    { icon: Clock, title: "Jam Operasional", color: "#8d6e4c", content: <div className="text-sm space-y-1" style={{ color: "var(--color-muted-foreground)" }}><p>Senin - Jumat: 08:00 - 20:00</p><p>Sabtu: 09:00 - 17:00</p><p style={{ opacity: 0.6 }}>Minggu & Hari Libur: Tutup</p></div> },
    { icon: Phone, title: "Telepon", color: "#735a3a", content: <a href="tel:+62217575757" className="text-sm hover:underline" style={{ color: "var(--color-muted-foreground)" }}>(021) 7575 757</a> },
    { icon: Mail, title: "Email", color: "#b3906f", content: <><a href="mailto:info@gibry.id" className="text-sm hover:underline" style={{ color: "var(--color-muted-foreground)" }}>info@gibry.id</a><a href="mailto:info@gibry.id" className="inline-flex items-center gap-1 text-xs font-medium mt-2 hover:underline" style={{ color: "var(--color-primary)" }}>Kirim Email <ExternalLink size={10} /></a></> },
  ];

  return (
    <PageTransition>
    <div className="tile">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-display-lg mb-2">Lokasi Perpustakaan</h1>
          <p style={{ color: "var(--color-muted-foreground)" }}>Kunjungi perpustakaan kami untuk pengalaman langsung</p>
        </div>
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="card p-0 overflow-hidden"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.6!2d106.71!3d-6.29!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f1d0e1e1e1e1%3A0x1e1e1e1e1e1e1e1e!2sJl.%20Tegal%20Rotan%20Raya%20No.9A!5e0!3m2!1sid!2sid!4v1" width="100%" height="400" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-[400px]" /></div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {infoCards.map((card) => (
              <div key={card.title} className="card hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${card.color}15`, color: card.color }}><card.icon size={18} /></div>
                  <div><h3 className="text-sm font-bold mb-1">{card.title}</h3>{card.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
