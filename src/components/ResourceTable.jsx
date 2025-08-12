import React from "react";

const ResourceTable = ({ resources }) => {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-700 mb-2">
        Resumo de Recursos
      </h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recurso
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacidade Diária
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {resources.map((resource) => (
            <tr key={resource.id}>
              <td className="px-6 py-4 whitespace-nowrap">{resource.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {resource.capacity} horas
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResourceTable;
