import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/database';

type DomainSeed = {
  code: string;
  name: string;
  description: string;
  weight: number;
  owner: string;
  service: string;
  serviceUrl: string;
  requirements?: Record<string, unknown>;
  checks: Array<[string, string, string]>;
};

const DOMAIN_SEEDS: DomainSeed[] = [
  {
    code: 'GOV',
    name: 'Privacy Governance & Accountability',
    description: 'Governance framework, policy, ownership, accountability, oversight, monitoring, and management reporting.',
    weight: 1.1,
    owner: 'Legal / Compliance / Privacy',
    service: 'Privacy Policy & PDP Governance Framework',
    serviceUrl: '/services',
    checks: [
      ['Apakah organisasi memiliki kerangka tata kelola pelindungan data pribadi yang disetujui manajemen?', 'Menetapkan governance dan accountability formal.', 'PDP governance framework / board approval'],
      ['Apakah peran pengendali, prosesor, business owner, security, legal, dan privacy telah didefinisikan?', 'Menetapkan ownership dan RACI yang jelas.', 'RACI / organization chart / role description'],
      ['Apakah kebijakan pelindungan data pribadi ditinjau dan diperbarui secara berkala?', 'Menjamin kebijakan tetap relevan dengan perubahan proses dan regulasi.', 'Privacy policy / review record'],
      ['Apakah KPI/KRI privasi dilaporkan kepada manajemen?', 'Menyediakan pengawasan berbasis metrik.', 'Privacy dashboard / management report'],
      ['Apakah remediasi temuan privasi dilacak sampai selesai?', 'Memastikan accountability atas gap dan action plan.', 'Issue log / remediation tracker'],
    ],
  },
  {
    code: 'MAP',
    name: 'Data Inventory & Data Mapping',
    description: 'Inventory of personal data, systems, sources, recipients, owners, locations, processors, and data flows.',
    weight: 1.1,
    owner: 'Data Governance / Privacy',
    service: 'RoPA Development & Data Mapping',
    serviceUrl: '/services',
    checks: [
      ['Apakah organisasi memiliki inventaris data pribadi yang mencakup data pelanggan, karyawan, dan pihak lain?', 'Membangun single source of truth data pribadi.', 'Data inventory / data catalog'],
      ['Apakah aliran data dari sumber hingga penerima internal dan eksternal telah dipetakan?', 'Memahami end-to-end data flow.', 'Data flow diagram / mapping'],
      ['Apakah lokasi penyimpanan, aplikasi, database, dan cloud yang memproses data pribadi diketahui?', 'Memastikan lokasi pemrosesan dapat ditelusuri.', 'System inventory / CMDB / cloud inventory'],
      ['Apakah data owner dan process owner telah ditetapkan untuk aktivitas pemrosesan?', 'Memastikan ownership operasional.', 'Ownership matrix'],
      ['Apakah perubahan sistem/proses memicu pembaruan data inventory?', 'Menjaga inventory tetap current.', 'Change management record'],
    ],
  },
  {
    code: 'ROPA',
    name: 'Record of Processing Activities / RoPA',
    description: 'Completeness, ownership, maintenance, and traceability of processing records.',
    weight: 1.15,
    owner: 'Privacy / Compliance',
    service: 'RoPA Development & Data Mapping',
    serviceUrl: '/services',
    checks: [
      ['Apakah RoPA telah tersedia untuk aktivitas pemrosesan utama?', 'Mendokumentasikan aktivitas pemrosesan secara terstruktur.', 'RoPA register'],
      ['Apakah RoPA memuat tujuan, kategori data, subjek data, penerima, retensi, dan kontrol keamanan?', 'Meningkatkan kelengkapan dan traceability RoPA.', 'RoPA fields / sample records'],
      ['Apakah RoPA memuat dasar pemrosesan untuk setiap aktivitas?', 'Menghubungkan aktivitas pemrosesan dengan dasar yang terdokumentasi.', 'RoPA legal basis fields'],
      ['Apakah RoPA mengidentifikasi prosesor dan transfer lintas negara bila relevan?', 'Menjamin third-party dan transfer visibility.', 'RoPA processor / transfer fields'],
      ['Apakah RoPA memiliki owner, versioning, dan siklus review?', 'Menjamin RoPA dipelihara secara berkelanjutan.', 'RoPA governance procedure'],
    ],
  },
  {
    code: 'LAW',
    name: 'Lawful Basis & Purpose Limitation',
    description: 'Documented processing basis, purpose limitation, necessity, proportionality, and minimization.',
    weight: 1.2,
    owner: 'Legal / Privacy',
    service: 'PDP Legal Basis & Processing Governance Advisory',
    serviceUrl: '/services',
    checks: [
      ['Apakah setiap aktivitas pemrosesan memiliki dasar pemrosesan yang terdokumentasi?', 'Menjamin pemrosesan memiliki dasar yang dapat ditelusuri.', 'Legal basis register / RoPA'],
      ['Apakah tujuan pemrosesan dinyatakan secara spesifik dan dapat dipahami?', 'Mengurangi pemrosesan di luar tujuan yang ditetapkan.', 'Purpose statement / privacy notice'],
      ['Apakah data yang dikumpulkan dibatasi pada data yang benar-benar diperlukan?', 'Menerapkan data minimization.', 'Data field review / minimization assessment'],
      ['Apakah perubahan tujuan pemrosesan melalui review privacy/legal sebelum diterapkan?', 'Mengendalikan purpose creep.', 'Change approval / legal review'],
      ['Apakah assessment kepentingan yang sah atau dasar lain didokumentasikan bila digunakan?', 'Menyediakan evidence reasoning atas dasar pemrosesan.', 'Assessment / legal memo'],
    ],
  },
  {
    code: 'CONSENT',
    name: 'Consent Management',
    description: 'Consent capture, granularity, evidence, versioning, withdrawal, and preference management.',
    weight: 1.05,
    owner: 'Privacy / Digital / Marketing',
    service: 'Consent & Preference Management Design',
    serviceUrl: '/services',
    checks: [
      ['Jika consent digunakan, apakah consent diperoleh secara jelas, spesifik, dan dapat dibuktikan?', 'Menjamin consent valid dan traceable.', 'Consent log / form / timestamp'],
      ['Apakah consent dipisahkan menurut tujuan pemrosesan yang relevan?', 'Mencegah bundled consent yang tidak transparan.', 'Consent design / preference center'],
      ['Apakah subjek data dapat menarik consent dengan mekanisme yang mudah?', 'Mendukung withdrawal secara efektif.', 'Withdrawal workflow / UI evidence'],
      ['Apakah versi wording consent dan tanggal persetujuan tersimpan?', 'Menjamin evidentiary trail consent.', 'Version history / audit log'],
      ['Apakah sistem downstream menghormati perubahan preference/withdrawal?', 'Mencegah pemrosesan berlanjut setelah withdrawal.', 'Integration test / suppression list'],
    ],
  },
  {
    code: 'RIGHTS',
    name: 'Data Subject Rights',
    description: 'Intake, verification, tracking, fulfillment, escalation, and evidence for data subject requests.',
    weight: 1.2,
    owner: 'Privacy / Customer Service / Legal',
    service: 'Data Subject Rights & DSAR Operating Model',
    serviceUrl: '/services',
    checks: [
      ['Apakah tersedia kanal formal untuk permintaan hak subjek data?', 'Memastikan request dapat diterima dan dilacak.', 'DSAR channel / web form / SOP'],
      ['Apakah identitas pemohon diverifikasi secara proporsional sebelum pemenuhan request?', 'Mencegah pengungkapan kepada pihak yang tidak berhak.', 'Identity verification procedure'],
      ['Apakah request akses, koreksi, penghapusan, keberatan, dan withdrawal memiliki workflow terdokumentasi?', 'Menjamin request diproses konsisten.', 'DSAR SOP / workflow'],
      ['Apakah SLA, escalation, dan status request dipantau?', 'Mencegah request terlewat atau terlambat.', 'DSAR tracker / dashboard'],
      ['Apakah keputusan, bukti pemenuhan, dan komunikasi kepada subjek data disimpan?', 'Menyediakan audit trail yang memadai.', 'Case record / correspondence'],
    ],
  },
  {
    code: 'NOTICE',
    name: 'Privacy Notice & Transparency',
    description: 'Clear and contextual privacy notices for customer, employee, applicant, vendor, web, app, CCTV, and other processing.',
    weight: 1.0,
    owner: 'Legal / Privacy / Communications',
    service: 'Privacy Notice & Transparency Review',
    serviceUrl: '/services',
    checks: [
      ['Apakah privacy notice menjelaskan kategori data, tujuan, dasar pemrosesan, dan pihak penerima secara jelas?', 'Meningkatkan transparency pemrosesan.', 'Published privacy notice'],
      ['Apakah tersedia notice yang sesuai konteks untuk customer, employee, applicant, vendor, dan kanal digital?', 'Menghindari one-size-fits-all notice yang tidak relevan.', 'Context-specific notices'],
      ['Apakah privacy notice diperbarui saat tujuan, sistem, vendor, atau transfer berubah?', 'Menjaga notice sesuai kondisi aktual.', 'Version / change record'],
      ['Apakah notice tersedia sebelum atau saat pengumpulan data?', 'Memberi transparency pada waktu yang relevan.', 'UI screenshot / collection form'],
      ['Apakah bahasa notice mudah dipahami oleh target data subject?', 'Meningkatkan accessibility dan comprehension.', 'Readability review'],
    ],
  },
  {
    code: 'RET',
    name: 'Data Retention & Secure Disposal',
    description: 'Retention schedule, legal hold, deletion workflow, backup treatment, and destruction evidence.',
    weight: 1.15,
    owner: 'Records Management / IT / Privacy',
    service: 'Data Retention & Secure Disposal Program',
    serviceUrl: '/services',
    checks: [
      ['Apakah organisasi memiliki retention schedule untuk kategori data pribadi utama?', 'Membatasi penyimpanan sesuai kebutuhan dan kewajiban.', 'Retention schedule'],
      ['Apakah sistem memiliki mekanisme penghapusan atau anonymization saat masa retensi berakhir?', 'Menerapkan disposal secara operasional.', 'Deletion job / system configuration'],
      ['Apakah backup dan archive termasuk dalam kebijakan retensi dan disposal?', 'Menghindari data bertahan tanpa batas di backup.', 'Backup retention policy'],
      ['Apakah legal hold atau kebutuhan regulasi dapat menghentikan deletion secara terkontrol?', 'Menyeimbangkan deletion dengan kewajiban lain.', 'Legal hold procedure'],
      ['Apakah bukti pemusnahan media/data tersedia bila diperlukan?', 'Menyediakan traceability atas secure disposal.', 'Certificate / destruction log'],
    ],
  },
  {
    code: 'DPIA',
    name: 'Data Protection Impact Assessment / DPIA',
    description: 'Screening, assessment, approval, mitigation, and review for high-risk processing.',
    weight: 1.2,
    owner: 'Privacy / Risk / Security',
    service: 'DPIA Advisory',
    serviceUrl: '/services',
    checks: [
      ['Apakah organisasi memiliki kriteria screening untuk menentukan kapan DPIA diperlukan?', 'Mengidentifikasi high-risk processing sebelum implementasi.', 'DPIA screening checklist'],
      ['Apakah pemrosesan berisiko tinggi menjalani DPIA sebelum go-live?', 'Mengidentifikasi dan memitigasi privacy risk secara ex ante.', 'Completed DPIA'],
      ['Apakah DPIA menilai necessity, proportionality, impact, likelihood, dan mitigasi?', 'Menjamin analisis risiko memadai.', 'DPIA methodology / template'],
      ['Apakah residual risk DPIA mendapatkan approval/escalation yang sesuai?', 'Memastikan risk acceptance memiliki accountability.', 'Approval record'],
      ['Apakah DPIA direview saat proses, teknologi, volume, atau data berubah signifikan?', 'Menjaga DPIA relevan terhadap perubahan.', 'DPIA review log'],
    ],
  },
  {
    code: 'DPO',
    name: 'DPO / Privacy Function',
    description: 'Requirement screening, independence, resources, competencies, access, and escalation for the privacy function.',
    weight: 1.1,
    owner: 'Board / Legal / Compliance',
    service: 'DPO Advisory / DPO Support',
    serviceUrl: '/services',
    checks: [
      ['Apakah organisasi telah menilai secara terdokumentasi kebutuhan pejabat/petugas fungsi pelindungan data?', 'Menentukan kebutuhan fungsi DPO secara berbasis karakteristik pemrosesan.', 'DPO requirement assessment'],
      ['Jika trigger teridentifikasi, apakah pejabat/petugas fungsi pelindungan data telah ditunjuk?', 'Memenuhi kebutuhan governance atas fungsi pelindungan data.', 'Appointment letter / charter'],
      ['Apakah fungsi privacy memiliki independensi, akses ke manajemen, dan sumber daya yang memadai?', 'Menjaga efektivitas fungsi privacy.', 'Charter / reporting line'],
      ['Apakah kompetensi dan pelatihan privacy function dipelihara?', 'Menjamin capability sesuai kompleksitas pemrosesan.', 'Training / certification record'],
      ['Apakah potensi conflict of interest fungsi privacy dikelola?', 'Menjaga objektivitas oversight privacy.', 'Conflict assessment / RACI'],
    ],
  },
  {
    code: 'TPRM',
    name: 'Processor & Third-Party Management',
    description: 'Vendor due diligence, processing agreements, instructions, subprocessors, monitoring, breach clauses, and exit controls.',
    weight: 1.15,
    owner: 'Procurement / Privacy / Security',
    service: 'Third Party Privacy Risk Management',
    serviceUrl: '/services',
    checks: [
      ['Apakah vendor/prosesor yang menangani data pribadi diinventarisasi dan diklasifikasikan menurut risiko?', 'Menyediakan visibility atas processor ecosystem.', 'Vendor register / classification'],
      ['Apakah due diligence privacy dan security dilakukan sebelum onboarding vendor?', 'Mengurangi risiko pihak ketiga sebelum kontrak.', 'Due diligence questionnaire / report'],
      ['Apakah kontrak/DPA memuat instruksi pemrosesan, keamanan, breach, subprocessor, dan deletion/return data?', 'Menetapkan kewajiban kontraktual yang relevan.', 'DPA / contract clauses'],
      ['Apakah penggunaan subprocessor oleh vendor dikendalikan dan dipantau?', 'Menjaga oversight atas rantai pemrosesan.', 'Subprocessor list / approval'],
      ['Apakah exit/termination memastikan data dikembalikan atau dihapus dengan bukti?', 'Mengurangi residual data pada pihak ketiga.', 'Exit checklist / deletion certificate'],
    ],
  },
  {
    code: 'SEC',
    name: 'Information Security for Personal Data',
    description: 'Identity, access, encryption, endpoint, network, logging, vulnerability, patching, backup, DLP, monitoring, and secure development.',
    weight: 1.25,
    owner: 'CISO / IT Security',
    service: 'Cybersecurity Assessment / VAPT / Security Governance',
    serviceUrl: '/services',
    checks: [
      ['Apakah akses ke data pribadi mengikuti least privilege dan review akses berkala?', 'Mencegah akses berlebihan atau tidak sah.', 'IAM policy / access review'],
      ['Apakah MFA dan autentikasi kuat diterapkan pada sistem kritikal yang memproses data pribadi?', 'Mengurangi risiko account takeover.', 'MFA configuration / IAM evidence'],
      ['Apakah data pribadi sensitif dilindungi dengan encryption yang sesuai saat transit dan/atau tersimpan?', 'Melindungi confidentiality data.', 'Encryption configuration / architecture'],
      ['Apakah vulnerability management, patching, logging, monitoring, dan penetration testing dilakukan secara terukur?', 'Mengurangi exploitable weaknesses dan meningkatkan detection.', 'Vulnerability report / VAPT / logs'],
      ['Apakah secure SDLC dan privacy/security review diterapkan pada perubahan aplikasi?', 'Mencegah kelemahan sejak tahap desain.', 'SDLC standard / security gate'],
    ],
  },
  {
    code: 'BREACH',
    name: 'Personal Data Breach Management',
    description: 'Detection, triage, investigation, impact assessment, escalation, notification workflow, evidence, and post-incident learning.',
    weight: 1.25,
    owner: 'Incident Response / Privacy / Legal',
    service: 'Privacy Incident & Breach Response Program',
    serviceUrl: '/services',
    checks: [
      ['Apakah terdapat prosedur khusus untuk personal data breach yang terintegrasi dengan incident response?', 'Menjamin breach privacy ditangani dengan workflow yang jelas.', 'Incident response / breach SOP'],
      ['Apakah proses mampu mengidentifikasi, menilai dampak, dan mengeskalasi breach secara cepat?', 'Mempercepat keputusan containment dan notification.', 'Triage criteria / incident record'],
      ['Apakah organisasi memiliki mekanisme untuk memenuhi kewajiban pemberitahuan 3x24 jam bila applicable?', 'Meningkatkan readiness terhadap timeline notification.', 'Notification workflow / template / contact list'],
      ['Apakah template komunikasi kepada subjek data dan otoritas telah disiapkan?', 'Mengurangi delay saat incident.', 'Notification templates'],
      ['Apakah tabletop exercise/post-incident review dilakukan untuk meningkatkan readiness?', 'Menguji dan memperbaiki response capability.', 'Exercise report / lessons learned'],
    ],
  },
  {
    code: 'XFER',
    name: 'Cross-Border Data Transfer',
    description: 'Transfer inventory, recipient country, adequacy/safeguards assessment, contracts, risk assessment, and monitoring.',
    weight: 1.15,
    owner: 'Legal / Privacy / Procurement',
    service: 'Cross-Border Data Transfer Advisory',
    serviceUrl: '/services',
    requirements: { internationalTransfer: true },
    checks: [
      ['Apakah seluruh transfer data pribadi ke luar Indonesia terinventarisasi?', 'Menyediakan visibility atas transfer lintas negara.', 'Transfer register / RoPA'],
      ['Apakah negara dan pihak penerima transfer didokumentasikan?', 'Memastikan destination dan recipient dapat ditelusuri.', 'Transfer inventory'],
      ['Apakah mekanisme dan safeguards transfer telah dinilai dan didokumentasikan?', 'Mengurangi risiko transfer tanpa dasar/safeguards yang memadai.', 'Transfer impact/risk assessment'],
      ['Apakah kontrak dengan penerima memuat kontrol perlindungan data yang relevan?', 'Menetapkan contractual safeguards.', 'Contract / DPA'],
      ['Apakah perubahan lokasi data/subprocessor cloud dipantau?', 'Menjaga transfer register tetap aktual.', 'Cloud location / subprocessor monitoring'],
    ],
  },
  {
    code: 'PBD',
    name: 'Privacy by Design & Privacy by Default',
    description: 'Privacy integration into SDLC, architecture, change approval, minimization, testing, and default settings.',
    weight: 1.0,
    owner: 'Product / Architecture / Privacy',
    service: 'Privacy by Design Advisory',
    serviceUrl: '/services',
    checks: [
      ['Apakah privacy review menjadi bagian dari project/product lifecycle?', 'Menyisipkan privacy control sebelum go-live.', 'Project gate / checklist'],
      ['Apakah data minimization dipertimbangkan pada desain field, API, log, dan analytics?', 'Mengurangi data collection yang tidak perlu.', 'Design review / data schema'],
      ['Apakah default setting meminimalkan exposure data pribadi?', 'Menerapkan privacy-friendly defaults.', 'Configuration evidence'],
      ['Apakah perubahan signifikan pada sistem memicu privacy/security assessment?', 'Mengendalikan risk dari perubahan.', 'Change control / review'],
      ['Apakah test data dan non-production environment dilindungi dari penggunaan data pribadi yang tidak perlu?', 'Mengurangi exposure di development/testing.', 'Test data policy / masking'],
    ],
  },
  {
    code: 'HR',
    name: 'Employee & HR Privacy',
    description: 'Recruitment, employee records, payroll, biometrics, attendance, health data, monitoring, and offboarding.',
    weight: 0.95,
    owner: 'HR / Legal / Privacy',
    service: 'Employee Privacy Program',
    serviceUrl: '/services',
    requirements: { employeeData: true },
    checks: [
      ['Apakah HR memiliki data inventory dan privacy notice khusus employee/applicant?', 'Meningkatkan transparency dan governance data tenaga kerja.', 'HR data inventory / notice'],
      ['Apakah akses ke employee record dibatasi berdasarkan kebutuhan pekerjaan?', 'Mencegah akses internal berlebihan.', 'HRIS access matrix'],
      ['Apakah penggunaan biometrik, kesehatan, atau monitoring employee melalui review risiko yang sesuai?', 'Mengelola high-impact workforce processing.', 'DPIA / risk assessment'],
      ['Apakah data kandidat yang tidak diterima memiliki retention/deletion rule?', 'Mencegah penyimpanan applicant data tanpa batas.', 'Recruitment retention rule'],
      ['Apakah offboarding mencakup penghapusan akses dan pengelolaan data personal employee?', 'Mengurangi risk pasca-terminasi.', 'Offboarding checklist'],
    ],
  },
  {
    code: 'MKT',
    name: 'Marketing, Cookies & Digital Tracking',
    description: 'Cookies, analytics, remarketing, direct marketing, profiling, messaging, and preference management.',
    weight: 0.95,
    owner: 'Marketing / Digital / Privacy',
    service: 'Digital Privacy, Cookies & Marketing Governance',
    serviceUrl: '/services',
    requirements: { anyTrue: ['cookiesTracking', 'marketingDatabase'] },
    checks: [
      ['Apakah cookies/tracker di website atau aplikasi diinventarisasi dan dikategorikan?', 'Memahami digital tracking yang aktif.', 'Cookie scan / tracker register'],
      ['Apakah marketing database memiliki sumber, tujuan, dan dasar pemrosesan yang terdokumentasi?', 'Mencegah penggunaan database tanpa governance.', 'Marketing data register'],
      ['Apakah preference/opt-out direct marketing dapat diproses secara efektif?', 'Menghormati pilihan subjek data.', 'Preference center / suppression list'],
      ['Apakah profiling/remarketing dinilai dari perspektif privacy risk?', 'Mengelola risiko targeted processing.', 'Privacy review / DPIA screening'],
      ['Apakah vendor martech/analytics tercakup dalam third-party privacy governance?', 'Mengendalikan processor/recipient di kanal digital.', 'Vendor register / DPA'],
    ],
  },
  {
    code: 'CHILD',
    name: 'Children & Vulnerable Data Subjects',
    description: 'Heightened governance, notices, consent/authorization, minimization, risk assessment, and safeguards for children or vulnerable subjects.',
    weight: 1.1,
    owner: 'Privacy / Legal / Product',
    service: 'Children & Vulnerable Data Privacy Assessment',
    serviceUrl: '/services',
    requirements: { childrenData: true },
    checks: [
      ['Apakah pemrosesan data anak diidentifikasi secara eksplisit dalam data inventory dan RoPA?', 'Menyediakan visibility atas pemrosesan kelompok rentan.', 'RoPA / data inventory'],
      ['Apakah terdapat notice dan mekanisme persetujuan/otorisasi yang sesuai konteks?', 'Meningkatkan transparency dan safeguards.', 'Notice / consent workflow'],
      ['Apakah data anak dibatasi pada data minimum yang diperlukan?', 'Mengurangi exposure data kelompok rentan.', 'Data minimization review'],
      ['Apakah produk/fitur yang melibatkan anak melalui DPIA atau risk assessment yang diperkuat?', 'Mengidentifikasi high-risk impact sejak awal.', 'DPIA / risk assessment'],
      ['Apakah sharing kepada pihak ketiga untuk data anak dibatasi dan dipantau?', 'Mengurangi propagation risk.', 'DPA / sharing register'],
    ],
  },
  {
    code: 'AWARE',
    name: 'Training & Awareness',
    description: 'Periodic awareness, role-based learning, developer training, privacy competency, and executive awareness.',
    weight: 0.85,
    owner: 'HR / Privacy / Security',
    service: 'PDP Awareness & Privacy Training',
    serviceUrl: '/training',
    checks: [
      ['Apakah seluruh employee mendapatkan awareness pelindungan data pribadi secara berkala?', 'Meningkatkan baseline privacy awareness.', 'Training attendance / module'],
      ['Apakah role dengan exposure tinggi menerima role-based privacy training?', 'Menyesuaikan capability dengan risiko pekerjaan.', 'Role-based curriculum'],
      ['Apakah developer/product team menerima privacy-by-design training?', 'Meningkatkan privacy capability dalam SDLC.', 'Training record'],
      ['Apakah privacy/DPO function memiliki pengembangan kompetensi berkelanjutan?', 'Menjaga expertise function.', 'CPD / training plan'],
      ['Apakah efektivitas training diukur melalui assessment, simulation, atau metric?', 'Memastikan awareness menghasilkan perubahan perilaku.', 'Assessment score / metric'],
    ],
  },
  {
    code: 'AUDIT',
    name: 'Audit, Assurance & Continuous Monitoring',
    description: 'Control testing, internal audit, management review, KPI/KRI, remediation, evidence, and continuous monitoring.',
    weight: 0.95,
    owner: 'Internal Audit / Compliance / Privacy',
    service: 'Privacy Assurance & Continuous Monitoring',
    serviceUrl: '/services',
    checks: [
      ['Apakah privacy control diuji secara periodik berdasarkan risk-based plan?', 'Memvalidasi desain dan efektivitas kontrol.', 'Control testing plan / results'],
      ['Apakah internal audit mencakup area pelindungan data yang material?', 'Menyediakan independent assurance.', 'Audit plan / report'],
      ['Apakah management review membahas tren insiden, DSAR, DPIA, vendor, dan remediation?', 'Meningkatkan oversight manajemen.', 'Management review minutes'],
      ['Apakah KPI/KRI privacy memiliki threshold dan owner?', 'Mendukung continuous monitoring.', 'KPI/KRI register'],
      ['Apakah evidence assessment dan audit trail disimpan serta dapat ditelusuri?', 'Mendukung accountability dan assurance.', 'Evidence repository / logs'],
    ],
  },
];

