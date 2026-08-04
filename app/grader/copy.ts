export type GraderLocale = "tr" | "en";

export const GRADER_LOCALE_STORAGE_KEY = "scoreai_locale";

export type MoreInfoItem = {
  q: string;
  paragraphs: Array<{ title?: string; text: string }>;
};

export type GraderCopy = {
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
  bullets: [string, string, string];
  heroPointCta: string;
  freeAnalysis: string;
  criteriaBadge: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailHint: string;
  emailLockedTitle: string;
  emailLockedHint: string;
  emailError: string;
  dropTitle: string;
  dropHint: string;
  selectFile: string;
  analyzeCta: string;
  freeUsedCta: string;
  freeUsedNoticeBefore: string;
  freeUsedLogin: string;
  freeUsedOr: string;
  freeUsedSignup: string;
  freeUsedNoticeAfter: string;
  viewReportCta: string;
  selectFileError: string;
  freeUsedError: string;
  freeUsedApiError: string;
  genericSubmitError: string;
  features: Array<{ t: string; d: string }>;
  positioningTitle: string;
  positioningP1: string;
  positioningP2: string;
  visualSlotLabel: string;
  visualSlotHintBefore: string;
  visualSlotPath: string;
  moreInfoTitle: string;
  moreInfo: MoreInfoItem[];
  loadingSteps: string[];
  loadingTips: string[];
  waitingTitle: string;
  waitingEta: string;
  waitingProgress: string;
  analysisDone: string;
  contentScoreFallback: string;
  criteriaLabel: string;
  detailCta: string;
  overallScore: string;
  potentialShort: string;
  potentialTitle: string;
  potentialGainLabel: string;
  saveReportTitle: string;
  saveReportBody: string;
  freeSignup: string;
  shortEval: string;
  strength: string;
  contentPreview: string;
  scoreDistribution: string;
  suggestions: string;
  gainPotentialLabel: string;
  suggestionsMoreCta: string;
  suggestionFallbackAction: string;
  insightTitle: string;
  insightSuggestionsLabel: string;
  criteriaPanelTitle: string;
  criteriaPanelSubtitle: string;
  finalCtaTitle: string;
  finalCtaBody: string;
  hasAccount: string;
  removeFileAria: string;
};

