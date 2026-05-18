export const fr = {
  app: {
    name: 'Portail Client'
  },
  nav: {
    dashboard: 'Tableau de bord',
    store: 'Catalogue',
    orders: 'Mes commandes',
    invoices: 'Mes factures',
    reminders: 'Relances',
    history: 'Historique'
  },
  actions: {
    addToCart: 'Ajouter au panier',
    checkout: 'Valider la commande',
    downloadPdf: 'Telecharger PDF',
    exportCsv: 'Export CSV',
    reset: 'Reinitialiser'
  },
  status: {
    paid: 'Payee',
    pending: 'En attente',
    overdue: 'En retard',
    draft: 'Brouillon'
  }
} as const;

type DotPrefix<TPrefix extends string, TKey extends string> = TPrefix extends ''
  ? TKey
  : `${TPrefix}.${TKey}`;

type TranslationKey<T, TPrefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? DotPrefix<TPrefix, K>
    : TranslationKey<T[K], DotPrefix<TPrefix, K>>;
}[keyof T & string];

export function t(key: TranslationKey<typeof fr>) {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return key;
  }, fr) as string;
}
