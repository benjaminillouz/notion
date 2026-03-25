# CEMEDIS Suivi Clôtures — Instructions Claude Code

## 🎯 Objectif

Développer **notion.cemedis.app**, une application web de suivi des clôtures comptables pour l'équipe comptabilité de CEMEDIS (réseau de 26 centres médico-dentaires). L'app remplace un artifact Claude JSX par une vraie application hébergée avec auth, collaboration temps réel et base de données.

## 🖼️ Logo CEMEDIS

Le fichier `LogoCEMEDISV4.png` est fourni à la racine du repo. Au setup du projet, le copier dans `public/` sous le nom `logo-cemedis.png`. Il doit être utilisé :
- **Sidebar** : en haut de la sidebar, au-dessus du nom de l'utilisateur. Afficher le logo en petit format (hauteur ~28-32px, auto width) avec un fallback vers le texte "CEMEDIS" si l'image ne charge pas.
- **Page de login** : centré en grand format (hauteur ~60-80px) au-dessus du titre "Suivi des clôtures".
- **Header** : petit logo (hauteur ~24px) à gauche du header, à la place de l'emoji 🦷.

Le logo doit être intégré via une balise `<img>` avec le chemin `/logo-cemedis.png` (servi depuis `public/`). Ajouter un `alt="CEMEDIS"` et un `onError` qui masque l'image et affiche le texte de fallback.

---

## 📐 Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  GitHub Pages   │────▶│  Supabase (Backend)      │────▶│  Supabase Auth      │
│  React SPA      │     │  jcppaboawmgizafhused    │     │  Google OAuth       │
│  Vite + React   │     │  PostgreSQL + Realtime   │     │                     │
│  TailwindCSS    │     │  RLS Policies            │     │                     │
└─────────────────┘     └──────────────────────────┘     └─────────────────────┘
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | TailwindCSS 3 |
| **State** | Zustand (store global) |
| **Backend** | Supabase (PostgreSQL + Realtime + Auth) |
| **Auth** | Google OAuth via Supabase Auth |
| **Hosting** | GitHub Pages (repo: `benjaminillouz/notion`) |
| **Domaine** | notion.cemedis.app (CNAME vers GitHub Pages) |
| **Icons** | Lucide React |
| **Charts** | Recharts (optionnel, pour dashboards) |

### Repo GitHub

- **URL** : https://github.com/benjaminillouz/notion
- **Branch** : `main`
- **Build** : `npm run build` → output `dist/`
- **Deploy** : GitHub Actions → GitHub Pages
- **Base path** : `/` (custom domain)

---

## 🗄️ Base de données Supabase

**Projet** : `jcppaboawmgizafhused`
**URL API** : `https://jcppaboawmgizafhused.supabase.co`

### Schéma (déjà créé et prêt)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   users      │◄───│  workspaces  │◄───│  categories  │
│   (auth)     │    │  (onglets)   │    │  (groupes)   │
└──────┬───────┘    └──────────────┘    └──────┬───────┘
       │                                       │
       │            ┌──────────────┐           │
       ├───────────▶│    tasks     │◄──────────┘
       │            │  (tâches)    │
       │            └──┬───────┬──┘
       │               │       │
       │    ┌──────────┘       └──────────┐
       │    ▼                             ▼
┌──────┴────────┐              ┌──────────────┐
│task_assignees │              │   comments   │
│  (M2M+valid.) │              │              │
└───────────────┘              └──────────────┘

        ┌──────────────┐
        │ activity_log │   (historique)
        └──────────────┘
