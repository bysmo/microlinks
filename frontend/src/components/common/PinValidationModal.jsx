import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { ShieldCheck, Lock } from 'lucide-react';

/**
 * Modal réutilisable demandant le code PIN de sécurité de l'utilisateur
 * avant de soumettre une transaction ou modification critique.
 */
export default function PinValidationModal({ isOpen, onClose, onConfirm, title = "Validation de Sécurité", message = "Veuillez saisir votre code PIN à 4 ou 6 chiffres pour valider cette opération financière." }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      // Auto-focus de l'input au chargement
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pin) {
      setError("Le code PIN est obligatoire.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setError("Le code PIN doit comporter entre 4 et 6 chiffres.");
      return;
    }
    setError('');
    onConfirm(pin);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 6) {
      setPin(value);
      setError('');
    }
  };

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
        id="btn-pin-cancel"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
        id="btn-pin-submit"
        disabled={pin.length < 4}
      >
        <ShieldCheck className="w-4 h-4" />
        Confirmer
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
      id="pin-validation"
    >
      <form onSubmit={handleSubmit} className="flex flex-col items-center py-4 px-2">
        <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 animate-pulse">
          <Lock className="w-8 h-8" />
        </div>

        <p className="text-sm text-slate-300 text-center mb-6 max-w-xs">
          {message}
        </p>

        <div className="w-full max-w-xs">
          <label htmlFor="security-pin-input" className="sr-only">Code PIN</label>
          <input
            ref={inputRef}
            id="security-pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={handlePinChange}
            autoComplete="off"
            className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 px-4 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-white outline-none transition-all shadow-inner placeholder:opacity-30 focus:shadow-emerald-950/20 focus:shadow-md"
          />

          {error && (
            <p className="text-xs text-rose-400 mt-3 text-center" id="pin-error-msg">
              {error}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
