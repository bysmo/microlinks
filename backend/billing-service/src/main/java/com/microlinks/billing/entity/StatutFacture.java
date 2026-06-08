package com.microlinks.billing.entity;

public enum StatutFacture {
    BROUILLON,   // générée mais non émise
    EMISE,       // transmise à l'institution
    PAYEE,       // réglée
    EN_RETARD,   // échéance dépassée
    ANNULEE
}
