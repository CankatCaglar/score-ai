/** Firebase Auth / session hata kodlarını kullanıcıya Türkçe mesaja çevirir. */
export function mapAuthError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "";

  const key = code || message;

  switch (key) {
    case "auth/email-already-in-use":
      return "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.";
    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalı.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-posta veya şifre hatalı. Google ile kayıt olduysanız aşağıdaki Google butonunu kullanın.";
    case "auth/too-many-requests":
      return "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google girişi iptal edildi. İsterseniz tekrar deneyebilirsiniz.";
    case "auth/popup-blocked":
      return "Tarayıcı pop-up’ı engelledi. Pop-up’lara izin verip tekrar deneyin.";
    case "auth/unauthorized-domain":
      return "Bu domain Firebase’de yetkili değil (Authorized domains).";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
      return "Firebase API key geçersiz. .env.local içindeki NEXT_PUBLIC_FIREBASE_API_KEY değerini Firebase Console’dan yenileyin.";
    case "auth/operation-not-allowed":
      return "Bu giriş yöntemi Firebase’de kapalı. Provider’ı etkinleştirin.";
    case "auth/account-exists-with-different-credential":
      return "Bu e-posta Google ile kayıtlı. Lütfen Google ile devam edin.";
    case "auth/network-request-failed":
      return "Ağ hatası. İnternet bağlantınızı kontrol edin.";
    case "auth/requires-recent-login":
      return "Bu işlem için yeniden giriş yapmanız gerekiyor.";
    case "auth/expired-action-code":
      return "Bağlantının süresi dolmuş. Yeni bir bağlantı isteyin.";
    case "auth/invalid-action-code":
      return "Bağlantı geçersiz veya daha önce kullanılmış.";
    case "auth/user-disabled":
      return "Bu hesap devre dışı bırakılmış.";
    case "INVALID_TOKEN":
    case "SESSION_FAILED":
      return "Oturum oluşturulamadı. Firebase Admin / USER_SESSION_SECRET ayarlarını kontrol edin.";
    case "USER_SESSION_SECRET":
      return "USER_SESSION_SECRET tanımlı değil veya çok kısa.";
    case "EMAIL_REQUIRED":
      return "Bu hesapta e-posta adresi yok. Başka bir Google hesabı deneyin.";
    case "MISSING_TOKEN":
    case "NO_USER":
      return "Kimlik doğrulama tamamlanamadı. Lütfen tekrar deneyin.";
    case "FIREBASE_ADMIN_NOT_CONFIGURED":
      return "Sunucu Firebase Admin ayarı eksik (.env.local).";
    default:
      if (message.includes("USER_SESSION_SECRET")) {
        return "USER_SESSION_SECRET tanımlı değil veya çok kısa.";
      }
      if (message.includes("FIREBASE_ADMIN")) {
        return "Firebase Admin yapılandırması hatalı.";
      }
      return "Bir sorun oluştu. Lütfen tekrar deneyin.";
  }
}

/** Kullanıcı hatası mı (form uyarısı) yoksa sistem hatası mı (toast) ayırır. */
export function isSoftAuthFeedback(message: string): boolean {
  return (
    message.includes("E-posta veya şifre") ||
    message.includes("Google ile kayıt") ||
    message.includes("Google ile devam") ||
    message.includes("Geçerli bir e-posta") ||
    message.includes("Şifre en az") ||
    message.includes("zaten kayıtlı") ||
    message.includes("iptal edildi")
  );
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
