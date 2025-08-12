// src/App.js
import React, { useState, useEffect } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import ResourceForm from "./components/ResourceForm";
import ResourceTable from "./components/ResourceTable";
import ConstraintForm from "./components/ConstraintForm";
import Results from "./components/Results";

import GLPK from "glpk.js";

function App() {
  // ----- Config básica -----
  const days = ["seg", "ter", "qua", "qui", "sex"]; // 5 dias úteis

  // Estado para produtos
  const [products, setProducts] = useState([]);

  // Estado para recursos
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem("resources");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "encapar_bojos",
            name: "Encapar Bojos",
            capacity: 8,
          },
          { id: "colocar_pala", name: "Colocar Pala", capacity: 8 },
          {
            id: "colocar_vies",
            name: "Colocar Viés",
            capacity: 24,
          },
          {
            id: "colocar_sandwich",
            name: "Colocar Sandwich",
            capacity: 8,
          },
          { id: "finalizacao", name: "Finalização", capacity: 24 },
        ];
  });

  // Restrições customizadas
  const [customConstraints, setCustomConstraints] = useState(() => {
    const saved = localStorage.getItem("customConstraints");
    return saved ? JSON.parse(saved) : [];
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch("/products.json");
        const data = await response.json();

        console.log("data:", data);

        // Verificar se já temos produtos salvos no localStorage
        const savedProducts = localStorage.getItem("products");

        if (JSON.parse(savedProducts).length > 0) {
          console.log("teste", savedProducts);
          setProducts(JSON.parse(savedProducts));
        } else {
          setProducts(data);
        }
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        setProducts([]);
      }
    };

    loadProducts();
  }, []);

  // Persistência
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

  // CRUDs
  const addProduct = (product) => {
    if (products.some((p) => p.name === product.name)) {
      setValidationErrors((prev) => [
        ...prev,
        `Já existe um produto com o nome "${product.name}"`,
      ]);
      return;
    }
    setProducts([...products, { ...product, id: Date.now() }]);
  };

  const updateProduct = (id, updatedProduct) => {
    const otherProducts = products.filter((p) => p.id !== id);
    if (otherProducts.some((p) => p.name === updatedProduct.name)) {
      setValidationErrors((prev) => [
        ...prev,
        `Já existe um produto com o nome "${updatedProduct.name}"`,
      ]);
      return;
    }
    setProducts(products.map((p) => (p.id === id ? updatedProduct : p)));
  };

  const removeProduct = (id) =>
    setProducts(products.filter((p) => p.id !== id));

  const updateResource = (id, capacity) => {
    if (isNaN(capacity) || capacity < 0) {
      setValidationErrors((prev) => [
        ...prev,
        `Capacidade inválida para o recurso ${id}`,
      ]);
      return;
    }
    setResources(
      resources.map((r) =>
        r.id === id ? { ...r, capacity: Number(capacity) } : r
      )
    );
  };

  const addConstraint = (constraint) =>
    setCustomConstraints([
      ...customConstraints,
      { ...constraint, id: Date.now() },
    ]);

  const removeConstraint = (id) =>
    setCustomConstraints(customConstraints.filter((c) => c.id !== id));

  const secondsToHours = (seconds) => seconds / 3600;

  // Validação antes de resolver
  const validateInputs = () => {
    const errors = [];

    resources.forEach((res) => {
      if (isNaN(res.capacity) || res.capacity < 0) {
        errors.push(`Capacidade inválida para ${res.name}`);
      }
    });

    products.forEach((prod) => {
      if (prod.weeklyMin > prod.weeklyMax) {
        errors.push(`Produto ${prod.name}: Mínimo > Máximo`);
      }
    });

    customConstraints.forEach((c) => {
      if (isNaN(c.value)) {
        errors.push(`Restrição "${c.name}" tem valor inválido`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Verificar viabilidade do modelo
  const checkFeasibility = () => {
    const minResourceDemand = {};
    resources.forEach((res) => (minResourceDemand[res.id] = 0));

    products.forEach((prod) =>
      resources.forEach((res) => {
        const resourceTime = prod.resources[res.id] || 0;
        const resourceTimeInHours = secondsToHours(resourceTime);
        minResourceDemand[res.id] += prod.weeklyMin * resourceTimeInHours;
      })
    );

    const feasibilityIssues = [];
    resources.forEach((res) => {
      const totalCapacity = res.capacity * days.length;
      if (minResourceDemand[res.id] > totalCapacity) {
        feasibilityIssues.push(
          `Recurso ${res.name} sobrecarregado! ` +
            `Demanda mínima: ${minResourceDemand[res.id].toFixed(2)}h, ` +
            `Capacidade: ${totalCapacity}h`
        );
      }
    });

    if (feasibilityIssues.length > 0) {
      setValidationErrors(feasibilityIssues);
      return false;
    }
    return true;
  };

  // Resolver o modelo
  const solve = async () => {
    setLoading(true);
    setError("");
    setResults(null);
    setValidationErrors([]);

    // Validação básica
    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    // Verificar viabilidade
    if (!checkFeasibility()) {
      setLoading(false);
      return;
    }

    try {
      const glpk = await GLPK();
      if (!glpk || !glpk.solve)
        throw new Error("GLPK não carregado corretamente");

      // Construir variáveis de produção (INTEIRAS)
      const variables = products.flatMap((prod, i) =>
        days.map((dayKey) => ({
          name: `x_${i}_${dayKey}`,
          coef: prod.salePrice - prod.cost,
          type: glpk.GLP_IV, // VARIÁVEL INTEIRA
        }))
      );

      // Construir restrições
      const subjectTo = [];

      // 1) Restrições de capacidade
      resources.forEach((res) => {
        days.forEach((dayKey) => {
          const prodVars = products.map((prod, i) => {
            const resourceTime = prod.resources[res.id] || 0;

            const resourceTimeInHours = secondsToHours(resourceTime);
            return {
              name: `x_${i}_${dayKey}`,
              coef: resourceTimeInHours,
            };
          });
          console.log("prodVars", prodVars);

          subjectTo.push({
            name: `cap_${res.id}_${dayKey}`,
            vars: prodVars.filter((v) => v.coef !== 0),
            bnds: { type: glpk.GLP_UP, ub: res.capacity },
          });
        });
      });

      // 2) Demanda semanal
      products.forEach((prod, i) => {
        subjectTo.push({
          name: `weeklyMax_${i}`,
          vars: days.map((dayKey) => ({ name: `x_${i}_${dayKey}`, coef: 1 })),
          bnds: { type: glpk.GLP_UP, ub: prod.weeklyMax },
        });

        subjectTo.push({
          name: `weeklyMin_${i}`,
          vars: days.map((dayKey) => ({ name: `x_${i}_${dayKey}`, coef: 1 })),
          bnds: { type: glpk.GLP_LO, lb: prod.weeklyMin },
        });
      });

      console.log("customConstraints", customConstraints);
      // 3) Restrições personalizadas
      customConstraints.forEach((c, idx) => {
        const vars = products
          .flatMap((prod, i) => {
            const productIndex = c.productIds.indexOf(prod.id);
            if (productIndex === -1) return [];
            const coef = c.coefficients[productIndex];
            return days.map((dayKey) => ({
              name: `x_${i}_${dayKey}`,
              coef: coef,
            }));
          })
          .filter((v) => v?.coef !== 0);

        if (vars.length > 0) {
          const bndType =
            c.type === "<="
              ? glpk.GLP_UP
              : c.type === ">="
              ? glpk.GLP_LO
              : glpk.GLP_FX;
          const bnd =
            c.type === "<="
              ? { ub: c.value }
              : c.type === ">="
              ? { lb: c.value }
              : { ub: c.value, lb: c.value };

          subjectTo.push({
            name: `custom_${idx}`,
            vars,
            bnds: { type: bndType, ...bnd },
          });
        }
      });

      // Montar e resolver modelo
      const model = {
        name: "Mix_Producao_Semanal",
        objective: { direction: glpk.GLP_MAX, vars: variables },
        subjectTo,
        generals: variables.map((v) => v.name), // Variáveis inteiras
      };

      // Configurações para problemas inteiros
      const solverOptions = {
        msglev: glpk.GLP_MSG_OFF,
        presol: true,
        tmlim: 3,
      };

      const solverResponse = await glpk.solve(model, solverOptions);

      console.log("Solver response:", solverResponse);

      // Verificar resultado
      if (
        !solverResponse.result ||
        typeof solverResponse.result.z === "undefined"
      ) {
        const statusMsg =
          {
            [glpk.GLP_OPT]: "Solução ótima encontrada",
            [glpk.GLP_FEAS]: "Solução viável",
            [glpk.GLP_INFEAS]: "Problema inviável",
            [glpk.GLP_NOFEAS]: "Sem solução viável",
            [glpk.GLP_UNBND]: "Problema ilimitado",
            [glpk.GLP_UNDEF]: "Solução indefinida",
          }[solverResponse.result?.status] || "Status desconhecido";

        throw new Error(`Solver retornou: ${statusMsg}`);
      }

      // Processar resultados
      const production = products.map((prod, i) => {
        const dailyQuantities = days.map((dayKey) => {
          const val = solverResponse.result.vars[`x_${i}_${dayKey}`] || 0;
          return Math.round(val); // Arredondar para garantir valor inteiro
        });

        return {
          name: prod.name,
          daily: dailyQuantities,
          total: dailyQuantities.reduce((sum, val) => sum + val, 0),
        };
      });

      // Verificação manual do lucro
      let manualProfit = 0;
      production.forEach((prod, i) => {
        const unitProfit = products[i].salePrice - products[i].cost;
        manualProfit += prod.total * unitProfit;
      });

      setResults({
        profit: solverResponse.result.z,
        production,
        manualProfit, // Para verificação
        status: solverResponse.result.status,
      });
    } catch (err) {
      console.error(err);
      setError("Erro ao resolver o problema: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-600">
          Otimização Semanal de Produção
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Planejamento semanal com capacidade diária e demanda semanal
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Adicionar Produto
          </h2>
          <ProductForm onSubmit={addProduct} resources={resources} />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Adicionar Restrição
          </h2>
          <ConstraintForm products={products} onSubmit={addConstraint} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">Produtos</h2>
        <ProductTable
          products={products}
          resources={resources}
          onEdit={updateProduct}
          onRemove={removeProduct}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            Recursos (capacidade por dia)
          </h2>
          <ResourceForm resources={resources} onUpdate={updateResource} />
          <ResourceTable resources={resources} />
          <p className="text-sm text-gray-500 mt-3">
            Observação: Capacidades são horas por dia. Para etapas móveis (ex.:
            colocar_vies + finalizacao), configure capacity como soma dos
            trabalhadores móveis * horas/dia (ex.: 3 * 8 = 24).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4 flex justify-between items-center">
            Restrições Adicionais
            {customConstraints.length > 0 && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Tem certeza que deseja remover TODAS as restrições?"
                    )
                  ) {
                    setCustomConstraints([]);
                  }
                }}
                className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Remover Todas
              </button>
            )}
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
                  className="py-3 flex justify-between items-center group"
                >
                  <div>
                    <span className="font-medium">{constraint.name}: </span>
                    {products.map((prod) => {
                      const productIndex = constraint.productIds.indexOf(
                        prod.id
                      );
                      if (
                        productIndex === -1 ||
                        constraint.coefficients[productIndex] === 0
                      )
                        return null;
                      return (
                        <span key={prod.id} className="mx-1">
                          {constraint.coefficients[productIndex] > 0 ? "+" : ""}
                          {constraint.coefficients[productIndex]}
                          {prod.name}
                        </span>
                      );
                    })}
                    <span>
                      {" "}
                      {constraint.type} {constraint.value}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Tem certeza que deseja remover esta restrição?"
                        )
                      ) {
                        removeConstraint(constraint.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover restrição"
                  >
                    <DeleteIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={solve}
          disabled={loading || products.length === 0}
          className={`px-6 py-3 rounded-lg text-white font-bold transition-colors ${
            loading || products.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? (
            <span>
              <i className="fas fa-spinner fa-spin mr-2" />
              Processando...
            </span>
          ) : (
            <span>
              <i className="fas fa-calculator mr-2" />
              Otimizar Semana
            </span>
          )}
        </button>
      </div>

      {validationErrors.length > 0 && (
        <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold mb-2">Erros de validação:</h3>
          <ul className="list-disc pl-5">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {results && <Results results={results} days={days} />}
    </div>
  );
}

export default App;
