// src/components/ProductTable.js
import React, { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

const ProductTable = ({ products, resources, onEdit, onRemove }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const startEditing = (product) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    onEdit(editingId, editForm);
    setEditingId(null);
    setEditForm(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: name.startsWith("resource_")
        ? parseFloat(value) || 0
        : name === "weeklyMin" || name === "weeklyMax"
        ? parseInt(value, 10) || 0
        : value,
    }));
  };

  return (
    <div className="overflow-x-auto">
      {products.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          Nenhum produto cadastrado.
        </p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custo (R$)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Venda (R$)
              </th>
              {resources.map((resource) => (
                <th
                  key={resource.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {resource.name}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lucro Unit.
              </th>
              {/* Novas colunas para weeklyMin e weeklyMax */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min. Semanal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max. Semanal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) =>
              editingId === product.id ? (
                <tr key={product.id} className="bg-yellow-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      name="cost"
                      value={editForm.cost}
                      onChange={handleEditChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      name="salePrice"
                      value={editForm.salePrice}
                      onChange={handleEditChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  {resources.map((resource) => (
                    <td
                      key={resource.id}
                      className="px-6 py-4 whitespace-nowrap"
                    >
                      <input
                        type="number"
                        step="0.01"
                        name={`resource_${resource.id}`}
                        value={editForm.resources[resource.id] || 0}
                        onChange={handleEditChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(editForm.salePrice - editForm.cost).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      name="weeklyMin"
                      value={editForm.weeklyMin}
                      onChange={handleEditChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      name="weeklyMax"
                      value={editForm.weeklyMax}
                      onChange={handleEditChange}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={saveEditing}
                      className="text-green-600 hover:text-green-800"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <CloseIcon />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    R$ {product.cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    R$ {product.salePrice.toFixed(2)}
                  </td>
                  {resources.map((resource) => (
                    <td
                      key={resource.id}
                      className="px-6 py-4 whitespace-nowrap"
                    >
                      {product.resources[resource.id] || 0} segundos
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap">
                    R$ {(product.salePrice - product.cost).toFixed(2)}
                  </td>
                  {/* Exibição dos valores de weeklyMin e weeklyMax */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.weeklyMin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.weeklyMax}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => startEditing(product)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => onRemove(product.id)}
                      className="text-red-600 hover:text-red-800 bg-transparent"
                    >
                      <DeleteIcon />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProductTable;
