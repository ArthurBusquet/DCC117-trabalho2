import React, { useState } from "react";

const ConstraintForm = ({ products, onSubmit }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("<=");
  const [value, setValue] = useState("");
  const [coefficients, setCoefficients] = useState(products.map(() => 0));

  const handleSubmit = (e) => {
    e.preventDefault();

    const numericCoefficients = coefficients.map((c) =>
      typeof c === "string" ? parseFloat(c) || 0 : c
    );

    const constraint = {
      name,
      type,
      value: parseFloat(value),
      coefficients: numericCoefficients,
    };

    onSubmit(constraint);

    // Reset form
    setName("");
    setType("<=");
    setValue("");
    setCoefficients(products.map(() => 0));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-700 font-medium mb-1">
          Nome da Restrição
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
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
            value={value}
            onChange={(e) => setValue(e.target.value)}
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
                value={coefficients[i] || ""}
                onChange={(e) => {
                  const newCoefficients = [...coefficients];
                  newCoefficients[i] = e.target.value;
                  setCoefficients(newCoefficients);
                }}
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
