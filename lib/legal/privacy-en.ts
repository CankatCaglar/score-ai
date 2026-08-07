import type { LegalSection } from "./types";

const mail = (email: string) =>
  `<a class="font-medium text-brand-dark underline" href="mailto:${email}">${email}</a>`;

const link = (href: string, label?: string) =>
  `<a class="font-medium text-brand-dark underline break-all" href="${href}" target="_blank" rel="noopener noreferrer">${label ?? href}</a>`;

/** English privacy policy (Nera / Score AI). */
export const PRIVACY_SECTIONS_EN: LegalSection[] = [
  {
    heading: "Privacy Policy",
    paragraphs: [
      `This Privacy Policy governs how Nera Reklam Pazarlama Yazılım Teknoloji Limited Şirketi ("Company", "we", "us", or "our") collects, uses, protects, and discloses information obtained from users (each a "User") in connection with access to or use of the Service. This Privacy Policy applies to the Service and to all products and services offered by the Company. Accessing or using our Service means you agree to the terms set out in this Privacy Policy.`,
    ],
  },
  {
    heading: "What Types of Information We Collect",
    paragraphs: [
      `This Policy sets out which personal data we may collect, how we process and protect that data, the legal bases for processing, and your related rights. In most cases, the legal basis for processing is that it is: (i) necessary for our legitimate interests in running our business, including growing and improving our Services, provided those interests are not overridden by your rights and interests ("Legitimate Interests"), (ii) necessary to enter into a contract with you ("Contract"), or (iii) necessary to comply with a legal obligation ("Legal Obligation"). Where processing is based on your consent ("Consent"), we will state the purposes of processing and provide you with relevant information so that processing is fair and transparent. Because data protection law and practice continually evolve, we may update this policy from time to time by publishing a new policy on the Website, effective from the stated date. It is your responsibility to return to the Website from time to time and review changes. When you use our Service, we may collect two types of information.`,
    ],
  },
  {
    heading: "Personal Information",
    paragraphs: [
      `The Personal Information we collect (that is, information that may allow a User to be identified) may include the User's name and email address, phone number, billing address, and certain payment details (for example, a credit card's expiration date and last four digits). We may also collect Personal Information from your device, such as your IP address.`,
    ],
  },
  {
    heading: "Non-Personal Information",
    paragraphs: [
      `Non-Personal Information may include browser name, type of User device and technical information transmitted by the User's device, language preferences, timestamps and pages visited, operating system, internet service provider used, and other similar information. We may also collect the User's IP address, which may be irreversibly deleted.`,
    ],
  },
  {
    heading: "How Do We Collect Your Information?",
    paragraphs: [
      `We may collect or receive personal data in the ordinary course of business, for example: when you become a customer or visit the Website, you may provide details such as your name, email address, and employer ("Account Data"). We may collect information about your visit such as your IP address and pages visited, and when you use our Services we may collect information about how you use those Services ("Improvement Data"). You may provide your details to us at any time about our Services (via the Website, by email, or otherwise). For our marketing purposes we may obtain and use lists of lawfully compliant potential business customers for our Services ("Marketing Data"), and when customers use our Services we may receive personal data such as team member names or data entered into the Services ("Service Data").`,
    ],
  },
  {
    heading: "How Do We Use the Information We Collect?",
    paragraphs: [
      `We use personal data in the ordinary course of our business, including to provide and improve our Services and to perform any binding contract or legal obligation. For example: answering questions, providing websites and Services, providing advice and support, and invoicing accordingly. Legal basis: Legitimate Interest or Contract. Analyzing and improving the website and Services, for example for technical or security purposes and to enhance the customer experience. Legal basis: Legitimate Interest; however, where applicable law requires your consent to use certain cookies, we will request your Consent and provide relevant information. Marketing and selling our Services, including communicating with you about the same or similar services we offer. If we do so, we will provide an easy and free way for you to opt out of such communications in the future. Legal basis: Legitimate Interests (or Consent as above). In certain cases, sharing with a limited number of third parties described in this policy, for example for operational necessity and business continuity. Legal basis: most processing will be based on Legitimate Interests, some processing will be based on Contract, and where required (as above) some processing may be based on your prior Consent.`,
    ],
  },
  {
    heading: "With Whom We Share Information",
    paragraphs: [
      `We do not sell, trade, or rent Users' Personal Information to other parties. We may share Personal Information with our trusted service providers only to the extent necessary to fulfill the purposes stated above. We will provide our service providers only with information reasonably necessary to perform their services, and they are prohibited from using that information for any other purpose. You can see the full list of our trusted partners and the purpose of sharing information here: ${link("https://www.nerasocial.com/cookiepolicy")}`,
      `We may also disclose Personal Information or other information submitted by a User through the Service if we have a good-faith belief that disclosure is useful or reasonably necessary to: (i) comply with any applicable law, regulation, legal process, or governmental request; (ii) enforce our policies, including investigating potential violations; (iii) investigate, detect, prevent, or take action regarding illegal activities or other misconduct, suspected fraud, or security issues; (iv) establish or exercise our rights of defense against legal claims; (v) prevent harm to the rights, property, or safety of us, our users, you, or any third party; or (vi) where we deem it necessary for cooperation with law enforcement and/or enforcement of intellectual property or other legal rights.`,
      `Non-Personal Information may be shared with other third parties (including retailers, advertising networks, advertising companies, service providers, media, and other related parties) in any of the situations above and also for developing or delivering advertising (whether through our Service or third-party websites, applications, or services) or for improving our Service, conducting business analysis, or other commercial purposes. This information may be combined with information we collect from other sources, provided it remains Anonymous Information.`,
    ],
  },
  {
    heading: "Functional Cookies",
    paragraphs: [
      `These cookies are used to give you a more advanced and convenient experience. For example, they remember your previous preferences and help you access certain content on the Website more easily. You may block the use of these cookies as described in more detail below.`,
    ],
  },
  {
    heading: "Transfer of Personal Information from the EU",
    paragraphs: [
      `Because we operate globally, your Personal Information may need to be transferred to countries outside the European Union (EU). The data protection and other laws of those countries may not be as comprehensive as those in the European Union — in such cases we will take steps to ensure a similar level of protection for your Personal Information. To achieve this we adhere to EU–U.S. standards. Privacy Shield Framework and Swiss–U.S. Privacy Shield Framework as set forth by the U.S. Department of Commerce regarding the collection, use, and retention of personal information transferred from the European Union and Switzerland to the United States. We are responsible for processing personal data we receive under the Privacy Shield Framework and for onward transfer to a party acting as an agent on our behalf. We have certified to the Department of Commerce that we adhere to the Privacy Shield Principles. If there is any conflict between the terms in this Privacy Policy and the Privacy Shield Principles, the Privacy Shield Principles shall govern. With respect to personal data received or transferred pursuant to the Privacy Shield Framework, we are subject to the regulatory enforcement powers of the U.S. Federal Trade Commission. In certain situations, we may be required to disclose personal data in response to lawful requests by public authorities, including to meet national security or law enforcement requirements. Under certain conditions described in more detail on the Privacy Shield website at ${link("https://www.privacyshield.gov/article?id=How-to-Submit-a-Comlaint")}, you may invoke binding arbitration when other dispute resolution procedures have been exhausted. To learn more about the Privacy Shield program and to view our certification, please visit ${link("https://www.privacyshield.gov/")}. You consent to the transfer of your Personal Information to countries outside the European Union.`,
    ],
  },
  {
    heading: "Retention Policy and User Rights",
    paragraphs: [
      `We respect your privacy rights. Therefore you may contact us at any time at ${mail("info@nerasocial.com")} and request access to, deletion of, modification of, or updates to Personal Information about you (for example, if you believe your Personal Information is incorrect, you may request that it be corrected or deleted); or to receive a copy of Personal Information you volunteered to us directly in a structured, commonly used, and machine-readable format; that we stop further use of your Personal Information (for example, you may ask us to stop using or sharing your Personal Information with third parties) or that we remove your Personal Information (subject to any other legal obligation that may require us to retain information such as transaction history and information required by anti-money laundering regulations). We may correct, refresh, or remove incomplete or inaccurate information at any time and at our sole discretion. If you wish to complain about how we handle your Personal Information, please contact our DPO at ${mail("info@nerasocial.com")}. If you are not satisfied with our response or believe we have collected or processed your Personal Information unlawfully, you may lodge a complaint with the relevant data protection authority. Unless otherwise indicated by Users, we retain information we collect for seven (7) years. We retain information to provide the Service and comply with our legal obligations, resolve disputes, and enforce our agreements.`,
    ],
  },
  {
    heading: "Children's Information",
    paragraphs: [
      `We will not knowingly collect Personal Information from children under 16. If we become aware that a user is under 16, we will remove their information from our servers. We reserve the right to request proof of age at any stage so that we can verify that children are not using the Service.`,
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      `We use industry-standard security tools and measures as well as internal guidelines and corporate procedures to prevent misuse of information and data leaks. Information is also protected using Amazon Web Services cloud-based computing and data storage infrastructure (Amazon S3). You can read more about our security practices in our Security and Customer Data Protection center. While we strive to use commercially acceptable tools and procedures to protect information and significantly reduce the risks of data misuse, we cannot guarantee that our systems will be absolutely secure. If you become aware of any security vulnerability or potential data breach, please contact us immediately at ${mail("info@nerasocial.com")}; we will take appropriate measures to address such an incident as deemed necessary.`,
    ],
  },
  {
    heading: "Marketing",
    paragraphs: [
      `We may use your Personal Information, such as your name or email address, ourselves or through third-party subcontractors, to provide you with promotional materials related to our Services as well as news about products, services, websites, and applications, including product updates, contests, events, and other promotional materials. If you have given us consent, we may also send communications about unrelated products or services. We may also choose to share your Personal Information with qualified third-party partners for marketing or similar purposes, but only where you have agreed to such sharing. Such partners will be prohibited from disclosing or using such information except for the limited purposes authorized by users. Respecting your privacy rights, we provide you within such marketing materials a way to refuse further marketing offers from us. You may also unsubscribe and request to stop receiving marketing offers at any time by contacting ${mail("info@nerasocial.com")} with a blank message containing the word "unsubscribe". We may continue to send periodic emails informing you about technical, service, or security issues related to a product or service you requested, confirming that you requested a product or service, or providing periodic updates or information related to the product or service you requested.`,
    ],
  },
  {
    heading: "Merger, Sale, or Bankruptcy",
    paragraphs: [
      `In the event we are acquired by or merged with a third-party legal entity, or in the event of another corporate transaction or bankruptcy or similar event, we reserve the right to transfer or assign information, including Personal Information, in connection with the foregoing events. If the foregoing occurs, our affiliates or the acquiring company will assume the rights and obligations described in this Privacy Policy.`,
    ],
  },
  {
    heading: "Third-Party Websites",
    paragraphs: [
      `Users may find advertising or other content on our Service that links to the sites and services of our partners, suppliers, advertisers, sponsors, licensors, and other third parties. We do not control the content or links that appear on these sites and are not responsible for the practices employed by websites linked to or from our Service. In addition, these sites or services, including their content and links, may be constantly changing. These sites and services may have their own privacy policies and customer service policies. Browsing and interaction on any other website, including websites which have a link to our Service, is subject to that website's own terms and policies.`,
    ],
  },
  {
    heading: "Changes to the Privacy Policy",
    paragraphs: [
      `The Company has the authority to update this privacy policy at any time. We encourage you to periodically review our Privacy Policy for any changes so that you stay informed about how we help protect the personal information we collect. Recent changes will be reflected under the "Last Updated" heading. Continued use of the Service after any changes are posted will be deemed acceptance of those changes.`,
    ],
  },
  {
    heading: "Contact Us",
    paragraphs: [
      `If you have any questions or concerns about this Privacy Policy or our Service's practices and how we handle your Personal Information, please email us at ${mail("info@nerasocial.com")}. We commit to cooperating with the panel established by the EU data protection authorities (DPAs) and the Swiss Federal Data Protection and Information Commissioner (FDPIC) with regard to unresolved Privacy Shield complaints concerning data transferred from the EU and Switzerland. If you have an unresolved privacy or data use concern that we have not addressed satisfactorily, please contact your local DPA.`,
    ],
  },
];
