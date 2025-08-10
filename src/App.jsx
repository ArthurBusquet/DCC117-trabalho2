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
            cost: 3.6,
            salePrice: 17.9,
            resources: {
              encapar_bojos: 0.2,
              colocar_pala: 0.1,
              colocar_vies: 0.15,
              colocar_sandwich: 0.1,
              finalizacao: 0.2,
            },
          },
          {
            id: 2,
            name: "Calcinha",
            cost: 2.4,
            salePrice: 14.9,
            resources: {
              encapar_bojos: 0.25,
              colocar_pala: 0.15,
              colocar_vies: 0.2,
              colocar_sandwich: 0.12,
              finalizacao: 0.22,
            },
          },
        ];
  });

  // Estado para recursos (capacidades por etapa)
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem("resources");
    return saved
      ? JSON.parse(saved)
      : [
          { id: "encapar_bojos", name: "Encapar Bojos (horas)", capacity: 8 },
          { id: "colocar_pala", name: "Colocar Pala (horas)", capacity: 8 },
          { id: "colocar_vies", name: "Colocar Viés (horas)", capacity: 24 }, // 3 funcionários móveis * 8h
          {
            id: "colocar_sandwich",
            name: "Colocar Sandwich (horas)",
            capacity: 8,
          },
          { id: "finalizacao", name: "Finalização (horas)", capacity: 24 }, // mesmos 3 móveis
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
        resource.id === id
          ? { ...resource, capacity: Number(capacity) }
          : resource
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

  // Valores para restrições móveis (mínimo e máximo horas)
  const moveisUsoMin = 15; // horas mínimas totais para colocar_vies + finalizacao
  const moveisUsoMax = 24; // horas máximas totais (3 funcionários * 8h)

  // Participação mínima no mix (fração)
  const minParticipation = 0.1; // 10% para todos, pode alterar

  // Resolver o problema
  const solve = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const glpk = await GLPK();

      if (!glpk || !glpk.solve) {
        throw new Error("GLPK não carregado corretamente");
      }

      // Variáveis e coeficientes lucro
      const variables = products.map((prod, i) => ({
        name: `x${i}`,
        coef: prod.salePrice - prod.cost,
      }));

      // Restrição por recurso (capacidade máxima)
      const resourceConstraints = resources.map((resource) => {
        const vars = products.map((prod, i) => ({
          name: `x${i}`,
          coef: prod.resources[resource.id] || 0,
        }));

        return {
          name: resource.id,
          vars: vars.filter((v) => v.coef !== 0),
          bnds: {
            type: glpk.GLP_UP,
            ub: resource.capacity,
            lb: 0,
          },
        };
      });

      // Restrição para funcionários móveis - soma (colocar_vies + finalizacao) ≤ capacidade máxima
      resourceConstraints.push({
        name: "moveis_max",
        vars: products.map((prod, i) => ({
          name: `x${i}`,
          coef:
            (prod.resources.colocar_vies || 0) +
            (prod.resources.finalizacao || 0),
        })),
        bnds: { type: glpk.GLP_UP, ub: moveisUsoMax, lb: 0 },
      });

      // // Restrição para funcionários móveis - soma (colocar_vies + finalizacao) ≥ capacidade mínima
      // resourceConstraints.push({
      //   name: "moveis_min",
      //   vars: products.flatMap((prod, i) => [
      //     { name: `x${i}`, coef: prod.resources.colocar_vies || 0 },
      //     { name: `x${i}`, coef: prod.resources.finalizacao || 0 },
      //   ]),
      //   bnds: { type: glpk.GLP_LO, lb: moveisUsoMin, ub: 0 },
      // });

      // Restrições personalizadas já adicionadas pelo usuário
      const customConstraintsList = customConstraints.map((constraint, idx) => {
        const vars = products
          .map((prod, i) => ({
            name: `x${i}`,
            coef: constraint.coefficients[i] || 0,
          }))
          .filter((v) => v.coef !== 0);

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

      // Restrições de participação mínima no mix
      // Para cada produto: x_i >= minParticipation * soma(x_j)  ⇒  x_i - minParticipation*sum_j x_j ≥ 0
      const participationConstraints = products.map((_, i) => {
        const vars = products.map((_, j) => ({
          name: `x${j}`,
          coef: i === j ? 1 - minParticipation : -minParticipation,
        }));

        return {
          name: `min_participation_${i}`,
          vars,
          bnds: { type: glpk.GLP_LO, lb: 0, ub: 1 },
        };
      });

      // Juntar todas restrições
      const allConstraints = [
        ...resourceConstraints,
        ...customConstraintsList,
        ...participationConstraints,
      ].filter((c) => c.vars.length > 0);

      // Criar modelo
      const model = {
        name: "Mix_Producao",
        objective: {
          direction: glpk.GLP_MAX,
          name: "lucro",
          vars: variables,
        },
        subjectTo: allConstraints,
        binaries: [],
        generals: products.map((_, i) => `x${i}`),
      };

      // Debug modelo
      console.log("Modelo enviado para GLPK:", model);

      // Resolver
      const response = await glpk.solve(model, {
        msglev: glpk.GLP_MSG_ALL,
        presol: true,
      });

      console.log("Resultado do GLPK:", response);

      if (
        response.result.status === glpk.GLP_OPT ||
        response.result.status === glpk.GLP_FEAS
      ) {
        setResults({
          profit: response.result.z,
          production: products.map((prod, i) => ({
            name: prod.name,
            quantity: response.result.vars[`x${i}`],
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
          className={`w-80 px-6 py-3 rounded-lg text-white font-bold ${
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
