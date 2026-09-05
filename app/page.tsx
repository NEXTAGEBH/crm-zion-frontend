import { Users, MessageCircle, TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumo da sua operação comercial hoje.</p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Novos Contatos', value: '24', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Conversas Abertas', value: '18', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Conversão Funil', value: '32%', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          { title: 'Tempo de Resposta', value: '4m 12s', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* Espaço para os Gráficos */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Leads por Dia</h2>
        <div className="h-64 flex items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
          Os gráficos aparecerão aqui quando conectarmos o backend!
        </div>
      </div>
    </div>
  );
}