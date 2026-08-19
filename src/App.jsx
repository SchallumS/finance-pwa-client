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

  // N'oublie pas de remettre ton URL Render ici
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
    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    try {
      await axios.post(`${API_URL}/transactions`, {
        title,
        amount: Number(amount),
        type,
        tags: tagsArray,
        currency: 'XOF'
      });
      
      setTitle('');
      setAmount('');
      setTagsInput('');
      fetchData();
    } catch (err) {
      console.error("Erreur lors de l'ajout", err);
    }
  };

  // --- CALCULS DYNAMIQUES ---
  const boaSavings = transactions
    .filter(t => t.type === 'SAVINGS_BOA')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDebts = transactions
    .filter(t => t.type === 'DEBT')
    .reduce((acc, curr) => acc + curr.amount, 0);

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
  
  const evolutionData = Object.values(evolutionMap).reverse();

  // --- RENDU UI (Vrai Noir & Alignements corrigés) ---
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Mon Bilan Financier</h1>
          <p className="text-neutral-500 mt-1">Suivi temps réel & Discipline</p>
        </header>

        {/* CARTES DE RÉSUMÉ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800">
            <h2 className="text-sm text-neutral-400 mb-2">Portefeuille XTB (EUR)</h2>
            <p className="text-3xl font-bold text-green-500">
              {portfolioValue > 0 ? `${portfolioValue.toFixed(2)} €` : '0.00 €'}
            </p>
          </div>
          
          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800">
            <h2 className="text-sm text-neutral-400 mb-2">Épargne BOA (XOF)</h2>
            <p className="text-3xl font-bold text-blue-500">{boaSavings.toLocaleString()} XOF</p>
          </div>

          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800">
            <h2 className="text-sm text-neutral-400 mb-2">Dettes en cours (XOF)</h2>
            <p className="text-3xl font-bold text-red-500">{totalDebts.toLocaleString()} XOF</p>
          </div>
        </div>

        {/* FORMULAIRE D'AJOUT (Grille corrigée) */}
        <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 mb-8">
          <h3 className="text-lg font-semibold mb-6 text-white">Ajouter une transaction</h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-2">Titre</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Restaurant, Prêt..." 
                className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 placeholder-neutral-600" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-400 mb-2">Montant</label>
              <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" 
                className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 placeholder-neutral-600" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-400 mb-2">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} 
                className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500">
                <option value="EXPENSE">Dépense</option>
                <option value="INCOME">Revenu</option>
                <option value="SAVINGS_BOA">Épargne BOA</option>
                <option value="DEBT">Dette</option>
              </select>
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-2">Tags (séparés par une virgule)</label>
              <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Sortie, Urgence..." 
                className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 placeholder-neutral-600" />
            </div>
            
            <div className="md:col-span-2">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
                Ajouter
              </button>
            </div>

          </form>
        </div>

        {/* GRAPHIQUES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 h-96">
            <h3 className="text-lg font-semibold mb-6 text-white">Évolution Dépenses vs Épargne</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData.length > 0 ? evolutionData : [{ month: 'Mois', depenses: 0, epargne: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="depenses" stroke="#EF4444" strokeWidth={3} name="Dépenses" />
                <Line type="monotone" dataKey="epargne" stroke="#3B82F6" strokeWidth={3} name="Épargne" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 h-96">
            <h3 className="text-lg font-semibold mb-6 text-white">Dépenses par Tags</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByTag.length > 0 ? expensesByTag : [{name: 'Aucune donnée', total: 0}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip cursor={{fill: '#222'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} />
                <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Montant (XOF)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;