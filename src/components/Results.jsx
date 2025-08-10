import React from "react";

const Results = ({ results }) => {
  console.log("results", results);
  const days = ["seg", "ter", "qua", "qui", "sex"]; // 5 dias úteis
  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-green-700 mb-4">
        Resultados da Otimização - Produção Semanal
      </h2>

      {/* Lucro total semanal */}
      <div className="mb-6">
        <div className="text-center bg-green-100 py-4 rounded-lg">
          <p className="text-lg text-gray-700">Lucro Total da Semana</p>
          <p className="text-3xl font-bold text-green-700 mt-2">
            R$ {results.profit.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabela de produção por dia */}
      <h3 className="text-xl font-bold text-gray-700 mb-3">
        Produção Recomendada por Dia
      </h3>
      <table className="min-w-full divide-y divide-gray-200 mb-6">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Produto
            </th>
            {days.map((day, i) => (
              <th
                key={i}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {day}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Semanal
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.production.map((prod, index) => {
            const total = prod.daily.reduce((sum, val) => sum + val, 0);
            return (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">{prod.name}</td>
                {prod.daily.map((qty, d) => (
                  <td
                    key={d}
                    className="px-6 py-4 whitespace-nowrap text-gray-700"
                  >
                    {qty.toFixed(0)} un.
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                  {total.toFixed(0)} un.
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Results;
