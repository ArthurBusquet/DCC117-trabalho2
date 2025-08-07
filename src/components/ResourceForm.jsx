import React from 'react';

const ResourceForm = ({ resources, onUpdate }) => {
  const handleChange = (id, value) => {
    onUpdate(id, parseFloat(value));
  };

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-lg font-medium text-gray-700 mb-2">Capacidades Diárias</h3>
      {resources.map(resource => (
        <div key={resource.id} className="flex items-center">
          <label className="block text-gray-700 font-medium w-48">{resource.name}</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={resource.capacity}
            onChange={(e) => handleChange(resource.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      ))}
    </div>
  );
};

export default ResourceForm;