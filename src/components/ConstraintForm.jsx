import React, { useState } from "react";

const ConstraintForm = ({ products, onSubmit }) => {
  const [constraintName, setConstraintName] = useState("");
  const [constraintType, setConstraintType] = useState(">=");
  const [constraintValue, setConstraintValue] = useState("");
  const [coefficients, setCoefficients] = useState({});

  const handleCoefficientChange = (productId, value) => {
    setCoefficients({
      ...coefficients,
      [productId]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isNaN(constraintValue)) {
      alert("Valor da restrição deve ser um número");
      return;
    }

    const productIds = products.map((p) => p.id);
    const coefficientsArray = productIds.map(
      (id) => parseFloat(coefficients[id]) || 0
    );

    onSubmit({
      name: constraintName,
      type: constraintType,
      value: parseFloat(constraintValue),
      productIds,
      coefficients: coefficientsArray,
    });

    setConstraintName("");
    setConstraintType(">=");
    setConstraintValue("");
    setCoefficients({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-700 font-medium mb-1">
          Nome da Restrição
        </label>
        <input
          type="text"
          value={constraintName}
          onChange={(e) => setConstraintName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Tipo</label>
          <select
            value={constraintType}
            onChange={(e) => setConstraintType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="<=">{"<="} (Menor ou igual)</option>
            <option value=">=">{">="} (Maior ou igual)</option>
            <option value="=">{"="} (Igual)</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Valor</label>
          <input
            type="number"
            step="0.01"
            value={constraintValue}
            onChange={(e) => setConstraintValue(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Coeficientes</h3>
        <div className="space-y-2">
          {products.map((product, i) => (
            <div key={i} className="flex items-center">
              <label className="block text-gray-700 font-medium w-32">
                {product.name}:
              </label>
              <input
                type="number"
                step="0.01"
                value={coefficients[product.id] || ""}
                onChange={(e) =>
                  handleCoefficientChange(product.id, e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-black text-white font-bold py-2 px-4 rounded-lg transition duration-200"
      >
        Adicionar Restrição
      </button>
    </form>
  );
};

export default ConstraintForm;
