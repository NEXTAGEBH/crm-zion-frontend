"use client";

import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Dados fictícios para os gráficos
const dadosLeads = [
  { name: 'Seg', leads: 12, clientes: 2 },
  { name: 'Ter', leads: 18, clientes: 3 },
  { name: 'Qua', leads: 15, clientes: 1 },
  { name: 'Qui', leads: 25, clientes: 5 },
  { name: 'Sex', leads: 22, clientes: 4 },
  { name: 'Sáb', leads: 8, clientes: 1 },
];

const dadosOrigem = [
  { name: 'Meta Ads', value: 65 },
  { name: 'Google Ads', value: 20 },
  { name: 'Instagram', value: 10 },
  { name: 'Indicação', value: 5 },
];

export default function RelatoriosPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
        <p className="text-slate-500 text-sm mt-1">Análise de performance comercial e ROI das campanhas.</p>
      </div>

      {/* Cards de KPI - Foco em Tráfego Pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Custo por Lead (CPL)', value: 'R$ 18,50', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Taxa de Conversão', value: '22%', icon: Percent, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'ROI Estimado', value: '340%', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          { title: 'Ticket Médio', value: 'R$ 450', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <card.icon size={24} className={card.color} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{card.title}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Linha: Leads vs Clientes */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Leads vs Clientes (Últimos 7 dias)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosLeads}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="clientes" name="Clientes" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras: Origem dos Leads */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Origem dos Leads (%)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosOrigem} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Porcentagem" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}