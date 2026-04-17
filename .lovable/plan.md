

## Plano: Ajustar larguras das colunas e reposicionar badge de %

### Problema atual
1. Coluna **DURAÇÃO** ficou estreita demais (44px) — com o sufixo "d" o número some/trunca.
2. Outras colunas (Início, Fim, % Concl., Dep) podem estar apertadas após adicionar a nova coluna.
3. Badge de % no Gantt está centralizado na linha tracejada — usuário quer fixo no **lado direito, na ponta da última data do apontamento diário** (ponto onde Real termina = início da projeção).

### 1. Redimensionar colunas da sidebar (`src/components/GanttChart.tsx`)
Aumentar larguras para evitar truncamento:

| Coluna | Antes | Depois |
|---|---|---|
| Drag handle | 24px | 24px |
| Nome (EAP) | 1fr | 1fr |
| Equipe | 28px | 32px |
| Crítica (!) | 20px | 20px |
| Início | 78px | 88px |
| Fim | 78px | 88px |
| **Duração** | **44px** | **58px** (cabe "999d") |
| % Concl. | 42px | 48px |
| Dep | 44px | 48px |
| Ações | 56px | 56px |

Novo `sidebarCols`: `'24px 1fr 32px 20px 88px 88px 58px 48px 48px 56px'`
Novo `sidebarWidth`: `620` (era 578).

Aplicar em **todas** as ocorrências (header, linhas de fase, linhas de tarefa) para manter alinhamento.

### 2. Sufixo "d" sem cobrir o número
Ajustar wrapper do input de duração:
- Input com `pr-3` (padding-right) para reservar espaço.
- `<span>d</span>` em `right-1 text-[9px]` (em vez de 8px) para ficar mais visível.
- `text-align: left` no input para o número não colidir com o "d".

### 3. Reposicionar badge de % no Gantt
Atualmente: badge centralizado no meio da linha tracejada.
Novo comportamento:
- Calcular posição X = `(diasDoStartAtéÚltimoApontamento) * dayWidth` — ou seja, fim da parte "Real" / início da parte "Previsto".
- Badge ancorado nesse ponto com `transform: translateX(-50%)` e `top` levemente acima da linha.
- Se não há apontamentos, esconder o badge (não há projeção).
- Cor mantém a semântica: azul se em dia, vermelho se atrasado.
- Manter `drop-shadow` branco para legibilidade.

### Arquivo afetado
- `src/components/GanttChart.tsx` (somente).

### Resultado esperado
- Coluna Duração mostra `12d`, `120d` sem truncar.
- Datas Início/Fim com folga visual.
- Badge % fixo no ponto exato onde termina o último apontamento, deixando claro: "deste ponto pra frente é projeção, e o status atual é XX%".

