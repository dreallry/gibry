import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowUpRight, Trophy, BookMarked, StickyNote, Target, Users } from "lucide-react";

const footerColumns = [
  {
    title: "Navigasi",
    links: [
      { label: "Beranda", path: "/" },
      { label: "Koleksi Buku", path: "/books" },
      { label: "Lokasi", path: "/location" },
      { label: "Presensi", path: "/attendance" },
    ],
  },
  {
    title: "Komunitas",
    links: [
      { label: "Komunitas", path: "/social", icon: Users },
      { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
      { label: "Book Clubs", path: "/clubs", icon: BookMarked },
      { label: "Tantangan", path: "/events", icon: Target },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "Cara Pinjam", path: "/help" },
      { label: "FAQ", path: "/help" },
      { label: "Catatan Baca", path: "/notes", icon: StickyNote },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#304D42] text-[#FFF9EF]">
      {/* Soft Editorial Line Divider between CTA / Page and Footer */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="pt-2 pb-12 sm:pb-14">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FFF9EF]/20 to-transparent" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/digipusslogo.jpg" alt="Gibry" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-editorial text-lg tracking-tight font-bold text-[#FFF9EF]">Gibry</span>
            </Link>
            <p className="text-xs leading-relaxed mb-4 text-[#E8EBDF]/90 font-space">
              Perpustakaan Digital Gibry<br />Ruang Literasi & Komunitas
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#DCE2CD]/75 font-space">
              <MapPin size={13} className="text-[#AD6549]" />
              <span>Ciputat Timur, Tangerang Selatan</span>
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-mono font-bold uppercase tracking-wider mb-4 text-[#DCE2CD]">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      to={link.path}
                      className="text-sm font-space text-[#E8EBDF]/85 hover:text-[#FFF9EF] transition-colors flex items-center gap-1.5 group"
                    >
                      {link.icon && <link.icon size={13} className="text-[#AD6549]" />}
                      <span>{link.label}</span>
                      <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-wider mb-4 text-[#DCE2CD]">Kontak</p>
            <ul className="space-y-3 font-space">
              <li>
                <a
                  href="mailto:info@gibry.id"
                  className="text-sm text-[#E8EBDF]/85 hover:text-[#FFF9EF] transition-colors flex items-center gap-2"
                >
                  <Mail size={13} className="text-[#AD6549]" />
                  <span>info@gibry.id</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+62217575757"
                  className="text-sm text-[#E8EBDF]/85 hover:text-[#FFF9EF] transition-colors flex items-center gap-2"
                >
                  <Phone size={13} className="text-[#AD6549]" />
                  <span>(021) 7575757</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-[#FFF9EF]/10 py-6">
          <p className="text-xs text-center font-mono text-[#DCE2CD]/60">
            &copy; 2026 Gibry. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
