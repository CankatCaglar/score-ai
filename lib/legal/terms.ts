import { TERMS_SECTIONS_EN } from "./terms-en";
import type { LegalSection } from "./types";

const mail = (email: string) =>
  `<a class="font-medium text-brand-dark underline" href="mailto:${email}">${email}</a>`;

const link = (href: string, label?: string) =>
  `<a class="font-medium text-brand-dark underline break-all" href="${href}" target="_blank" rel="noopener noreferrer">${label ?? href}</a>`;

/** Official Turkish terms of use (Nera / Score AI). */
export const TERMS_SECTIONS_TR: LegalSection[] = [
  {
    heading: "Giriş",
    paragraphs: [
      `BU, SİZ YA DA TEMSİL ETTİĞİNİZ KURULUŞ (BURADAN "SİZ" veya "SİZİN" olarak anılacaktır) VE GEÇERLİ NERA SOSYAL (BURADAN "NERA" olarak anılacaktır) ARASINDAKİ BİR SÖZLEŞMEDİR.`,
    ],
  },
  {
    heading: "Sözleşme Parçaları",
    paragraphs: [
      `Bu Sözleşme, aşağıdaki hüküm ve koşullardan (bundan böyle Genel Hükümler olarak anılacaktır) ve varsa, bireysel Hizmetlerin kullanımına özel hüküm ve koşullardan (bundan böyle "Hizmete Özel Şartlar" olarak anılacaktır) oluşur. Genel Koşullar ile Hizmete Özel Koşullar arasında bir çelişki olması durumunda, Hizmete Özel Koşullar geçerli olacaktır.`,
    ],
  },
  {
    heading: "Sözleşmenin Kabulü",
    paragraphs: [
      `Sözleşmeyi kabul etmek için bağlayıcı bir sözleşmeye girmek için reşit olmanız gerekir. Genel Koşulları kabul etmiyorsanız, Hizmetlerimizden hiçbirini kullanmayın. Genel Koşulları kabul ediyorsanız ve Hizmete Özel Koşulları kabul etmiyorsanız, ilgili Hizmeti kullanmayın. Sözleşmeyi kabul ettiğinizi belirten bir onay kutusunu işaretleyerek veya bir düğmeyi tıklayarak ya da Hizmetleri fiilen kullanarak Sözleşmeyi kabul edebilirsiniz.`,
    ],
  },
  {
    heading: "Servis Tanımı",
    paragraphs: [
      `İnternet erişimini ve Hizmetleri kullanmak için gerekli ekipmanı elde etmekten siz sorumlusunuz. Kullanıcı hesabınızla içerik oluşturabilir ve düzenleyebilirsiniz ve bunu yapmayı seçerseniz, bu tür içerikleri yayınlayabilir ve paylaşabilirsiniz.`,
    ],
  },
  {
    heading: "Beta Hizmet",
    paragraphs: [
      `Test ve değerlendirme amacıyla belirli Hizmetleri kapalı veya açık beta hizmetleri ("Beta Hizmeti" veya "Beta Hizmetleri") olarak sunabiliriz. Beta Hizmetlerinin test edilmesi ve değerlendirilmesi için gereken süreyi belirleme konusunda tek yetki ve takdir yetkisine sahip olduğumuzu kabul ediyorsunuz. Bu tür testlerin başarısının ve varsa Beta Hizmetlerini ticari hizmetler olarak sunma kararının tek yargıcı biz olacağız. Herhangi bir Beta Hizmetine aboneliğinizin bir sonucu olarak, herhangi bir ücretli Hizmeti kullanmak için bir abonelik edinme zorunluluğunuz olmayacaktır. Herhangi bir zamanda ve zaman zaman, size bildirimde bulunarak veya bulunmadan herhangi bir Beta Hizmetini geçici veya kalıcı olarak tamamen veya kısmen durdurma hakkımızı saklı tutarız. Herhangi bir Beta Hizmetinin herhangi bir nedenle değiştirilmesi, askıya alınması veya durdurulması ile ilgili, bunlardan kaynaklanan veya bunlardan kaynaklanan herhangi bir zarardan dolayı Nera'nın size veya herhangi bir üçüncü kişiye karşı sorumlu olmayacağını kabul etmektesiniz.`,
    ],
  },
  {
    heading: "Ücretsiz Deneme",
    paragraphs: [
      `Bir veya daha fazla Hizmetin ücretsiz denemesi için kaydolursanız, Nera, (i) ilgili Hizmetlerin ücretsiz deneme süresinin sonuna kadar (sonlandırılmadığı sürece) geçerli Hizmetleri deneme bazında ücretsiz olarak size sunacaktır. sizin tarafınızdan daha erken), (ii) geçerli Hizmetler için ücretli abonelik süresinin başlangıç tarihi veya (iii) Nera tamamen kendi takdirindedir. Ücretsiz deneme sırasında Hizmetlere girdiğiniz tüm veriler ve Hizmetlerde yapılan tüm özelleştirmeler, (i) hesap için ilgili ücretli abonelik planını satın almadığınız, (ii) satın almadığınız sürece kalıcı olarak kaybolacaktır. geçerli Hizmet yükseltmeleri veya (iii) bu tür verileri deneme süresinin bitiminden önce dışa aktarın. Bu Bölümde yer alan herhangi bir şeye bakılmaksızın, Hizmetler, yasaların izin verdiği ölçüde.`,
    ],
  },
  {
    heading: "Kullanıcı Kayıt Yükümlülükleri",
    paragraphs: [
      `Hizmetlere erişmek veya Hizmetleri kullanmak için gerekli tüm bilgileri sağlayarak bir kullanıcı hesabına kaydolmanız gerekir. Bir kuruluşu temsil ediyorsanız ve Hizmetleri kurumsal şirket içi kullanım için kullanmak istiyorsanız, sizin ve kuruluşunuzdaki diğer tüm kullanıcıların kurumsal iletişim bilgilerinizi vererek kullanıcı hesaplarına kaydolmanızı öneririz. Özellikle kurumsal e-posta adresinizi kullanmanızı öneririz. Şunları kabul etmektesiniz: (i) kayıt sürecinde istendiği şekilde kendiniz hakkında doğru, doğru, güncel ve eksiksiz bilgi sağlamak; ve (ii) kayıt sırasında sağlanan bilgileri doğru, doğru, güncel ve eksiksiz tutmak için muhafaza etmek ve derhal güncellemek. Doğru olmayan, doğru olmayan, güncel olmayan veya eksik herhangi bir bilgi verirseniz veya Nera'nın bu bilgilerin gerçek dışı, hatalı, güncelliğini yitirmiş veya eksik olduğundan şüphelenmek için makul gerekçeleri varsa, Nera kullanıcı hesabınızı feshedebilir ve mevcut veya gelecekteki kullanımı reddedebilir. Hizmetlerin herhangi biri veya tümü.`,
    ],
  },
  {
    heading: "Kullanım Kısıtlamaları",
    paragraphs: [
      `Bu Sözleşmenin diğer tüm hüküm ve koşullarına ek olarak, şunları yapamazsınız:`,
    ],
    items: [
      "(i) Hizmetleri devredemezsiniz veya başka bir şekilde herhangi bir üçüncü tarafa sunamazsınız;",
      "(ii) önceden yazılı izin olmaksızın Hizmetlere dayalı herhangi bir hizmet sağlamak;",
      "(iii) kullanıcı lisansını yeni bir kullanıcıya yeniden atamak dışında, kullanıcı lisanslarının birden fazla kişi tarafından paylaşılmasına veya kullanılmasına izin vermek;",
      "(iv) yürürlükteki yasaların izin verdiği durumlar dışında, Hizmetleri parçalarına ayırmaya, tersine mühendislik yapmaya veya kaynak koda dönüştürmeye çalışmak;",
      "(v) web sitelerinin hüküm ve koşullarını kabul etmeden sitelere üçüncü taraf bağlantıları kullanmak;",
      "(vi) önceden yazılı izin almadan üçüncü şahıs sitelerine linkler göndermek veya logolarını, şirket isimlerini vb. kullanmak;",
      "(vii) Hizmetlere veya ilgili sistemlerine veya ağına yetkisiz erişim sağlamaya çalışmak;",
      "(viii) Hizmetleri, Nera'nın herhangi bir sunucusuna, ağa, bilgisayar sistemine, kaynağına zarar verecek, devre dışı bırakacak, aşırı yükleyecek, bozacak veya zarar verecek şekilde kullanmak;",
      "(ix) Yazılım virüsleri, solucanlar veya diğer zararlı bilgisayar kodları, dosyaları, komut dosyaları veya programları içeren materyalleri göndermek veya depolamak için Hizmetleri kullanmak;",
      "(x) Hizmetleri, Hizmetlerin, bileşenlerinin ve içerdiği verilerin bütünlüğüne, güvenliğine veya performansına müdahale eden veya bozan herhangi bir şekilde kullanmak;",
      "(xi) herhangi bir kişiyi herhangi bir iletişimin kimliği veya kaynağı konusunda yanlış yönlendirmek için sahte bir kimlik oluşturmak;",
      "(xii) başka bir kişi veya kuruluşa ait olan ve herhangi bir hakka sahip olmadığınız, herhangi bir kişi veya kuruluşun kişisel veya gizli bilgileri dahil olmak üzere herhangi bir bilgiyi barındırmak, görüntülemek, yüklemek, değiştirmek, yayınlamak, iletmek, depolamak, güncellemek veya paylaşmak;",
      "(xiii) Hizmetleri, bir kişiyi, kuruluşu veya kurumu mali kazanç sağlamak veya herhangi bir kişiye zarar vermek amacıyla yanlış yönlendirmek veya herhangi bir biçimde yazılı veya yayınlanmış bilgileri iletmek için kullanmak;",
      "(xiv) geçerli herhangi bir yerel, eyalet, ulusal veya uluslararası yasayı ihlal etmek;",
      "(xv) Hizmetleri herhangi bir rekabet veya kıyaslama amacıyla kullanmak;",
      "(xvi) Hizmetlerde yer alan herhangi bir mülkiyet veya diğer bildirimleri kaldırmak veya gizlemek.",
    ],
  },
  {
    heading: "Spam ve Yasadışı Faaliyetler",
    paragraphs: [
      `Hizmetler aracılığıyla yaptığınız aktarımların içeriğinden yalnızca siz sorumlu olmayı kabul edersiniz. Hizmetleri yasa dışı amaçlarla veya yasa dışı, karalayıcı, taciz edici, iftira niteliğinde, başkalarının gizliliğini ihlal eden, taciz edici, tehdit edici, zararlı, kaba, pornografik, müstehcen veya başka bir şekilde sakıncalı olan, dini rencide edici materyallerin iletimi için kullanmamayı kabul edersiniz. duyguları uyandıran, ırkçılığı teşvik eden, virüs veya kötü amaçlı kod içeren veya başka birinin fikri mülkiyetini veya diğer haklarını ihlal eden veya ihlal edebilecek olan. Hizmetleri 'önemsiz posta', 'spam', 'zincir mektuplar', 'kimlik avı' veya istenmeyen toplu e-posta dağıtımı için kullanmamayı kabul ediyorsunuz. Hizmetleri herhangi bir yasa dışı veya yetkisiz etkinlik için kullandığınıza inanmak için makul nedenler varsa, Hizmetlere erişiminizi sonlandırma hakkımızı saklı tutarız.`,
    ],
  },
  {
    heading: "Üçüncü Taraf Uygulamalar",
    paragraphs: [
      `Nera, birçok üçüncü taraf uygulamasıyla (bundan böyle 'Üçüncü Taraf Uygulama(lar)ı' olarak anılacaktır) entegre olur. Üçüncü Şahıs Uygulamalarına erişim ve kullanım, bu tür Üçüncü Şahıs Uygulamaları için geçerli olan hizmet koşullarının ve gizlilik politikalarının (bundan böyle 'Üçüncü Şahıs Şartları' olarak anılacaktır) kabul edilmesini gerektirebilir. Herhangi bir Üçüncü Şahıs Uygulamasına erişmeden veya herhangi bir Üçüncü Şahıs Uygulamasını kullanmadan önce Üçüncü Şahıs Şartlarını okumaktan ve anlamaktan siz sorumlusunuz. Nera'nın herhangi bir Üçüncü Şahıs Uygulamasından sorumlu olmadığını kabul ve beyan edersiniz. Size önceden bildirimde bulunmaya çalışacak olsak da, makul bir şekilde mümkün olduğunda, Nera'nın herhangi bir zamanda ve tamamen kendi takdirimize bağlı olarak ve size herhangi bir bildirimde bulunmaksızın herhangi bir Üçüncü Şahıs Uygulamasına erişimi askıya alabileceğini, kısıtlayabileceğini veya devre dışı bırakabileceğini kabul etmektesiniz. Hizmetler, herhangi bir Üçüncü Şahıs Uygulaması, herhangi bir kar, gelir, veri, şerefiye veya diğer maddi olmayan kayıplar dahil ancak bunlarla sınırlı olmamak üzere size karşı herhangi bir yükümlülük altına girmeksizin.`,
    ],
  },
  {
    heading: "Ücretler ve Ödeme",
    paragraphs: [
      `Hizmetler, çeşitli sürelerdeki abonelik planları kapsamında sunulmaktadır. Bir yıldan kısa süreli abonelik planlarının ödemeleri sadece Kredi Kartı ile yapılabilir. Ücretli abonelik planınızı ücretsiz bir plana düşürmediğiniz veya aboneliği yenilemek istemediğinizi bize bildirmediğiniz sürece, aboneliğiniz her abonelik döneminin sonunda otomatik olarak yenilenecektir. Otomatik yenileme sırasında abonelik ücreti, en son kullandığınız Kredi Kartından tahsil edilecektir. Yenileme ödemesinin farklı bir Kredi Kartı ile yapılmasını isterseniz, size bilgileri değiştirme seçeneği sunuyoruz. Aboneliğinizi yenilemek istemiyorsanız, yenileme tarihinden en az yedi gün önce bize haber vermelisiniz. Ücretsiz bir plana geçmediyseniz ve aboneliğinizi yenilemek istemediğinizi bize bildirmediyseniz, abonelik ücretini en son kullandığınız Kredi Kartından tahsil etmesi için Nera'ya yetki verdiğiniz varsayılacaktır. Zaman zaman, herhangi bir Hizmetin fiyatını veya halihazırda ücretsiz olarak sunulan Hizmetlerin kullanım ücretini değiştirebiliriz. Ücretlerdeki herhangi bir artış, o zaman geçerli olan sürenizin sona ermesine kadar geçerli olmayacaktır. fatura döngüsü. Ücretli bir abonelik planını seçmediğiniz sürece, herhangi bir Hizmeti kullandığınız için sizden ücret alınmayacaktır. Hizmetlerimize aboneliğinizle ilgili olarak yerel, eyalet, il veya yabancı yasalar uyarınca GST, KDV, satış vergisi veya benzeri herhangi bir verginin Nera tarafından tahsil edilmesi durumunda ('Vergiler'), Nera size fatura kesecektir. Bu tür Vergiler için. Abonelik ücretlerine ek olarak Nera'ya bu tür Vergileri ödemeyi kabul etmektesiniz. Nera, bu şekilde ödenen Vergiler için geçerli girdi vergi kredisinden yararlanmanıza yardımcı olmak için geçerli yerel, eyalet, il veya yabancı yasalar tarafından belirtilen biçimde size bir fatura sağlayacaktır.`,
    ],
  },
  {
    heading: "Kuruluş Hesapları ve Yöneticiler",
    paragraphs: [
      `Kuruluşunuz için bir hesaba kaydolduğunuzda, bir veya daha fazla yönetici belirtebilirsiniz. Yöneticiler, Hizmetleri gereksinimlerinize göre yapılandırma ve kuruluş hesabınızdaki son kullanıcıları yönetme hakkına sahip olacaktır. Kuruluş hesabınız sizin adınıza bir üçüncü tarafça oluşturulduysa ve yapılandırıldıysa, söz konusu üçüncü tarafın kuruluşunuz için yönetici rolü üstlenmiş olması muhtemeldir. Bu tür üçüncü taraflarla, kuruluş hesabınızın yöneticisi olarak söz konusu tarafın rollerini ve kısıtlamalarını belirten uygun bir anlaşma yaptığınızdan emin olun. (i) kuruluş hesabı parolanızın gizliliğini sağlamaktan, (ii) kuruluş hesabınızı yönetmek için yetkili kişileri yönetici olarak atamaktan ve (iii) kuruluş hesabınızla bağlantılı olarak gerçekleştirilen tüm faaliyetlerin bu Sözleşmeye uygun olmasını sağlamaktan siz sorumlusunuz. Nera'nın sizin için Hizmetlerin hesap yönetiminden ve dahili yönetiminden sorumlu olmadığını anlıyorsunuz.`,
    ],
  },
  {
    heading: "Kişisel Bilgiler ve Gizlilik",
    paragraphs: [
      `Hizmet aracılığıyla Nera'ya sağladığınız kişisel bilgiler, Nera Gizlilik Politikası'na tabidir. Hizmeti kullanmayı seçmeniz, Nera Gizlilik Politikasının şartlarını kabul ettiğinizi gösterir. Kullanıcı adınızın, şifrenizin ve diğer hassas bilgilerinizin gizliliğini korumaktan siz sorumlusunuz. Kullanıcı hesabınızda meydana gelen tüm faaliyetlerden siz sorumlusunuz ve kullanıcı hesabınızın herhangi bir yetkisiz kullanımını ${mail("info@nerasocial.com")} adresine e-posta göndererek veya ${link("https://www.nerasocial.com/contact/", "nerasocial.com/contact")} üzerinde listelenen numaralardan herhangi birini arayarak bizi derhal bilgilendirmeyi kabul ediyorsunuz. Kullanıcı hesabınızın yetkisiz erişimi ve/veya kullanımı veya başka bir şekilde size veya herhangi bir üçüncü şahsa gelebilecek herhangi bir kayıp veya hasardan sorumlu değiliz.`,
    ],
  },
  {
    heading: "Nera'dan İletişim",
    paragraphs: [
      `Hizmet, hizmet duyuruları, idari mesajlar ve haber bültenleri gibi Nera'dan gelen belirli iletişimleri içerebilir. Bu iletişimlerin Hizmetleri kullanmanın bir parçası olarak kabul edileceğini anlıyorsunuz. Size tam bir mahremiyet sağlama politikamızın bir parçası olarak, size bizden haber bültenleri almaktan vazgeçme seçeneği de sunuyoruz. Ancak, hizmet duyurularını ve yönetim mesajlarını almaktan vazgeçemeyeceksiniz.`,
    ],
  },
  {
    heading: "Şikayetler",
    paragraphs: [
      `Hizmetlerin kullanımının bir parçası olarak faaliyetlerinizle ilgili olarak herhangi bir kişiden bir şikayet alırsak, şikayeti kullanıcı hesabınızın birincil e-posta adresine ileteceğiz. Şikayetçiye tarafımızca iletilen şikayeti aldıktan sonraki 10 gün içinde doğrudan yanıt vermeli ve iletişimde Nera'yı kopyalamalısınız. Size e-posta gönderdiğimiz tarihten itibaren 10 gün içinde şikayetçiye yanıt vermezseniz, şikayetçinin size karşı yasal işlem başlatmasını sağlamak için adınızı ve iletişim bilgilerinizi şikayetçiye ifşa edebiliriz. 10 günlük süre içinde iletilen şikayete yanıt vermemenizin, adınızın ve iletişim bilgilerinizin Nera tarafından şikayetçiye ifşa edilmesine rızanız olarak yorumlanacağını kabul etmektesiniz.`,
    ],
  },
  {
    heading: "Etkin Olmayan Kullanıcı Hesapları Politikası",
    paragraphs: [
      `120 gün boyunca sürekli olarak aktif olmayan, ödenmemiş kullanıcı hesaplarını sonlandırma hakkımızı saklı tutuyoruz. Bu tür bir fesih durumunda, söz konusu kullanıcı hesabıyla ilişkili tüm veriler silinecektir. Bu tür bir fesih hakkında size önceden bildirimde bulunacağız ve verilerinizi yedekleme seçeneği sunacağız. Veri silme politikası, Hizmetlerin herhangi biri veya tamamı ile ilgili olarak uygulanabilir. Her Hizmet, faaliyet dışı kalma süresinin hesaplanması amacıyla bağımsız ve ayrı bir hizmet olarak kabul edilecektir. Başka bir deyişle, Hizmetlerden birindeki etkinlik, kullanıcı hesabınızı başka bir Hizmette etkin tutmak için yeterli değildir. Birden fazla kullanıcıya sahip hesaplarda, kullanıcılardan en az birinin aktif olması durumunda hesap pasif olarak kabul edilmeyecektir.`,
    ],
  },
  {
    heading: "Veri Sahipliği",
    paragraphs: [
      `Sizin tarafınızdan oluşturulan veya saklanan içeriğin mülkiyet hakkınıza saygı duyuyoruz. Sizin tarafınızdan oluşturulan veya saklanan içeriğin sahibi sizsiniz. Sizin tarafınızdan özel olarak izin verilmedikçe, Hizmetleri kullanımınız Nera'ya sizin tarafınızdan oluşturulan veya kullanıcı hesabınızda saklanan içeriği Nera'nın ticari, pazarlama veya benzer bir amaçla kullanma, çoğaltma, uyarlama, değiştirme, yayınlama veya dağıtma lisansı vermez. Ancak, Nera'ya yalnızca Hizmetlerin size sağlanması amacıyla gerektiği şekilde kullanıcı hesabınızın içeriğine erişme, kopyalama, dağıtma, saklama, iletme, yeniden biçimlendirme, herkese açık olarak görüntüleme ve kamuya açık olarak gerçekleştirme izni verirsiniz.`,
    ],
  },
  {
    heading: "Barındırma Konumu",
    paragraphs: [
      `Size hizmet verilen bulut tesisinin konumu, kaydolduğunuz sırada bölgenizin/ülkenizin mevcut bulut tesisleriyle eşlenmesine bağlıdır. Herhangi bir zamanda bölge/ülkeden bulut tesisine haritalamada herhangi bir güncelleme olması durumunda hesabınızı taşıyabilir veya hesabınızı farklı bir bulut tesisine taşımanızı isteyebiliriz. Bölgeniz/ülkeniniz IP adresinize göre belirlendiğinden, kayıt sırasında internet protokol (IP) adresinizi maskelememelisiniz. Herhangi bir zamanda gerçek bölgenizin/ülkenizin kayıtlarımızdaki bölgeden/ülkeden farklı olduğu tespit edilirse, Nera hesabınızı taşımak gibi uygun işlemleri yapabilir veya hesabınızı bölgenize karşılık gelen bulut tesisine taşımanızı isteyebilir. /country veya hesabınızı kapatın ve size Hizmeti reddedin. Bölgenizdeki ülke dışındaki bir bulut tesisinden hizmet alıyorsanız ve bir Nera kuruluşunun bölgenizde/ülkenizde bir ofisi varsa, verileri size atanan bulut tesisinde depolamanın yanı sıra, verilerin yerel bir kopyasını bölgenizde saklayabiliriz.`,
    ],
  },
  {
    heading: "Kullanıcı Tarafından Oluşturulan İçerik",
    paragraphs: [
      `Hizmetlerden herhangi birini kullanarak veya başka bir şekilde oluşturduğunuz içeriği iletebilir veya yayınlayabilirsiniz. Ancak, bu tür içerikten ve bunların iletilmesi veya yayınlanmasının sonuçlarından yalnızca siz sorumlu olacaksınız. Herkese açık hale getirilen herhangi bir içerik, internet üzerinden herkesin erişimine açık olacak ve arama motorları tarafından taranıp dizine eklenebilir. Herhangi bir özel içeriği yanlışlıkla herkese açık hale getirmediğinizden emin olmak sizin sorumluluğunuzdadır. Hizmetlerin diğer kullanıcılarından alabileceğiniz herhangi bir içerik, size OLDUĞU GİBİ yalnızca bilginiz ve kişisel kullanımınız için sağlanmaktadır ve siz, kullanmamayı, kopyalamamayı, çoğaltmamayı, dağıtmamayı, iletmemeyi, yayınlamamayı, görüntülememeyi, satmamayı, lisanslamamayı veya başka bir şekilde kullanmamayı kabul etmektesiniz. söz konusu içeriğin haklarına sahip olan kişinin açık yazılı izni olmaksızın bu tür içeriği herhangi bir amaçla kullanmak. Hizmetlerden herhangi birini kullanırken, telif hakkı bildirimi/bildirimleri veya herhangi bir kopya koruma özelliği/özelliği/özellikleri içeren herhangi bir içerikle karşılaşırsanız, söz konusu telif hakkı bildirimini/bildirimlerini kaldırmamayı veya bu tür kopya koruma özelliklerini devre dışı bırakmamayı kabul etmektesiniz. Telif hakkıyla korunan/telif hakkıyla korunan herhangi bir içeriği Hizmetlerden herhangi birinde kullanıma sunarak, söz konusu içeriği bu şekilde kullanılabilir hale getirmek için söz konusu içerikte herhangi bir hak talebinde bulunabilecek her kişiden olduğu gibi, onay, yetki veya izne sahip olduğunuzu onaylarsınız. Ayrıca, herhangi bir içeriği yukarıda belirtilen şekilde kullanıma sunarak, Nera'nın bu tür içerikte herhangi bir yasa dışılık veya üçüncü şahıs haklarının ihlali ile ilgili şikayetler alması durumunda, sizin tarafınızdan sunulan bu içeriğe erişimi engelleme veya kaldırma hakkına sahip olacağını açıkça kabul etmektesiniz. Hizmetlerden herhangi birini kullanarak ve bu Hizmeti kullanarak herhangi bir içeriği ileterek veya yayınlayarak, bu tür içerikteki yasa dışılık veya üçüncü şahıs haklarının ihlaline ilişkin soruların Nera tarafından bu amaç için atanan temsilci tarafından belirlenmesine açıkça izin vermiş olursunuz.`,
    ],
  },
  {
    heading: "Marka",
    paragraphs: [
      `'Nera Social', Nera logosu, bireysel Hizmetlerin adları ve logoları, Nera Reklam Pazarlama Yazılım Teknoloji Limited Şirketi'nin ticari markalarıdır. Nera'nın önceden izni olmadan Nera ticari markalarını hiçbir şekilde sergilememeyi veya kullanmamayı kabul etmektesiniz.`,
    ],
  },
  {
    heading: "Garanti Reddi",
    paragraphs: [
      `HİZMETLERİN KULLANIMINDAKİ RİSKİN TAMAMEN SİZE AİT OLDUĞUNU AÇIKÇA ANLIYOR VE KABUL EDİYORSUNUZ. HİZMETLER OLDUĞU GİBİ VE MEVCUT OLARAK SUNULMAKTADIR. NERA, ZIMNİ SATILABİLİRLİK VE BELİRLİ BİR AMACA UYGUNLUK GARANTİLERİ DAHİL ANCAK BUNLARLA SINIRLI OLMAYAN, AÇIK VEYA ZIMNİ HER TÜRLÜ GARANTİYİ AÇIKÇA REDDEDER. NERA, HİZMETLERİN KESİNTİSİZ, ZAMANINDA, GÜVENLİ VEYA HATASIZ OLACAĞINA DAİR HİÇBİR GARANTİ VERMEZ. İNDİRİLEN VEYA HİZMETLERİN KULLANIMI ARACILIĞIYLA ELDE EDİLEN HERHANGİ BİR MATERYALİN KULLANIMI KENDİ TARAFINIZA AİT OLACAKTIR VE RİSKİ SİZE AİT OLACAKTIR VE BİLGİSAYAR SİSTEMİNİZİN, CEP TELEFONUNUZUN, KABLOSUZ CİHAZIN KULLANIMI CİHAZININ KABLOSUZ TELEFONUNDAKİ ZARARLARINDAN YALNIZCA SİZ SORUMLUSUNUZ. VEYA BÖYLE BİR MATERYALİN İNDİRİLMESİ. NERA'DAN ALDIĞINIZ YAZILI VEYA SÖZLÜ HİÇBİR TAVSİYE VEYA BİLGİ, NERA'NIN ÇALIŞANLARI VEYA TEMSİLCİLERİ, SÖZLEŞMEDE AÇIKÇA BELİRTİLMEMİŞ HİÇBİR GARANTİ OLUŞTURMAYACAKTIR.`,
    ],
  },
  {
    heading: "Tazminat",
    paragraphs: [
      `Nera'yı, memurlarını, yöneticilerini, çalışanlarını, tedarikçilerini ve bağlı kuruluşlarını, sahip olduğunuz herhangi bir iddiadan kaynaklanan veya bunlarla ilgili her türlü kayıp, zarar, para cezası ve masrafa (avukatlık ücretleri ve masrafları dahil) karşı tazmin etmeyi ve masun tutmayı kabul etmektesiniz. Hizmetleri başka bir tarafın haklarını ihlal ederek, herhangi bir yasayı ihlal ederek, Sözleşmenin herhangi bir hükmünü ihlal ederek veya Nera tarafından bu tür bir kullanıma izin verilmediği sürece Hizmetleri kullanımınızla ilgili diğer herhangi bir iddiada kullandıysanız.`,
    ],
  },
  {
    heading: "Geçerli Yasa ve Yargı Yetkisi",
    paragraphs: [
      `Bu Sözleşmeden kaynaklanan veya bu Sözleşmeyle bağlantılı olarak ortaya çıkan herhangi bir anlaşmazlık veya dava durumunda geçerli olacak geçerli yasa ve yargı yetkisi, ücretli bir müşteriyseniz fatura adresinize ve diğer tüm durumlarda ikamet ettiğiniz eyalet veya ülkenize bağlı olacaktır. Buna göre, her bir taraf, bu Sözleşmeden kaynaklanan veya bu Sözleşme ile bağlantılı olarak ortaya çıkan herhangi bir anlaşmazlık veya dava durumunda, geçerli yasayı (hukuk kurallarının seçimi veya çatışması dikkate alınmaksızın) ve burada belirtilen mahkemelerin münhasır yargı yetkisini kabul eder.`,
    ],
  },
  {
    heading: "Askıya Alma ve Fesih",
    paragraphs: [
      `Herhangi bir yasa dışı faaliyetten şüphelenilmesi, uzun süreli hareketsizlik veya kolluk kuvvetleri veya diğer devlet kurumları tarafından talep edilmesi durumunda kullanıcı hesabınızı askıya alabilir veya herhangi bir Hizmetin tamamına veya bir kısmına erişimi geçici olarak devre dışı bırakabiliriz. Kullanıcı hesaplarının askıya alınmasına veya devre dışı bırakılmasına ilişkin itirazlar, askıya almanın bildirilmesinden itibaren otuz gün içinde ${mail("info@nerasocial.com")} adresine yapılmalıdır. Askıya alınmış veya devre dışı bırakılmış bir kullanıcı hesabını otuz gün sonra feshedebiliriz. İsteğiniz üzerine kullanıcı hesabınızı da sonlandıracağız. Ayrıca, Sözleşmeyi ihlal ettiğinize dair makul bir kanaate dayanarak kullanıcı hesabınızı feshetme ve Hizmetleri reddetme ve beklenmeyen teknik sorunlar veya Beta Hizmetinin kesilmesi durumunda herhangi bir Beta Hizmetine erişiminizi sonlandırma hakkımızı saklı tutuyoruz. Nera'nın bu Sözleşme kapsamındaki yükümlülüklerini ihlal etmesi durumunda kullanıcı hesabınızı feshetme hakkınız vardır ve böyle bir durumda önceden ödenmiş ücretlerin orantılı olarak iadesini alma hakkınız olacaktır. Kullanıcı hesabının feshi, tüm Hizmetlere erişimin reddini, e-posta adresiniz ve şifreniz gibi kullanıcı hesabınızdaki bilgilerin silinmesini ve kullanıcı hesabınızdaki tüm verilerin silinmesini içerecektir.`,
    ],
  },
  {
    heading: "Hizmet Şartlarının Değiştirilmesi",
    paragraphs: [
      `Bu Sözleşmeyi, herhangi bir zamanda bir hizmet duyurusu yoluyla veya birincil e-posta adresinize e-posta göndererek size bildirimde bulunarak değiştirebiliriz. Sözleşmede haklarınızı etkileyen önemli değişiklikler yaparsak, birincil e-posta adresinize en az 30 gün önceden e-posta yoluyla değişiklikler bildirilecektir. Sözleşme, Hizmetlerin kullanımıyla bağlantılı haklarınızı önemli ölçüde etkileyecek şekilde değiştirilirse, değiştirilmiş Sözleşmenin kullanılabilirliği konusunda bilgilendirildikten sonraki 30 gün içinde Nera'ya e-posta yoluyla bildirimde bulunarak Hizmetleri kullanımınızı sonlandırabilirsiniz. Bu tür bir fesih durumunda, önceden ödenmiş ücretlerin kullanılmayan kısmının orantılı olarak iadesini alma hakkınız olacaktır. Sözleşmede yapılan herhangi bir değişikliğin yürürlüğe girdiği tarihten sonra Hizmeti kullanmaya devam etmeniz, değiştirilen Sözleşmeyi kabul ettiğiniz kabul edilecektir.`,
    ],
  },
  {
    heading: "Hizmet Şartlarının Sonu",
    paragraphs: [
      `Bu Sözleşmeyle ilgili herhangi bir sorunuz veya endişeniz varsa, lütfen bizimle ${mail("info@nerasocial.com")} adresinden iletişime geçin.`,
    ],
  },
];

export function getTermsSections(locale: string): LegalSection[] {
  return locale === "en" ? TERMS_SECTIONS_EN : TERMS_SECTIONS_TR;
}
