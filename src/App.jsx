import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function App() {
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // États pour le formulaire
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [tagsInput, setTagsInput] = useState('');

  // L'URL de ton API Render
  const API_URL = 'https://api-finance-pwa.onrender.com/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const txRes = await axios.get(`${API_URL}/transactions`);
      setTransactions(txRes.data);
      
      const ptRes = await axios.get(`${API_URL}/portfolio`);
      setPortfolioValue(ptRes.data.totalValueEUR);
    } catch (err) {
      console.error("Erreur de chargement des données", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Nettoyage et création du tableau de tags
    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    try {
      await axios.post(`${API_URL}/transactions`, {
        title,
        amount: Number(amount),
        type,
        tags: tagsArray,
        currency: 'XOF'
      });
      
      // Réinitialisation du formulaire
      setTitle('');
      setAmount('');
      setTagsInput('');
      fetchData(); // Recharge les données instantanément
    } catch (err) {
      console.error("Erreur lors de l'ajout", err);
    }
  };

  // --- CALCULS DYNAMIQUES ---

  // 1. Épargne BOA globale
  const boaSavings = transactions
    .filter(t => t.type === 'SAVINGS_BOA')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // 2. Dettes globales
  const totalDebts = transactions
    .filter(t => t.type === 'DEBT')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // 3. Répartition des dépenses par tags (BarChart)
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

  // 4. Évolution temporelle (LineChart) regroupée par mois
  const evolutionMap = transactions.reduce((acc, curr) => {
    const date = new Date(curr.date);
    const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    if (!acc[month]) {
      acc[month] = { month, depenses: 0, epargne: 0 };
    }
    if (curr.type === 'EXPENSE') acc[month].depenses += curr.amount;
    if (curr.type === 'SAVINGS_BOA') acc[month].epargne += curr.amount;
    
    return acc;
  }, {});
  
  // Inverser l'ordre pour avoir le rendu chronologique sur le graphique
  const evolutionData = Object.values(evolutionMap).reverse();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Mon Bilan Financier</h1>
        <p className="text-gray-400">Suivi temps réel & Discipline</p>
      </header>

      {/* 3 CARTES DE RÉSUMÉ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-sm text-gray-400 mb-1">Portefeuille XTB (EUR)</h2>
          <p className="text-3xl font-bold text-green-400">
            {portfolioValue > 0 ? `${portfolioValue.toFixed(2)} €` : '0.00 €'}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-sm text-gray-400 mb-1">Épargne BOA (XOF)</h2>
          <p className="text-3xl font-bold text-blue-400">{boaSavings.toLocaleString()} XOF</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-sm text-gray-400 mb-1">Dettes en cours (XOF)</h2>
          <p className="text-3xl font-bold text-red-500">{totalDebts.toLocaleString()} XOF</p>
        </div>
      </div>

      {/* FORMULAIRE D'AJOUT */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Ajouter une transaction</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Titre</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Restaurant, Prêt..." className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500" />
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-400 mb-1">Montant</label>
            <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500" />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500">
              <option value="EXPENSE">Dépense</option>
              <option value="INCOME">Revenu</option>
              <option value="SAVINGS_BOA">Épargne BOA</option>
              <option value="DEBT">Dette</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Tags (séparés par une virgule)</label>
            <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Sortie, Nourriture..." className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded transition-colors">
            Ajouter
          </button>
        </form>
      </div>

      {/* GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Courbe Dépenses vs Épargne */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-96">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Évolution Dépenses vs Épargne</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData.length > 0 ? evolutionData : [{ month: 'Mois', depenses: 0, epargne: 0 }]}>
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