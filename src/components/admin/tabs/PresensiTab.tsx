import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Calendar,
  Info,
} from "lucide-react";
import { AdminCard, AdminCardHeader, AdminCardContent } from "../shared/AdminCard";
import { AdminBadge } from "../shared/AdminBadge";
import type { PresensiConfig } from "@/lib/firestore";

interface PresensiTabProps {
  presensiConfig: PresensiConfig | null;
  generatingToken: boolean;
  onGenerateToken: () => void;
  onDownloadQR: () => void;
}

export function PresensiTab({
  presensiConfig,
  generatingToken,
  onGenerateToken,
  onDownloadQR,
}: PresensiTabProps) {
  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header Presensi */}
      <AdminCard>
        <AdminCardHeader
          title="Presensi Siswa Berbasis QR Code"
          subtitle="QR Code permanen untuk dipajang di perpustakaan agar siswa dapat melakukan presensi mandiri"
          badge={
            presensiConfig ? (
              <AdminBadge variant="sage" dot={true}>
                QR Code Aktif
              </AdminBadge>
            ) : (
              <AdminBadge variant="terracotta" dot={true}>
                Belum Dibuat
              </AdminBadge>
            )
          }
          action={
            <button
              onClick={onGenerateToken}
              disabled={generatingToken}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#304D42] dark:bg-[#C57B5F] hover:opacity-90 disabled:opacity-50 text-[#FFF9EF] text-xs font-bold transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {generatingToken ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Membuat Kode...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>{presensiConfig ? "Perbarui QR Code" : "Buat QR Code Baru"}</span>
                </>
              )}
            </button>
          }
        />
      </AdminCard>

      {presensiConfig ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Kartu QR Code Cetak */}
          <AdminCard className="p-6 flex flex-col items-center justify-between text-center space-y-4">
            <div>
              <p className="text-xs font-bold text-[#797D6E] dark:text-[#BAC0B3]">
                Lembar QR Code Presensi
              </p>
              <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] mt-0.5">
                Siswa memindai kode ini melalui kamera ponsel.
              </p>
            </div>

            <div
              className="p-5 rounded-2xl bg-white border border-[#DEDDD0] dark:border-[#3A5B4F] shadow-2xs"
              id="presensi-qr-svg"
            >
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/scan?qr=${presensiConfig.qrCode}`}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="w-full space-y-2">
              <div className="p-2.5 rounded-xl bg-[#FFF9EF] dark:bg-[#1B2E27] border border-[#DEDDD0] dark:border-[#3A5B4F]">
                <p className="text-[10px] font-semibold text-[#797D6E] dark:text-[#BAC0B3]">
                  Kode Token Presensi
                </p>
                <p className="font-mono font-bold text-sm text-[#304D42] dark:text-[#FFF9EF] tracking-wider">
                  {presensiConfig.qrCode}
                </p>
              </div>

              <button
                onClick={onDownloadQR}
                className="min-h-[44px] w-full px-4 py-2.5 rounded-xl border border-[#DEDDD0] dark:border-[#3A5B4F] bg-[#F2ECDF] dark:bg-[#2C473D] hover:bg-[#E8EBDF] dark:hover:bg-[#37564A] text-[#304D42] dark:text-[#FFF9EF] text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download size={15} />
                <span>Unduh Gambar QR (PNG)</span>
              </button>
            </div>
          </AdminCard>

          {/* Panduan Petugas Perpustakaan */}
          <div className="space-y-4">
            <AdminCard className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#304D42] dark:text-[#FFF9EF]">
                <Info size={16} className="text-[#AD6549] dark:text-[#C57B5F]" />
                <span>Petunjuk Pemasangan QR</span>
              </div>
              <ol className="space-y-2.5 text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#304D42] dark:bg-[#C57B5F] text-[#FFF9EF] flex items-center justify-center text-[10px] font-bold shrink-0">
                    1
                  </span>
                  <span>Unduh berkas gambar QR Code melalui tombol di samping.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#304D42] dark:bg-[#C57B5F] text-[#FFF9EF] flex items-center justify-center text-[10px] font-bold shrink-0">
                    2
                  </span>
                  <span>Cetak pada kertas A4 atau laminasi agar tahan lama.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#304D42] dark:bg-[#C57B5F] text-[#FFF9EF] flex items-center justify-center text-[10px] font-bold shrink-0">
                    3
                  </span>
                  <span>Tempelkan pada meja sirkulasi atau dekat pintu masuk perpustakaan.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#304D42] dark:bg-[#C57B5F] text-[#FFF9EF] flex items-center justify-center text-[10px] font-bold shrink-0">
                    4
                  </span>
                  <span>Siswa cukup memindai dengan kamera ponsel untuk otomatis check-in.</span>
                </li>
              </ol>
            </AdminCard>

            <AdminCard className="p-4 space-y-1.5 bg-[#FFF9EF]/80 dark:bg-[#1B2E27]/80">
              <span className="text-[11px] font-bold text-[#304D42] dark:text-[#FFF9EF]">
                Informasi Pembuatan Token
              </span>
              <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3]">
                Dibuat pada:{" "}
                <strong className="text-[#304D42] dark:text-[#FFF9EF]">
                  {new Date(presensiConfig.generatedAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </p>
              <p className="text-[11px] text-[#797D6E] dark:text-[#BAC0B3] pt-1 border-t border-[#DEDDD0] dark:border-[#3A5B4F]">
                Token ini berlaku permanen dan tidak perlu dicetak ulang setiap hari.
              </p>
            </AdminCard>
          </div>
        </div>
      ) : (
        <AdminCard className="p-12 text-center space-y-3">
          <QrCode
            size={44}
            className="mx-auto text-[#797D6E] dark:text-[#BAC0B3] opacity-60"
          />
          <h3 className="text-base font-bold text-[#304D42] dark:text-[#FFF9EF]">
            Belum Ada QR Code Presensi
          </h3>
          <p className="text-xs text-[#797D6E] dark:text-[#BAC0B3] max-w-sm mx-auto">
            Buat kode token presensi pertama untuk mengaktifkan fitur pencatatan kedatangan siswa berbasis QR.
          </p>
          <button
            onClick={onGenerateToken}
            disabled={generatingToken}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#304D42] dark:bg-[#C57B5F] text-[#FFF9EF] text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer shadow-xs inline-flex items-center gap-2"
          >
            {generatingToken ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <QrCode size={14} />
            )}
            <span>Buat QR Code Pertama</span>
          </button>
        </AdminCard>
      )}
    </div>
  );
}
