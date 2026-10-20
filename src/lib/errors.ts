export function getErrorMessage(error: unknown, fallback = "Terjadi kesalahan."): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message) {
    return error.message;
  }
  return typeof error === "string" && error ? error : fallback;
}
