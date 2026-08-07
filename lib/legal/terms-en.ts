import type { LegalSection } from "./types";

const mail = (email: string) =>
  `<a class="font-medium text-brand-dark underline" href="mailto:${email}">${email}</a>`;

const link = (href: string, label?: string) =>
  `<a class="font-medium text-brand-dark underline break-all" href="${href}" target="_blank" rel="noopener noreferrer">${label ?? href}</a>`;

/** English terms of use (Nera / Score AI). */
export const TERMS_SECTIONS_EN: LegalSection[] = [
  {
    heading: "Introduction",
    paragraphs: [
      `THIS IS AN AGREEMENT BETWEEN YOU OR THE ENTITY YOU REPRESENT (HEREINAFTER "YOU" OR "YOUR") AND THE APPLICABLE NERA SOCIAL (HEREINAFTER "NERA").`,
    ],
  },
  {
    heading: "Parts of the Agreement",
    paragraphs: [
      `This Agreement consists of the following terms and conditions (hereinafter the General Terms) and, if any, terms and conditions specific to the use of individual Services (hereinafter "Service-Specific Terms"). In the event of a conflict between the General Terms and the Service-Specific Terms, the Service-Specific Terms shall prevail.`,
    ],
  },
  {
    heading: "Acceptance of the Agreement",
    paragraphs: [
      `To accept the Agreement you must be of legal age to enter into a binding contract. If you do not accept the General Terms, do not use any of our Services. If you accept the General Terms but do not accept the Service-Specific Terms, do not use the relevant Service. You may accept the Agreement by checking a checkbox indicating acceptance, by clicking a button, or by actually using the Services.`,
    ],
  },
  {
    heading: "Service Description",
    paragraphs: [
      `You are responsible for obtaining Internet access and the equipment necessary to use the Services. With your user account you may create and edit content and, if you choose to do so, you may publish and share such content.`,
    ],
  },
  {
    heading: "Beta Service",
    paragraphs: [
      `We may offer certain Services as closed or open beta services for testing and evaluation purposes ("Beta Service" or "Beta Services"). You acknowledge that we have sole authority and discretion to determine the period required for testing and evaluating Beta Services. We will be the sole judge of the success of such tests and of any decision to offer Beta Services as commercial services. As a result of your subscription to any Beta Service, you will not be required to obtain a subscription to use any paid Service. We reserve the right at any time and from time to time to discontinue any Beta Service temporarily or permanently, in whole or in part, with or without notice to you. You agree that Nera will not be liable to you or any third party for any damages related to, arising out of, or resulting from the modification, suspension, or discontinuation of any Beta Service for any reason.`,
    ],
  },
  {
    heading: "Free Trial",
    paragraphs: [
      `If you register for a free trial of one or more Services, Nera will make the applicable Services available to you free of charge on a trial basis until the earlier of (i) the end of the free trial period for the applicable Services (unless terminated earlier by you), (ii) the start date of any paid subscription period for the applicable Services, or (iii) as determined by Nera in its sole discretion. All data you enter into the Services during the free trial and all customizations made in the Services will be permanently lost unless you (i) purchase the relevant paid subscription plan for the account, (ii) purchase applicable Service upgrades, or (iii) export such data before the trial period ends. Notwithstanding anything in this Section, the Services are provided to the extent permitted by law.`,
    ],
  },
  {
    heading: "User Registration Obligations",
    paragraphs: [
      `To access or use the Services you must register for a user account by providing all required information. If you represent an organization and wish to use the Services for corporate internal use, we recommend that you and all other users in your organization register for user accounts using your corporate contact details. In particular, we recommend using your corporate email address. You agree to: (i) provide true, accurate, current, and complete information about yourself as prompted in the registration process; and (ii) maintain and promptly update the information provided during registration to keep it true, accurate, current, and complete. If you provide any information that is untrue, inaccurate, not current, or incomplete, or if Nera has reasonable grounds to suspect that such information is untrue, inaccurate, not current, or incomplete, Nera may terminate your user account and refuse any and all current or future use of any or all of the Services.`,
    ],
  },
  {
    heading: "Use Restrictions",
    paragraphs: [
      `In addition to all other terms and conditions of this Agreement, you may not:`,
    ],
    items: [
      "(i) transfer the Services or otherwise make them available to any third party;",
      "(ii) provide any service based on the Services without prior written permission;",
      "(iii) allow user licenses to be shared or used by more than one person, except for reassigning a user license to a new user;",
      "(iv) attempt to disassemble, reverse engineer, or decompile the Services except as permitted by applicable law;",
      "(v) use third-party links to sites without accepting those websites' terms and conditions;",
      "(vi) send links to third-party sites or use their logos, company names, etc. without prior written permission;",
      "(vii) attempt to gain unauthorized access to the Services or their related systems or network;",
      "(viii) use the Services in any manner that could damage, disable, overburden, impair, or harm any of Nera's servers, network, computer system, or resources;",
      "(ix) use the Services to send or store materials containing software viruses, worms, or other harmful computer code, files, scripts, or programs;",
      "(x) use the Services in any manner that interferes with or disrupts the integrity, security, or performance of the Services, their components, and the data they contain;",
      "(xi) create a false identity to mislead any person as to the identity or source of any communication;",
      "(xii) host, display, upload, modify, publish, transmit, store, update, or share any information belonging to another person or organization, including personal or confidential information of any person or organization, for which you do not have rights, approval, or permission from the relevant person or organization;",
      "(xiii) use the Services to mislead a person, organization, or institution for financial gain or to harm any person, or to transmit written or published information in any form;",
      "(xiv) violate any applicable local, state, national, or international law;",
      "(xv) use the Services for any competitive or benchmarking purpose; and",
      "(xvi) remove or obscure any proprietary or other notices contained in the Services.",
    ],
  },
  {
    heading: "Spam and Illegal Activities",
    paragraphs: [
      `You agree that you alone are responsible for the content of transmissions you make through the Services. You agree not to use the Services for illegal purposes or for the transmission of material that is unlawful, defamatory, harassing, libelous, invasive of another's privacy, abusive, threatening, harmful, vulgar, pornographic, obscene, or otherwise objectionable, that offends religious feelings, promotes racism, contains viruses or malicious code, or that infringes or may infringe another's intellectual property or other rights. You agree not to use the Services for 'junk mail', 'spam', 'chain letters', 'phishing', or unsolicited bulk email distribution. We reserve the right to terminate your access to the Services if we have reasonable grounds to believe you are using the Services for any illegal or unauthorized activity.`,
    ],
  },
  {
    heading: "Third-Party Applications",
    paragraphs: [
      `Nera integrates with many third-party applications (hereinafter "Third-Party Application(s)"). Access to and use of Third-Party Applications may require acceptance of the service terms and privacy policies applicable to such Third-Party Applications (hereinafter "Third-Party Terms"). You are responsible for reading and understanding the Third-Party Terms before accessing or using any Third-Party Application. You acknowledge and agree that Nera is not responsible for any Third-Party Application. While we will try to give you prior notice where reasonably practicable, you agree that Nera may at any time and in its sole discretion, with or without notice to you, suspend, restrict, or disable access to any Third-Party Application through the Services, without any liability to you for any loss of profits, revenue, data, goodwill, or other intangible losses.`,
    ],
  },
  {
    heading: "Fees and Payment",
    paragraphs: [
      `Services are offered under subscription plans of various durations. Payments for subscription plans shorter than one year may be made by Credit Card only. Unless you downgrade your paid subscription plan to a free plan or notify us that you do not wish to renew the subscription, your subscription will automatically renew at the end of each subscription period. Upon automatic renewal, the subscription fee will be charged to the Credit Card you most recently used. If you want the renewal payment to be made with a different Credit Card, we offer you the option to change the details. If you do not wish to renew your subscription, you must notify us at least seven days before the renewal date. If you have not switched to a free plan and have not notified us that you do not wish to renew your subscription, you will be deemed to have authorized Nera to charge the subscription fee to the Credit Card you most recently used. From time to time we may change the price of any Service or charge for use of Services that are currently offered free of charge. Any increase in fees will not apply until the end of your then-current billing cycle. You will not be charged for using any Service unless you select a paid subscription plan. If GST, VAT, sales tax, or any similar tax under local, state, provincial, or foreign laws ("Taxes") is to be collected by Nera in connection with your subscription to our Services, Nera will invoice you for such Taxes. You agree to pay Nera such Taxes in addition to subscription fees. Nera will provide you with an invoice in the form required by applicable local, state, provincial, or foreign laws to help you benefit from any applicable input tax credit for Taxes paid in this manner.`,
    ],
  },
  {
    heading: "Organization Accounts and Administrators",
    paragraphs: [
      `When you register for an account for your organization, you may designate one or more administrators. Administrators will have the right to configure the Services according to your requirements and to manage end users on your organization account. If your organization account was created and configured on your behalf by a third party, that third party is likely to have assumed the administrator role for your organization. Ensure you have an appropriate agreement with such third parties specifying that party's roles and restrictions as administrator of your organization account. You are responsible for (i) maintaining the confidentiality of your organization account password, (ii) appointing authorized persons as administrators to manage your organization account, and (iii) ensuring that all activities performed in connection with your organization account comply with this Agreement. You understand that Nera is not responsible for account management and internal administration of the Services for you.`,
    ],
  },
  {
    heading: "Personal Information and Privacy",
    paragraphs: [
      `Personal information you provide to Nera through the Service is subject to the Nera Privacy Policy. Your choice to use the Service indicates that you accept the terms of the Nera Privacy Policy. You are responsible for maintaining the confidentiality of your username, password, and other sensitive information. You are responsible for all activities that occur under your user account and agree to notify us immediately of any unauthorized use of your user account by emailing ${mail("info@nerasocial.com")} or by calling any of the numbers listed at ${link("https://www.nerasocial.com/contact/", "nerasocial.com/contact")}. We are not liable for any loss or damage arising from unauthorized access to and/or use of your user account or otherwise to you or any third party.`,
    ],
  },
  {
    heading: "Communications from Nera",
    paragraphs: [
      `The Service may include certain communications from Nera, such as service announcements, administrative messages, and newsletters. You understand that these communications will be considered part of using the Services. As part of our policy of providing you with full privacy, we also offer you the option to opt out of receiving newsletters from us. However, you will not be able to opt out of receiving service announcements and administrative messages.`,
    ],
  },
  {
    heading: "Complaints",
    paragraphs: [
      `If we receive a complaint from any person regarding your activities as part of use of the Services, we will forward the complaint to the primary email address of your user account. You must respond directly to the complainant within 10 days of receiving the complaint forwarded by us and copy Nera on the communication. If you do not respond to the complainant within 10 days from the date we emailed you, we may disclose your name and contact details to the complainant to enable the complainant to initiate legal proceedings against you. You agree that failure to respond to a forwarded complaint within the 10-day period will be construed as your consent to disclosure of your name and contact details by Nera to the complainant.`,
    ],
  },
  {
    heading: "Inactive User Accounts Policy",
    paragraphs: [
      `We reserve the right to terminate unpaid user accounts that have been continuously inactive for 120 days. In the event of such termination, all data associated with that user account will be deleted. We will give you prior notice of such termination and offer you the option to back up your data. The data deletion policy may apply with respect to any or all of the Services. Each Service will be considered an independent and separate service for the purpose of calculating the inactivity period. In other words, activity in one of the Services is not sufficient to keep your user account active in another Service. On accounts with multiple users, the account will not be considered inactive if at least one of the users is active.`,
    ],
  },
  {
    heading: "Data Ownership",
    paragraphs: [
      `We respect your ownership rights in content created or stored by you. You own the content created or stored by you. Unless specifically permitted by you, your use of the Services does not grant Nera a license to use, reproduce, adapt, modify, publish, or distribute content created by you or stored in your user account for Nera's commercial, marketing, or similar purposes. However, you grant Nera permission to access, copy, distribute, store, transmit, reformat, publicly display, and publicly perform the content of your user account only as needed for the purpose of providing the Services to you.`,
    ],
  },
  {
    heading: "Hosting Location",
    paragraphs: [
      `The location of the cloud facility from which you are served depends on the mapping of your region/country to available cloud facilities at the time you register. If there is any update to the region/country-to-cloud-facility mapping at any time, we may migrate your account or ask you to migrate your account to a different cloud facility. Because your region/country is determined by your IP address, you should not mask your Internet Protocol (IP) address at registration. If at any time it is determined that your actual region/country differs from the region/country in our records, Nera may take appropriate action such as migrating your account, ask you to migrate your account to the cloud facility corresponding to your region/country, or close your account and deny you the Service. If you are served from a cloud facility outside your region/country and a Nera entity has an office in your region/country, in addition to storing data in the cloud facility assigned to you, we may keep a local copy of the data in your region.`,
    ],
  },
  {
    heading: "User-Generated Content",
    paragraphs: [
      `Using any of the Services or otherwise, you may transmit or publish content you create. However, you alone will be responsible for such content and for the consequences of transmitting or publishing it. Any content made public will be accessible to anyone on the Internet and may be crawled and indexed by search engines. It is your responsibility to ensure you do not accidentally make any private content public. Any content you may receive from other users of the Services is provided to you AS IS for your information and personal use only, and you agree not to use, copy, reproduce, distribute, transmit, broadcast, display, sell, license, or otherwise exploit such content for any purpose without the express written permission of the person who owns the rights to that content. When using any of the Services, if you encounter any content that contains a copyright notice(s) or any copy-protection feature(s), you agree not to remove such copyright notice(s) or disable such copy-protection feature(s). By making any copyrighted content available in any of the Services, you confirm that you have approval, authority, or permission from every person who may claim any right in such content to make that content available in that manner. Further, by making any content available as described above, you expressly agree that if Nera receives complaints regarding any illegality or infringement of third-party rights in such content, Nera will have the right to block or remove access to the content submitted by you. By using any of the Services and by transmitting or publishing any content using such Service, you expressly authorize determination by the representative appointed by Nera for this purpose of questions regarding illegality or infringement of third-party rights in such content.`,
    ],
  },
  {
    heading: "Trademarks",
    paragraphs: [
      `'Nera Social', the Nera logo, and the names and logos of individual Services are trademarks of Nera Reklam Pazarlama Yazılım Teknoloji Limited Şirketi. You agree not to display or use Nera trademarks in any manner without Nera's prior permission.`,
    ],
  },
  {
    heading: "Disclaimer of Warranties",
    paragraphs: [
      `YOU EXPRESSLY UNDERSTAND AND AGREE THAT YOUR USE OF THE SERVICES IS AT YOUR SOLE RISK. THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. NERA EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. NERA MAKES NO WARRANTY THAT THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE. ANY MATERIAL DOWNLOADED OR OTHERWISE OBTAINED THROUGH THE USE OF THE SERVICES IS DONE AT YOUR OWN DISCRETION AND RISK AND YOU WILL BE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR COMPUTER SYSTEM, MOBILE PHONE, OR WIRELESS DEVICE, OR LOSS OF DATA THAT RESULTS FROM THE DOWNLOAD OF ANY SUCH MATERIAL. NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED BY YOU FROM NERA, ITS EMPLOYEES, OR REPRESENTATIVES SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED IN THE AGREEMENT.`,
    ],
  },
  {
    heading: "Indemnification",
    paragraphs: [
      `You agree to indemnify and hold harmless Nera, its officers, directors, employees, suppliers, and affiliates from and against any and all losses, damages, fines, and expenses (including attorneys' fees and costs) arising out of or related to any claim you have that you used the Services in violation of another party's rights, in violation of any law, in violation of any provision of the Agreement, or in connection with any other claim related to your use of the Services unless such use was permitted by Nera.`,
    ],
  },
  {
    heading: "Governing Law and Jurisdiction",
    paragraphs: [
      `The governing law and jurisdiction that will apply in the event of any dispute or action arising out of or in connection with this Agreement will depend on your billing address if you are a paid customer and, in all other cases, on the state or country of your residence. Accordingly, each party consents to the governing law (without regard to choice or conflict of law rules) and to the exclusive jurisdiction of the courts specified herein in the event of any dispute or action arising out of or in connection with this Agreement.`,
    ],
  },
  {
    heading: "Suspension and Termination",
    paragraphs: [
      `We may suspend your user account or temporarily disable access to all or part of any Service in the event of suspected illegal activity, prolonged inactivity, or a request by law enforcement or other government agencies. Appeals regarding suspension or disabling of user accounts must be made to ${mail("info@nerasocial.com")} within thirty days of notice of suspension. We may terminate a suspended or disabled user account after thirty days. We will also terminate your user account upon your request. We further reserve the right to terminate your user account and refuse the Services based on a reasonable belief that you have breached the Agreement, and to terminate your access to any Beta Service in the event of unexpected technical issues or discontinuation of the Beta Service. You have the right to terminate your user account if Nera breaches its obligations under this Agreement, and in such case you will be entitled to a pro-rata refund of prepaid fees. Termination of a user account will include denial of access to all Services, deletion of information in your user account such as your email address and password, and deletion of all data in your user account.`,
    ],
  },
  {
    heading: "Modification of the Terms of Service",
    paragraphs: [
      `We may modify this Agreement at any time by notifying you through a service announcement or by sending an email to your primary email address. If we make material changes to the Agreement that affect your rights, the changes will be notified by email to your primary email address at least 30 days in advance. If the Agreement is modified in a way that will materially affect your rights in connection with use of the Services, you may terminate your use of the Services by notifying Nera by email within 30 days of being informed of the availability of the modified Agreement. In the event of such termination, you will be entitled to a pro-rata refund of the unused portion of prepaid fees. Your continued use of the Service after the effective date of any change to the Agreement will be deemed acceptance of the modified Agreement.`,
    ],
  },
  {
    heading: "End of the Terms of Service",
    paragraphs: [
      `If you have any questions or concerns about this Agreement, please contact us at ${mail("info@nerasocial.com")}.`,
    ],
  },
];
