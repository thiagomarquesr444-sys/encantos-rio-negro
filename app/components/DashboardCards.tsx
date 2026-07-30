export default function DashboardCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">

      <div className="bg-white border-l-4 border-emerald-600 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold">👥 Clientes</h2>
        <p className="text-3xl font-bold mt-2">128</p>
      </div>

      <div className="bg-white border-l-4 border-blue-600 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold">🛶 Passeios</h2>
        <p className="text-3xl font-bold mt-2">18</p>
      </div>

      <div className="bg-white border-l-4 border-yellow-500 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold">📄 Vouchers</h2>
        <p className="text-3xl font-bold mt-2">56</p>
      </div>

      <div className="bg-white border-l-4 border-green-600 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold">💰 Faturamento</h2>
        <p className="text-3xl font-bold mt-2">R$ 12.450</p>
      </div>

      <div className="bg-white border-l-4 border-red-500 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold">🔔 Notificações</h2>
        <p className="text-3xl font-bold mt-2">4</p>
      </div>

      <div className="bg-white border-l-4 border-purple-600 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold">⭐ Avaliação</h2>
        <p className="text-3xl font-bold mt-2">4.9</p>
      </div>

    </div>
  );
}