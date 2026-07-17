import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

export default function OperationToast({ data, t, toast }) {
  return (
    <div
      className={`${
        t.visible ? 'animate-fade-in' : 'animate-fade-out'
      } max-w-sm w-full bg-dark-800 border border-primary-500/30 shadow-2xl rounded-lg pointer-events-auto flex overflow-hidden`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-9 w-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-xs font-semibold text-white uppercase tracking-wider">
              Mise à jour d'opération
            </p>
            <p className="text-sm font-bold text-primary-400 mt-0.5">
              Réf: {data.referenceUnique}
            </p>
            <p className="mt-1 text-xs text-dark-300">
              Statut: <span className="font-semibold text-white">{data.statutLabel || data.statut}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-white/5">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg px-4 py-2 flex items-center justify-center text-xs font-semibold text-primary-400 hover:text-primary-300 focus:outline-none hover:bg-white/5 active:bg-white/10"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