export const GRADER_COPY: Record<GraderLocale, GraderCopy> = {
  tr: {
    eyebrow: "Ücretsiz içerik analizi",
    heroTitle: "Anlık İçerik Kalite Denetimi",
    heroBody:
      "Görselini yükle; Score 30+ objektif kriterle skorlasın, eksikleri göstersin ve geliştirme potansiyelini açıklasın. Canva ve ChatGPT'den sonra gelen kalite katmanı.",
    bullets: [
      "Yaklaşık 30 saniyede skor ve kategori kırılımı",
      "Score AI önerileri ve aksiyon alanları",
      "İlk analiz ücretsiz, kayıtsız dene",
    ],
    heroPointCta: "İlk ücretsiz analizinle buradan başla",
    freeAnalysis: "Ücretsiz analiz",
    criteriaBadge: "31 kriter",
    emailLabel: "E-posta adresiniz",
    emailPlaceholder: "ornek@mail.com",
    emailHint: "Sonucu ve sonraki adımları paylaşabilmemiz için.",
    emailLockedTitle: "Önce e-posta adresinizi girin",
    emailLockedHint: "Geçerli bir e-posta yazınca dosya seçimi açılır.",
    emailError: "Lütfen geçerli bir e-posta adresi girin.",
    dropTitle: "Görselinizi buraya sürükleyin",
    dropHint: "PNG · JPG · WEBP · Maks. 20 MB",
    selectFile: "Dosya seç",
    analyzeCta: "Ücretsiz analiz et",
    freeUsedCta: "Ücretsiz hak kullanıldı",
    freeUsedNoticeBefore:
      "Bu tarayıcıda ücretsiz analiz hakkı kullanıldı. Devam etmek için",
    freeUsedLogin: "giriş yapın",
    freeUsedOr: "veya",
    freeUsedSignup: "kaydolun",
    freeUsedNoticeAfter: ".",
    viewReportCta: "Mevcut raporunu gör",
    selectFileError: "Lütfen analiz etmek için bir görsel seçin.",
    freeUsedError:
      "Ücretsiz analiz hakkınız daha önce kullanıldı. Yeni analiz için hesabınıza giriş yaparak dashboard üzerinden devam edin.",
    freeUsedApiError:
      "İlk ücretsiz analizinizi tamamladınız. Sonucu kaydetmek için ücretsiz hesap oluşturun.",
    genericSubmitError: "Analiz başlatılırken bir hata oluştu.",
    features: [
      {
        t: "Skorla",
        d: "30+ objektif kritere göre içerik kalitesini ölç.",
      },
      {
        t: "Anla",
        d: "Kritik sorunları, eksiklikleri ve potansiyeli gör.",
      },
      {
        t: "Geliştir",
        d: "Kaydol; Score ile düzenle ve çıktını al.",
      },
    ],
    positioningTitle: "Üretimden sonra gelen kalite katmanı",
    positioningP1:
      "Score AI'ı Canva, ChatGPT veya Adobe'nin karşısına koymuyoruz. Onların ürettiği içeriğin yayınlanmadan önce geçtiği kontrol ve geliştirme sistemi olarak konumlandırıyoruz.",
    positioningP2:
      "İçeriğini yükle. Score analiz etsin, geliştirme alanlarını açıklasın ve yayına hazır hâle getirsin.",
    visualSlotLabel: "Görsel alanı",
    visualSlotHintBefore: "PNG eklemek için",
    visualSlotPath: "public/grader/hero-visual-tr.png",
    moreInfoTitle: "Daha fazla bilgi",
    moreInfo: [
      {
        q: "Score Grader nedir?",
        paragraphs: [
          {
            text: "Score Grader, Score AI'ın ücretsiz giriş noktasıdır. İçeriğini yükler, 31 objektif kritere göre skorunu görür, eksikleri ve geliştirme potansiyelini anlarsın, hesabın olmadan.",
          },
          {
            text: "Ana vaat nettir: içeriğini skorlar, geliştirme alanlarını açıklar, gerekli düzenlemeleri uygular ve onayının ardından yayına hazır veya düzenlenebilir formatta teslim eder.",
          },
          {
            text: "Kısa anlatım: İçeriğini yükle. Score analiz etsin, geliştirsin ve yayına hazır hâle getirsin. Kaydolduğunda bu ilk analiz otomatik olarak Score AI hesabına aktarılır.",
          },
        ],
      },
      {
        q: "Score AI, Canva veya ChatGPT'nin rakibi mi?",
        paragraphs: [
          {
            text: "Hayır. Score'u Canva, ChatGPT veya Adobe'nin karşısına koymuyoruz. Score, içerik üretim araçlarından sonra gelen kalite katmanıdır.",
          },
          {
            text: "Üretilen içeriğin yayınlanmadan önce geçtiği kontrol ve geliştirme sistemi olarak konumlanır: objektif kriterlerle değerlendirir, geliştirme alanlarını belirler ve içeriği markaya özel biçimde yayına hazır hâle getirir.",
          },
          {
            text: "Yani üretim araçlarının yerini almaz; onların çıktısını ölçülebilir, tutarlı ve yayına hazır hale getiren yapay zekâ destekli kalite ve optimizasyon katmanıdır.",
          },
        ],
      },
      {
        q: "Kimler için uygun?",
        paragraphs: [
          {
            text: "Düzenli içerik üreten, küçük veya orta ölçekli bir pazarlama ekibine sahip, büyüme ve kurumsallaşma aşamasındaki markalar. Dev kurumsal şirketler değil; sosyal medyayı işletme sahibinin arada yönettiği mikro KOBİ'ler de değil.",
          },
          {
            title: "Tipik profil",
            text: "Ayda en az 12-15 dijital içerik üretir; ChatGPT, Canva, Adobe veya benzeri araçlardan yararlanır; büyüyor ve pazarlama operasyonunu daha ölçülebilir hale getirmek ister.",
          },
          {
            title: "En güçlü segmentler",
            text: "Büyüyen e-ticaret ve tüketici markaları (gıda, kozmetik, moda, ev ve yaşam, wellness, eğitim, turizm, çok şubeli yerel markalar) ve kurumsallaşan B2B firmalar (üretim, teknoloji, yazılım, lojistik, profesyonel hizmet).",
          },
          {
            text: "Özetle hedef: içerik üretimini artık bir operasyon olarak yönetmek zorunda kalan, ekibi oluşmuş ve marka tutarlılığını sistematik yönetmek isteyen büyüyen markalar.",
          },
        ],
      },
      {
        q: "İlk analizden sonra ne olur?",
        paragraphs: [
          {
            text: "Grader'da skorunu, kategori kırılımlarını, Score AI önerilerini ve eksiklikleri görürsün. Detaylı kayıt, sürekli analiz ve geliştirme için ücretsiz hesap oluşturursun.",
          },
          {
            text: "Kayıt veya giriş sonrası misafir oturumundaki analiz otomatik olarak dashboard hesabına aktarılır. Boş bir panele düşmezsin; doğrudan ilgili analizine gidersin.",
          },
          {
            text: "İkinci içerikten itibaren Score AI içinde kredi veya üyelikle devam edersin. İlk deneyim ücretsizdir; sürdürülebilir operasyon Score AI ile büyür.",
          },
        ],
      },
    ],
    loadingSteps: [
      "Görsel hazırlanıyor...",
      "31 kritere göre analiz ediliyor...",
      "Kategori skorları hesaplanıyor...",
      "Geliştirme alanları belirleniyor...",
      "Rapor son rötuşlarda...",
    ],
    loadingTips: [
      "İyi içerik yalnızca güzel görünmez, ölçülebilir olur.",
      "Marka tutarlılığı, tek bir posttan değil sistemden gelir.",
      "Score, üretimden sonra gelen kalite katmanıdır.",
      "31 kriter, subjektif 'güzel olmuş' yorumunun yerini alır.",
    ],
    waitingTitle: "İçeriğiniz analiz ediliyor",
    waitingEta: "Bu genelde 20–30 saniye sürer. 31 kriteri görsel üzerinden paralel tarıyoruz.",
    waitingProgress: "İlerleme",
    analysisDone: "Analiz tamamlandı",
    contentScoreFallback: "İçerik skoru",
    criteriaLabel: "kriter",
    detailCta: "Detaylı gör, kaydol",
    overallScore: "Genel Skor",
    potentialShort: "Potansiyel",
    potentialTitle: "Potansiyel Skor",
    potentialGainLabel: "Potansiyel artış",
    saveReportTitle: "Detaylı raporu kaydet",
    saveReportBody:
      "Ücretsiz hesap ile bu analizi dashboard'una aktar.",
    freeSignup: "Ücretsiz kaydol",
    shortEval: "Kısa Değerlendirme",
    strength: "Güçlü yön",
    contentPreview: "İçerik Önizleme",
    scoreDistribution: "Score Dağılımı",
    suggestions: "Score AI Önerileri",
    gainPotentialLabel: "puan potansiyeli",
    suggestionsMoreCta:
      "Daha fazla öneri ve tam aksiyon planı için Score AI’ya geçin",
    suggestionFallbackAction:
      "Bu kriteri güçlendir; skora en hızlı katkı buradan gelir.",
    insightTitle: "Score AI İçgörüsü",
    insightSuggestionsLabel: "Öneriler",
    criteriaPanelTitle: "Mikro Kriterler",
    criteriaPanelSubtitle: "Kategorilere göre objektif değerlendirme",
    finalCtaTitle: "Detaylı şekilde gör, ücretsiz kaydol",
    finalCtaBody:
      "Bu rapor hesabına otomatik aktarılır. Tam kriter detayları ve Score ile geliştirme için ücretsiz hesap oluştur.",
    hasAccount: "Hesabım var, giriş yap",
    removeFileAria: "Seçili dosyayı kaldır",
  },
  en: {
    eyebrow: "Free Content Analysis",
    heroTitle: "Instant Content Quality Audit",
    heroBody:
      "Upload your visual; Score grades it against 31 objective criteria, shows gaps, and explains improvement potential. The quality layer after Canva and ChatGPT.",
    bullets: [
      "Score and category breakdown in about 30 seconds",
      "Score AI suggestions and action areas",
      "First analysis free, no signup required",
    ],
    heroPointCta: "Start your first free analysis here",
    freeAnalysis: "Free analysis",
    criteriaBadge: "31 criteria",
    emailLabel: "Your email",
    emailPlaceholder: "you@company.com",
    emailHint: "So we can share the result and next steps with you.",
    emailLockedTitle: "Enter your email first",
    emailLockedHint: "File selection unlocks once your email is valid.",
    emailError: "Please enter a valid email address.",
    dropTitle: "Drag your image here",
    dropHint: "PNG · JPG · WEBP · Max 20 MB",
    selectFile: "Choose file",
    analyzeCta: "Analyze for free",
    freeUsedCta: "Free credit used",
    freeUsedNoticeBefore:
      "The free analysis credit has already been used in this browser. To continue,",
    freeUsedLogin: "sign in",
    freeUsedOr: "or",
    freeUsedSignup: "sign up",
    freeUsedNoticeAfter: ".",
    viewReportCta: "View your report",
    selectFileError: "Please select an image to analyze.",
    freeUsedError:
      "Your free analysis credit was already used. Sign in and continue from the dashboard for new analyses.",
    freeUsedApiError:
      "You have completed your first free analysis. Create a free account to save the result.",
    genericSubmitError: "Something went wrong while starting the analysis.",
    features: [
      {
        t: "Score",
        d: "Measure content quality against 31 objective criteria.",
      },
      {
        t: "Understand",
        d: "See critical issues, gaps, and improvement potential.",
      },
      {
        t: "Improve",
        d: "Sign up, refine with Score, and export the output.",
      },
    ],
    positioningTitle: "The quality layer after production",
    positioningP1:
      "We do not position Score AI against Canva, ChatGPT, or Adobe. It is the control and improvement system content passes through before publishing.",
    positioningP2:
      "Upload your content. Let Score analyze it, explain improvement areas, and make it publish-ready.",
    visualSlotLabel: "Visual slot",
    visualSlotHintBefore: "Add a PNG at",
    visualSlotPath: "public/grader/hero-visual-en.png",
    moreInfoTitle: "More information",
    moreInfo: [
      {
        q: "What is Score Grader?",
        paragraphs: [
          {
            text: "Score Grader is Score AI's free entry point. Upload content, see your score across 31 objective criteria, and understand gaps and potential, without an account.",
          },
          {
            text: "The core promise is clear: Score grades your content, explains improvement areas, applies needed edits, and delivers a publish-ready or editable result after your approval.",
          },
          {
            text: "Short version: Upload your content. Let Score analyze, improve, and make it publish-ready. When you sign up, this first analysis is automatically moved into your Score AI account.",
          },
        ],
      },
      {
        q: "Is Score AI a competitor to Canva or ChatGPT?",
        paragraphs: [
          {
            text: "No. We do not put Score against Canva, ChatGPT, or Adobe. Score is the quality layer that comes after content production tools.",
          },
          {
            text: "It is the control and improvement system content goes through before publishing: evaluate with objective criteria, identify gaps, and prepare brand-specific publish-ready output.",
          },
          {
            text: "In other words, it does not replace production tools. It is the AI-powered quality and optimization layer that makes their output measurable, consistent, and ready to publish.",
          },
        ],
      },
      {
        q: "Who is it for?",
        paragraphs: [
          {
            text: "Growing brands with a small or mid-sized marketing team that produce content regularly and are professionalizing their operations. Not giant enterprises, and not micro SMBs where the owner occasionally posts on social.",
          },
          {
            title: "Typical profile",
            text: "Produces at least 12-15 digital assets per month; uses ChatGPT, Canva, Adobe, or similar tools; is growing and wants marketing operations to become more measurable.",
          },
          {
            title: "Strongest segments",
            text: "Growing ecommerce and consumer brands (food, beauty, fashion, home, wellness, education, travel, multi-location local brands) and maturing B2B companies (manufacturing, tech, software, logistics, professional services).",
          },
          {
            text: "In short: brands that must run content as an operation, already have a team, and want to manage quality and brand consistency systematically.",
          },
        ],
      },
      {
        q: "What happens after the first analysis?",
        paragraphs: [
          {
            text: "On Grader you see your score, category breakdown, Score AI suggestions, and gaps. Create a free account to keep the report and continue analyzing and improving.",
          },
          {
            text: "After signup or login, the guest-session analysis is automatically transferred into your dashboard account. You do not land on an empty panel; you go straight to that analysis.",
          },
          {
            text: "From the second piece of content onward, you continue inside Score AI with credits or membership. The first experience is free; ongoing operations scale with Score AI.",
          },
        ],
      },
    ],
    loadingSteps: [
      "Preparing image...",
      "Analyzing against 31 criteria...",
      "Calculating category scores...",
      "Identifying improvement areas...",
      "Putting the final touches on your report...",
    ],
    loadingTips: [
      "Great content is not only beautiful, it is measurable.",
      "Brand consistency comes from a system, not a single post.",
      "Score is the quality layer after production.",
      "31 criteria replace subjective 'looks good' feedback.",
    ],
    waitingTitle: "Your content is being analyzed",
    waitingEta:
      "This usually takes 20–30 seconds. We scan all 31 criteria from the image in parallel.",
    waitingProgress: "Progress",
    analysisDone: "Analysis complete",
    contentScoreFallback: "Content score",
    criteriaLabel: "criteria",
    detailCta: "See details, sign up",
    overallScore: "Overall Score",
    potentialShort: "Potential",
    potentialTitle: "Potential Score",
    potentialGainLabel: "Potential gain",
    saveReportTitle: "Save the full report",
    saveReportBody: "Transfer this analysis to your dashboard with a free account.",
    freeSignup: "Sign up free",
    shortEval: "Quick evaluation",
    strength: "Strength",
    contentPreview: "Content preview",
    scoreDistribution: "Score distribution",
    suggestions: "Score AI suggestions",
    gainPotentialLabel: "point potential",
    suggestionsMoreCta:
      "Continue in Score AI for more suggestions and a full action plan",
    suggestionFallbackAction:
      "Strengthen this criterion — it’s one of the fastest ways to raise your score.",
    insightTitle: "Score AI insight",
    insightSuggestionsLabel: "Suggestions",
    criteriaPanelTitle: "Micro Criteria",
    criteriaPanelSubtitle: "Objective evaluation by category",
    finalCtaTitle: "See the full details, sign up free",
    finalCtaBody:
      "This report is transferred to your account automatically. Create a free account for full criteria detail and Score-powered improvements.",
    hasAccount: "I already have an account, sign in",
    removeFileAria: "Remove selected file",
  },
};

export function getDefaultGraderLocale(): GraderLocale {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem(GRADER_LOCALE_STORAGE_KEY);
  if (saved === "tr" || saved === "en") return saved;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "tr";
}
