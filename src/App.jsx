// src/App.js
import React, { useState, useEffect } from "react";
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
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("products");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "Sutiã Básico",
            cost: 8.5,
            salePrice: 19.9,
            resources: {
              encapar_bojos: 0.15, // 9 minutos
              colocar_pala: 0.1, // 6 minutos
              colocar_vies: 0.12, // 7.2 minutos
              colocar_sandwich: 0.08, // 4.8 minutos
              finalizacao: 0.12, // 7.2 minutos
            },
            weeklyMin: 60,
            weeklyMax: 1000,
          },
          {
            id: 2,
            name: "Sutiã com Renda",
            cost: 12.0,
            salePrice: 29.9,
            resources: {
              encapar_bojos: 0.18, // 10.8 minutos
              colocar_pala: 0.12, // 7.2 minutos
              colocar_vies: 0.15, // 9 minutos
              colocar_sandwich: 0.1, // 6 minutos
              finalizacao: 0.14, // 8.4 minutos
            },
            weeklyMin: 50,
            weeklyMax: 700,
          },
          {
            id: 3,
            name: "Sutiã Esportivo",
            cost: 10.0,
            salePrice: 24.9,
            resources: {
              encapar_bojos: 0.12, // 7.2 minutos
              colocar_pala: 0.09, // 5.4 minutos
              colocar_vies: 0.1, // 6 minutos
              colocar_sandwich: 0.07, // 4.2 minutos
              finalizacao: 0.1, // 6 minutos
            },
            weeklyMin: 40,
            weeklyMax: 900,
          },
          {
            id: 4,
            name: "Sutiã Push-Up",
            cost: 14.0,
            salePrice: 34.9,
            resources: {
              encapar_bojos: 0.2, // 12 minutos
              colocar_pala: 0.15, // 9 minutos
              colocar_vies: 0.18, // 10.8 minutos
              colocar_sandwich: 0.12, // 7.2 minutos
              finalizacao: 0.15, // 9 minutos
            },
            weeklyMin: 30,
            weeklyMax: 500,
          },
          {
            id: 5,
            name: "Sutiã Sem Costura",
            cost: 13.5,
            salePrice: 32.9,
            resources: {
              encapar_bojos: 0.14, // 8.4 minutos
              colocar_pala: 0.11, // 6.6 minutos
              colocar_vies: 0.13, // 7.8 minutos
              colocar_sandwich: 0.1, // 6 minutos
              finalizacao: 0.13, // 7.8 minutos
            },
            weeklyMin: 20,
            weeklyMax: 800,
          },
        ];
  });

  // Estado para recursos
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem("resources");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "encapar_bojos",
            name: "Encapar Bojos (horas/dia)",
            capacity: 8,
          },
          { id: "colocar_pala", name: "Colocar Pala (horas/dia)", capacity: 8 },
          {
            id: "colocar_vies",
            name: "Colocar Viés (horas/dia)",
            capacity: 24,
          },
          {
            id: "colocar_sandwich",
            name: "Colocar Sandwich (horas/dia)",
            capacity: 8,
          },
          { id: "finalizacao", name: "Finalização (horas/dia)", capacity: 24 },
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
  const addProduct = (product) =>
    setProducts([...products, { ...product, id: Date.now() }]);

  const updateProduct = (id, updatedProduct) =>
    setProducts(products.map((p) => (p.id === id ? updatedProduct : p)));

  const removeProduct = (id) =>
    setProducts(products.filter((p) => p.id !== id));

  const updateResource = (id, capacity) =>
    setResources(
      resources.map((r) =>
        r.id === id ? { ...r, capacity: Number(capacity) } : r
      )
    );

  const addConstraint = (constraint) =>
    setCustomConstraints([
      ...customConstraints,
      { ...constraint, id: Date.now() },
    ]);

  const removeConstraint = (id) =>
    setCustomConstraints(customConstraints.filter((c) => c.id !== id));

  // ----- Configurações do modelo -----
  const minParticipation = 0.05; // 5% do mix semanal

  // Configurações realistas para horas extras
  const overtimeConfig = {
    encapar_bojos: { maxPerDay: 4, costPerHour: 6 },
    colocar_pala: { maxPerDay: 4, costPerHour: 6 },
    colocar_vies: { maxPerDay: 4, costPerHour: 6 },
    colocar_sandwich: { maxPerDay: 4, costPerHour: 6 },
    finalizacao: { maxPerDay: 4, costPerHour: 6 },
  };

  // Validação antes de resolver
  const validateInputs = () => {
    const errors = [];

    // Verificar se todos os recursos têm capacidade válida
    resources.forEach((res) => {
      if (isNaN(res.capacity)) {
        errors.push(`Capacidade inválida para ${res.name}`);
      }
    });

    // Verificar limites de produção
    products.forEach((prod) => {
      if (prod.weeklyMin > prod.weeklyMax) {
        errors.push(`Produto ${prod.name}: Mínimo semanal maior que máximo`);
      }
    });

    // Verificar restrições personalizadas
    customConstraints.forEach((c) => {
      if (isNaN(c.value)) {
        errors.push(`Restrição "${c.name}" tem valor inválido`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Resolver o modelo
  const solve = async () => {
    console.log("Resolvendo modelo com GLPK...");
    setLoading(true);
    setError("");
    setResults(null);
    setValidationErrors([]);

    // Validar inputs antes de resolver
    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      console.log("teste 1");
      const glpk = await GLPK();

      if (!glpk || !glpk.solve) {
        throw new Error("GLPK não carregado corretamente");
      }

      console.log("teste 2");

      // Construir variáveis
      const variables = [];

      // Variáveis de produção
      products.forEach((prod, i) => {
        days.forEach((dayKey) => {
          variables.push({
            name: `x_${i}_${dayKey}`,
            coef: prod.salePrice - prod.cost, // lucro unitário
          });
        });
      });

      // Variáveis overtime
      const overtimeResources = Object.keys(overtimeConfig);
      overtimeResources.forEach((resId) => {
        days.forEach((dayKey) => {
          variables.push({
            name: `o_${resId}_${dayKey}`,
            coef: -overtimeConfig[resId].costPerHour, // custo reduz lucro
          });
        });
      });

      // Lista de variáveis inteiras (produção)
      const generals = products.flatMap((_, i) =>
        days.map((dayKey) => `x_${i}_${dayKey}`)
      );

      // ========= Restrições =========
      const subjectTo = [];

      // 1) Restrições de capacidade por recurso por dia
      resources.forEach((res) => {
        days.forEach((dayKey) => {
          // Coeficientes dos produtos
          const prodVars = products.map((prod, i) => ({
            name: `x_${i}_${dayKey}`,
            coef: prod.resources[res.id] || 0,
          }));

          // Se recurso permite overtime, adiciona variável overtime
          const overtimeVarName = overtimeConfig[res.id]
            ? `o_${res.id}_${dayKey}`
            : null;

          // const vars = overtimeVarName
          //   ? [...prodVars, { name: overtimeVarName, coef: -1 }]
          //   : prodVars;

          const vars = prodVars;

          // Capacidade base + horas extras (devido ao -1 no overtime)
          subjectTo.push({
            name: `cap_${res.id}_${dayKey}`,
            vars: vars.filter((v) => v.coef !== 0),
            bnds: { type: glpk.GLP_UP, ub: res.capacity, lb: 0 },
          });
        });
      });

      // 2) Limites de overtime por recurso por dia
      overtimeResources.forEach((resId) => {
        days.forEach((dayKey) => {
          subjectTo.push({
            name: `overtime_bound_${resId}_${dayKey}`,
            vars: [{ name: `o_${resId}_${dayKey}`, coef: 1 }],
            bnds: {
              type: glpk.GLP_DB,
              lb: 0,
              ub: overtimeConfig[resId].maxPerDay,
            },
          });
        });
      });

      // 3) Demanda semanal para cada produto
      products.forEach((prod, i) => {
        // Soma diária <= weeklyMax
        subjectTo.push({
          name: `weeklyMax_${i}`,
          vars: days.map((dayKey) => ({ name: `x_${i}_${dayKey}`, coef: 1 })),
          bnds: { type: glpk.GLP_UP, ub: prod.weeklyMax, lb: 0 },
        });

        // Soma diária >= weeklyMin
        subjectTo.push({
          name: `weeklyMin_${i}`,
          vars: days.map((dayKey) => ({ name: `x_${i}_${dayKey}`, coef: 1 })),
          bnds: { type: glpk.GLP_LO, lb: prod.weeklyMin, ub: 0 },
        });
      });

      // 4) Restrições personalizadas
      customConstraints.forEach((c, idx) => {
        const vars = [];
        products.forEach((prod, i) => {
          days.forEach((dayKey) => {
            const coef = c.coefficients[i] || 0;
            if (coef !== 0) vars.push({ name: `x_${i}_${dayKey}`, coef });
          });
        });

        if (vars.length > 0) {
          const bndType =
            c.type === "<="
              ? glpk.GLP_UP
              : c.type === ">="
              ? glpk.GLP_LO
              : glpk.GLP_FX;

          const bnd = {};
          if (c.type === "<=") bnd.ub = c.value;
          else if (c.type === ">=") bnd.lb = c.value;
          else {
            bnd.ub = c.value;
            bnd.lb = c.value;
          }

          subjectTo.push({
            name: `custom_${idx}`,
            vars,
            bnds: { type: bndType, ...bnd },
          });
        }
      });

      // 5) Diversificação (participation constraint)
      products.forEach((_, i) => {
        const vars = [];

        // Coef para produto i
        days.forEach((dayKey) =>
          vars.push({ name: `x_${i}_${dayKey}`, coef: 1 - minParticipation })
        );

        // Coef para outros produtos
        products.forEach((_, j) => {
          if (j === i) return;
          days.forEach((dayKey) =>
            vars.push({ name: `x_${j}_${dayKey}`, coef: -minParticipation })
          );
        });

        subjectTo.push({
          name: `min_participation_prod_${i}`,
          vars: vars.filter((v) => v.coef !== 0),
          bnds: { type: glpk.GLP_LO, lb: 0, ub: 0 },
        });
      });

      console.log("teste 3");

      // ===== Montar modelo =====
      const model = {
        name: "Mix_Producao_Semanal",
        objective: {
          direction: glpk.GLP_MAX,
          name: "lucro_semanal",
          vars: variables,
        },
        subjectTo,
        generals, // Variáveis de produção como inteiras
        options: {
          msglev: glpk.GLP_MSG_ON,
          presol: true,
        },
      };

      console.log("teste 4", model);

      // Resolver o modelo
      const solverResponse = await glpk.solve(model, {
        msglev: glpk.GLP_MSG_OFF,
        presol: true,
      });

      console.log("teste 5", model);

      console.log("solverResponse:", solverResponse);

      // Verificar resultado
      if (
        !solverResponse ||
        !solverResponse.result ||
        typeof solverResponse.result.z === "undefined" ||
        solverResponse.result.status !== glpk.GLP_OPT
      ) {
        const statusMsg =
          {
            [glpk.GLP_OPT]: "Solução ótima encontrada",
            [glpk.GLP_FEAS]: "Solução viável",
            [glpk.GLP_INFEAS]: "Problema inviável",
            [glpk.GLP_NOFEAS]: "Sem solução viável",
            [glpk.GLP_UNBND]: "Problema ilimitado",
            [glpk.GLP_UNDEF]: "Solução indefinida",
          }[solverResponse.status] ||
          `Status desconhecido: ${solverResponse.status}`;

        throw new Error(`Solver retornou: ${statusMsg}`);
      }

      // Construir resultado detalhado
      const production = products.map((prod, i) => {
        const dailyQuantities = days.map((dayKey) => {
          const varName = `x_${i}_${dayKey}`;
          const val = solverResponse.result.vars[varName];
          return Math.round(Number(val || 0)); // Arredondar para inteiro
        });

        return {
          name: prod.name,
          daily: dailyQuantities,
          total: dailyQuantities.reduce((sum, val) => sum + val, 0),
        };
      });

      // Extrair overtime usado
      const overtimeUsed = {};
      overtimeResources.forEach((resId) => {
        overtimeUsed[resId] = {};
        days.forEach((dayKey) => {
          const varName = `o_${resId}_${dayKey}`;
          overtimeUsed[resId][dayKey] = Number(
            solverResponse.result.vars[varName] || 0
          );
        });
      });

      setResults({
        profit: solverResponse.result.z,
        production,
        overtimeUsed,
        status: solverResponse.status,
      });
    } catch (err) {
      console.error(err);
      setError("Erro ao resolver o problema: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Cenários de aplicação de horas extras
  const overtimeScenarios = [
    {
      title: "Pico de Demanda",
      description:
        "Quando a produção planejada excede a capacidade normal em um dia específico para um recurso.",
    },
    {
      title: "Atraso na Produção",
      description:
        "Quando atrasos em dias anteriores exigem produção extra para cumprir metas semanais.",
    },
    {
      title: "Recurso Específico com Gargalo",
      description:
        "Quando um recurso específico (ex: máquina de costura) limita toda a produção.",
    },
    {
      title: "Encomendas Urgentes",
      description:
        "Quando são recebidas encomendas especiais com prazo curto durante a semana.",
    },
  ];

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
                    <i className="fas fa-trash" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">
          Quando Horas Extras Serão Aplicadas?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overtimeScenarios.map((scenario, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold text-blue-700">{scenario.title}</h3>
              <p className="text-gray-700 mt-2">{scenario.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-gray-700">
          <strong>Observação:</strong> As horas extras só serão usadas quando o
          lucro adicional gerado pela produção extra for maior que o custo das
          horas extras.
        </p>
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
