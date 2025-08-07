import React from 'react';

const Results = ({ results }) => {
  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Resultados da Otimização</h2>
      
      <div className="mb-6">
        <div className="text-center bg-green-100 py-4 rounded-lg">
          <p className="text-lg text-gray-700">Lucro Total Diário</p>
          <p className="text-3xl font-bold text-green-700 mt-2">R$ {results.profit.toFixed(2)}</p>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-700 mb-3">Produção Recomendada</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.production.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{item.quantity.toFixed(0)} unidades</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Results;