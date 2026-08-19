import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function App() {
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Récupération des données au montage du composant
    axios.get('https://api-finance-pwa.onrender.com/api/portfolio')
      .then(res => setPortfolioValue(res.data.totalValueEUR))
      .catch(err => console.error(err));

    axios.get('https://api-finance-pwa.onrender.com/api/transactions')
      .then(res => setTransactions(res.data))
      .catch(err => console.error(err));
  }, []);

  // --- TRAITEMENT DES DONNÉES POUR LES GRAPHIQUES ---
  
  // 1. Données fictives/calculées pour la courbe Dépenses vs Épargne/Investissement
  const evolutionData = [
    { month: 'Jan', depenses: 150000, epargne: 50000 },
    { month: 'Fev', depenses: 200000, epargne: 60000 },
    { month: 'Mar', depenses: 120000, epargne: 150000 },
  ];

  // 2. Calcul des dépenses par Tag
  const expensesByTag = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, curr) => {
      curr.tags.forEach(tag => {
        const existing = acc.find(item => item.name === tag);
        if (existing) existing.total += curr.amount;
        else acc.push({ name: tag, total: curr.amount });
      });
      return acc;
    }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Mon Bilan Financier</h1>
        <p className="text-gray-400">Suivi temps réel XTB & BOA</p>
      </header>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-sm text-gray-400 mb-1">Portefeuille XTB (EUR)</h2>
          <p className="text-3xl font-bold text-green-400">
            {portfolioValue > 0 ? `${portfolioValue.toFixed(2)} €` : 'Chargement...'}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-sm text-gray-400 mb-1">Épargne BOA (XOF)</h2>
          <p className="text-3xl font-bold text-blue-400">1 250 000 XOF</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Courbe Dépenses vs Épargne */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-96">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Évolution Dépenses vs Épargne</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="depenses" stroke="#EF4444" strokeWidth={3} name="Dépenses" />
              <Line type="monotone" dataKey="epargne" stroke="#3B82F6" strokeWidth={3} name="Épargne" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des dépenses par Tags */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-96">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Dépenses par Tags</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expensesByTag.length > 0 ? expensesByTag : [{name: 'Aucune donnée', total: 0}]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
              <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Montant (XOF)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

export default App;