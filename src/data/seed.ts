import type { TaskStatus, TaskRecurrence } from '../lib/types';

export interface SeedTask {
  label: string;
  people: string[];
  status: string;
  deadline?: string;
  comment?: string;
}

export interface SeedCategory {
  name: string;
  tasks: SeedTask[];
}

export interface SeedWorkspace {
  name: string;
  description?: string;
  isTemplate?: boolean;
  categories: SeedCategory[];
}

export function statusToEnum(s: string): TaskStatus {
  const l = s.toLowerCase().trim();
  if (l === 'fait') return 'fait';
  if (l === 'en cours') return 'en_cours';
  return 'a_faire';
}

export function parseRecurrence(comment: string | undefined): { recurrence: TaskRecurrence; hint: string | null; note: string | null } {
  if (!comment) return { recurrence: 'none', hint: null, note: null };

  const patterns: [RegExp, TaskRecurrence][] = [
    [/quotidienne/i, 'daily'],
    [/hebdo/i, 'weekly'],
    [/mensuelle/i, 'monthly'],
    [/semestrielle/i, 'semi_annual'],
    [/trimestrielle/i, 'quarterly'],
    [/annuelle/i, 'annual'],
  ];

  for (const [regex, rec] of patterns) {
    if (regex.test(comment)) {
      const parts = comment.split('|').map((s) => s.trim());
      const hint = parts.length > 1 ? parts.slice(1).join(' | ').trim() : null;
      // Extract remaining note content
      const remaining = comment.replace(regex, '').replace(/\|/g, '').trim();
      const noteContent = remaining.replace(/^[\s,|]+|[\s,|]+$/g, '').trim();
      return { recurrence: rec, hint, note: noteContent || null };
    }
  }

  return { recurrence: 'none', hint: null, note: comment };
}

export const USERS_SEED = [
  { name: 'Florian', initials: 'FL', color: '#4361ee', role: 'Direction' },
  { name: 'Seynan', initials: 'SE', color: '#2ec4b6', role: 'Resp. comptable' },
  { name: 'Elodie', initials: 'EL', color: '#f4a261', role: 'Comptable' },
  { name: 'Daniel', initials: 'DA', color: '#e63946', role: 'Comptable' },
  { name: 'Bastien', initials: 'BA', color: '#7209b7', role: 'Comptable' },
  { name: 'Antonin', initials: 'AN', color: '#06d6a0', role: 'Comptable' },
  { name: 'Gregory', initials: 'GR', color: '#118ab2', role: 'E2P' },
];

