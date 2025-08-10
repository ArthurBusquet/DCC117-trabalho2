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

  // Estado para produtos (adicione weeklyMin / weeklyMax se necessário)
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
            weeklyMax: 500000,
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

  // Estado para recursos: interprete capacity como horas POR DIA desse recurso
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
          // Colocar_vies e finalizacao compartilham funcionários móveis;
          // capacity aqui é a capacidade base por dia (ex.: 3 móveis * 8h = 24h)
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

  // customConstraints aplicadas sobre totais semanais (coef por produto)
  const [customConstraints, setCustomConstraints] = useState(() => {
    const saved = localStorage.getItem("customConstraints");
    return saved ? JSON.parse(saved) : [];
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // persistência
  useEffect(
    () => localStorage.setItem("products", JSON.stringify(products)),
    [products]
  );
  useEffect(
    () => localStorage.setItem("resources", JSON.stringify(resources)),
    [resources]
  );
  useEffect(
    () =>
      localStorage.setItem(
        "customConstraints",
        JSON.stringify(customConstraints)
      ),
    [customConstraints]
  );

  // CRUDs simples (preservados do seu código)
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

  // ----- Configuráveis do modelo -----
  // participação mínima no mix semanal (fração) - aplica igual para todos (ajuste conforme precisar)
  const minParticipation = 0.05; // 5% do mix semanal por SKU (exemplo)

  // Horas extras (overtime) configuráveis por estágio: máximo por dia e custo por hora (custo adicional sobre o lucro)
  // Se você não quer horas extras para uma etapa, remova a chave ou coloque max 0.
  const overtimeConfig = {
    // exemplo: permitir até 4h extras por dia em etapas móveis, com custo R$6/h
    colocar_vies: { maxPerDay: 4000000, costPerHour: 6 },
    finalizacao: { maxPerDay: 40000000, costPerHour: 6 },
    encapar_bojos: { maxPerDay: 40000000, costPerHour: 6 },
    colocar_pala: { maxPerDay: 40000000, costPerHour: 6 },
    // se quiser permitir em encapar_bojos, adicionar { encapar_bojos: { maxPerDay: X, costPerHour: Y } }
  };

  // ----- Solve (construção do modelo após carregar glpk) -----
  const solve = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const glpk = await GLPK();

      if (!glpk || !glpk.solve) {
        throw new Error("GLPK não carregado corretamente");
      }

      // Construir lista de variáveis:
      // - x_{i}_{d} : produção do produto i no dia d
      // - o_{resource}_{d} : horas extras contratadas para resource no dia d (opcional)
      const variables = [];

      // variáveis de produção por produto por dia
      products.forEach((prod, i) => {
        days.forEach((dayIdx) => {
          variables.push({
            name: `x_${i}_${dayIdx}`,
            coef: prod.salePrice - prod.cost, // lucro unitário
          });
        });
      });

      // variáveis overtime (uma por resource que tenha overtimeConfig e por dia)
      const overtimeResources = Object.keys(overtimeConfig);
      overtimeResources.forEach((resId) => {
        days.forEach((dayIdx) => {
          variables.push({
            name: `o_${resId}_${dayIdx}`,
            // custo: reduz lucro (coef negativo)
            coef: -overtimeConfig[resId].costPerHour,
          });
        });
      });

      // ========= restrições =========
      const subjectTo = [];

      // 1) restrições de capacidade por recurso por dia:
      // sum_i time[i][resource] * x_{i,d} <= capacity(resource) + overtime(resource,d)
      resources.forEach((res) => {
        days.forEach((dayIdx) => {
          // coeficientes dos produtos para a restrição
          const prodVars = products.map((prod, i) => ({
            name: `x_${i}_${dayIdx}`,
            coef: prod.resources[res.id] || 0,
            kind: glpk.GLP_IV,
          }));

          // se recurso permite overtime, adiciona variável overtime com coef -1
          const overtimeVarName = overtimeConfig[res.id]
            ? `o_${res.id}_${dayIdx}`
            : null;
          const vars = overtimeVarName
            ? [...prodVars, { name: overtimeVarName, coef: -1 }]
            : prodVars;

          // ub = capacity base (horas/dia). A presença de -1*overtime na LHS permite que overtime aumente o RHS.
          subjectTo.push({
            name: `cap_${res.id}_${dayIdx}`,
            vars: vars.filter((v) => v.coef !== 0),
            bnds: { type: glpk.GLP_UP, ub: res.capacity, lb: 0 },
          });
        });
      });

      // 2) limites de overtime por recurso por dia (0 <= o_{r,d} <= maxPerDay)
      overtimeResources.forEach((resId) => {
        days.forEach((dayIdx) => {
          // bound lower 0 implicit via GLP_LO
          subjectTo.push({
            name: `overtime_bound_${resId}_${dayIdx}`,
            vars: [{ name: `o_${resId}_${dayIdx}`, coef: 1 }],
            bnds: {
              type: glpk.GLP_DB,
              lb: 0,
              ub: overtimeConfig[resId].maxPerDay,
            },
          });
        });
      });

      // 3) demanda semanal para cada produto: weeklyMin <= sum_d x_{i,d} <= weeklyMax
      products.forEach((prod, i) => {
        // soma diária <= weeklyMax
        subjectTo.push({
          name: `weeklyMax_${i}`,
          vars: days.map((dayIdx) => ({ name: `x_${i}_${dayIdx}`, coef: 1 })),
          bnds: { type: glpk.GLP_UP, ub: prod.weeklyMax ?? 1e9, lb: 0 },
        });

        // soma diária >= weeklyMin
        subjectTo.push({
          name: `weeklyMin_${i}`,
          vars: days.map((dayIdx) => ({ name: `x_${i}_${dayIdx}`, coef: 1 })),
          bnds: { type: glpk.GLP_LO, lb: prod.weeklyMin ?? 0, ub: 0 },
        });
      });

      // 4) customConstraints (aplicamos sobre totais semanais: coef * sum_d x_{i,d} ... )
      // Cada custom constraint vem com coefficients (array por produto), type and value
      customConstraints.forEach((c, idx) => {
        // construir lista de (x_{i,d}) com coef = c.coefficients[i] para cada dia
        const vars = [];
        products.forEach((prod, i) => {
          days.forEach((dIdx) => {
            const coef = c.coefficients[i] || 0;
            if (coef !== 0) vars.push({ name: `x_${i}_${dIdx}`, coef });
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

      // 5) diversificação (participation constraint) sobre totais semanais:
      // Para cada produto i: sum_d x_{i,d} - alpha * sum_{j,d} x_{j,d} >= 0
      // Reescrevemos como: (1 - alpha)*sum_d x_{i,d} + sum_{j != i} (-alpha)*sum_d x_{j,d} >= 0
      const totalVarsAll = [];
      products.forEach((_, i) =>
        days.forEach((dIdx) => totalVarsAll.push(`x_${i}_${dIdx}`))
      );

      products.forEach((_, i) => {
        const vars = [];

        // coef para produto i
        days.forEach((dIdx) =>
          vars.push({ name: `x_${i}_${dIdx}`, coef: 1 - minParticipation })
        );

        // coef para outros produtos
        products.forEach((_, j) => {
          if (j === i) return;
          days.forEach((dIdx) =>
            vars.push({ name: `x_${j}_${dIdx}`, coef: -minParticipation })
          );
        });

        subjectTo.push({
          name: `min_participation_prod_${i}`,
          vars: vars.filter((v) => v.coef !== 0),
          bnds: { type: glpk.GLP_LO, lb: 0, ub: 0 },
        });
      });

      // ===== montar modelo =====
      const model = {
        name: "Mix_Producao_Semanal",
        objective: {
          direction: glpk.GLP_MAX,
          name: "lucro_semanal",
          vars: variables,
        },
        subjectTo,
        // sem binaries / generals: contínuo
      };

      // Debug: verifique o modelo no console se precisar
      console.log("Modelo (resumo):", {
        varsCount: variables.length,
        constraintsCount: subjectTo.length,
      });

      // resolver
      const solverReponse = await glpk.solve(model, {
        msglev: glpk.GLP_MSG_OFF,
        presol: true,
      });

      console.log("Resultado do solver:", solverReponse);
      // verificar resultado
      if (
        !solverReponse ||
        !solverReponse.result ||
        typeof solverReponse.result.z === "undefined"
      ) {
        throw new Error("Solver não retornou solução válida.");
      }

      // Construir resultado detalhado por produto e por dia
      const production = products.map((prod, i) => {
        // array com quantidades diárias na ordem da lista "days"
        const dailyQuantities = days.map((dayName) => {
          const varName = `x_${i}_${dayName}`;
          const val = solverReponse.result.vars[varName];
          return Number(val || 0);
        });

        return {
          name: prod.name,
          daily: dailyQuantities,
        };
      });

      // também extrair overtime usado (por recurso por dia)
      const overtimeUsed = {};
      overtimeResources.forEach((resId) => {
        overtimeUsed[resId] = {};
        days.forEach((dIdx) => {
          const varName = `o_${resId}_${dIdx}`;
          overtimeUsed[resId][dIdx] = Number(
            solverReponse.result.vars[varName] || 0
          );
        });
      });

      setResults({ profit: solverReponse.result.z, production, overtimeUsed });
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
            Observação: capacities são horas por dia. Para etapas móveis (ex.:
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
              Processando... <i className="fas fa-spinner fa-spin ml-2" />
            </span>
          ) : (
            <span>
              Otimizar Semana <i className="fas fa-calculator ml-2" />
            </span>
          )}
        </button>
      </div>

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
