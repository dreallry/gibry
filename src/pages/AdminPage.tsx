import { getErrorMessage } from "@/lib/errors";
import { InvitationCodeModal } from "@/components/admin/forms/InvitationCodeModal";
import { AnnouncementModal } from "@/components/admin/forms/AnnouncementModal";
import { ReadingListModal } from "@/components/admin/forms/ReadingListModal";
import { EventModal } from "@/components/admin/forms/EventModal";
import { RewardModal } from "@/components/admin/forms/RewardModal";
import { BookEditorModal } from "@/components/admin/forms/BookEditorModal";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserRole } from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { PageTransition } from "@/components/PageTransition";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CirculationDeskView } from "@/components/admin/CirculationDeskView";
import { LibraryEvaluationView } from "@/components/admin/LibraryEvaluationView";
import { BooksTab } from "@/components/admin/tabs/BooksTab";
import { UsersTab } from "@/components/admin/tabs/UsersTab";
import { CommunityProgramsTab } from "@/components/admin/tabs/CommunityProgramsTab";
import { useAdminData } from "@/hooks/admin/useAdminData";
import { useAdminBooks } from "@/hooks/admin/useAdminBooks";
import { useAdminMembers } from "@/hooks/admin/useAdminMembers";
import { useAdminPresensi } from "@/hooks/admin/useAdminPresensi";
import { useAdminPrograms } from "@/hooks/admin/useAdminPrograms";
import { useAdminModeration } from "@/hooks/admin/useAdminModeration";
import { useAdminInvitations } from "@/hooks/admin/useAdminInvitations";
import type { AdminConfirmAction } from "@/hooks/admin/types";