export const SEED_DATA: SeedWorkspace[] = [
  {
    name: 'Situation Janvier',
    description: 'Clôture mensuelle janvier',
    categories: [
      { name: 'Traitement des achats', tasks: [
        {label:"MAJ LIBEO",people:["Daniel","Antonin"],status:"Fait"},
        {label:"Collecte des grands livres",people:[],status:"Fait"},
        {label:"Mail global le 2 du mois",people:["Antonin"],status:"Fait"},
        {label:"Appel fournisseurs cibles le 5",people:["Antonin","Bastien","Daniel","Elodie"],status:"Fait"},
        {label:"Cadrage des GL",people:["Bastien","Daniel"],status:"Fait"},
        {label:"Traitement des FNP",people:["Bastien","Daniel","Elodie"],status:"Fait"},
        {label:"Revue outil de commandes",people:["Bastien","Daniel"],status:"A faire",deadline:"2026-03-11"},
        {label:"Integration achats X-LAB",people:["Daniel"],status:"A faire",deadline:"2026-03-12"},
        {label:"Detection FNP sur LIBEO",people:["Antonin","Bastien","Daniel"],status:"En cours",deadline:"2026-03-11"},
        {label:"Etat elements manquants",people:[],status:"A faire",comment:"Pas urgent"},
        {label:"Justifs associes",people:["Seynan","Bastien"],status:"A faire",comment:"Pas urgent"},
        {label:"Info depenses engagees",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
        {label:"Etat factures fournisseurs",people:["Daniel","Antonin","Seynan","Elodie"],status:"A faire",comment:"Pas urgent"},
        {label:"Point post cloture",people:["Daniel","Antonin","Seynan","Elodie","Florian"],status:"A faire",comment:"Pas urgent"},
        {label:"Revision ecritures de situation",people:["Seynan"],status:"A faire",deadline:"2026-03-12"},
        {label:"MAJ outil revue ecarts",people:["Antonin"],status:"A faire",deadline:"2026-03-12"},
        {label:"Correction des ecarts",people:["Equipe"],status:"A faire",deadline:"2026-03-13"},
        {label:"Analyse ecarts au budget",people:["Seynan","Antonin"],status:"A faire",deadline:"2026-03-13"},
      ]},
      { name: 'Traitement des immos', tasks: [
        {label:"Detection immos Libeo",people:["Bastien"],status:"A faire",deadline:"2026-03-12"},
        {label:"Integration achats medicaux",people:["Elodie"],status:"A faire",deadline:"2026-03-11"},
        {label:"Integration productions immobilisees",people:["Seynan"],status:"A faire",deadline:"2026-03-11"},
        {label:"Creation fiches immos",people:["Antonin"],status:"En cours",comment:"Pas urgent"},
      ]},
      { name: 'Tresorerie', tasks: [
        {label:"Integrations hebdo banques",people:["Elodie"],status:"Fait"},
        {label:"Rapprochements bancaires",people:["Elodie"],status:"Fait"},
        {label:"Integration releves CB",people:["Elodie"],status:"Fait"},
      ]},
      { name: 'Operations transversales', tasks: [
        {label:"Cadrage credits baux",people:["Bastien"],status:"A faire",comment:"Pas urgent"},
        {label:"Revue des 471",people:["Elodie"],status:"Fait"},
        {label:"Revue des 580",people:["Elodie"],status:"Fait"},
        {label:"Revue des 511",people:["Elodie"],status:"A faire",comment:"Pas urgent"},
        {label:"Cadrage intragroupe",people:["Bastien"],status:"A faire",deadline:"2026-03-16"},
        {label:"Suivi emprunts",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
      ]},
      { name: 'Chiffres affaires', tasks: [
        {label:"CA Intragroupe / X-Lab / Asso",people:["Elodie"],status:"Fait"},
        {label:"Cadrage CA annuel",people:["Seynan"],status:"Fait"},
      ]},
      { name: 'MAJ social', tasks: [
        {label:"Integration OD Paies",people:["Elodie"],status:"Fait"},
        {label:"Saisie salaires differes",people:["Elodie"],status:"Fait"},
        {label:"Revue comptes 43",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
        {label:"Saisie Teulades",people:["Elodie"],status:"Fait"},
        {label:"Suivi ATIH",people:["Seynan","Bastien"],status:"A faire",comment:"A AUTOMATISER"},
        {label:"Suivi echeanciers dette sociale",people:["Seynan","Elodie"],status:"En cours"},
        {label:"Suivi comptes dettes differees",people:["Seynan","Elodie"],status:"En cours"},
        {label:"Outil ecart en social",people:["Seynan","Elodie"],status:"A faire"},
      ]},
      { name: 'Fiscalite', tasks: [
        {label:"Provision CFE / TF / CVAE",people:["Elodie"],status:"A faire"},
      ]},
    ],
  },
  {
    name: 'Situation Fevrier',
    description: 'Clôture mensuelle février',
    categories: [
      { name: 'Traitement des achats', tasks: [
        {label:"MAJ LIBEO",people:["Daniel","Antonin"],status:"En cours",deadline:"2026-03-17"},
        {label:"Collecte grands livres",people:[],status:"En cours",deadline:"2026-03-17"},
        {label:"Mail global le 2 du mois",people:["Antonin"],status:"Fait"},
        {label:"Appel fournisseurs cibles le 5",people:["Antonin","Bastien","Daniel","Elodie"],status:"A faire"},
        {label:"Cadrage des GL",people:["Bastien","Daniel"],status:"A faire"},
        {label:"Traitement des FNP",people:["Bastien","Daniel","Elodie"],status:"A faire",deadline:"2026-03-23"},
        {label:"Revue outil de commandes",people:["Bastien","Daniel"],status:"A faire",deadline:"2026-03-25"},
        {label:"Integration achats X-LAB",people:[],status:"A faire",deadline:"2026-03-24"},
        {label:"Detection FNP sur LIBEO",people:["Antonin","Bastien","Daniel"],status:"A faire",deadline:"2026-03-24"},
        {label:"Etat elements manquants",people:[],status:"A faire"},
        {label:"Justifs associes",people:["Seynan","Bastien"],status:"A faire"},
        {label:"Info depenses engagees",people:["Seynan"],status:"A faire"},
        {label:"Etat factures fournisseurs",people:["Daniel","Antonin","Seynan","Elodie"],status:"A faire"},
        {label:"Point post cloture",people:["Daniel","Antonin","Seynan","Elodie","Florian"],status:"A faire"},
        {label:"Revision ecritures de situation",people:["Seynan"],status:"A faire",deadline:"2026-03-25"},
        {label:"MAJ outil revue ecarts",people:["Antonin"],status:"A faire",deadline:"2026-03-26"},
        {label:"Correction des ecarts",people:["Equipe"],status:"A faire",deadline:"2026-03-26"},
        {label:"Analyse ecarts au budget",people:["Seynan","Antonin"],status:"A faire",deadline:"2026-03-26"},
      ]},
      { name: 'Traitement des immos', tasks: [
        {label:"Detection immos Libeo",people:["Bastien"],status:"A faire",deadline:"2026-03-24"},
        {label:"Integration achats medicaux",people:["Elodie"],status:"A faire"},
        {label:"Integration productions immobilisees",people:["Seynan"],status:"A faire"},
        {label:"Creation fiches immos",people:["Antonin"],status:"A faire"},
      ]},
      { name: 'Tresorerie', tasks: [
        {label:"Integrations hebdo banques",people:["Elodie"],status:"Fait"},
        {label:"Rapprochements bancaires",people:["Elodie"],status:"En cours"},
        {label:"Integration releves CB",people:["Elodie"],status:"En cours"},
      ]},
      { name: 'Operations transversales', tasks: [
        {label:"Cadrage credits baux",people:["Bastien"],status:"A faire"},
        {label:"Revue des 471",people:["Elodie"],status:"En cours"},
        {label:"Revue des 580",people:["Elodie"],status:"En cours"},
        {label:"Revue des 511",people:["Elodie"],status:"A faire",comment:"Pas urgent"},
        {label:"Cadrage intragroupe",people:["Bastien"],status:"A faire"},
        {label:"Suivi emprunts",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
      ]},
      { name: 'Chiffres affaires', tasks: [
        {label:"CA Intragroupe / X-Lab / Asso",people:["Elodie"],status:"Fait"},
        {label:"Cadrage CA annuel",people:["Seynan"],status:"Fait"},
      ]},
      { name: 'MAJ social', tasks: [
        {label:"Integration OD Paies",people:["Elodie"],status:"A faire",deadline:"2026-03-17"},
        {label:"Saisie salaires differes",people:["Elodie"],status:"A faire",deadline:"2026-03-17"},
        {label:"Revue comptes 43",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
        {label:"Saisie Teulades",people:["Elodie"],status:"A faire",deadline:"2026-03-24"},
        {label:"Suivi ATIH",people:["Seynan","Bastien"],status:"A faire",comment:"A AUTOMATISER"},
        {label:"Suivi echeanciers dette sociale",people:["Seynan","Elodie"],status:"En cours"},
        {label:"Suivi comptes dettes differees",people:["Seynan","Elodie"],status:"En cours"},
        {label:"Outil ecart en social",people:["Seynan","Elodie"],status:"A faire"},
      ]},
      { name: 'Fiscalite', tasks: [
        {label:"Provision CFE / TF / CVAE",people:["Elodie"],status:"A faire"},
      ]},
    ],
  },
  {
    name: 'Mensuelle Seynan',
    description: 'Checklist mensuelle responsable comptable',
    categories: [
      { name: 'Taches mensuelles Seynan', tasks: [
        {label:"Salaires differes",people:["Elodie"],status:"A faire"},
        {label:"Rappro bancaires non traites",people:["Seynan"],status:"A faire"},
        {label:"471",people:["Seynan"],status:"A faire"},
        {label:"580",people:["Seynan"],status:"A faire"},
        {label:"Emprunts",people:["Seynan"],status:"A faire",comment:"A deleguer"},
        {label:"Analytique non affecte",people:["Seynan"],status:"A faire",comment:"A deleguer"},
        {label:"Analytique siege",people:["Seynan"],status:"A faire",comment:"A deleguer"},
        {label:"Lettrer les 486",people:["Seynan"],status:"A faire",comment:"A deleguer"},
        {label:"Fichiers des ecarts",people:["Seynan"],status:"A faire",comment:"A partager"},
        {label:"Controle de gestion",people:["Seynan"],status:"A faire"},
        {label:"Honoraires",people:["Seynan"],status:"A faire"},
        {label:"Teulades",people:["Seynan"],status:"A faire"},
        {label:"ATIH (Regul + CSPA)",people:["Seynan"],status:"A faire",comment:"Pas tous les mois"},
        {label:"Journal PAR",people:["Seynan"],status:"A faire",comment:"Pas tous les mois"},
        {label:"Controle ecarts social",people:["Seynan"],status:"A faire"},
        {label:"CSPA",people:["Seynan"],status:"A faire"},
        {label:"Achats medicaux (immos)",people:["Seynan"],status:"A faire",comment:"Simple controle"},
        {label:"Journal HAR",people:["Seynan"],status:"A faire",comment:"Pas tous les mois"},
        {label:"FNP Libeo",people:["Seynan"],status:"A faire",comment:"Simple controle"},
        {label:"FNP outil de commandes",people:["Seynan"],status:"A faire",comment:"Simple controle"},
        {label:"Preparer reunion associes",people:["Seynan"],status:"A faire"},
        {label:"Integrer HA M-1 associes",people:["Seynan"],status:"A faire"},
        {label:"Veiller ecritures CFE/TF",people:["Elodie"],status:"A faire"},
        {label:"Lettrage des 43",people:["Seynan"],status:"A faire",comment:"A deleguer"},
        {label:"Decalages de paie",people:["Seynan"],status:"A faire",comment:"En cours de delegation"},
        {label:"Intragroupe",people:["Seynan"],status:"A faire",comment:"Partage"},
        {label:"Revue X-LAB",people:["Seynan"],status:"A faire"},
        {label:"Honoraires GUETTA",people:["Seynan"],status:"A faire",comment:"Simple controle"},
        {label:"Cloturer les journaux",people:["Seynan"],status:"A faire"},
        {label:"BG 1 a 4 pour lettrer",people:["Seynan"],status:"A faire"},
      ]},
    ],
  },
  {
    name: 'Recurrentes',
    description: 'Template des tâches récurrentes',
    isTemplate: true,
    categories: [
      { name: 'Traitement des achats', tasks: [
        {label:"MAJ LIBEO",people:["Daniel","Antonin"],status:"A faire",comment:"Quotidienne"},
        {label:"Collecte des grands livres",people:[],status:"A faire",comment:"S1"},
        {label:"Mail global le 2 du mois",people:["Antonin"],status:"A faire",comment:"Mensuelle | S1"},
        {label:"Appel fournisseurs cibles le 5",people:["Antonin","Bastien","Daniel","Elodie"],status:"A faire",comment:"Mensuelle | S1"},
        {label:"Cadrage des GL",people:["Bastien","Daniel"],status:"A faire",comment:"Mensuelle | Fin S1"},
        {label:"Traitement des FNP",people:["Bastien","Daniel","Elodie"],status:"A faire",comment:"Mensuelle | S1-S2"},
        {label:"Revue outil de commandes",people:["Bastien","Daniel"],status:"A faire",comment:"Mensuelle | Fin S2"},
        {label:"Integration achats X-LAB",people:[],status:"A faire"},
        {label:"Detection FNP sur LIBEO",people:["Antonin","Bastien","Daniel"],status:"A faire",comment:"Mensuelle | Fin S2 - Debut S3"},
        {label:"Etat elements manquants",people:[],status:"A faire"},
        {label:"Justifs associes",people:["Seynan","Bastien"],status:"A faire",comment:"Mensuelle | Fin S3"},
        {label:"Info depenses engagees",people:["Seynan"],status:"A faire",comment:"Mensuelle | Fin S3"},
        {label:"Etat factures fournisseurs",people:["Daniel","Antonin","Seynan","Elodie"],status:"A faire",comment:"Mensuelle | S4"},
        {label:"Point post cloture",people:["Daniel","Antonin","Seynan","Elodie","Florian"],status:"A faire"},
        {label:"Revision ecritures de situation",people:["Seynan"],status:"A faire",comment:"Mensuelle | S2-S3"},
        {label:"MAJ outil revue ecarts",people:["Antonin"],status:"A faire",comment:"Mensuelle | S2-S3"},
        {label:"Correction des ecarts",people:["Equipe"],status:"A faire",comment:"Mensuelle | Fin S3 - Debut S4"},
        {label:"Analyse ecarts au budget",people:["Seynan","Antonin"],status:"A faire",comment:"Mensuelle | Debut S4"},
      ]},
      { name: 'Traitement des immos', tasks: [
        {label:"Detection immos Libeo",people:["Bastien"],status:"A faire",comment:"Mensuelle | S1"},
        {label:"Integration achats medicaux",people:["Elodie"],status:"A faire",comment:"Mensuelle | S1"},
        {label:"Integration productions immobilisees",people:["Seynan"],status:"A faire",comment:"Mensuelle | S2"},
        {label:"Creation fiches immos",people:["Antonin"],status:"A faire",comment:"Mensuelle | S1 (decalage 1 mois)"},
      ]},
      { name: 'Tresorerie', tasks: [
        {label:"Integrations hebdo banques",people:["Elodie"],status:"A faire",comment:"Hebdo"},
        {label:"Rapprochements bancaires",people:["Elodie"],status:"A faire",comment:"Mensuelle | Fin S1"},
        {label:"Suivi echeanciers dette sociale",people:["Seynan","Antonin"],status:"A faire",comment:"Hebdo | Points le 04, 15 et 25"},
        {label:"Suivi comptes dettes differees",people:["Seynan","Elodie"],status:"A faire",comment:"Mensuelle | S1"},
        {label:"Integration releves CB",people:["Elodie"],status:"A faire",comment:"Mensuelle | S1"},
      ]},
      { name: 'Operations transversales', tasks: [
        {label:"Cadrage credits baux",people:["Bastien"],status:"A faire",comment:"Mensuelle | Debut S4"},
        {label:"Revue des 471",people:["Elodie"],status:"A faire",comment:"Hebdo"},
        {label:"Revue des 580",people:["Elodie"],status:"A faire",comment:"Hebdo"},
        {label:"Revue des 511",people:["Elodie"],status:"A faire",comment:"Hebdo"},
        {label:"Cadrage intragroupe",people:["Bastien"],status:"A faire",comment:"Mensuelle | Debut S4"},
        {label:"Suivi emprunts",people:["Seynan"],status:"A faire",comment:"Mensuelle"},
      ]},
      { name: 'Chiffres affaires', tasks: [
        {label:"CA Intragroupe / X-Lab / Asso",people:["Elodie"],status:"A faire",comment:"Mensuelle | S2"},
        {label:"Cadrage CA annuel",people:["Seynan"],status:"A faire",comment:"Mensuelle | S1"},
      ]},
      { name: 'MAJ social', tasks: [
        {label:"Integration OD Paies",people:["Elodie"],status:"A faire",comment:"Mensuelle | S3"},
        {label:"Saisie salaires differes",people:["Elodie"],status:"A faire",comment:"Mensuelle | S3"},
        {label:"Revue comptes 43",people:["Seynan"],status:"A faire",comment:"Mensuelle | S1 (decalage 1 mois)"},
        {label:"Cadrage OD Paies 01/01 a date",people:["Seynan"],status:"A faire",comment:"Semestrielle"},
        {label:"Saisie Teulades",people:["Elodie"],status:"A faire",comment:"Mensuelle | Fin S2 - Debut S3"},
        {label:"Suivi ATIH",people:["Seynan","Bastien"],status:"A faire",comment:"Semestrielle"},
        {label:"Outil ecart en social",people:["Seynan","Elodie"],status:"A faire",comment:"Mensuelle | Fin S3"},
      ]},
      { name: 'Fiscalite', tasks: [
        {label:"Provision CFE / TF / CVAE",people:["Elodie"],status:"A faire",comment:"Mensuelle | S2"},
        {label:"Declaration TVA",people:["Elodie","Seynan"],status:"A faire",comment:"Mensuelle | S2"},
        {label:"Suivi paiement TVA",people:["Elodie"],status:"A faire",comment:"Mensuelle | Fin S4"},
        {label:"Saisie OD de TVA",people:["Daniel"],status:"A faire",comment:"Mensuelle | S4"},
        {label:"Controle TVA",people:["Seynan"],status:"A faire",comment:"Semestrielle"},
      ]},
      { name: 'Administration des dossiers', tasks: [
        {label:"Cloture des journaux",people:["Seynan"],status:"A faire",comment:"Mensuelle | Debut S1"},
        {label:"Extourne des OD M-1",people:["Seynan"],status:"A faire",comment:"Mensuelle | S4"},
        {label:"Creer les factures IG",people:[],status:"A faire"},
      ]},
    ],
  },
  {
    name: 'Cloture Annuelle',
    description: 'Travaux de clôture annuelle',
    categories: [
      { name: 'TRESORERIE', tasks: [
        {label:"Rappro 31/12 + releves",people:["Elodie"],status:"A faire",comment:"24/02 - 28/02"},
        {label:"Recup RB 2025 (5 comptes)",people:["Elodie"],status:"En cours"},
        {label:"Recup RB janvier 26",people:["Elodie"],status:"A faire"},
        {label:"Resolution ecarts 2025",people:["Elodie"],status:"A faire"},
        {label:"Agios a payer",people:["Elodie"],status:"A faire"},
        {label:"Lettrer 58 et 511",people:["Elodie"],status:"A faire"},
        {label:"Circularisations bancaires",people:["Elodie"],status:"A faire"},
      ]},
      { name: 'EMPRUNTS', tasks: [
        {label:"Cadrage emprunts",people:["Seynan"],status:"A faire"},
        {label:"Cadrage emprunts OC",people:["Seynan","Florian"],status:"A faire"},
        {label:"Interets courus",people:["Seynan"],status:"A faire"},
        {label:"Cadrage credits baux",people:["Florian","Seynan","Bastien"],status:"En cours"},
      ]},
      { name: 'FOURNISSEURS', tasks: [
        {label:"Remplacer/documenter FNP",people:["Elodie","Daniel","Bastien"],status:"A faire"},
        {label:"Dossier GL fournisseurs",people:["Daniel","Antonin"],status:"A faire"},
        {label:"Suivi demandes GL",people:["Daniel","Antonin","Bastien"],status:"A faire"},
        {label:"Justifier comptes frs",people:["Elodie","Daniel","Bastien"],status:"A faire"},
        {label:"Documenter CCA",people:["Elodie","Daniel","Bastien"],status:"A faire"},
        {label:"Verif stocks 2025",people:["Seynan"],status:"A faire"},
        {label:"Methode valorisation stocks",people:["Florian","Seynan","Gregory"],status:"A faire",comment:"Cemedis + E2P"},
      ]},
      { name: 'CLIENTS', tasks: [
        {label:"Cadrage creances / clients douteux",people:[],status:"A faire",comment:"A determiner"},
        {label:"FAE/AAE -> factures ventes",people:["Bastien","Seynan"],status:"A faire"},
        {label:"Provisions et ajustements",people:["Seynan"],status:"A faire",comment:"E2P"},
        {label:"Cadrage CA + doc",people:["Florian","Seynan"],status:"A faire",comment:"Cemedis + E2P"},
        {label:"Eclatement CA associations",people:["Elodie"],status:"A faire"},
      ]},
      { name: 'IMMOBILISATIONS', tasks: [
        {label:"Balance immo vs Sage",people:["Bastien","Seynan"],status:"A faire"},
        {label:"Dernieres immos (TMC)",people:[],status:"A faire",comment:"E2P"},
        {label:"Factures immos 2025",people:["Bastien","Seynan"],status:"A faire"},
        {label:"Dotations amortissements",people:["Bastien","Seynan"],status:"A faire"},
        {label:"Etats immos et GL",people:["Seynan"],status:"A faire"},
        {label:"Impairment test immos fi",people:["Florian","Seynan"],status:"A faire"},
      ]},
      { name: 'SOCIAL', tasks: [
        {label:"Livres de paie + recap",people:["Seynan","Elodie"],status:"A faire",comment:"E2P"},
        {label:"Provisions CP",people:["Seynan","Elodie"],status:"A faire",comment:"E2P"},
        {label:"Nettoyage comptes 43",people:["Seynan","Elodie"],status:"A faire"},
        {label:"Documentation travaux",people:["Seynan","Elodie"],status:"A faire",comment:"E2P"},
        {label:"CAP / PAR social",people:["Seynan","Elodie"],status:"A faire"},
        {label:"Suivi effectifs",people:["Seynan","Elodie"],status:"A faire"},
        {label:"Declaration TSS",people:["Seynan","Elodie"],status:"A faire"},
      ]},
      { name: 'FISCALITE', tasks: [
        {label:"Controle TVA + Recap 2025",people:["Seynan"],status:"A faire"},
        {label:"CAP / PAR fiscal",people:["Seynan"],status:"A faire"},
        {label:"Declaration groupe TVA",people:[],status:"A faire"},
      ]},
      { name: 'CAPITAUX PROPRES', tasks: [
        {label:"Affectation du resultat",people:["Bastien"],status:"A faire"},
        {label:"Provisions pour risques",people:[],status:"A faire",comment:"Cemedis + avocat"},
      ]},
    ],
  },
];