```

#### Tables

**`users`** — Profils utilisateurs (liés à `auth.users`)
- `id` UUID (PK, FK → auth.users)
- `email` TEXT UNIQUE
- `name` TEXT
- `initials` TEXT (1-4 chars)
- `color` TEXT (hex, default #4361ee)
- `role` ENUM: `superadmin` | `admin` | `member`
- `avatar_url` TEXT (nullable, rempli par Google OAuth)
- `is_active` BOOLEAN
- `created_at`, `updated_at` TIMESTAMPTZ

**`workspaces`** — Onglets / périodes de clôture (ex: "Situation Janvier", "Clôture Annuelle")
- `id` UUID (PK, auto-gen)
- `name` TEXT
- `description` TEXT (nullable)
- `sort_order` INT
- `is_template` BOOLEAN — marque les workspaces modèles (Récurrentes, Mensuelle Seynan)
- `source_template_id` UUID (nullable, FK → workspaces) — pour les copies
- `created_by` UUID (FK → users)
- `is_archived` BOOLEAN
- `created_at`, `updated_at` TIMESTAMPTZ

**`categories`** — Groupes de tâches dans un workspace (ex: "Traitement des achats", "Trésorerie")
- `id` UUID (PK)
- `workspace_id` UUID (FK → workspaces, CASCADE)
- `name` TEXT
- `sort_order` INT
- `created_at`, `updated_at` TIMESTAMPTZ

**`tasks`** — Tâches (supporte 3 niveaux : tâche, sous-tâche, sous-sous-tâche)
- `id` UUID (PK)
- `category_id` UUID (FK → categories, CASCADE)
- `parent_task_id` UUID (nullable, FK → tasks, CASCADE) — pour sous-tâches
- `label` TEXT
- `status` ENUM: `a_faire` | `en_cours` | `fait`
- `date_start` DATE (nullable)
- `deadline` DATE (nullable)
- `note` TEXT (nullable)
- `recurrence` ENUM: `none` | `daily` | `weekly` | `monthly` | `quarterly` | `semi_annual` | `annual`
- `recurrence_hint` TEXT (nullable) — ex: "S1", "Fin S2", "le 2 du mois"
- `sort_order` INT
- `depth` INT (0=tâche, 1=sous-tâche, 2=sous-sous-tâche) CHECK 0..2
- `created_by` UUID (FK → users)
- `created_at`, `updated_at` TIMESTAMPTZ

**`task_assignees`** — Liaison M2M tâche ↔ utilisateur + validation individuelle
- `id` UUID (PK)
- `task_id` UUID (FK → tasks, CASCADE)
- `user_id` UUID (FK → users, CASCADE)
- `validated` BOOLEAN (default false)
- `validated_at` TIMESTAMPTZ (nullable)
- UNIQUE(task_id, user_id)

**`comments`** — Commentaires sur les tâches
- `id` UUID (PK)
- `task_id` UUID (FK → tasks, CASCADE)
- `author_id` UUID (FK → users)
- `text` TEXT
- `is_edited` BOOLEAN
- `created_at`, `updated_at` TIMESTAMPTZ

**`activity_log`** — Journal d'activité
- `id` UUID (PK)
- `user_id` UUID (FK → users, nullable)
- `workspace_id` UUID (FK → workspaces, nullable)
- `task_id` UUID (FK → tasks, nullable)
- `action` TEXT
- `details` JSONB
- `created_at` TIMESTAMPTZ

#### Vue SQL disponible

**`tasks_with_progress`** — Vue enrichie avec assignees (JSON array), counts de validation, counts commentaires et sous-tâches. Utiliser cette vue pour les lectures.

#### Triggers automatiques (déjà en place)

1. **`recompute_parent_status`** — Quand une sous-tâche change de statut, le parent se recalcule automatiquement (tout fait → fait, au moins un en cours → en cours, sinon à faire)
2. **`recompute_task_from_validations`** — Quand un assignee valide/invalide, le statut de la tâche se recalcule
3. **`handle_new_user`** — Crée automatiquement le profil `users` lors de l'inscription. Détecte `benjaminillouz@gmail.com` comme superadmin
4. **`moddatetime`** — Met à jour `updated_at` automatiquement sur toutes les tables

#### Realtime activé sur

`tasks`, `task_assignees`, `comments`, `workspaces`, `categories`

#### RLS (Row Level Security)

- **Tous les SELECT** : ouverts aux utilisateurs authentifiés (toute l'équipe voit tout)
- **Modifications structurelles** (workspaces, categories, suppression tasks) : admin ou superadmin uniquement
- **Validation assignee** : l'assignee lui-même OU admin/superadmin
- **Commentaires** : l'auteur peut modifier/supprimer, admin peut supprimer

#### Fonctions disponibles

- `is_superadmin()` → BOOLEAN
- `is_admin_or_above()` → BOOLEAN
- `get_user_role()` → user_role

---

## 🔐 Authentification

### Google OAuth via Supabase

1. **Provider** : Google uniquement (pas de mot de passe)
2. **Redirect URL** : `https://notion.cemedis.app` (callback géré par Supabase)
3. **Superadmin auto** : `benjaminillouz@gmail.com` → role `superadmin` (via trigger SQL)
4. Les nouveaux utilisateurs sont créés avec role `member` par défaut
5. Un admin/superadmin peut promouvoir un member → admin depuis l'interface

### Configuration requise côté Supabase Dashboard

> ⚠️ À faire manuellement dans Supabase Dashboard > Authentication > Providers > Google :
> - Activer le provider Google
> - Configurer Client ID + Client Secret Google (depuis Google Cloud Console)
> - Redirect URL : `https://jcppaboawmgizafhused.supabase.co/auth/v1/callback`
> - Site URL : `https://notion.cemedis.app`

### Flow d'auth dans l'app

```typescript
// Login
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://notion.cemedis.app'
  }
});

// Logout
await supabase.auth.signOut();

// Session check
const { data: { session } } = await supabase.auth.getSession();
```

---

## 🎨 Design & UI

### Identité visuelle CEMEDIS

- **Logo** : 🦷 emoji + "CEMEDIS" en bold
- **Couleur primaire** : `#4361ee` (bleu CEMEDIS)
- **Couleur secondaire** : `#2ec4b6` (teal/vert)
- **Accent warning** : `#f4a261` (orange)
- **Accent danger** : `#e63946` (rouge)
- **Fond clair** : `#f0f2f8`
- **Fond sombre (dark mode)** : `#1a1a2e`

### Couleurs des statuts

| Statut | Background | Texte | Bordure |
|--------|-----------|-------|---------|
| `fait` | `#e6f9f7` | `#0d8a7e` | `#2ec4b6` |
| `en_cours` | `#fef3e6` | `#b97a2e` | `#f4a261` |
| `a_faire` | `#fde8ea` | `#e63946` | `#e63946` |

