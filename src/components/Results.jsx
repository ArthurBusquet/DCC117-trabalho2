import React from "react";

// Definindo constantes de status manualmente
const GLPK_STATUS = {
  GLP_UNDEF: 1, // Solução indefinida
  GLP_FEAS: 2, // Solução viável
  GLP_INFEAS: 3, // Solução inviável
  GLP_NOFEAS: 4, // Sem solução viável (problema impossível)
  GLP_OPT: 5, // Solução ótima encontrada
  GLP_UNBND: 6, // Solução ilimitada
};

const Results = ({ results }) => {
  const days = ["seg", "ter", "qua", "qui", "sex"];

  // Verificar se não há solução viável
  if (results.status === GLPK_STATUS.GLP_NOFEAS) {
    return (
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-red-700 mb-4">
          Problema Impossível
        </h2>

        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p className="font-bold">
            Não foi possível encontrar uma solução viável.
          </p>
          <p>
            Por favor, revise as restrições adicionais e os limites de produção.
          </p>

          <p className="mt-3">Possíveis causas:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Restrições conflitantes ou muito restritivas</li>
            <li>Limites mínimos de produção muito altos</li>
            <li>Recursos insuficientes para atender a demanda mínima</li>
            <li>Combinação de restrições que não permitem solução</li>
          </ul>

          <p className="mt-3 font-medium">Sugestões:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Verifique as restrições personalizadas</li>
            <li>Reduza os valores mínimos de produção</li>
            <li>Aumente a capacidade dos recursos críticos</li>
            <li>Relaxe algumas restrições de igualdade</li>
          </ul>
        </div>
      </div>
    );
  }

  // Se houver outros erros (não GLP_NOFEAS)
  if (
    results.status !== GLPK_STATUS.GLP_OPT &&
    results.status !== GLPK_STATUS.GLP_FEAS
  ) {
    const statusMessages = {
      [GLPK_STATUS.GLP_INFEAS]: "Solução inviável",
      [GLPK_STATUS.GLP_UNBND]: "Problema ilimitado",
      [GLPK_STATUS.GLP_UNDEF]: "Solução indefinida",
    };

    const statusMessage =
      statusMessages[results.status] || "Status desconhecido";

    return (
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-red-700 mb-4">
          Problema na Otimização
        </h2>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p className="font-bold">Status do solver: {statusMessage}</p>
          <p className="mt-2">
            O solver não conseguiu encontrar uma solução satisfatória. Tente
            ajustar os parâmetros ou simplificar as restrições.
          </p>
        </div>
      </div>
    );
  }

  // Exibição normal dos resultados
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
          {results.manualProfit && (
            <p className="text-sm mt-2">
              (Verificação: R$ {results.manualProfit.toFixed(2)})
            </p>
          )}
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
