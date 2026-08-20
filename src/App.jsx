import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'budgets', 'history'
  
  const [portfolioData, setPortfolioData] = useState({ totalValueUSD: 0, totalInvestedUSD: 0 }); 
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [displayCurrency, setDisplayCurrency] = useState('XOF'); 

  // États Formulaires
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [tagsInput, setTagsInput] = useState('');
  const [xtbAmount, setXtbAmount] = useState('');
  
  const [budgetTag, setBudgetTag] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');

  // État pour la recherche/analyse
  const [searchTerm, setSearchTerm] = useState('');

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
      const bgRes = await axios.get(`${API_URL}/budgets`);
      setBudgets(bgRes.data);
    } catch (err) { console.error("Erreur", err); }
  };

  // --- ACTIONS ---
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    try {
      await axios.post(`${API_URL}/transactions`, { title, amount: Number(amount), type, tags: tagsArray, currency: 'XOF' });
      setTitle(''); setAmount(''); setTagsInput(''); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteTransaction = async (id) => {
    if(window.confirm('Supprimer définitivement cette transaction ?')) {
      await axios.delete(`${API_URL}/transactions/${id}`);
      fetchData();
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/budgets`, { tag: budgetTag.trim(), monthlyLimit: Number(budgetLimit) });
      setBudgetTag(''); setBudgetLimit(''); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteBudget = async (id) => {
    if(window.confirm('Supprimer cette enveloppe ?')) {
      await axios.delete(`${API_URL}/budgets/${id}`);
      fetchData();
    }
  };

  const handleXtbInvest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/portfolio/invest`, { amountUSD: Number(xtbAmount) });
      setXtbAmount(''); fetchData();
    } catch (err) { console.error(err); }
  };

  // --- CORRECTION : Initialisation avec les vraies données des captures d'écran ---
  const handleInitializeXtb = async () => {
    if(window.confirm("Synchroniser avec l'historique exact de tes ETF UCITS ?")) {
      try {
        await axios.post(`${API_URL}/portfolio/invest`, {
          reset: true,
          customPortfolio: [
            { ticker: 'CNDX.L', shares: 0.0103, investedAmount: 15.63 },
            { ticker: 'IWDA.L', shares: 0.116, investedAmount: 15.65 },
            { ticker: 'CSPX.L', shares: 0.0207, investedAmount: 15.65 }
          ]
        });
        fetchData();
      } catch (err) { console.error(err); }
    }
  };

  // --- CONVERSION ---
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

  // --- CALCULS DONNÉES ---
  const displayPortfolioValue = convertAmount(portfolioData.totalValueUSD, 'USD');
  const displayPortfolioInvested = convertAmount(portfolioData.totalInvestedUSD, 'USD');
  const profitAmount = displayPortfolioValue - displayPortfolioInvested;
  const profitPercent = portfolioData.totalInvestedUSD > 0 
    ? ((portfolioData.totalValueUSD - portfolioData.totalInvestedUSD) / portfolioData.totalInvestedUSD) * 100 
    : 0;
  
  const boaSavings = transactions.filter(t => t.type === 'SAVINGS_BOA').reduce((acc, curr) => acc + convertAmount(curr.amount, curr.currency || 'XOF'), 0);
  const debts = transactions.filter(t => t.type === 'DEBT').reduce((acc, curr) => acc + convertAmount(curr.amount, curr.currency || 'XOF'), 0);

  // Moteur Intelligent de Budgets
  const calculateBudgetProgress = (budget) => {
    const startDate = new Date(budget.createdAt);
    const now = new Date();
    let monthsActive = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
    if (monthsActive < 1) monthsActive = 1;

    const totalAllowed = budget.monthlyLimit * monthsActive; 
    const totalSpent = transactions
      .filter(t => t.type === 'EXPENSE' && t.tags.includes(budget.tag))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const remaining = totalAllowed - totalSpent;
    const percentUsed = Math.min((totalSpent / totalAllowed) * 100, 100);

    return { totalAllowed, totalSpent, remaining, percentUsed };
  };

  // Données Graphiques
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

  // Filtrage Historique
  const filteredTransactions = transactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(searchLower);
    const tagMatch = t.tags.some(tag => tag.toLowerCase().includes(searchLower));
    return titleMatch || tagMatch;
  });
  const filteredTotalExpense = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + convertAmount(curr.amount, curr.currency || 'XOF'), 0);

  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-8 font-sans pb-32 md:pb-40">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-6 flex flex-row justify-between items-center gap-2">
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Bilan Financier</h1>
          </div>
          <div className="bg-[#111] p-1.5 md:p-2 rounded-xl border border-neutral-800 flex items-center">
            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-transparent text-white text-sm outline-none cursor-pointer font-bold appearance-none px-2">
              <option value="XOF">XOF</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </header>

        {/* --- ONGLET 1 : TABLEAU DE BORD --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-fadeIn">
            {/* Cartes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <div>
                  <h2 className="text-xs md:text-sm text-neutral-400 mb-1">Portefeuille XTB</h2>
                  <p className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(displayPortfolioValue)}</p>
                  {portfolioData.totalInvestedUSD > 0 && (
                    <p className={`text-xs md:text-sm font-semibold mt-1 ${profitAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Profit: {profitAmount >= 0 ? '+' : ''}{formatCurrency(profitAmount)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-800 flex justify-between text-[10px] md:text-xs text-neutral-400">
                  <span>Investi: <span className="text-white font-medium">{formatCurrency(displayPortfolioInvested)}</span></span>
                </div>
              </div>
              <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-neutral-800">
                <h2 className="text-xs md:text-sm text-neutral-400 mb-1">Épargne BOA</h2>
                <p className="text-2xl md:text-3xl font-bold text-blue-500">{formatCurrency(boaSavings)}</p>
              </div>
              <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-neutral-800">
                <h2 className="text-xs md:text-sm text-neutral-400 mb-1">Dettes</h2>
                <p className="text-2xl md:text-3xl font-bold text-red-500">{formatCurrency(debts)}</p>
              </div>
            </div>

            {/* Formulaires d'ajout */}
            <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-neutral-800 mb-6">
              <h3 className="text-base font-semibold mb-4 text-white">Ajouter (en XOF)</h3>
              <form onSubmit={handleTransactionSubmit} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end mb-6">
                <div className="col-span-2 md:col-span-3">
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (Ex: Salaire, Uber...)" className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-sm text-white outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant" className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-sm text-white outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-sm text-white outline-none">
                    <option value="EXPENSE">Dépense</option>
                    <option value="INCOME">Revenu</option>
                    <option value="SAVINGS_BOA">BOA</option>
                    <option value="DEBT">Dette</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags : Optionnel, Loyer..." className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-sm text-white outline-none" />
                </div>
                <div className="col-span-2 md:col-span-2 mt-1">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm">Ajouter</button>
                </div>
              </form>

              <div className="pt-5 border-t border-neutral-800">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm md:text-md font-semibold text-neutral-300">Dépôt XTB</h3>
                  <button onClick={handleInitializeXtb} type="button" className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 py-1 px-2 rounded border border-neutral-700">
                    Init capture
                  </button>
                </div>
                <form onSubmit={handleXtbInvest} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                  <div className="col-span-2 md:col-span-9">
                    <input type="number" step="0.01" required value={xtbAmount} onChange={(e) => setXtbAmount(e.target.value)} placeholder="Montant déposé (USD)" className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-sm text-white outline-none" />
                  </div>
                  <div className="col-span-2 md:col-span-3 mt-1">
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm">Répartir (33%)</button>
                  </div>
                </form>
              </div>
            </div>

            {/* GRAPHIQUES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-neutral-800 h-64 md:h-96">
                <h3 className="text-sm md:text-lg font-semibold mb-4 text-white">Dépenses vs Épargne ({displayCurrency})</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData.length > 0 ? evolutionData : [{ month: 'Mois', depenses: 0, epargne: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" stroke="#737373" tick={{fontSize: 12}} />
                    <YAxis stroke="#737373" tick={{fontSize: 12}} tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{fontSize: '12px'}} />
                    <Line type="monotone" dataKey="depenses" stroke="#EF4444" strokeWidth={2} name="Dépenses" />
                    <Line type="monotone" dataKey="epargne" stroke="#3B82F6" strokeWidth={2} name="Épargne" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-neutral-800 h-64 md:h-96">
                <h3 className="text-sm md:text-lg font-semibold mb-4 text-white">Dépenses par Tags ({displayCurrency})</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByTag.length > 0 ? expensesByTag : [{name: 'Aucun', total: 0}]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#737373" tick={{fontSize: 12}} />
                    <YAxis stroke="#737373" tick={{fontSize: 12}} tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: "compact" }).format(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: '#222'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                    <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Montant" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET 2 : BUDGETS (ENVELOPPES) --- */}
        {activeTab === 'budgets' && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold mb-4">Mes Enveloppes (en XOF)</h2>
            <form onSubmit={handleBudgetSubmit} className="bg-[#111] p-4 rounded-xl border border-neutral-800 flex gap-2 mb-6">
              <input type="text" required value={budgetTag} onChange={(e) => setBudgetTag(e.target.value)} placeholder="Tag (ex: Logement)" className="flex-1 bg-black border border-neutral-700 rounded-lg p-2 text-sm text-white outline-none" />
              <input type="number" required value={budgetLimit} onChange={(e) => setBudgetLimit(e.target.value)} placeholder="Limite/mois" className="w-1/3 bg-black border border-neutral-700 rounded-lg p-2 text-sm text-white outline-none" />
              <button type="submit" className="bg-blue-600 px-3 rounded-lg text-white font-bold">+</button>
            </form>

            <div className="grid grid-cols-1 gap-4">
              {budgets.map(budget => {
                const { remaining, percentUsed } = calculateBudgetProgress(budget);
                const isOver = remaining < 0;
                return (
                  <div key={budget._id} className="bg-[#111] p-4 rounded-xl border border-neutral-800 relative">
                    <button onClick={() => handleDeleteBudget(budget._id)} className="absolute top-3 right-4 text-neutral-500 hover:text-red-500 text-sm">✕</button>
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="font-semibold text-white">{budget.tag}</h3>
                      <p className={`text-sm font-bold ${isOver ? 'text-red-500' : 'text-green-400'}`}>
                        {isOver ? 'Dépassé de ' : 'Reste '}
                        {Math.abs(remaining).toLocaleString()} XOF
                      </p>
                    </div>
                    <div className="w-full bg-black rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${isOver ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percentUsed}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- ONGLET 3 : HISTORIQUE ET ANALYSE --- */}
        {activeTab === 'history' && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold mb-4">Analyse des transactions</h2>
            
            <div className="bg-[#111] p-4 rounded-xl border border-neutral-800 mb-6">
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="🔍 Chercher (ex: Optionnel, Sortie...)" 
                className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-sm text-white outline-none mb-3" 
              />
              {searchTerm && (
                <div className="flex justify-between items-center text-sm border-t border-neutral-800 pt-3">
                  <span className="text-neutral-400">Total dépensé sur cette recherche :</span>
                  <span className="font-bold text-red-500">{formatCurrency(filteredTotalExpense)}</span>
                </div>
              )}
            </div>

            <div className="bg-[#111] rounded-xl border border-neutral-800 overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">Aucune transaction trouvée.</p>
              ) : (
                filteredTransactions.map(t => (
                  <div key={t._id} className="p-4 border-b border-neutral-800 flex justify-between items-center last:border-b-0">
                    <div>
                      <h3 className="font-semibold text-sm text-white">{t.title}</h3>
                      <p className="text-xs text-neutral-500">
                        {new Date(t.date).toLocaleDateString('fr-FR')} • {t.tags.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`text-sm font-bold ${
                        t.type === 'EXPENSE' ? 'text-white' : 
                        t.type === 'INCOME' ? 'text-green-500' :
                        t.type === 'DEBT' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {t.type === 'EXPENSE' ? '-' : '+'}{t.amount.toLocaleString()} {t.currency}
                      </p>
                      <button onClick={() => handleDeleteTransaction(t._id)} className="text-neutral-500 hover:text-red-500 text-xl">🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
      </div>

      {/* --- BARRE DE NAVIGATION MOBILE --- */}
      <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-neutral-800 flex justify-around p-3 z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-lg w-1/3 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-neutral-500'}`}>
          <span className="text-xl mb-1">📊</span>
          <span className="text-[10px] font-bold">Bilan</span>
        </button>
        <button onClick={() => setActiveTab('budgets')} className={`flex flex-col items-center p-2 rounded-lg w-1/3 ${activeTab === 'budgets' ? 'text-blue-500' : 'text-neutral-500'}`}>
          <span className="text-xl mb-1">💰</span>
          <span className="text-[10px] font-bold">Budgets</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 rounded-lg w-1/3 ${activeTab === 'history' ? 'text-blue-500' : 'text-neutral-500'}`}>
          <span className="text-xl mb-1">📜</span>
          <span className="text-[10px] font-bold">Analyse</span>
        </button>
      </div>

    </div>
  );
}

export default App;