### Couleurs utilisateurs (par défaut à la création)

Chaque utilisateur a une couleur personnalisable stockée en base. Palette par défaut :
```
Florian: #4361ee, Seynan: #2ec4b6, Elodie: #f4a261, Daniel: #e63946
Bastien: #7209b7, Antonin: #06d6a0, Gregory: #118ab2
```

### Dark Mode

L'app doit supporter un toggle dark/light mode. Utiliser des CSS variables Tailwind avec `dark:` prefix. Persister le choix dans `localStorage`.

### Responsive

- **Desktop first** (usage principal sur écran bureau)
- Sidebar collapsible
- Mobile : sidebar en drawer, vue liste simplifiée

---

## 📱 Spécifications UI détaillées

> **IMPORTANT** : L'app doit reproduire fidèlement l'interface et le comportement de l'app artifact source. Les spécifications ci-dessous décrivent chaque composant avec précision.

### 1. Écran de login

- Plein écran, fond dégradé `linear-gradient(135deg, #f5f7fa, #e8ecfd)`
- Card centrée, fond blanc, border-radius 20px, shadow `0 10px 40px rgba(67,97,238,0.15)`
- Logo CEMEDIS en grand (60-80px de haut) centré en haut
- Titre "CEMEDIS" en `#4361ee`, 1.6rem, bold
- Sous-titre "Suivi des clôtures" en `#6c757d`, 0.88rem
- Bouton unique "Se connecter avec Google" stylé en `#4361ee`, pleine largeur, border-radius 14px, avec icône Google
- Si l'utilisateur n'est pas encore dans `users`, le trigger SQL le crée automatiquement

