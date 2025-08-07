import React, { useState, useEffect } from "react";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import ResourceForm from "./components/ResourceForm";
import ResourceTable from "./components/ResourceTable";
import ConstraintForm from "./components/ConstraintForm";
import Results from "./components/Results";

// Importação correta do GLPK
import GLPK from "glpk.js";

function App() {
  // Estado para produtos
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("products");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "Sutiã",
            cost: 8.5,
            salePrice: 9.9,
            resources: {
              costura: 2,
              bojos: 2,
              embalagem: 1,
              corte: 2,
            },
          },
          {
            id: 2,
            name: "Calcinha",
            cost: 0.2,
            salePrice: 14.9,
            resources: {
              costura: 2,
              bojos: 0,
              embalagem: 2,
              corte: 2,
            },
          },
        ];
  });

  // Estado para recursos
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem("resources");
    return saved
      ? JSON.parse(saved)
      : [
          { id: "costura", name: "Costura (horas)", capacity: 28800 },
          { id: "bojos", name: "Bojos (horas)", capacity: 28800 },
          { id: "embalagem", name: "Embalagem (horas)", capacity: 28800 },
          { id: "corte", name: "Corte (horas)", capacity: 28800 },
        ];
  });

  // Estado para restrições adicionais - renomeei para 'customConstraints'
  const [customConstraints, setCustomConstraints] = useState(() => {
    const saved = localStorage.getItem("customConstraints");
    return saved ? JSON.parse(saved) : [];
  });

  // Estado para resultados
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("resources", JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem(
      "customConstraints",
      JSON.stringify(customConstraints)
    );
  }, [customConstraints]);

  // Adicionar produto
  const addProduct = (product) => {
    setProducts([...products, { ...product, id: Date.now() }]);
  };

  // Atualizar produto
  const updateProduct = (id, updatedProduct) => {
    setProducts(
      products.map((product) => (product.id === id ? updatedProduct : product))
    );
  };

  // Remover produto
  const removeProduct = (id) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  // Atualizar recurso
  const updateResource = (id, capacity) => {
    setResources(
      resources.map((resource) =>
        resource.id === id ? { ...resource, capacity: capacity * 10 } : resource
      )
    );
  };

  // Adicionar restrição
  const addConstraint = (constraint) => {
    setCustomConstraints([
      ...customConstraints,
      { ...constraint, id: Date.now() },
    ]);
  };

  // Remover restrição
  const removeConstraint = (id) => {
    setCustomConstraints(customConstraints.filter((c) => c.id !== id));
  };

  // Resolver o problema
  const solve = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      // Carregar o GLPK
      const glpk = await GLPK();

      // Verificar se glpk foi carregado
      if (!glpk || !glpk.solve) {
        throw new Error("GLPK não carregado corretamente");
      }

      console.log(
        "Dados dos produtos:",
        products.map((p) => ({
          name: p.name,
          lucro: p.salePrice - p.cost,
          recursos: p.resources,
        }))
      );

      // Preparar variáveis
      const variables = products.map((prod, i) => ({
        name: `x${i}`,
        coef: prod.salePrice - prod.cost,
      }));

      // Preparar restrições de recursos
      const resourceConstraints = resources.map((resource) => {
        console.log("products:", products);
        const vars = products.map((prod, i) => ({
          name: `x${i}`,
          coef: prod.resources[resource.id] || 0,
        }));

        console.log("Restrição de recurso:", resource);

        return {
          name: resource.id,
          vars: vars.filter((v) => v.coef !== 0), // Filtrar coeficientes zero
          bnds: {
            type: glpk.GLP_UP,
            ub: resource.capacity,
            lb: 0, // Não permitir produção negativa
          },
        };
      });

      // Preparar restrições personalizadas
      const customConstraintsList = customConstraints.map((constraint, idx) => {
        const vars = products
          .map((prod, i) => ({
            name: `x${i}`,
            coef: constraint.coefficients[i] || 0,
          }))
          .filter((v) => v.coef !== 0); // Filtrar coeficientes zero

        return {
          name: `constraint_${idx}`,
          vars,
          bnds: {
            type:
              constraint.type === "<="
                ? glpk.GLP_UP
                : constraint.type === ">="
                ? glpk.GLP_LO
                : glpk.GLP_FX,
            ub: constraint.type === "<=" ? constraint.value : undefined,
            lb: constraint.type === ">=" ? constraint.value : undefined,
            ...(constraint.type === "=" && {
              ub: constraint.value,
              lb: constraint.value,
            }),
          },
        };
      });

      // Combinar todas as restrições
      const allConstraints = [
        ...resourceConstraints,
        ...customConstraintsList,
      ].filter((c) => c.vars.length > 0); // Remover restrições vazias

      // Criar modelo
      const model = {
        name: "Mix_Producao",
        objective: {
          direction: glpk.GLP_MAX,
          name: "lucro",
          vars: variables,
        },
        subjectTo: resourceConstraints,
        binaries: [],
        generals: products.map((_, i) => `x${i}`),
      };

      // Verificar modelo antes de resolver
      console.log("Modelo enviado para GLPK:", model);

      // Resolver
      const result = await glpk.solve(model, {
        msglev: glpk.GLP_MSG_ALL,
        presol: true,
        cb: {
          call: (progress) => console.log(progress),
          each: 1,
        },
      });

      console.log("Resultado do GLPK:", result);

      if (result.status === 5 || result.status === glpk.GLP_FEAS) {
        setResults({
          profit: result.result.z,
          production: products.map((prod, i) => ({
            name: prod.name,
            quantity: result.result.vars[`x${i}`],
          })),
        });
      } else {
        setError(
          "Não foi possível encontrar uma solução ótima. Verifique as restrições."
        );
      }
    } catch (err) {
      setError("Erro ao resolver o problema: " + err.message);
      console.error("Erro detalhado:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-600">
          Otimização de Mix de Produção
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Planejamento de produção para confecção de moda íntima
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário de Produto */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Adicionar Produto
          </h2>
          <ProductForm onSubmit={addProduct} resources={resources} />
        </div>

        {/* Formulário de Restrição */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Adicionar Restrição
          </h2>
          <ConstraintForm products={products} onSubmit={addConstraint} />
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">Produtos</h2>
        <ProductTable
          products={products}
          resources={resources}
          onEdit={updateProduct}
          onRemove={removeProduct}
        />
      </div>

      {/* Recursos e Restrições */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Recursos */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Recursos</h2>
          <ResourceForm resources={resources} onUpdate={updateResource} />
          <ResourceTable resources={resources} />
        </div>

        {/* Restrições Adicionais */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Restrições Adicionais
          </h2>
          {customConstraints.length === 0 ? (
            <p className="text-gray-500">
              Nenhuma restrição adicional definida.
            </p>
          ) : (
            <ul className="divide-y">
              {customConstraints.map((constraint) => (
                <li
                  key={constraint.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{constraint.name}: </span>
                    {products.map(
                      (prod, i) =>
                        constraint.coefficients[i] !== 0 && (
                          <span key={i} className="mx-1">
                            {constraint.coefficients[i] > 0 ? "+" : ""}
                            {constraint.coefficients[i]}
                            {prod.name}
                          </span>
                        )
                    )}
                    <span>
                      {" "}
                      {constraint.type} {constraint.value}
                    </span>
                  </div>
                  <button
                    onClick={() => removeConstraint(constraint.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Botão para resolver */}
      <div className="mt-8 text-center">
        <button
          onClick={solve}
          disabled={loading || products.length === 0}
          className={`px-6 py-3 rounded-lg text-white font-bold ${
            loading || products.length === 0
              ? "bg-black cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? (
            <span>
              Processando... <i className="fas fa-spinner fa-spin ml-2"></i>
            </span>
          ) : (
            <span>
              Otimizar Produção <i className="fas fa-calculator ml-2"></i>
            </span>
          )}
        </button>
      </div>

      {/* Resultados */}
      {error && (
        <div className="mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {results && <Results results={results} />}
    </div>
  );
}

export default App;
