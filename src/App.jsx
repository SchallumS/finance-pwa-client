import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function App() {
  const [portfolioData, setPortfolioData] = useState({ totalValueUSD: 0, totalInvestedUSD: 0 }); 
  const [transactions, setTransactions] = useState([]);
  const [displayCurrency, setDisplayCurrency] = useState('XOF'); 

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [tagsInput, setTagsInput] = useState('');
  const [xtbAmount, setXtbAmount] = useState('');

  const API_URL = 'https://api-finance-pwa.onrender.com/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const txRes = await axios.get(`${API_URL}/transactions`);
      setTransactions(txRes.data);
      
      const ptRes = await axios.get(`${API_URL}/portfolio`);
      setPortfolioData(ptRes.data); 
    } catch (err) {
      console.error("Erreur de chargement", err);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    try {
      await axios.post(`${API_URL}/transactions`, { title, amount: Number(amount), type, tags: tagsArray, currency: 'XOF' });
      setTitle(''); setAmount(''); setTagsInput(''); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleXtbInvest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/portfolio/invest`, { amountUSD: Number(xtbAmount) });
      setXtbAmount(''); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleInitializeXtb = async () => {
    if(window.confirm("Cela va synchroniser le portefeuille avec les valeurs de la capture. Confirmer ?")) {
      try {
        await axios.post(`${API_URL}/portfolio/invest`, {
          reset: true,
          allocations: {
            'QQQ': 16.75, // Valeurs actuelles (pour le calcul des parts)
            'URTH': 16.46,
            'VOO': 16.51
          },
          initialInvested: {
            'QQQ': 15.06, // Capital de base exact
            'URTH': 15.08,
            'VOO': 15.08
          }
        });
        fetchData();
      } catch (err) { console.error(err); }
    }
  };

  // Moteur de conversion
  const EUR_TO_XOF = 655.95;
  const USD_TO_XOF = 605.00;
  const USD_TO_EUR = 0.92;

  const convertAmount = (amount, originalCurrency) => {
    if (!amount) return 0;
    if (originalCurrency === displayCurrency) return amount;
    if (displayCurrency === 'XOF') {
      if (originalCurrency === 'EUR') return amount * EUR_TO_XOF;
      if (originalCurrency === 'USD') return amount * USD_TO_XOF;
    }
    if (displayCurrency === 'EUR') {
      if (originalCurrency === 'XOF') return amount / EUR_TO_XOF;
      if (originalCurrency === 'USD') return amount * USD_TO_EUR;
    }
    return amount;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: displayCurrency, maximumFractionDigits: displayCurrency === 'XOF' ? 0 : 2
    }).format(amount);
  };

  // Calculs Portefeuille XTB
  const displayPortfolioValue = convertAmount(portfolioData.totalValueUSD, 'USD');
  const displayPortfolioInvested = convertAmount(portfolioData.totalInvestedUSD, 'USD');
  const profitAmount = displayPortfolioValue - displayPortfolioInvested;
  const profitPercent = portfolioData.totalInvestedUSD > 0 
    ? ((portfolioData.totalValueUSD - portfolioData.totalInvestedUSD) / portfolioData.totalInvestedUSD) * 100 
    : 0;

  // Calculs autres cartes
  const displayBoaSavings = transactions.filter(t => t.type === 'SAVINGS_BOA').reduce((acc, curr) => acc + convertAmount(curr.amount, curr.currency || 'XOF'), 0);
  const displayDebts = transactions.filter(t => t.type === 'DEBT').reduce((acc, curr) => acc + convertAmount(curr.amount, curr.currency || 'XOF'), 0);

  // Calculs Graphiques
  const expensesByTag = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => {
    const convertedAmount = convertAmount(curr.amount, curr.currency || 'XOF');
    curr.tags.forEach(tag => {
      const existing = acc.find(item => item.name === tag);
      if (existing) existing.total += convertedAmount;
      else acc.push({ name: tag, total: convertedAmount });
    });
    return acc;
  }, []);

  const evolutionMap = transactions.reduce((acc, curr) => {
    const date = new Date(curr.date);
    const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    const convertedAmount = convertAmount(curr.amount, curr.currency || 'XOF');
    if (!acc[month]) acc[month] = { month, depenses: 0, epargne: 0 };
    if (curr.type === 'EXPENSE') acc[month].depenses += convertedAmount;
    if (curr.type === 'SAVINGS_BOA') acc[month].epargne += convertedAmount;
    return acc;
  }, {});
  const evolutionData = Object.values(evolutionMap).reverse();

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mon Bilan Financier</h1>
            <p className="text-neutral-500 mt-1">Suivi temps réel & Discipline</p>
          </div>
          <div className="bg-[#111] p-2 rounded-xl border border-neutral-800 flex items-center gap-3">
            <span className="text-sm text-neutral-400 pl-2">Affichage :</span>
            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-black text-white px-3 py-1.5 rounded-lg outline-none border border-neutral-700 cursor-pointer font-bold">
              <option value="XOF">Franc CFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* NOUVELLE CARTE XTB AVEC PROFIT */}
          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
            <div>
              <h2 className="text-sm text-neutral-400 mb-1">Portefeuille XTB</h2>
              <p className="text-3xl font-bold text-white">{formatCurrency(displayPortfolioValue)}</p>
              
              {portfolioData.totalInvestedUSD > 0 && (
                <p className={`text-sm font-semibold mt-2 ${profitAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  Profit: {profitAmount >= 0 ? '+' : ''}{formatCurrency(profitAmount)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between text-xs text-neutral-400">
              <span>Investi: <span className="text-white font-medium">{formatCurrency(displayPortfolioInvested)}</span></span>
            </div>
          </div>

          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800">
            <h2 className="text-sm text-neutral-400 mb-2">Épargne BOA</h2>
            <p className="text-3xl font-bold text-blue-500">{formatCurrency(displayBoaSavings)}</p>
          </div>
          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800">
            <h2 className="text-sm text-neutral-400 mb-2">Dettes en cours</h2>
            <p className="text-3xl font-bold text-red-500">{formatCurrency(displayDebts)}</p>
          </div>
        </div>

        <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 mb-8">
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-6 text-white">Ajouter une transaction (en XOF)</h3>
            <form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-400 mb-2">Titre</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Restaurant..." className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-neutral-400 mb-2">Montant</label>
                <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-neutral-400 mb-2">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500">
                  <option value="EXPENSE">Dépense</option>
                  <option value="INCOME">Revenu</option>
                  <option value="SAVINGS_BOA">Épargne BOA</option>
                  <option value="DEBT">Dette</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-400 mb-2">Tags (séparés par virgule)</label>
                <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Sortie, Urgence..." className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500" />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">Ajouter</button>
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-neutral-300">Nouveau dépôt sur le plan XTB</h3>
              <button onClick={handleInitializeXtb} type="button" className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-400 py-1 px-3 rounded border border-neutral-700">
                Initialiser avec la capture
              </button>
            </div>
            
            <form onSubmit={handleXtbInvest} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-9">
                <label className="block text-xs text-neutral-400 mb-2">Montant global déposé ce mois-ci (USD)</label>
                <input type="number" step="0.01" required value={xtbAmount} onChange={(e) => setXtbAmount(e.target.value)} placeholder="Ex: 45.00" className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white outline-none focus:border-green-500" />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
                  Répartir (33% / ETF)
                </button>
              </div>
            </form>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 h-96">
            <h3 className="text-lg font-semibold mb-6 text-white">Évolution Dépenses vs Épargne ({displayCurrency})</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData.length > 0 ? evolutionData : [{ month: 'Mois', depenses: 0, epargne: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#737373" />
                <YAxis stroke="#737373" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(value)} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="depenses" stroke="#EF4444" strokeWidth={3} name="Dépenses" />
                <Line type="monotone" dataKey="epargne" stroke="#3B82F6" strokeWidth={3} name="Épargne" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 h-96">
            <h3 className="text-lg font-semibold mb-6 text-white">Dépenses par Tags ({displayCurrency})</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByTag.length > 0 ? expensesByTag : [{name: 'Aucune donnée', total: 0}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#737373" />
                <YAxis stroke="#737373" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(value)} />
                <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: '#222'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Montant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;