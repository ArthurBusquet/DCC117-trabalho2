import React, { useState } from 'react';

const ProductForm = ({ onSubmit, resources }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [resourceValues, setResourceValues] = useState(
    resources.reduce((acc, resource) => ({ ...acc, [resource.id]: '' }), {})
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newProduct = {
      name,
      cost: parseFloat(cost),
      salePrice: parseFloat(salePrice),
      resources: Object.fromEntries(
        Object.entries(resourceValues).map(([key, value]) => [key, parseFloat(value) || 0])
      )
    };

    onSubmit(newProduct);
    
    // Reset form
    setName('');
    setCost('');
    setSalePrice('');
    setResourceValues(resources.reduce((acc, resource) => ({ ...acc, [resource.id]: '' }), {}));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-700 font-medium mb-1">Nome do Produto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Custo de Produção (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-700 font-medium mb-1">Preço de Venda (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Recursos Utilizados (por unidade)</h3>
        <div className="space-y-2">
          {resources.map(resource => (
            <div key={resource.id} className="flex items-center">
              <label className="block text-gray-700 font-medium w-32">{resource.name}:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={resourceValues[resource.id] || ''}
                onChange={(e) => setResourceValues({ 
                  ...resourceValues, 
                  [resource.id]: e.target.value 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>
      
      <button
        type="submit"
        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-200"
      >
        Adicionar Produto
      </button>
    </form>
  );
};

export default ProductForm;