const INDUSTRY_PACKS = [
  'Banking', 'Insurance', 'Multifinance', 'Fintech', 'Securities', 'Healthcare',
  'Hospital', 'Education', 'Telecom', 'Retail', 'E-commerce', 'Manufacturing',
  'Government', 'Technology', 'Professional Services', 'Other',
];

const ANSWER_OPTIONS = [
  ['yes', 'Yes', 1.0, 1.0],
  ['partial', 'Partially', 0.6, 1.0],
  ['planned', 'Planned', 0.35, 1.0],
  ['unknown', 'Unknown', 0.15, 0.85],
  ['no', 'No', 0.0, 1.0],
  ['na', 'Not Applicable', null, 1.0],
] as const;

function now() {
  return new Date().toISOString();
}

function domainId(code: string) {
  return 'pdp-domain-' + code.toLowerCase();
}

export function ensurePdpSeeded() {
  const db = getDatabase();
  const timestamp = now();

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare(
      `INSERT OR IGNORE INTO pdp_regulations (
        id, title, reference_code, version, effective_date, status, source_url,
        last_reviewed_at, reviewed_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    ).run(
      'pdp-reg-uu27-2022',
      'Undang-Undang Pelindungan Data Pribadi',
      'UU No. 27 Tahun 2022',
      '2022',
      '2022-10-17',
      'https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022',
      timestamp,
      'RTI Regulatory Knowledge Base',
      timestamp,
      timestamp,
    );

    db.prepare(
      `INSERT OR IGNORE INTO pdp_question_sets
        (id, name, mode, version, status, effective_date, created_at, updated_at)
       VALUES (?, ?, 'comprehensive', '1.0', 'active', ?, ?, ?)`,
    ).run(
      'pdp-question-set-v1',
      'UU PDP Readiness Baseline',
      '2022-10-17',
      timestamp,
      timestamp,
    );

    const domainStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_domains
        (id, code, name, description, weight, sort_order, is_active, version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, '1.0', ?)`,
    );

    const questionStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_questions (
        id, question_set_id, domain_id, code, subdomain, question_text, question_help,
        regulation_reference, article_reference, control_objective, risk_statement,
        recommended_evidence, weight, criticality, answer_type, answer_options_json,
        branching_rule_json, industry_applicability_json, organization_size_json,
        risk_trigger_json, dpo_trigger_json, dpia_trigger_json, cross_border_trigger_json,
        profile_requirements_json, is_quick, sort_order, version, effective_date, status, updated_at
      ) VALUES (
        ?, 'pdp-question-set-v1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'choice', ?,
        '{}', '[]', '[]', '{}', '{}', '{}', '{}', ?, ?, ?, '1.0', '2022-10-17', 'active', ?
      )`,
    );

    let globalOrder = 10;
    DOMAIN_SEEDS.forEach((domain, domainIndex) => {
      const id = domainId(domain.code);
      domainStatement.run(
        id,
        domain.code,
        domain.name,
        domain.description,
        domain.weight,
        (domainIndex + 1) * 10,
        timestamp,
      );

      domain.checks.forEach((check, checkIndex) => {
        const number = String(checkIndex + 1).padStart(2, '0');
        const code = 'PDP-' + domain.code + '-' + number;
        const criticality =
          checkIndex === 0 && ['LAW','RIGHTS','RET','DPIA','DPO','TPRM','SEC','BREACH','XFER'].includes(domain.code)
            ? 'Critical'
            : checkIndex < 2
              ? 'High'
              : 'Medium';
        const isQuick = domainIndex < 10 ? checkIndex < 2 : checkIndex === 0;
        const riskStatement =
          'Kelemahan pada ' + domain.name + ' dapat menyebabkan ketidakmampuan membuktikan accountability, meningkatnya risiko terhadap subjek data, dan kebutuhan remediasi prioritas.';
        const help =
          'Jawab berdasarkan kondisi aktual dan bukti yang tersedia. Pilih Not Applicable hanya jika konteks organisasi memang tidak memenuhi kondisi applicability.';

        questionStatement.run(
          'pdp-question-' + domain.code.toLowerCase() + '-' + number,
          id,
          code,
          domain.name,
          check[0],
          help,
          'UU No. 27 Tahun 2022',
          null,
          check[1],
          riskStatement,
          check[2],
          checkIndex === 0 ? 1.25 : 1.0,
          criticality,
          JSON.stringify(['yes','partial','planned','unknown','no','na']),
          JSON.stringify(domain.requirements || {}),
          isQuick ? 1 : 0,
          globalOrder,
          timestamp,
        );
        globalOrder += 10;
      });
    });

    const answerStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_answer_options
        (id, value, label, score, confidence_factor, sort_order, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    );
    ANSWER_OPTIONS.forEach((item, index) => {
      answerStatement.run(
        'pdp-answer-' + item[0],
        item[0],
        item[1],
        item[2],
        item[3],
        (index + 1) * 10,
        timestamp,
      );
    });

    const industryStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_industry_packs
        (id, code, label, description, config_json, is_active, sort_order, updated_at)
       VALUES (?, ?, ?, ?, '{}', 1, ?, ?)`,
    );
    INDUSTRY_PACKS.forEach((label, index) => {
      const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      industryStatement.run(
        'pdp-industry-' + code,
        code,
        label,
        'Parameterized PDP assessment industry pack.',
        (index + 1) * 10,
        timestamp,
      );
    });

    const serviceStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_service_mappings
        (code, trigger_type, trigger_value, service_name, service_url, description, is_active, updated_at)
       VALUES (?, 'domain_gap', ?, ?, ?, ?, 1, ?)`,
    );
    DOMAIN_SEEDS.forEach((domain) => {
      serviceStatement.run(
        'svc-' + domain.code.toLowerCase(),
        domain.code,
        domain.service,
        domain.serviceUrl,
        'Mapped independently from diagnostic scoring; a service recommendation never changes readiness score.',
        timestamp,
      );
    });

    const scoringStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_scoring_parameters
        (key, label, numeric_value, description, is_active, updated_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
    );
    [
      ['answer.yes', 'Answer score — Yes', 1.0, 'Fully implemented answer factor.'],
      ['answer.partial', 'Answer score — Partially', 0.6, 'Partially implemented answer factor.'],
      ['answer.planned', 'Answer score — Planned', 0.35, 'Planned but not operating answer factor.'],
      ['answer.unknown', 'Answer score — Unknown', 0.15, 'Unknown answer factor.'],
      ['answer.no', 'Answer score — No', 0.0, 'Not implemented answer factor.'],
      ['confidence.confirmed', 'Confidence — Confirmed', 1.0, 'Confirmed confidence factor.'],
      ['confidence.partial', 'Confidence — Partially Confirmed', 0.85, 'Partial confidence factor.'],
      ['confidence.unverified', 'Confidence — Not Verified', 0.7, 'Unverified confidence factor.'],
      ['evidence.verified', 'Evidence — Verified', 1.0, 'Verified evidence factor.'],
      ['evidence.available', 'Evidence — Available', 0.95, 'Evidence available but not independently verified.'],
      ['evidence.not_available', 'Evidence — Not Available', 0.8, 'Self-declared answer without supporting evidence.'],
      ['evidence.not_required', 'Evidence — Not Required', 1.0, 'Evidence not required for this control.'],
      ['criticality.Low', 'Criticality factor — Low', 0.85, 'Low criticality weighting.'],
      ['criticality.Medium', 'Criticality factor — Medium', 1.0, 'Medium criticality weighting.'],
      ['criticality.High', 'Criticality factor — High', 1.15, 'High criticality weighting.'],
      ['criticality.Critical', 'Criticality factor — Critical', 1.3, 'Critical control weighting.'],
      ['risk.critical_threshold', 'Risk threshold — Critical', 20, 'Likelihood x impact threshold for Critical.'],
      ['risk.high_threshold', 'Risk threshold — High', 15, 'Likelihood x impact threshold for High.'],
      ['risk.medium_threshold', 'Risk threshold — Medium', 8, 'Likelihood x impact threshold for Medium.'],
      ['roadmap.critical_days', 'Roadmap Critical horizon', 30, 'Target upper day boundary for immediate/critical remediation.'],
      ['roadmap.high_days', 'Roadmap High horizon', 90, 'Target upper day boundary for short-term remediation.'],
      ['roadmap.medium_days', 'Roadmap Medium horizon', 180, 'Target upper day boundary for medium-term remediation.'],
    ].forEach((row) => scoringStatement.run(row[0], row[1], row[2], row[3], timestamp));

    const maturityStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_maturity_levels
        (level, label, min_score, max_score, description, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    );
    [
      [0, 'Not Established', 0, 19.999, 'Capability is not established or cannot be evidenced.'],
      [1, 'Initial', 20, 39.999, 'Activities are mostly ad hoc or reactive.'],
      [2, 'Developing', 40, 59.999, 'Controls are being developed but are not consistently operating.'],
      [3, 'Defined', 60, 74.999, 'Processes are defined, documented, and formally implemented.'],
      [4, 'Managed', 75, 89.999, 'Controls are measured, monitored, and actively managed.'],
      [5, 'Optimized', 90, 100, 'Capabilities are integrated and continuously improved; this is not a compliance certification.'],
    ].forEach((row) => maturityStatement.run(row[0], row[1], row[2], row[3], row[4], timestamp));

    const evidenceTypeStatement = db.prepare(
      `INSERT OR IGNORE INTO pdp_evidence_types
        (code, label, extensions_json, mime_types_json, max_bytes, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    );
    ([
      ['pdf', 'PDF Document', ['.pdf'], ['application/pdf']],
      ['office-doc', 'Word Document', ['.doc','.docx'], ['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
      ['office-sheet', 'Spreadsheet', ['.xls','.xlsx'], ['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
      ['office-slide', 'Presentation', ['.ppt','.pptx'], ['application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']],
      ['image', 'Image Evidence', ['.png','.jpg','.jpeg'], ['image/png','image/jpeg']],
      ['text', 'Text Document', ['.txt'], ['text/plain']],
    ] as const).forEach((row) =>
      evidenceTypeStatement.run(
        row[0],
        row[1],
        JSON.stringify(row[2]),
        JSON.stringify(row[3]),
        10 * 1024 * 1024,
        timestamp,
      ),
    );

    db.prepare(
      `INSERT OR IGNORE INTO pdp_ai_prompts
        (code, label, prompt_text, version, is_active, updated_at)
       VALUES ('executive-analysis', 'Executive Privacy Analysis',
       'Analyze only the structured assessment and approved regulatory context. Separate Fact, Assessment Result, AI Analysis, Recommendation, and Requires Human Validation. Never declare final legal compliance and never invent article references.',
       '1.0', 1, ?)`,
    ).run(timestamp);

    db.prepare(
      `INSERT OR IGNORE INTO pdp_report_templates
        (code, label, config_json, version, is_active, updated_at)
       VALUES ('executive-pdf', 'Executive PDP Readiness Report',
       ?, '1.0', 1, ?)`,
    ).run(
      JSON.stringify({
        sections: [
          'cover','confidentiality','executive_summary','organization_profile',
          'scope_methodology','domain_results','risk_heatmap','regulatory_gaps',
          'critical_findings','dpia','dpo','ropa','data_subject_rights',
          'breach_response','cross_border','third_party','quick_wins',
          'roadmap','supporting_documents','rti_advisory','disclaimer',
        ],
      }),
      timestamp,
    );

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

export function seedMetadata() {
  return {
    domains: DOMAIN_SEEDS.length,
    comprehensiveQuestions: DOMAIN_SEEDS.reduce((sum, domain) => sum + domain.checks.length, 0),
    quickQuestions: DOMAIN_SEEDS.reduce((sum, domain, index) => sum + (index < 10 ? 2 : 1), 0),
    baselineRegulation: 'UU No. 27 Tahun 2022',
    scoringModelVersion: '1.0',
    questionSetVersion: '1.0',
    regulationVersion: '2022',
    id: randomUUID(),
  };
}