export default function AdminPage() {

  const { user, profile } = useAuth();

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("circulation");

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [confirmAction, setConfirmAction] = useState<AdminConfirmAction | null>(null);

  const data = useAdminData({ activeTab });

  const bookEditor = useAdminBooks({ toast, user, profile, loadData: data.loadData });

  const members = useAdminMembers({ user, profile, toast, loadData: data.loadData, setConfirmAction });

  const presensi = useAdminPresensi({ user, setPresensiConfig: data.setPresensiConfig, toast, presensiConfig: data.presensiConfig });

  const programs = useAdminPrograms({ user, toast, loadData: data.loadData, setConfirmAction });

  const moderation = useAdminModeration({ user, profile, toast, setReports: data.setReports, loadCoreData: data.loadCoreData, setSuggestions: data.setSuggestions });

  const invitations = useAdminInvitations({ user, setInvitationCodes: data.setInvitationCodes, toast, invitationCodes: data.invitationCodes });

  return (
    <AdminGuard>
      <PageTransition>
        <div className="min-h-screen bg-[#FFF9EF] dark:bg-[#1B2E27] flex text-[#304D42] dark:text-[#FFF9EF] transition-colors">
          {/* Dedicated Left Sidebar */}
          <AdminSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isOpenMobile={isSidebarOpenMobile}
            onCloseMobile={() => setIsSidebarOpenMobile(false)}
          />

          {/* Main Area */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            <AdminTopBar
              onOpenMobile={() => setIsSidebarOpenMobile(true)}
              activeBorrowsCount={data.activeBorrows}
              unpaidFinesCount={data.finesWithBorrows.filter(b => b.dendaStatus !== "lunas" && b.dendaStatus !== "waived").length}
            />

            <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
              {/* 1. Meja Sirkulasi (dan alias sirkulasi/dashboard/fines/presensi) */}
              {(activeTab === "circulation" ||
                activeTab === "dashboard" ||
                activeTab === "fines" ||
                activeTab === "presensi") && (
                  <CirculationDeskView
                    books={data.books}
                    borrows={data.borrows}
                    users={data.users}
                    onRefresh={data.loadCoreData}
                    presensiConfig={data.presensiConfig}
                    generatingToken={presensi.generatingToken}
                    onGenerateToken={presensi.handleGenerateToken}
                    onDownloadQR={presensi.handleDownloadQR}
                  />
                )}

              {/* 2. Katalog Koleksi */}
              {activeTab === "books" && (
                <BooksTab
                  books={data.books}
                  loading={data.loading}
                  onOpenAddBook={bookEditor.handleOpenAddBook}
                  onOpenEditBook={bookEditor.handleOpenEditBook}
                  onRequestDeleteBook={(book) =>
                    setConfirmAction({ type: "deleteBook", data: book })
                  }
                />
              )}

              {/* 3. Keanggotaan Siswa (dan alias invitations) */}
              {(activeTab === "users" || activeTab === "invitations") && (
                <UsersTab
                  users={data.users}
                  loading={data.loading}
                  onRequestBanUser={(user) =>
                    setConfirmAction({
                      type: "ban",
                      data: { userId: user.uid, userName: user.nama },
                    })
                  }
                  onRequestUnbanUser={(user) =>
                    setConfirmAction({
                      type: "unban",
                      data: { userId: user.uid, userName: user.nama },
                    })
                  }
                  onRequestUpdateRole={members.handleUpdateUserRole}
                  onRequestTruncateUsers={() =>
                    setConfirmAction({ type: "truncateUsers" })
                  }
                  invitationCodes={data.invitationCodes}
                  loadingCodes={data.loadingCodes}
                  copiedCodeId={invitations.copiedCodeId}
                  onCopyCode={invitations.handleCopyCode}
                  onCopyAllUnusedCodes={invitations.handleCopyAllUnusedCodes}
                  onToggleCodeActive={invitations.handleToggleCodeActive}
                  onOpenGenerateCodeModal={() => invitations.setShowGenCodeModal(true)}
                />
              )}

              {/* 4. Program Literasi (Mading, Event, Hadiah, Usulan, Moderasi, Rekomendasi) */}
              {(activeTab === "programs" ||
                activeTab === "announcements" ||
                activeTab === "reading_lists" ||
                activeTab === "events" ||
                activeTab === "rewards" ||
                activeTab === "suggestions" ||
                activeTab === "moderation") && (
                  <CommunityProgramsTab
                    initialSubTab={
                      activeTab === "events"
                        ? "events"
                        : activeTab === "rewards"
                          ? "rewards"
                          : activeTab === "reading_lists"
                            ? "reading_lists"
                            : activeTab === "suggestions"
                              ? "suggestions"
                              : activeTab === "moderation"
                                ? "moderation"
                                : "announcements"
                    }
                    announcements={data.announcements}
                    events={data.events}
                    rewards={data.rewards}
                    redemptions={data.redemptions}
                    readingLists={data.readingLists}
                    suggestions={data.suggestions}
                    loadingSuggestions={data.loadingSuggestions}
                    processingSuggestionId={moderation.processingSuggestionId}
                    onUpdateSuggestion={moderation.handleUpdateSuggestion}
                    onDeleteSuggestion={moderation.handleDeleteSuggestion}
                    reports={data.reports}
                    loadingReports={data.loadingReports}
                    reportFilter={moderation.reportFilter}
                    onReportFilterChange={moderation.setReportFilter}
                    processingReportId={moderation.processingReportId}
                    onProcessReport={moderation.handleProcessReport}
                    onBanReportedUser={moderation.handleBanReportedUser}
                    onOpenAddAnnouncement={() => programs.setShowAddAnnouncement(true)}
                    onDeleteAnnouncement={(id) =>
                      setConfirmAction({ type: "deleteAnnouncement", data: id })
                    }
                    onOpenAddEvent={() => programs.setShowAddEvent(true)}
                    onDeleteEvent={(id) =>
                      setConfirmAction({ type: "deleteEvent", data: id })
                    }
                    onOpenAddReward={() => programs.setShowAddReward(true)}
                    onDeleteReward={(id) =>
                      setConfirmAction({ type: "deleteReward", data: id })
                    }
                    onProcessRedemption={programs.handleProcessRedemption}
                    onOpenAddReadingList={() => programs.setShowAddReadingList(true)}
                    onDeleteReadingList={(id) =>
                      setConfirmAction({ type: "deleteReadingList", data: id })
                    }
                  />
                )}

              {/* 5. Laporan Perpustakaan (dan alias evaluation, audit_logs) */}
              {(activeTab === "reports" ||
                activeTab === "evaluation" ||
                activeTab === "audit_logs") && (
                  <LibraryEvaluationView
                    books={data.books}
                    borrows={data.borrows}
                    users={data.users}
                  />
                )}
            </main>
          </div>
        </div>

        {/* Generate Invitation Code Modal */}
        <InvitationCodeModal {...invitations} />

        {/* Add Announcement Modal */}
        <AnnouncementModal {...programs} />

        {/* Add Reading List Modal */}
        <ReadingListModal {...programs} books={data.books} />

        {/* Add Event Modal */}
        <EventModal {...programs} />

        {/* Add Reward Modal */}
        <RewardModal {...programs} />

        {/* Add / Edit Book Modal */}
        <BookEditorModal {...bookEditor} toast={toast} />

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={!!confirmAction}
          title={
            confirmAction?.type === "promoteAdmin" ? "Jadikan Admin?" :
              confirmAction?.type === "demoteAdmin" ? "Ubah ke Anggota Biasa?" :
                confirmAction?.type === "deleteBook" ? "Hapus Buku dari Database?" :
                  confirmAction?.type === "ban" ? "Blokir User?" :
                    confirmAction?.type === "unban" ? "Aktifkan User?" :
                      confirmAction?.type === "truncateUsers" ? "Truncate Data User Non-Admin?" :
                        confirmAction?.type === "deleteAnnouncement" ? "Hapus Pengumuman?" :
                          confirmAction?.type === "deleteReadingList" ? "Hapus Koleksi?" :
                            confirmAction?.type === "deleteEvent" ? "Hapus Event?" :
                              confirmAction?.type === "deleteReward" ? "Hapus Reward?" : ""
          }
          message={
            confirmAction?.type === "promoteAdmin" ? `Apakah Anda yakin ingin memberikan hak akses Administrator kepada ${confirmAction?.data?.userName}?` :
              confirmAction?.type === "demoteAdmin" ? `Apakah Anda yakin ingin mengubah ${confirmAction?.data?.userName} kembali menjadi Anggota Biasa?` :
                confirmAction?.type === "deleteBook" ? `Apakah Anda yakin ingin menghapus buku "${confirmAction?.data?.judul}" dari katalog perpustakaan?` :
                  confirmAction?.type === "ban" ? `Apakah Anda yakin ingin memblokir ${confirmAction?.data?.userName}? User tidak akan bisa meminjam buku.` :
                    confirmAction?.type === "unban" ? `Apakah Anda yakin ingin mengaktifkan kembali ${confirmAction?.data?.userName}?` :
                      confirmAction?.type === "truncateUsers" ? "Hapus hingga 5 akun uji coba beserta data pribadinya? Akun petugas serta akun dengan pinjaman, denda, atau klaim aktif dipertahankan." :
                        confirmAction?.type === "deleteAnnouncement" ? "Apakah Anda yakin ingin menghapus pengumuman ini?" :
                          confirmAction?.type === "deleteReadingList" ? "Apakah Anda yakin ingin menghapus koleksi ini?" :
                            confirmAction?.type === "deleteEvent" ? "Apakah Anda yakin ingin menghapus event ini?" :
                              confirmAction?.type === "deleteReward" ? "Apakah Anda yakin ingin menghapus reward ini?" : ""
          }
          confirmText={
            confirmAction?.type === "promoteAdmin" ? "Ya, Jadikan Admin" :
              confirmAction?.type === "demoteAdmin" ? "Ya, Ubah Role" :
                confirmAction?.type === "deleteBook" ? "Ya, Hapus Buku" :
                  confirmAction?.type === "ban" ? "Ya, Blokir" :
                    confirmAction?.type === "unban" ? "Ya, Aktifkan" :
                      confirmAction?.type === "truncateUsers" ? "Ya, Truncate Database" :
                        confirmAction?.type === "deleteAnnouncement" ? "Ya, Hapus" :
                          confirmAction?.type === "deleteReadingList" ? "Ya, Hapus" :
                            confirmAction?.type === "deleteEvent" ? "Ya, Hapus" :
                              confirmAction?.type === "deleteReward" ? "Ya, Hapus" : "Lanjutkan"
          }
          variant={confirmAction?.type === "promoteAdmin" ? "warning" : "danger"}
          onConfirm={async () => {
            if (confirmAction?.type === "promoteAdmin") {
              try {
                await updateUserRole(confirmAction.data.userId, "admin");
                toast("success", `${confirmAction.data.userName} diangkat menjadi Admin!`);
                data.loadData();
              } catch (e) { toast("error", getErrorMessage(e)); }
            } else if (confirmAction?.type === "demoteAdmin") {
              try {
                await updateUserRole(confirmAction.data.userId, "user");
                toast("info", `${confirmAction.data.userName} diubah menjadi Anggota.`);
                data.loadData();
              } catch (e) { toast("error", getErrorMessage(e)); }
            } else if (confirmAction?.type === "deleteBook") {
              bookEditor.handleDeleteBook(confirmAction.data.id, confirmAction.data.judul);
            } else if (confirmAction?.type === "ban") members.handleBanUser(confirmAction.data.userId, confirmAction.data.userName);
            else if (confirmAction?.type === "unban") members.handleUnbanUser(confirmAction.data.userId, confirmAction.data.userName);
            else if (confirmAction?.type === "truncateUsers") members.handleTruncateUsers();
            else if (confirmAction?.type === "deleteAnnouncement") programs.handleDeleteAnnouncement(confirmAction.data);
            else if (confirmAction?.type === "deleteReadingList") programs.handleDeleteReadingList(confirmAction.data);
            else if (confirmAction?.type === "deleteEvent") programs.handleDeleteEvent(confirmAction.data);
            else if (confirmAction?.type === "deleteReward") programs.handleDeleteReward(confirmAction.data);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      </PageTransition>
    </AdminGuard>
  );
}
