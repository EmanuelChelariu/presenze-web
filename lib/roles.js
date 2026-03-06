// Costanti ruoli
export const ROLES = {
  ADMIN: "admin",
  UFFICIO: "ufficio",
  INSERIMENTO: "inserimento",
  OPERAIO: "operaio",
};

// Etichette per UI
export const ROLE_LABELS = {
  admin: "Amministratore",
  ufficio: "Ufficio",
  inserimento: "Inserimento Presenze",
  operaio: "Operaio",
};

// Colori badge
export const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  ufficio: "bg-blue-100 text-blue-700",
  inserimento: "bg-amber-100 text-amber-700",
  operaio: "bg-teal-100 text-teal-700",
};

// Opzioni per dropdown form
export const ROLE_OPTIONS = [
  { value: "admin", label: "Admin — Accesso completo a tutte le funzionalità" },
  { value: "ufficio", label: "Ufficio — Tutto tranne gestione utenti" },
  { value: "inserimento", label: "Inserimento — Presenze, rapportini, rimborsi" },
  { value: "operaio", label: "Operaio — Solo visualizzazione proprie presenze" },
];