### 2. Layout principal (après login)

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (46px haut, fond dégradé bleu)                   │
│  [Logo] CEMEDIS | [SaveBadge] | [StorageBadge] ... btns  │
├───────────┬──────────────────────────────────────────────┤
│           │                                              │
│ SIDEBAR   │            MAIN CONTENT                      │
│ 240px     │            (scroll vertical)                 │
│ (collap.  │                                              │
│  à 52px)  │                                              │
│           │                                              │
│ fond      │                                              │
│ #1e2a5a   │                                              │
│ (dark:    │                                              │
│  #12122a) │                                              │
│           │                                              │
└───────────┴──────────────────────────────────────────────┘
```

### 3. Header (46px)

- **Fond** : `linear-gradient(90deg, #4361ee, #3a0ca3)` (dark: `linear-gradient(90deg, #2a2a5e, #1a1a3e)`)
- **Gauche** :
  - Logo CEMEDIS (24px de haut) + texte "CEMEDIS" en blanc, bold, 1rem, letter-spacing 1px
  - Badge de sauvegarde : "Sauvegarde OK" (fond `#e6f9f7`, texte `#0d8a7e`), "Sauvegarde..." (fond `#fef3e6`, texte `#b97a2e`), "Erreur" (fond `#fde8ea`, texte `#e63946`)
  - Badge de connexion Realtime : "Connecté" en teal, "Déconnecté" en orange
- **Droite** (gap 6px) :
  - Si vue tâches : compteurs inline `[✅ N] [🟡 N] [🔴 N] [XX%]` sur fond `rgba(255,255,255,0.1)`, border-radius 12px
  - Bouton Export (fond `rgba(255,255,255,0.12)`, texte blanc, border-radius 8px)
  - Bouton "+" ajouter tâche (fond `#2ec4b6`, texte blanc, border-radius 8px, bold)
  - Toggle dark/light mode ☀/🌙
  - Bouton historique 📜
  - Bouton déconnexion 🚪

### 4. Sidebar (240px, collapsible à 52px)

- **Fond** : `#1e2a5a` (dark: `#12122a`), bordure droite `#2a3f8f`
- **En haut** :
  - Logo CEMEDIS (si non collapsed) + bouton collapse `<` / `>`
  - Avatar de l'utilisateur connecté (rond, 28px, couleur personnelle) + nom + rôle
- **Section "Vues"** (label uppercase, 0.62rem, muted) :
  - 📋 Tâches | 📅 Calendrier | 📊 Gantt | 🔀 Vue globale | ⚙️ Admin (si admin)
  - La vue active a : fond `rgba(255,255,255,0.15)`, bordure gauche 3px `#2ec4b6`, texte blanc bold
  - Les autres : texte `rgba(255,255,255,0.55)`, au hover texte blanc
- **Section "Onglets"** (visible uniquement en vue tâches) :
  - Label "ONGLETS" en uppercase
  - Liste des workspaces avec :
    - Nom du workspace (0.78rem)
    - Barre de progression en dessous (3px, couleur `#2ec4b6`) + pourcentage
    - Bordure gauche 3px `#4361ee` si actif
    - Boutons au hover : ⧉ dupliquer (teal), ✎ renommer (orange), x supprimer (rouge)
  - Bouton "+ Nouvel onglet" en bas
  - En mode collapsed : pastille colorée 8px (vert=100%, orange=partiel, rouge=0%)
- **Section "Filtres"** :
  - Champ de recherche texte (fond `rgba(255,255,255,0.1)`, border `rgba(255,255,255,0.2)`)
  - "Personne" : chips horizontales (border-radius 12px) : "Tous" + chaque user. Active = fond `#2ec4b6` texte blanc
  - "Statut" : chips "A faire" (rouge), "En cours" (orange), "Fait" (teal). Active = fond coloré

### 5. Vue Tâches (vue principale)

Pour chaque **catégorie** du workspace actif :

#### Card de catégorie
- Fond blanc (dark: `#16213e`), border-radius 14px, shadow `0 2px 12px rgba(0,0,0,0.06)`
- Header de catégorie : nom en bold 0.88rem `#4361ee`, bordure gauche 3px `#4361ee`, padding 10px 14px
- Barre de progression sous le header : fait/en cours/à faire avec compteurs + pourcentage
- Bouton "+" ajouter une tâche dans la catégorie

#### Ligne de tâche (chaque tâche)
- Padding `8px 12px`, border-bottom 1px solid `#dee2e6`
- Hover : fond `rgba(67,97,238,0.03)`
- **Composants par ligne, de gauche à droite** :
  1. **Checkbox statut** (15x15px, border-radius 3px) :
     - À faire : bordure `#dee2e6`, fond transparent
     - En cours : bordure `#f4a261`, fond `#fef3e6`, contenu "~"
     - Fait : bordure `#2ec4b6`, fond `#2ec4b6`, contenu "✓" blanc
     - Click = cycle (à faire → en cours → fait → à faire)
  2. **Label** (0.85rem, flex 1) :
     - Fait : barré (text-decoration line-through), couleur muted
     - Normal : couleur `#212529`
  3. **Avatars des assignees** :
     - Si plusieurs personnes : groupe de pastilles rondes 22px avec initiales
     - Chaque pastille = couleur de l'utilisateur, opacity 0.5 si pas validé, opacity 1 + fond `#2ec4b6` si validé
     - Compteur "X/Y" à côté
     - Click sur une pastille = toggle validation (si c'est l'utilisateur connecté ou admin)
     - Si une seule personne : avatar simple 22px
  4. **Dates** (compact) :
     - Label "du" + input date (width compacte, 0.67rem)
     - Label "au" + input date
     - Si deadline dépassée : bordure rouge, fond `#fde8ea`, 🔴
     - Si deadline ≤ 3 jours : bordure orange, fond `#fef3e6`, 🟠
     - Si les 2 dates présentes : badge durée "Xj" en bleu sur fond `#eef1ff`
  5. **StatusPill** (select stylé en pill, border-radius 12px, 0.7rem) :
     - Couleurs selon statut (voir tableau)
     - `appearance: none`, min-width 72px
  6. **Boutons action** (0.8rem, pas de fond, hover coloré) :
     - ✏️ Modifier → ouvre modal d'édition
     - 🗑️ Supprimer → ouvre modal de confirmation (admin seulement)
     - 💬 Commentaires → déplie la section commentaires. Badge compteur si > 0

#### Barre sous-tâches (sous chaque tâche)
- Bouton pleine largeur, fond léger `rgba(46,196,182,0.08)`
- Texte "▸ SOUS-TACHES" en teal 0.6rem bold, + badge "X/Y faites" si des sous-tâches existent
- Click = déplie la liste des sous-tâches
- Chaque sous-tâche : même structure que la tâche mais indentée (padding-left +20px), taille réduite (0.78rem)
- Sous-sous-tâches : indentation +40px, même pattern
- Bouton ⊕ pour ajouter une sous-tâche (inline input)
- Maximum 2 niveaux de profondeur

#### Section commentaires (dépliable sous la tâche)
- Fond `#f8f9fa` (dark: `#1e2a4a`), border-top
- **Note inline** : "Note : texte" avec bouton modifier. La note est un champ texte simple de la tâche
- **Thread de commentaires** : chaque commentaire avec :
  - Avatar auteur (20px) + nom en bold + date en muted
  - Texte du commentaire
  - Si l'auteur = user connecté : boutons modifier/supprimer
- **Input nouveau commentaire** : champ texte + bouton Envoyer

### 6. Modal Nouvelle tâche / Modifier tâche

- Overlay `rgba(0,0,0,0.5)`, z-index 1000+
- Card centrée, max-width 460px, border-radius 18px, padding 28px, shadow forte
- Champs (gap 12px, flex-direction column) :
  - Intitulé (input texte, autofocus)
  - Catégorie (select)
  - Responsables (chips cliquables avec noms, toggle multi-sélection)
  - Statut (select)
  - Date de début + Date de fin (2 inputs côte à côte)
  - Badge durée calculée si 2 dates valides
  - Note (textarea, 2 rows, resizable)
- Boutons : "Ajouter/Enregistrer" (bleu, flex 1) + "Annuler" (transparent, border)

### 7. Vue Calendrier

- Navigation mois : boutons `<` `>` + titre du mois en français, capitalisé, couleur `#4361ee`
- Grille 7 colonnes (Lun → Dim), header avec jours abrégés
- Chaque cellule jour :
  - Min-height 72px, padding 5px, border-radius 8px
  - Aujourd'hui : fond `#4361ee`, texte blanc, border `#4361ee`
  - Jour avec tâches : fond `#eef1ff` (dark: `#1e2a4a`)
  - Weekend : texte muted
  - Jusqu'à 3 tâches affichées en pills (0.6rem), couleur selon statut
  - Si > 3 : "+N" en muted
- **Tooltip au hover** sur un jour : card fixe avec position calculée, liste des tâches du jour avec :
  - Pastille couleur statut + label + workspace name + badge statut

### 8. Vue Gantt

- **Barre d'outils** en haut :
  - Navigation : `<<` (demi-viewport) `<` (7j) "Aujourd'hui" (bleu) `>` `>>` 
  - Zoom : boutons `-` / `+` + pourcentage affiché + "Ctrl+molette"
  - Légende : pastilles couleur + labels (Fait, A faire, Urgent, Retard)
- **Zone du diagramme** (fond card, border-radius 14px, scroll X+Y) :
  - **Colonne gauche fixe** (220px) : noms des tâches avec pastille statut
  - **Header sticky** : 2 lignes :
    - Ligne 1 : mois (texte bleu, capitalize)
    - Ligne 2 : numéros de jours + abréviation jour (si zoom ≥ 1)
    - Aujourd'hui en surbrillance bleue
    - Weekends en fond gris léger
  - **Lignes** groupées par workspace (collapsible) > catégorie > tâche
  - **Barres de Gantt** :
    - Hauteur 20px, border-radius 5px, shadow `0 2px 6px [couleur]55`
    - Couleur : fait=`#2ec4b6`, à faire=`#4361ee`, urgent=`#f4a261`, retard=`#e63946`
    - **Drag des bords gauche/droit** : cursor `ew-resize`, zone de 7px
    - **Drag du corps** : cursor `grab`/`grabbing`, déplace toute la barre
    - Si multi-personnes avec validation partielle : bande `rgba(255,255,255,0.28)` à gauche proportionnelle au %
    - Label de la tâche centré dans la barre (si zoom ≥ 0.9 et largeur > 50px)
  - **Avatars miniatures** (13px) à droite de chaque barre, avec indicateur validé
  - **Ligne verticale "aujourd'hui"** : 2px, `#4361ee44`
  - **Double-click** sur une barre → popover de modification des dates avec :
    - Durées rapides : "1 j", "3 j", "1 sem", "2 sem", "1 mois"
    - Inputs date début/fin
    - Badge durée calculée
    - Boutons "Appliquer" / "Annuler"
  - **Tooltip au hover** : card avec label, statut (pill), dates formatées, durée en jours

### 9. Vue Transversale (globale)

3 sections dans des cards séparées :

#### Section 1 : Avancement par onglet
- Titre "Avancement par onglet" + nom personne filtrée si applicable
- Pour chaque workspace : nom (160px fixe) + barre de progression (10px haut) + pourcentage
- Barre couleur `#4361ee` (ou `#2ec4b6` si 100%)

#### Section 2 : Matrice personnes × onglets
- Titre "Matrice personnes × onglets"
- Tableau HTML :
  - Colonne gauche : avatar 24px + nom bold
  - Colonnes : un par workspace, affichant "X/Y" en pill colorée + mini barre de progression
  - Dernière colonne "Total" : pourcentage en bleu bold + "X/Y" en muted
  - Cellules vides : "-" en muted

#### Section 3 : Retards et urgences
- Titre "Retards et urgences" en `#e63946`
- Liste triée par deadline croissante
- Chaque item : 🔴/🟠 + label bold + workspace/catégorie en muted + avatars assignees + date en bold rouge/orange
- Si aucun retard : "Aucun retard détecté" en muted

### 10. Page Admin (admin/superadmin uniquement)

- Accessible via l'icône ⚙️ dans la sidebar (visible uniquement si admin/superadmin)

#### Gestion des utilisateurs
- Tableau : Avatar | Nom | Email | Rôle | Couleur | Actif | Actions
- Actions admin :
  - Modifier le rôle via select (member ↔ admin) — seul le superadmin peut promouvoir en admin
  - Color picker pour la couleur
  - Toggle actif/inactif
  - Modifier les initiales
- Le superadmin (`benjaminillouz@gmail.com`) est affiché mais non modifiable

#### Seeding des données initiales
- Bouton "Importer les données initiales" (superadmin uniquement)
- Crée tous les workspaces, catégories et tâches depuis le jeu initial
- Confirmation avant exécution
- Les assignees sont créés comme placeholder par nom (mapping vers les vrais users quand ils se connecteront via Google)

### 11. Panneau Historique (drawer droite)

- Panneau latéral droit, 300px, fond blanc (dark: `#16213e`), shadow gauche
- Header : "Historique" en bleu bold + bouton fermer
- Liste chronologique inversée :
  - Date/heure en muted 0.66rem
  - Description de l'action en 0.76rem
  - Séparateur border-bottom
- Scroll vertical, max les 200 dernières actions

### 12. Export JSON (header)

Le bouton "Export" dans le header génère un fichier JSON téléchargeable contenant :
- Tous les workspaces, catégories et tâches du scope actuel
- Les commentaires, validations, notes
- Format : `cemedis-export-YYYY-MM-DD.json`
- Téléchargement via `Blob` + `URL.createObjectURL` + click automatique sur un `<a>` invisible

> Note : L'import JSON de l'artifact original (migration depuis la V2) n'est plus nécessaire puisque les données vivent en Supabase. L'export reste utile pour les sauvegardes manuelles.

### 13. Cas particuliers à gérer

#### Assignee "Equipe"
Dans les données de seed, certaines tâches ont `people: ["Equipe"]`. "Equipe" n'est pas un vrai utilisateur — c'est un placeholder signifiant "toute l'équipe". Dans le seeding, ne pas créer d'assignee pour ces tâches mais stocker "Équipe" dans la `note` de la tâche. Dans l'interface, afficher un badge "Équipe" gris quand une tâche n'a pas d'assignee.

#### Tâches sans assignee
Certaines tâches ont `people: []`. Les afficher avec un badge "Non assigné" en muted. Le statut de ces tâches est géré directement (pas de mécanisme de validation par personne).

#### Parsing des récurrences depuis les notes
Dans le seed, les commentaires de l'artifact contiennent souvent la récurrence : "Mensuelle | S2", "Hebdo", "Quotidienne", "Semestrielle". Le script de seed doit :
- Extraire la récurrence (`monthly`, `weekly`, `daily`, `semi_annual`)
- Stocker le hint de timing ("S2", "Fin S3", "le 2 du mois") dans `recurrence_hint`
- Conserver le reste du commentaire (ex: "Pas urgent", "A deleguer", "A AUTOMATISER") dans `note`

---

## 📊 Données initiales à seeder

Le jeu de données initial provient de l'app artifact. Il faut créer une route/script de seeding qui crée :

### Workspaces

1. **Situation Janvier** — Clôture mensuelle janvier
2. **Situation Février** — Clôture mensuelle février
3. **Mensuelle Seynan** — Checklist mensuelle responsable comptable
4. **Récurrentes** — Template des tâches récurrentes (is_template = true)
5. **Clôture Annuelle** — Travaux de clôture annuelle

### Catégories par workspace (identiques pour Janvier/Février/Récurrentes)

1. Traitement des achats
2. Traitement des immos
3. Trésorerie
4. Opérations transversales
5. Chiffres d'affaires
6. MAJ social
7. Fiscalité

### Catégories spécifiques Clôture Annuelle

TRESORERIE, EMPRUNTS, FOURNISSEURS, CLIENTS, IMMOBILISATIONS, SOCIAL, FISCALITE, CAPITAUX PROPRES

### Catégories Mensuelle Seynan

Tâches mensuelles Seynan, Fiscalité, Administration des dossiers

### Tâches

Reprendre **toutes les tâches** définies dans l'objet `INIT` du fichier JSX source (lignes 79-353). Chaque tâche a :
- `label` : nom de la tâche
- `people` : liste de noms → à mapper vers les user_ids en base
- `status` : "Fait", "En cours", "A faire" → mapper vers l'enum `task_status`
- `deadline` : date ISO si présente
- `comment` : texte → stocker dans `note`
- `recurrence` + `recurrence_hint` : extraire depuis les commentaires type "Mensuelle | S2", "Hebdo", "Quotidienne"

**Mapping noms → emails** (à adapter quand les vrais utilisateurs se connecteront) :
Le seeding peut créer des entrées temporaires dans `users` sans lien auth, ou simplement stocker les noms comme placeholder et les mapper manuellement après les premières connexions Google.

**Approche recommandée** : Créer un fichier `src/data/seed.ts` contenant la structure de données complète, et un bouton admin "Seeder les données" qui appelle les inserts Supabase en batch. Les assignees seront mappés par nom après que les utilisateurs réels se soient connectés.

---

## ⚡ Collaboration temps réel

### Supabase Realtime

Souscrire aux changements sur les tables clés :

```typescript
// Exemple de subscription Realtime
const channel = supabase
  .channel('workspace-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `category_id=in.(${categoryIds.join(',')})`
  }, (payload) => {
    // Mettre à jour le store Zustand
    handleTaskChange(payload);
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'task_assignees'
  }, (payload) => {
    handleAssigneeChange(payload);
  })
  .subscribe();
```

### Indicateurs de présence (optionnel, V2)

Montrer qui est connecté en temps réel via Supabase Presence.

---

## 🔧 Configuration du projet

### Structure des fichiers

Le repo contient déjà à la racine :
- `LogoCEMEDISV4.png` — Logo CEMEDIS (à copier dans `public/logo-cemedis.png` au setup)
- `cemedis-app-v3 (2).jsx` — Fichier source de référence (ne pas modifier, lecture seule)
- `README.md` — À remplacer par un README projet

Claude Code doit initialiser le projet Vite + React + TS dans ce repo existant et organiser les sources :

```
notion/                              # ← repo https://github.com/benjaminillouz/notion
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions → GitHub Pages (OBLIGATOIRE)
├── public/
│   ├── CNAME                        # notion.cemedis.app
│   ├── logo-cemedis.png             # ← copié depuis LogoCEMEDISV4.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── tasks/
│   │   │   ├── TaskListView.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskModal.tsx
│   │   │   ├── SubtaskList.tsx
│   │   │   ├── CommentThread.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   └── Avatar.tsx
│   │   ├── calendar/
│   │   │   └── CalendarView.tsx
│   │   ├── gantt/
│   │   │   ├── GanttView.tsx
│   │   │   ├── GanttBar.tsx
│   │   │   └── GanttPopover.tsx
│   │   ├── transversal/
│   │   │   └── TransversalView.tsx
│   │   ├── admin/
│   │   │   ├── AdminPage.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── SeedButton.tsx
│   │   └── ui/
│   │       ├── ProgressBar.tsx
│   │       ├── ConfirmModal.tsx
│   │       ├── Tooltip.tsx
│   │       └── Badge.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRealtime.ts
│   │   ├── useTasks.ts
│   │   └── useWorkspaces.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── workspaceStore.ts
│   │   └── filterStore.ts
│   ├── lib/
│   │   ├── supabase.ts              # Client Supabase
│   │   ├── types.ts                 # Types TypeScript
│   │   └── utils.ts                 # Helpers (dates, statuts, couleurs)
│   ├── data/
│   │   └── seed.ts                  # Données initiales pour le seeding
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                    # Tailwind imports + CSS custom
├── .env                             # Variables Supabase (dans .gitignore)
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── LogoCEMEDISV4.png                # Fichier source logo (déjà présent)
├── cemedis-app-v3 (2).jsx           # Fichier source référence (déjà présent)
└── README.md
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
});
```

### GitHub Actions deploy.yml (OBLIGATOIRE)

**Le déploiement se fait EXCLUSIVEMENT via GitHub Actions.** Pas de déploiement manuel. Chaque push sur `main` déclenche automatiquement le build + deploy sur GitHub Pages.

Créer le fichier `.github/workflows/deploy.yml` :

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

> ⚠️ **Prérequis GitHub** : Dans le repo Settings > Pages > Source, sélectionner "GitHub Actions" (pas "Deploy from a branch").

### Première étape au setup du projet

Claude Code doit exécuter dans l'ordre :
1. `cp LogoCEMEDISV4.png public/logo-cemedis.png` (copier le logo dans public)
2. Initialiser le projet Vite + React + TS (`npm create vite@latest . -- --template react-ts` ou setup manuel)
3. Installer les dépendances
4. Créer `.github/workflows/deploy.yml`
5. Créer `public/CNAME` avec `notion.cemedis.app`
6. Créer `.env` avec les variables Supabase
7. Ajouter `.env` au `.gitignore`

### Variables d'environnement

Créer un `.env` local (et ajouter au `.gitignore`) :

```
VITE_SUPABASE_URL=https://jcppaboawmgizafhused.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcHBhYm9hd21naXphZmh1c2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjEyODcsImV4cCI6MjA4Njg5NzI4N30.Lr_8C8xQc99pBT-NNsvBaiY_tzXQK1mkPJ9G6BAABg0
```

**IMPORTANT** : Cette anon key est la clé publique Supabase (safe côté client, protégée par RLS). La mettre aussi dans GitHub repo > Settings > Secrets > Actions :
- `VITE_SUPABASE_URL` = `https://jcppaboawmgizafhused.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (la clé ci-dessus)

### CNAME pour GitHub Pages

Fichier `public/CNAME` :
```
notion.cemedis.app
```

DNS à configurer chez le registrar :
```
CNAME  notion  benjaminillouz.github.io.
```

---

## 🧩 Supabase Client (src/lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 📦 Dépendances npm

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "@supabase/supabase-js": "^2.47.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.460.0",
    "date-fns": "^4.1.0",
    "date-fns/locale/fr": "*",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^6.0.0"
  }
}
```

---

## 🔑 Types TypeScript (src/lib/types.ts)

```typescript
export type UserRole = 'superadmin' | 'admin' | 'member';
export type TaskStatus = 'a_faire' | 'en_cours' | 'fait';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  color: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_template: boolean;
  source_template_id: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  category_id: string;
  parent_task_id: string | null;
  label: string;
  status: TaskStatus;
  date_start: string | null;
  deadline: string | null;
  note: string | null;
  recurrence: TaskRecurrence;
  recurrence_hint: string | null;
  sort_order: number;
  depth: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  validated: boolean;
  validated_at: string | null;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWithProgress extends Task {
  workspace_id: string;
  category_name: string;
  workspace_name: string;
  assignees: {
    user_id: string;
    name: string;
    initials: string;
    color: string;
    validated: boolean;
  }[];
  assignee_count: number;
  validated_count: number;
  comment_count: number;
  subtask_count: number;
  subtask_done_count: number;
}
```

---

## ⚠️ Points d'attention

### Performance
- Utiliser la vue `tasks_with_progress` pour les lectures (évite N+1)
- Paginer l'activity_log (50 dernières entrées)
- Les subscriptions Realtime doivent être filtrées par workspace actif
- Ne pas re-fetch tout à chaque changement Realtime — appliquer le diff localement

### Sécurité
- Ne jamais exposer la `service_role` key côté client — uniquement `anon` key
- Le RLS est actif sur toutes les tables
- Les triggers de recomputation sont `SECURITY DEFINER` — ils s'exécutent avec les droits du créateur, pas de l'appelant
- Valider côté frontend que l'utilisateur a le bon rôle avant d'afficher les boutons admin

### UX
- Toutes les dates en format français (`dd MMM`, `dd/MM/yyyy`)
- Locale `fr` pour date-fns
- Les tâches en retard doivent être visuellement flaggées (🔴)
- Les tâches dont la deadline est dans ≤ 3 jours : 🟠
- Le dark mode doit être cohérent partout
- Le Gantt doit être fluide (requestAnimationFrame pour le drag)
- Optimistic updates pour les changements de statut (mettre à jour le UI avant la réponse serveur)

### SPA Routing sur GitHub Pages
GitHub Pages ne supporte pas le routing côté serveur. Solution :
- Créer un fichier `public/404.html` qui redirige vers `index.html` avec les query params
- Ou utiliser HashRouter au lieu de BrowserRouter

```typescript
// Option recommandée : HashRouter
import { HashRouter } from 'react-router-dom';
```

---

## 🚀 Étapes de développement (ordre recommandé)

1. **Setup projet** : Cloner le repo, initialiser Vite + React + TS + Tailwind, copier `LogoCEMEDISV4.png` → `public/logo-cemedis.png`, créer `.github/workflows/deploy.yml`, créer `public/CNAME`, créer `.env`
2. **Auth** : Login Google via Supabase, AuthProvider, route guard
3. **Layout** : Header + Sidebar + routing (HashRouter)
4. **Store Zustand** : workspaces, tasks, users, filters
5. **Vue Tâches** : CRUD complet, sous-tâches, commentaires, validations
6. **Realtime** : subscriptions Supabase sur les tables clés
7. **Vue Calendrier** : calendrier mensuel avec tâches
8. **Vue Gantt** : diagramme interactif avec drag
9. **Vue Transversale** : tableau croisé + matrice + retards
10. **Admin** : gestion users + seeding des données initiales
11. **Dark mode** : toggle + persistence localStorage
12. **Polish** : animations, responsive, edge cases
13. **Commit + Push** : le déploiement sur GitHub Pages se déclenche automatiquement via GitHub Actions à chaque push sur `main`

> **Rappel** : Le déploiement est 100% automatisé via GitHub Actions. Il n'y a rien à faire manuellement pour déployer — juste push sur `main`.

---

## 📝 Notes finales

- **Le fichier source `cemedis-app-v3 (2).jsx` est fourni à la racine du repo comme référence.** Il contient toute la logique métier, les données initiales (objet `INIT` lignes 79-353), et les composants UI de l'app originale. Claude Code doit le lire en détail pour reproduire fidèlement le comportement de chaque vue, les interactions et les calculs.
- Le fichier `LogoCEMEDISV4.png` est fourni à la racine du repo. Au setup, le copier dans `public/logo-cemedis.png`. L'intégrer selon les instructions de la section 🖼️ Logo CEMEDIS.
- Le projet Supabase `jcppaboawmgizafhused` était précédemment utilisé pour l'app M&A. Toutes les anciennes tables ont été supprimées et le nouveau schéma est déjà en place.
- Les 6 storage buckets `ma-*` existent encore mais sont vides — ils peuvent être ignorés ou supprimés via le Dashboard Supabase.
- Le domaine `notion.cemedis.app` doit être configuré comme CNAME vers `benjaminillouz.github.io` chez le registrar DNS.

## 📎 Fichier source de référence

Le fichier `cemedis-app-v3 (2).jsx` (1746 lignes) à la racine du repo contient :
- **Lignes 53-61** : Définition des utilisateurs avec noms, initiales, couleurs, rôles
- **Lignes 79-353** : Objet `INIT` complet avec tous les workspaces, catégories et tâches (incluant labels, assignees, statuts, deadlines, notes, récurrences). **C'est la source de vérité pour le seeding.**
- **Lignes 355-431** : Logique de `buildTabs()` avec le système delta/patch (ne pas reproduire, remplacé par Supabase)
- **Lignes 433-480** : Composants réutilisables (Avatar, ProgBar, StatusPill, ConfirmModal, LoginScreen)
- **Lignes 483-537** : CalendarView complète
- **Lignes 539-592** : TransversalView complète (3 sections : avancement, matrice, retards)
- **Lignes 594-745** : GanttView complète (drag, zoom, tooltips, popovers)
- **Lignes 748-804** : Modals d'édition et d'ajout de tâche
- **Lignes 806-1200** : TaskListView avec sous-tâches, commentaires, validations
- **Lignes 1202-1300** : Sidebar complète
- **Lignes 1300-1746** : App principale (state management, handlers, rendering)

**Claude Code doit lire ce fichier au démarrage** pour comprendre chaque fonctionnalité à reproduire. Les données de seed doivent être extraites de l'objet `INIT` dans ce fichier.
