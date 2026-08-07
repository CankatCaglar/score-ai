import { PRIVACY_SECTIONS_EN } from "./privacy-en";
import type { LegalSection } from "./types";

const mail = (email: string) =>
  `<a class="font-medium text-brand-dark underline" href="mailto:${email}">${email}</a>`;

const link = (href: string, label?: string) =>
  `<a class="font-medium text-brand-dark underline break-all" href="${href}" target="_blank" rel="noopener noreferrer">${label ?? href}</a>`;

/** Official Turkish privacy policy (Nera / Score AI). */
export const PRIVACY_SECTIONS_TR: LegalSection[] = [
  {
    heading: "Gizlilik Politikası",
    paragraphs: [
      `Bu Gizlilik Politikası, Nera Reklam Pazarlama Yazılım Teknoloji Limited Şirketi'nin ("Şirket", "biz", "bize" veya "bizim") kullanıcılardan (her biri bir "Kullanıcı" olarak anılacaktır) toplanan bilgileri toplama, kullanma, koruma ve açıklama şeklini düzenler. Hizmete erişim veya Hizmetin kullanımı ile bağlantılı olarak. Bu Gizlilik Politikası, Hizmet ve Şirket tarafından sunulan tüm ürün ve hizmetler için geçerlidir. Hizmetimize erişmek veya Hizmeti kullanmak, bu Gizlilik Politikasında belirtilen şartlara uymayı kabul ettiğiniz anlamına gelir.`,
    ],
  },
  {
    heading: "Ne Tür Bilgiler Topluyoruz",
    paragraphs: [
      `Bu Politika, hangi kişisel verileri toplayabileceğimizi, bu verileri nasıl işlediğimizi ve koruduğumuzu, bu işleme için yasal gerekçeleri ve ilgili haklarınızı belirler. Çoğu durumda, yasal zemin işlemenin: (i) Hizmetlerimizi büyütmek ve iyileştirmek de dahil olmak üzere işimizi yürütmedeki meşru menfaatlerimiz için gerekli olması, ancak bu menfaatlerin sizin haklarınız ve menfaatlerinizden ağır basmaması ('Meşru Çıkarlar'), (ii) sizinle bir sözleşme yapmak için gerekliyse ('Sözleşme') veya (iii) işlemeyi yürütmek için yasal bir yükümlülüğümüz var ('Yasal Yükümlülük'). İşlemenin sizin izninize dayandığı durumlarda ("Rıza"), işleme amaçlarını belirleyeceğiz ve işlemeyi adil ve şeffaf hale getirmek için size ilgili bilgileri sağlayacağız. Veri koruma kanunu ve uygulaması sürekli geliştiğinden, belirtilen tarihten itibaren geçerli olmak üzere Web Sitesinde yeni bir politika yayınlayarak yapacağımız bu politikayı zaman zaman güncellememiz gerekecek. Zaman zaman Web Sitesine geri dönmek ve değişiklikleri kontrol etmek sizin sorumluluğunuzdadır. Hizmetimizi kullandığınızda, iki tür bilgi toplayabiliriz.`,
    ],
  },
  {
    heading: "Kişisel Bilgiler",
    paragraphs: [
      `Topladığımız Kişisel Bilgiler (yani, Kullanıcının kimliğinin belirlenmesine izin verebilecek bilgiler), Kullanıcının adı ve e-posta adresi, telefon numarası, fatura adresi ve belirli ödeme bilgileri (örneğin, kredi kartının son kullanma tarihi ve son dört hane vb.) Cihazınızdan IP adresiniz gibi Kişisel Bilgileri de toplayabiliriz.`,
    ],
  },
  {
    heading: "Kişisel Olmayan Bilgiler",
    paragraphs: [
      `Kişisel Olmayan Bilgiler, tarayıcı adını, Kullanıcı cihazının türünü ve Kullanıcının cihazı tarafından iletilen teknik bilgileri, dil tercihlerini, zaman damgalarını ve ziyaret edilen sayfaları, işletim sistemini, kullanılan internet servis sağlayıcısını ve diğer benzer bilgileri içerebilir. Ayrıca, geri dönülemez bir şekilde silinebilecek olan Kullanıcının IP adresini de toplayabiliriz.`,
    ],
  },
  {
    heading: "Bilgilerinizi Nasıl Topluyoruz?",
    paragraphs: [
      `Normal iş akışı içinde kişisel veriler toplayabilir veya sağlayabiliriz, örneğin: Müşteri olduğunuzda, Web Sitesini ziyaret ettiğinizde adınız, e-posta adresiniz ve işvereniniz ('Hesap Verileri') gibi ayrıntıları bize verebilirsiniz. IP adresiniz ve ziyaret ettiğiniz sayfalar gibi ziyaretinizle ilgili bilgileri toplayabiliriz ve Hizmetlerimizi kullandığınızda bu Hizmetleri nasıl kullandığınız hakkında bilgi toplayabiliriz ('İyileştirme Verileri'), istediğiniz zaman bize ayrıntılarınızı verebilirsiniz. Hizmetlerimiz hakkında (Web sitesi aracılığıyla, e-posta yoluyla veya başka bir şekilde) ve pazarlama amaçlarımız için Hizmetlerimiz için yasal olarak uyumlu potansiyel ticari müşterilerin listelerini ("Pazarlama Verileri") alabiliriz ve bunları kullanırken müşterilerimizden kişisel veriler alabiliriz. Ekip üyelerinin adları veya Hizmetlere girilen veriler gibi Hizmetlerimiz ('Hizmet Verileri').`,
    ],
  },
  {
    heading: "Topladığımız Bilgileri Nasıl Kullanıyoruz?",
    paragraphs: [
      `Kişisel verileri, Hizmetlerimizi sağlamak ve iyileştirmek ve herhangi bir bağlayıcı sözleşme veya yasal yükümlülüğü yerine getirmek dahil olmak üzere, işimizin normal seyrinde kullanırız. Örneğin: Soruları yanıtlamak, web sitelerini ve Hizmetleri sağlamak, tavsiye ve destek sağlamak ve buna göre fatura kesmek. Yasal dayanak: Meşru Menfaat veya Sözleşme. Web sitesini ve Hizmetleri, örneğin teknik veya güvenlik amaçlarıyla analiz etmek ve iyileştirmek ve müşteri deneyimini geliştirmek. Yasal dayanak: Meşru Menfaat, ancak örneğin geçerli yasanın belirli çerezleri kullanmak için izninizi gerektirdiği durumlarda, size ilgili bilgileri sağlayarak Onayınızı isteyeceğiz. Sizinle aynı veya benzer hizmetler hakkında iletişim kurmak da dahil olmak üzere Hizmetlerimizi pazarlamak ve satmak için ki biz sunuyoruz. Bunu yaparsak, gelecekte bu tür iletişimleri almaktan vazgeçmeniz için size kolay ve ücretsiz bir yol sağlayacağız. Yasal dayanak: Meşru Menfaatler (veya yukarıdaki gibi Rıza). Belirli durumlarda, örneğin operasyonel gereklilikler ve iş sürekliliği amaçları için bu politikada açıklanan sınırlı sayıda üçüncü tarafla paylaşmak. Yasal dayanak: çoğu işleme Meşru Menfaatlere dayalı olacaktır, bazı işlemler Sözleşmeye dayalı olacaktır ve gerektiğinde (yukarıdaki gibi) bazı işlemler önceden İzninize dayalı olabilir.`,
    ],
  },
  {
    heading: "Bilgileri Kimlerle Paylaşıyoruz",
    paragraphs: [
      `Kullanıcıların Kişisel Bilgilerini diğer taraflara satmayız, ticaretini yapmayız veya kiralamayız. Kişisel Bilgileri, yalnızca yukarıda belirtilen amaçları yerine getirmek için gerekli olduğu ölçüde güvenilir hizmet sağlayıcılarımızla paylaşabiliriz. Hizmet sağlayıcılarımıza yalnızca hizmetleri gerçekleştirmek için makul ölçüde gerekli olan bilgileri sağlayacağız ve bu bilgileri başka herhangi bir amaçla kullanmaları yasaklanacaktır. Güvenilir ortaklarımızın tam listesini ve bilgileri paylaşma amacımızı burada görebilirsiniz: ${link("https://www.nerasocial.com/cookiepolicy")}`,
      `Kişisel Bilgileri veya Hizmet aracılığıyla bir Kullanıcı tarafından gönderilen diğer bilgileri de ifşa edebiliriz. Bu tür bilgilerin açıklanmasının aşağıdakiler için yararlı veya makul ölçüde gerekli olduğuna iyi niyetli bir inancımız varsa: (i) geçerli herhangi bir yasaya, düzenlemeye, yasal sürece veya hükümet talebine uymak; (ii) olası ihlallerin araştırılması da dahil olmak üzere politikalarımızı uygulamak; (iii) yasa dışı faaliyetler veya diğer suistimaller, şüpheli dolandırıcılık veya güvenlik konularıyla ilgili soruşturma yapmak, tespit etmek, önlemek veya harekete geçmek; (iv) yasal taleplere karşı savunma haklarımızı oluşturmak veya kullanmak; (v) bizim, kullanıcılarımızın, sizin veya herhangi bir üçüncü tarafın haklarına, mülkiyetine veya güvenliğine zarar gelmesini önlemek; veya (vi) kanun uygulayıcı kurumlarla işbirliği yapmak amacıyla ve/veya fikri mülkiyet veya diğer yasal hakların uygulanması için gerekli gördüğümüz durumlarda.`,
      `Kişisel Olmayan Bilgiler diğer üçüncü taraflarla (perakendeciler, reklam ağları, reklam şirketleri, hizmet sağlayıcılar, medya ve diğer ilgili taraflar dahil) yukarıdaki durumlardan herhangi birinde ve ayrıca reklam geliştirme veya sunma amacıyla (ister Hizmetimiz veya üçüncü tarafların web siteleri, uygulamaları veya hizmetleri aracılığıyla) veya Hizmetimizi geliştirmek, iş analizi yapmak veya diğer ticari amaçlar için. Bu bilgiler, bilgilerin Anonim Bilgi olarak kalması koşuluyla, diğer kaynaklardan topladığımız bilgilerle birleştirilebilir.`,
    ],
  },
  {
    heading: "İşlev Çerezleri",
    paragraphs: [
      `Bu çerezler size daha gelişmiş ve kolay bir kullanım deneyimi yaşatmak için kullanılan çerezlerdir. Örneğin önceki tercihlerinizi hatırlamak, Web Sitesi üzerinde yer alan bazı içeriklere rahatça erişmenizi sağlamak işlevlerini yerine getirmektedir. Aşağıda detaylı olarak açıklanan şekilde bu çerezlerin kullanımını engelleyebilirsiniz.`,
    ],
  },
  {
    heading: "AB'den Kişisel Bilgilerin Transferi",
    paragraphs: [
      `Küresel olarak faaliyet gösterdiğimiz için Kişisel Bilgilerinizi Avrupa Birliği (AB) dışındaki ülkelere aktarmanız gerekebilir. Bu ülkelerin veri koruma ve diğer yasaları Avrupa Birliği'ndekiler kadar kapsamlı olmayabilir - bu durumlarda biz Kişisel Bilgilerinize benzer düzeyde bir koruma sağlanması için adımlar atacaktır. Bunu başarmak için AB-ABD standartlarına uyuyoruz. Gizlilik Kalkanı Çerçevesi ve İsviçre-ABD Avrupa Birliği ve İsviçre'den Amerika Birleşik Devletleri'ne aktarılan kişisel bilgilerin toplanması, kullanılması ve saklanmasıyla ilgili olarak ABD Ticaret Bakanlığı tarafından belirlenen Gizlilik Kalkanı Çerçevesi. Aldığımız kişisel verilerin Gizlilik Kalkanı Çerçevesi kapsamında işlenmesinden ve daha sonra bizim adımıza bir ajans olarak hareket eden bu tarafa aktarılmasından sorumluyuz. Gizlilik Kalkanı İlkelerine uyduğumuzu Ticaret Bakanlığı'na belgeledik. Bu Gizlilik Politikasındaki koşullar ile Gizlilik Kalkanı İlkeleri arasında herhangi bir çelişki olması durumunda, Gizlilik Kalkanı İlkeleri geçerli olacaktır. Gizlilik Kalkanı Çerçevesi uyarınca alınan veya aktarılan kişisel verilerle ilgili olarak, ABD Federal Ticaret Komisyonu'nun düzenleyici uygulama yetkilerine tabiyiz. Bazı durumlarda, ulusal güvenlik veya kanun yaptırımı gerekliliklerini karşılamak da dahil olmak üzere, kamu makamlarının yasal taleplerine yanıt olarak kişisel verileri ifşa etmemiz gerekebilir. ${link("https://www.privacyshield.gov/article?id=How-to-Submit-a-Comlaint")} adresindeki Gizlilik Kalkanı web sitesinde daha ayrıntılı olarak açıklanan belirli koşullar altında, diğer anlaşmazlık çözüm prosedürleri tükendiğinde bağlayıcı tahkime başvurabilirsiniz. Gizlilik Kalkanı programı hakkında daha fazla bilgi edinmek ve sertifikamızı görüntülemek için lütfen ${link("https://www.privacyshield.gov/")} adresini ziyaret edin. Kişisel Bilgilerinizin Avrupa Birliği dışındaki ülkelere aktarılmasına izin vermektesiniz.`,
    ],
  },
  {
    heading: "Saklama Politikası ve Kullanıcı Hakları",
    paragraphs: [
      `Gizlilik haklarınıza saygı duyuyoruz ve bu nedenle istediğiniz zaman ${mail("info@nerasocial.com")} adresinden bizimle iletişime geçebilir ve sizinle ilgili Kişisel Bilgilere erişmek, bunları silmek, değiştirmek veya güncellemek için talepte bulunabilirsiniz (örneğin, Kişisel Bilgilerinizin yanlış olduğunu düşünüyorsanız, düzeltilmesini veya silinmesini isteyebilirsiniz); veya bize doğrudan gönüllü olduğunuz Kişisel Bilgilerin yapılandırılmış, yaygın olarak kullanılan ve makine tarafından okunabilir bir biçimde bir kopyasını almak için; Kişisel Bilgilerinizi daha fazla kullanmayı bırakacağımızı (örneğin, Kişisel Bilgilerinizi üçüncü şahıslarla kullanmayı veya üçüncü taraflarla paylaşmayı durdurmamızı isteyebilirsiniz) veya Kişisel Bilgilerinizi kaldırmamızı (gerektirebilecek diğer herhangi bir yasal yükümlülüğe tabi olarak) işlem geçmişi ve kara para aklamayla mücadele yönetmeliğinin gerektirdiği bilgiler gibi bilgileri saklamamızı sağlar. Eksik veya yanlış bilgileri herhangi bir zamanda ve kendi takdirimize bağlı olarak düzeltebilir, yenileyebilir veya kaldırabiliriz. Kişisel Bilgilerinizi nasıl ele aldığımız konusunda bir şikayette bulunmak istiyorsanız, lütfen ${mail("info@nerasocial.com")} adresinden DPO'muzla iletişime geçin. Yanıtımızdan memnun değilseniz veya Kişisel Bilgilerinizi yasalara uygun olmayan şekilde topladığımızı veya işlediğimizi düşünüyorsanız, ilgili veri koruma makamına şikayette bulunabilirsiniz. Kullanıcılar tarafından aksi belirtilmedikçe, topladığımız bilgileri yedi (7) yıl süreyle saklarız. Bilgileri Hizmeti sağlamak ve yasal yükümlülüklerimize uymak, anlaşmazlıkları çözmek ve sözleşmelerimizi uygulamak için saklarız.`,
    ],
  },
  {
    heading: "Çocuk Bilgileri",
    paragraphs: [
      `16 yaşın altındaki çocuklardan bilerek Kişisel Bilgi toplamayacağız. Bir kullanıcının 16 yaşın altında olduğunu fark edersek, bilgilerini sunucularımızdan kaldıracağız. Çocukların Hizmeti kullanmadığını doğrulayabilmemiz için herhangi bir aşamada yaş kanıtı talep etme hakkımızı saklı tutarız.`,
    ],
  },
  {
    heading: "Güvenlik",
    paragraphs: [
      `Bilginin kötüye kullanımını ve veri sızıntısını önlemek için endüstri standardı güvenlik araçları ve önlemlerinin yanı sıra dahili yönergeler ve kurumsal prosedürler kullanıyoruz. Bilgiler ayrıca Amazon'un Web hizmetleri bulut tabanlı bilgi işlem ve veri depolama altyapısı (Amazon S3) kullanılarak korunur. Güvenlik ve Müşteri Verilerini Koruma merkezimizde güvenlik uygulamalarımızı daha fazla okuyabilirsiniz. Bilgileri korumak için ticari olarak kabul edilebilir araçları ve prosedürleri kullanmaya çalışırken, veri kötüye kullanımı risklerini önemli ölçüde azaltırken, sistemlerimizin kesinlikle güvenli olacağını garanti edemeyiz. Herhangi bir güvenlik açığından veya potansiyel veri ihlalinden haberdar olursanız, lütfen hemen ${mail("info@nerasocial.com")} adresinden bizimle iletişime geçin; gerekli görüldüğü şekilde bu tür olayı ele almak için uygun önlemleri alacağız.`,
    ],
  },
  {
    heading: "Pazarlama",
    paragraphs: [
      `Adınız veya e-posta adresiniz gibi Kişisel Bilgilerinizi, kendimiz veya üçüncü taraf taşeronlarımızı kullanarak, size Hizmetlerimiz ile ilgili promosyon malzemelerinin yanı sıra haberler de dahil olmak üzere ürünler, hizmetler, web siteleri ve uygulamalar sağlamak amacıyla kullanabiliriz. ürün güncellemeleri, yarışmalar, etkinlikler ve diğer promosyon malzemeleri hakkında. Bize onay verdiyseniz, ilgisiz ürünler veya hizmetler için de iletişim gönderebiliriz. Ayrıca, Kişisel Bilgilerinizi pazarlama veya diğer benzer amaçlarla, ancak yalnızca bu bilgileri paylaşmayı kabul ettiğiniz durumlarda, nitelikli üçüncü taraf ortaklarla paylaşmayı seçebiliriz. Bu tür ortakların, kullanıcıların izin verdiği sınırlı amaçlar dışında, bu tür bilgileri ifşa etmesi veya kullanması yasaklanacaktır. Gizlilik hakkınıza saygı duyarak, bizden daha fazla pazarlama teklifi almayı reddetmeniz için bu tür pazarlama materyalleri içinde size sağlıyoruz. Ayrıca, istediğiniz zaman ${mail("info@nerasocial.com")} adresine "kaldır" yazılı boş bir mesaj göndererek iletişime geçerek abonelikten çıkmayı ve pazarlama tekliflerini almayı bırakma talebinde bulunabilirsiniz. talep ettiğiniz bir ürün veya hizmetle ilgili teknik, hizmet veya güvenlik sorunları hakkında sizi bilgilendiren, bir ürün veya hizmeti talep ettiğinizi teyit eden veya talep ettiğiniz ürün veya hizmetle ilgili periyodik güncellemeler veya bilgiler sağlayan periyodik e-postalar göndermeye devam etmek.`,
    ],
  },
  {
    heading: "Birleşme, Satış veya İflas",
    paragraphs: [
      `Bir üçüncü taraf tüzel kişi tarafından satın alınmamız veya bunlarla birleştirilmemiz veya başka bir kurumsal işlem veya iflas veya benzer bir olay olması durumunda, Kişisel Bilgiler dahil olmak üzere bilgileri devretme veya devretme hakkını saklı tutarız. yukarıdaki olaylar. Yukarıdakilerin olması durumunda, bağlı şirketlerimiz veya devralan şirket, bu Gizlilik Politikasında açıklanan hak ve yükümlülükleri üstlenecektir.`,
    ],
  },
  {
    heading: "Üçüncü taraf web siteleri",
    paragraphs: [
      `Kullanıcılar, Hizmetimizde ortaklarımızın, tedarikçilerimizin, reklamcılarımızın, sponsorlarımızın, lisans verenlerimizin ve diğer üçüncü tarafların sitelerine ve hizmetlerine bağlantı veren reklam veya diğer içerikler bulabilir. Bu sitelerde görünen içeriği veya bağlantıları kontrol etmiyoruz ve Hizmetimize veya Hizmetimizden bağlantılı web sitelerinin kullandığı uygulamalardan sorumlu değiliz. Ayrıca bu siteler veya hizmetler, içerikleri ve bağlantıları da dahil olmak üzere sürekli değişiyor olabilir. Bu sitelerin ve hizmetlerin kendi gizlilik politikaları ve müşteri hizmetleri politikaları olabilir. Hizmetimize bağlantısı olan web siteleri de dahil olmak üzere başka herhangi bir web sitesinde gezinme ve etkileşim, o web sitesinin kendi hüküm ve politikalarına tabidir.`,
    ],
  },
  {
    heading: "Gizlilik Politikasında Değişiklik",
    paragraphs: [
      `Şirket, bu gizlilik politikasını herhangi bir zamanda güncelleme yetkisine sahiptir. Topladığımız kişisel bilgilerin korunmasına nasıl yardımcı olduğumuzdan haberdar olmak için herhangi bir değişiklik için Gizlilik Politikamızın periyodik olarak gözden geçirilmesini teşvik ediyoruz. Son değişiklikler "Son Güncelleme" başlığına yansıtılacaktır. Herhangi bir değişikliğin yayınlanmasının ardından Hizmetin kullanılmaya devam edilmesi, bu değişikliklerin kabulü olarak kabul edilecektir.`,
    ],
  },
  {
    heading: "Bize Ulaşın",
    paragraphs: [
      `Bu Gizlilik Politikası veya Hizmetimizin uygulamaları ve Kişisel Bilgilerinizi nasıl ele aldığımız hakkında herhangi bir sorunuz veya endişeniz varsa, lütfen ${mail("info@nerasocial.com")} adresinden bize e-posta ile ulaşın. AB verileri tarafından kurulan panel ile işbirliği yapmayı taahhüt ediyoruz. AB ve İsviçre'den aktarılan verilerle ilgili çözülmemiş Gizlilik Kalkanı şikayetleriyle ilgili olarak koruma yetkilileri (DPA) ve İsviçre Federal Veri Koruma ve Bilgi Komisyonu (FDPIC). Tatmin edici bir şekilde ele almadığımız çözülmemiş bir gizlilik veya veri kullanımı endişeniz varsa, lütfen yerel DPA'nızla iletişime geçin.`,
    ],
  },
];

export function getPrivacySections(locale: string): LegalSection[] {
  return locale === "en" ? PRIVACY_SECTIONS_EN : PRIVACY_SECTIONS_TR;
}
