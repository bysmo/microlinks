import React from 'react';

const STATUS_CONFIGS = {
  // Operations
  BROUILLON: { label: 'Brouillon', className: 'badge-brouillon' },
  SOUMIS: { label: 'Soumis', className: 'badge-soumis' },
  ACCEPTE_EMETTEUR: { label: 'Accepté Émetteur', className: 'badge-accepte' },
  REJETE_EMETTEUR: { label: 'Rejeté Émetteur', className: 'badge-rejete' },
  ACCEPTE_BANQUE_EMETTRICE: { label: 'Accepté Banque ÉM.', className: 'badge-accepte' },
  REJETE_BANQUE_EMETTRICE: { label: 'Rejeté Banque ÉM.', className: 'badge-rejete' },
  ACCEPTE_BANQUE_RECEPTRICE: { label: 'Accepté Banque RÉC.', className: 'badge-accepte' },
  REJETE_BANQUE_RECEPTRICE: { label: 'Rejeté Banque RÉC.', className: 'badge-rejete' },
  ACCEPTE_BENEFICIAIRE: { label: 'Accepté Bénéficiaire', className: 'badge-accepte' },
  COMPTABILISE: { label: 'Comptabilisé ✓', className: 'badge-comptabilise' },
  REJETE: { label: 'Rejeté', className: 'badge-rejete' },
  ANNULE: { label: 'Annulé', className: 'badge-annule' },

  // Institutions
  ACTIF: { label: 'Actif', className: 'badge-comptabilise' },
  INACTIF: { label: 'Inactif', className: 'badge-annule' },
  SUSPENDU: { label: 'Suspendu', className: 'badge-rejete' },

  // Types opérations
  VIREMENT: { label: '⇄ Virement', className: 'badge-virement' },
  CHEQUE: { label: '⎗ Chèque', className: 'badge-cheque' },
  PRELEVEMENT: { label: '↙ Prélèvement', className: 'badge-prelevement' },

  // Types institutions
  BANQUE: { label: '🏦 Banque', className: 'badge-virement' },
  MICRO_FINANCE: { label: '🏠 Micro-Finance', className: 'badge-cheque' },
  MESO_FINANCE: { label: '🏗 Méso-Finance', className: 'badge-prelevement' },
  COOPERATIVE_EPARGNE_CREDIT: { label: '🤝 Coopérative', className: 'badge-annule' },
  MUTUELLE_EPARGNE_CREDIT: { label: '🤲 Mutuelle', className: 'badge-annule' },
};

export default function StatusBadge({ status, customLabel }) {
  const config = STATUS_CONFIGS[status] || { label: status || '—', className: 'badge-annule' };

  return (
    <span className={`badge ${config.className}`}>
      {customLabel || config.label}
    </span>
  );
}
